# JobStreet Quick Apply Automation

A job application automation platform designed to evaluate JobStreet job listings against resume credentials, technical skill sets, experience, and custom applicant preferences.

This repository is structured as a modular monorepo containing three core applications:

1. **Chrome Extension (`extension/`):** Chrome Extension Manifest V3 built with React, TypeScript, and Vite.
2. **Web Dashboard (`dashboard/`):** Administrative web interface built with Next.js (App Router), React, TypeScript, and Tailwind CSS.
3. **Backend API (`backend/`):** Central REST API built with Laravel 11, PHP 8.3, and MySQL/MariaDB.

---

## Implemented Phases

- **Phase 1: Project Foundation and Dependency Setup** (Verified)
- **Phase 2: Resume Ingestion and Candidate Profile** (Verified)
  - PDF resume upload with server-side signature validation and size limits (5 MB).
  - Private storage outside public web directory.
  - Text extraction via `smalot/pdfparser` with scanned/image-only PDF detection and encryption handling.
  - Deterministic structured candidate extraction (skills grouped into Backend, Frontend, Database, Tools, Other).
  - Explicit experience classification (Professional Employment, Freelance, Commission, Contract, Academic, Personal).
  - Distinct portfolio projects recognition kept separate from employment history.
  - Interactive Review & Confirmation interface with provenance tracking (`pending_review`).
  - Resume versioning preserving application history upon replacement.
  - Normalized MySQL schema with Eloquent relationships and transaction safety.
- **Phase 3: JobStreet Listing Detection and Job Details** (Verified)
  - Legal & platform terms compliance: Strict avoidance of automated background scraping or anti-bot bypass.
  - Passive listing detection via Chrome Extension: checks active tab URL (`chrome.tabs.query`) to extract Job ID and match against database.
  - Pluggable `JobExtractionProviderInterface` architecture with `ManualJobImportProvider` (and future partner API provider support).
  - Deterministic section parsing for responsibilities, qualifications, and salary extraction.
  - Layered deduplication: (1) `[user_id, source_platform, source_job_id]`, (2) Normalized canonical URL (tracking query stripping), (3) SHA-256 content hash.
  - Re-observation logic: preserves original `first_detected_at`, refreshes `last_observed_at`, and logs changes into `job_listing_histories`.
  - Evidence-based Quick Apply detection: classifies into `available`, `unavailable`, `requires_review`, or `unknown`.
  - Dashboard interfaces: `/jobs` (listing repository & KPI summary), `/jobs/import` (dual paste/structured entry), and `/jobs/[id]` (detail editor & observation history log).
- **Phase 4: Hybrid Job-Matching Engine** (Verified)
  - **Component A (Deterministic Matching):** 100-point formula distributed into Technical Skills (40%), Experience & Seniority (25%), Job Responsibilities (15%), Work Arrangement (10%), and Salary Expectations (10%).
  - **Component B (AI-Assisted Semantic Analysis):** Offline, zero-leakage `LocalDeterministicSemanticProvider` corroborating technical domain competencies against verified candidate experience.
  - **Component C (Eligibility & Disqualifiers):** Independent evaluation of mandatory certifications, licenses, minimum professional tenure, and location/remote constraints. Statuses: `eligible`, `disqualified`, `requires_review`.
  - **Strict Tenure Calculation:** Personal and academic projects provide technical evidence but are strictly excluded from professional employment duration.
  - **Explainability & Provenance:** Full factor breakdowns, matched skills (exact vs. related 0.5 credit), and duty-to-evidence reference mappings stored in `job_matches`.
  - **User Matching Preferences:** Custom salary minimums, target pay, acceptable work arrangements (remote/hybrid/on-site), and hard disqualifier toggles in `candidate_preferences`.
  - **UI Integration:** Match score pills, high fit filters, batch match trigger (`⚡ Match All Jobs`), and comprehensive match analysis card in Dashboard & Chrome Extension.
- **Phase 5: Job Dashboard & Application Queue** (Verified)
  - **Concept Separation:** Complete independence between Match Score (fit), Eligibility (`eligible`, `disqualified`, `requires_review`), Review Status (`new`, `review_required`, `saved`, `interested`, `not_interested`, `archived`), and Bookmarking state (`is_bookmarked`). High match score never overrides user review decisions or eligibility blocks.
  - **Data Modeling:** Decoupled `job_user_workflows` table with atomic bookmarking, triage notes, review timestamps, and snapshot content hash/score tracking.
  - **Configurable Match Threshold:** Added `min_match_threshold` (default 70.00%) to `candidate_preferences` to dynamically control strong match highlighting without altering historical scores.
  - **Dynamic Staleness & Change Detection:**
    - Content Change Detection compares `last_reviewed_content_hash` vs. `job_listings.content_hash`, surfacing amber alerts if employer modified listing details post-review.
    - Match Staleness Detection evaluates `calculated_at` against listing and profile update timestamps, surfacing one-click recalculate triggers.
  - **Discovery Dashboard:** Quick View Tabs (`All Jobs`, `Strong Matches`, `Review Queue`, `Bookmarked`, `Interested`, `Archived`), 6 KPI summary counters (`/api/jobs/dashboard-summary`), composable multi-criteria search, technology keyword parsing, and stable server-side sorting (`newest`, `highest_match`, `lowest_match`, `salary_high`, `recently_reviewed`, `unreviewed_first`).
  - **Job Detail & Queue Workflow:** Sticky workflow action header in `/jobs/[id]` for triage decisions and notes, change comparison alerts, and stale match notices.
  - **Chrome Extension Integration:** Enhanced popup with review status badges, inline star bookmark toggle, triage selector, change/stale warnings, and direct routing to `/jobs?tab=review_queue`.

---

## Repository Structure

```text
Smart Apply Automation/
├── extension/          # Chrome Extension (Manifest V3 + React + Vite)
├── dashboard/          # Web Dashboard (Next.js App Router + Tailwind CSS)
│   ├── app/
│   │   ├── resumes/            # Resume upload & version management
│   │   │   └── [id]/review/    # Interactive extracted profile review interface
│   │   ├── profile/            # Structured candidate profile view & editor
│   │   ├── layout.tsx          # Navigation header
│   │   └── page.tsx            # Overview & health status
├── backend/            # REST API (Laravel 11 + MySQL)
│   ├── app/
│   │   ├── Exceptions/         # ScannedPdfException, EncryptedPdfException
│   │   ├── Http/Controllers/   # ResumeController, CandidateProfileController, AuthController
│   │   ├── Models/             # User, CandidateProfile, Resume, Skill, WorkExperience, etc.
│   │   └── Services/           # PdfParserService, StructuredResumeExtractor
│   ├── database/migrations/    # 8 normalized candidate profile migrations
├── docs/               # Architecture & Setup guides
│   ├── setup.md
│   └── architecture.md
├── .gitignore          # Root ignore rules
├── .env.example        # Root environment template
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- **Node.js:** v18.18+ (tested on v24.20.0)
- **PHP:** v8.2+ with PDO MySQL (tested on PHP 8.3.33)
- **Composer:** v2.2+ (tested on Composer 2.8.8)
- **MySQL / MariaDB:** Listening on 127.0.0.1:3306
- **Google Chrome:** For loading the unpacked extension

### 2. Database Setup
```sql
CREATE DATABASE IF NOT EXISTS `jobstreet_quick_apply` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend Setup
```bash
cd backend
composer install
php artisan migrate
php artisan db:seed
php artisan serve --port=8000
```
- Health endpoint: `http://127.0.0.1:8000/api/health`
- Candidate profile endpoint: `http://127.0.0.1:8000/api/candidate-profile`

### 4. Web Dashboard Setup
```bash
cd dashboard
npm install
npm run build
npm start -- -p 3000
# or development: npm run dev
```
- Resumes upload: `http://localhost:3000/resumes`
- Candidate profile: `http://localhost:3000/profile`

### 5. Chrome Extension Setup
```bash
cd extension
npm install
npm run build
```
Load the `extension/dist` folder into Chrome via `chrome://extensions/` with Developer Mode enabled.

---

## Detailed Documentation
- [Environment Setup & Installation Guide](file:///c:/petergwapo/Smart%20Apply%20Automation/docs/setup.md)
- [System Architecture & Boundaries](file:///c:/petergwapo/Smart%20Apply%20Automation/docs/architecture.md)
