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
