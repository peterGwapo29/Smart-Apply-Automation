# System Architecture & Application Boundaries

This document defines the architectural boundaries, communication models, security practices, and network topology for the **JobStreet Quick Apply Automation** system.

---

## 1. High-Level Architecture Overview

```mermaid
flowchart TD
    subgraph Browser ["Client Environment (Browser)"]
        CE["Chrome Extension (Manifest V3)<br/>Vite + React + TS<br/>Unpacked (extension/dist)"]
        DB["Web Dashboard<br/>Next.js 16 + React 19 + Tailwind<br/>http://localhost:3000"]
    end

    subgraph Server ["Backend API (Laravel 11)"]
        RC["Resume Controller & Service<br/>PdfParserService + StructuredExtractor"]
        CPC["Candidate Profile Controller"]
        Storage["Private Storage<br/>storage/app/resumes/"]
    end

    subgraph DatabaseLayer ["Data Storage (MySQL)"]
        DBStore[("Database: jobstreet_quick_apply<br/>Tables: users, candidate_profiles,<br/>resumes, skills, work_experiences,<br/>portfolio_projects, education, certs")]
    end

    DB -- "Upload PDF / Review Draft / Confirm Profile" --> RC
    DB -- "Fetch / Edit Candidate Profile" --> CPC
    CE -- "Query Match Scoring & Preferences" --> CPC
    RC -- "Save PDF outside web root" --> Storage
    RC -- "Sync Confirmed Profile & Retain Versions" --> DBStore
    CPC -- "CRUD Operations" --> DBStore
```

---

## 2. Resume Ingestion & Review Workflow (Phase 2)

```mermaid
sequenceDiagram
    autonumber
    actor User as Applicant (User)
    participant UI as Dashboard UI (/resumes)
    participant API as Laravel REST API (/api/resumes)
    participant Parser as PdfParserService
    participant Extractor as StructuredExtractor
    participant DB as MySQL Database

    User->>UI: Selects & uploads PDF resume
    UI->>API: POST /api/resumes (multipart/form-data)
    API->>API: Validate file size (<= 5MB) & magic bytes (%PDF-)
    API->>Parser: extractText(filePath)
    alt PDF is scanned or image-only
        Parser-->>API: throws ScannedPdfException
        API-->>UI: HTTP 422: OCR required (unsupported)
    else PDF is encrypted
        Parser-->>API: throws EncryptedPdfException
        API-->>UI: HTTP 422: Encrypted PDF rejected
    else Valid text PDF
        Parser-->>Extractor: extract(normalizedText)
        Extractor-->>API: Proposed profile draft
        API->>DB: Store resume record (is_active = false, status = parsed)
        API-->>UI: HTTP 201: Proposed draft returned
        UI->>User: Displays interactive Review Interface (/resumes/:id/review)
        User->>UI: Reviews facts, edits classifications, adds/removes skills
        User->>UI: Clicks "Confirm & Save Profile"
        UI->>API: POST /api/resumes/:id/confirm
        Note over API,DB: DB::transaction
        API->>DB: Update candidate_profiles table
        API->>DB: Sync categorized skills & candidate_skills
        API->>DB: Upsert work_experiences & portfolio_projects
        API->>DB: Upsert education & certifications
        API->>DB: Mark old resumes is_active = false
        API->>DB: Mark current resume is_active = true, status = confirmed
        API-->>UI: HTTP 200: Profile confirmed and activated
        UI-->>User: Displays updated Candidate Profile (/profile)
    end
```

---

## 3. Candidate Profile Data Model (Normalized Schema)

```mermaid
erDiagram
    users ||--o{ candidate_profiles : "owns"
    users ||--o{ resumes : "uploads"
    candidate_profiles ||--o{ candidate_skills : "has"
    skills ||--o{ candidate_skills : "grouped in"
    candidate_profiles ||--o{ work_experiences : "has"
    candidate_profiles ||--o{ portfolio_projects : "has"
    candidate_profiles ||--o{ education_records : "has"
    candidate_profiles ||--o{ certifications : "has"
    resumes ||--o{ work_experiences : "source provenance"
    resumes ||--o{ portfolio_projects : "source provenance"

    candidate_profiles {
        bigint id PK
        bigint user_id FK
        string full_name
        string email
        string phone
        string location
        string headline
        text summary
    }

    resumes {
        bigint id PK
        bigint user_id FK
        string file_path
        string original_filename
        bigint file_size
        string mime_type
        string content_hash
        boolean is_active
        string processing_status
        longtext parsed_data
        longtext raw_text
    }

    skills {
        bigint id PK
        string name UK
        string display_name
        string category
    }

    work_experiences {
        bigint id PK
        bigint candidate_profile_id FK
        bigint resume_id FK
        string company_name
        string job_title
        string classification
        boolean is_current
        string start_date
        string end_date
        text responsibilities
        json technologies_used
        string review_status
    }

    portfolio_projects {
        bigint id PK
        bigint candidate_profile_id FK
        bigint resume_id FK
        string name
        text description
        json technologies_used
        string project_url
        string repository_url
        string category
        string review_status
    }
```

---

## 4. Key Security & Privacy Safeguards

1. **Storage Isolation:** Uploaded resumes are placed in `storage/app/resumes/{user_id}/{sha256}.pdf` outside the public web root. Direct HTTP access to raw files is blocked.
2. **Strict Validation:** File extensions, MIME types, and binary file signatures (`%PDF-`) are checked on every upload.
3. **No External AI Leakage:** Parsing is performed completely locally using deterministic PHP lexicons and regular expressions. No candidate resumes or personal data are transmitted to external AI APIs.
4. **Application History Preservation:** Replacing an active resume does not delete prior resume records. Historical resumes retain their processing status and provenance foreign keys.
5. **Multi-Record Atomicity:** The confirmation action wraps profile updates, skill syncing, experience persistence, and resume status toggling in a `DB::transaction`. If any operation fails, the transaction rolls back cleanly without data corruption.


---

## 3. Job Listing Detection & Ingestion Architecture (Phase 3)

### Legal & Platform Compliance Framework
- JobStreet (SEEK Group) Terms of Use prohibit automated screen scraping and anti-bot evasion.
- No public unauthenticated JobStreet search or extraction API is made available.
- **Adopted Architecture:** Passive URL Detection via Chrome Extension + User-Initiated Assisted Ingestion.
- Background content scripts do NOT scrape DOM elements or inject bypass automation.
- Pluggable `JobExtractionProviderInterface` is utilized, enabling instant plug-in of official partner APIs (e.g. SEEK Partner API) should institutional API keys be provisioned in the future.

### Job Ingestion Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Applicant
    participant Ext as Chrome Extension
    participant Dash as Web Dashboard (/jobs/import)
    participant API as Laravel API (/api/jobs)
    participant Svc as JobExtractionService
    participant Provider as ManualJobImportProvider
    participant DB as MySQL (job_listings)

    alt Passive Detection via Extension
        User->>Ext: Opens extension popup while viewing JobStreet
        Ext->>Ext: Inspects chrome.tabs.query active URL
        Ext->>API: GET /api/jobs/check?url=...
        API-->>Ext: Returns exists status & metadata
        User->>Ext: Clicks "Import to Dashboard"
        Ext->>Dash: Opens /jobs/import?url=...
    else Manual Ingestion in Dashboard
        User->>Dash: Pastes JobStreet URL and listing text
    end

    Dash->>API: POST /api/jobs/import
    API->>Svc: Process payload
    Svc->>Svc: Canonicalize URL (strip utm_*, ref, sol)
    Svc->>Provider: extract(payload)
    Provider-->>Svc: Extracted responsibilities, salary, quick_apply_status
    Svc->>Svc: Generate SHA-256 content hash
    Svc->>DB: Layered deduplication check (Job ID -> URL -> Content Hash)

    alt Duplicate / Re-observed Listing
        Svc->>DB: Refresh last_observed_at, preserve first_detected_at, log audit changes
        DB-->>API: Updated record & is_duplicate=true
    else New Listing
        Svc->>DB: Insert into job_listings & create job_listing_histories (event_type='created')
        DB-->>API: New record & is_duplicate=false
    end

    API-->>Dash: JSON response
    Dash-->>User: Displays status & redirects to /jobs/[id]
```

### Layered Deduplication Strategy
1. **Tier 1 (Source Job ID):** Matches `[user_id, source_platform, source_job_id]`.
2. **Tier 2 (Canonical URL):** Matches `[user_id, canonical_url]`, stripping tracking parameters (`utm_source`, `ref`, `sol`, `tracking`, etc.).
3. **Tier 3 (Content Hash):** Computes `sha256(lowercase(title | company | location | description_prefix))` to prevent duplicate entries when URLs differ or are omitted.


---

## 4. Hybrid Matching Engine Architecture (Phase 4)

### Component Breakdown
1. **Component A: Deterministic Engine (Authoritative Source of Truth)**
   - Computes reproducible baseline score ($0.00 - 100.00$) independently of any AI service.
   - Factors:
     - **Technical Skills (40%):** Evaluates required (75% subweight) vs. preferred (25% subweight) skills. Grants 1.0 for exact/alias matches, 0.5 for documented related technologies (e.g. React $\rightarrow$ Next.js, MySQL $\rightarrow$ MariaDB), 0.0 for unmatched.
     - **Experience & Seniority (25%):** Calculates strictly verified professional employment duration in months. Personal and academic projects are strictly excluded from professional duration. Compares tenure with target seniority (`intern`, `junior`, `mid`, `senior`, `lead`).
     - **Job Responsibilities (15%):** Maps job duties to demonstrated proof in candidate employment (1.0 credit) or portfolio projects (0.8 credit).
     - **Work Arrangement & Type (10%):** Matches candidate editable arrangements (Remote, Hybrid, On-site) and employment types.
     - **Salary & Compensation (10%):** Compares candidate minimum and preferred salary with job maximum. Undisclosed salary is assigned neutral score (60%) without penalizing the candidate.

2. **Component B: Semantic Analysis Adapter**
   - Implements `SemanticAnalysisProviderInterface`.
   - Default: `LocalDeterministicSemanticProvider` (100% offline, zero network data egress, privacy-safe).
   - Corroborates domain competencies and transferable skills against verified candidate evidence.

3. **Component C: Eligibility & Disqualifier Evaluation**
   - Evaluated separately from numerical score.
   - Checks mandatory certifications, minimum professional tenure, work authorization, and hard disqualifiers (e.g. strictly remote-only vs. on-site).
   - Statuses: `eligible`, `disqualified`, `requires_review`.

---

## 5. Job Discovery Dashboard & Application Review Queue (Phase 5)

### Strict Separation of Architectural Concepts
To prevent false-positive applications or unvetted automation, the platform enforces strict orthogonality among four distinct states:
1. **Match Fit Score (0.00 – 100.00%):** Statistical alignment across technical skills, experience tenure, responsibilities, work arrangement, and salary fit.
2. **Eligibility Status (`eligible`, `disqualified`, `requires_review`):** Independent legal and mandatory constraint verification. A 95% match fit **never** overrides a `disqualified` or `requires_review` status.
3. **Review Status (`new`, `review_required`, `saved`, `interested`, `not_interested`, `archived`):** Human candidate triage decisions. A high match score never bypasses user review.
4. **Bookmarking State (`is_bookmarked: true/false`):** Independent user flagging for quick retrieval, unaffected by review status changes.

### Entity Relationship & Schema Decoupling
```mermaid
erDiagram
    USERS ||--o{ JOB_LISTINGS : owns
    USERS ||--o{ JOB_USER_WORKFLOWS : maintains
    JOB_LISTINGS ||--o{ JOB_USER_WORKFLOWS : tracks
    JOB_LISTINGS ||--o{ JOB_MATCHES : evaluates
    CANDIDATE_PROFILES ||--o{ CANDIDATE_PREFERENCES : configures

    JOB_USER_WORKFLOWS {
        bigint id PK
        bigint user_id FK
        bigint job_listing_id FK
        string review_status
        boolean is_bookmarked
        text notes
        datetime reviewed_at
        string last_reviewed_content_hash
        decimal last_reviewed_match_score
    }

    CANDIDATE_PREFERENCES {
        bigint id PK
        bigint candidate_profile_id FK
        decimal min_match_threshold
    }
```

### Staleness & Change Detection Mechanism
- **Content Change Detection:** When a review decision is recorded, `last_reviewed_content_hash` snapshots the current listing `content_hash`. If an employer subsequently modifies the listing title, responsibilities, or requirements, `job_listings.content_hash !== workflow.last_reviewed_content_hash` triggers an amber `listing_changed_since_review: true` warning banner.
- **Match Staleness Detection:** Evaluated dynamically when `job_matches.calculated_at < job_listings.updated_at` or `job_matches.calculated_at < candidate_profiles.updated_at`. Flags the score as outdated and surfaces a one-click recalculation action without overwriting history.
