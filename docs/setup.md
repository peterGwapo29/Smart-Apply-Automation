# Development Environment Setup Guide

This guide details the prerequisites, configuration steps, database setup, and execution instructions for the **JobStreet Quick Apply Automation** monorepo.

---

## 1. System Prerequisites & Verified Versions

| Tool | Minimum Version | Verified Environment | Purpose |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 10/11 x64 | Windows 11 Build 26200 | Host environment |
| **Node.js** | `>= 18.18.0` | `v24.20.0` | Extension & Dashboard runtime |
| **npm** | `>= 9.0.0` | `11.19.0` | Package manager |
| **PHP** | `>= 8.2` | `8.3.33 (cli)` | Laravel 11 runtime |
| **Composer** | `>= 2.2` | `2.8.8` | PHP package manager |
| **MySQL / MariaDB** | MySQL 8.0+ / MariaDB 10.4+ | MariaDB 10.4.32 / MySQL 8.0 | Application database |
| **Google Chrome** | Latest stable | Version 120+ | Chrome Extension host |

### Required PHP Extensions
Ensure the following extensions are enabled in your `php.ini`:
- `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `curl`, `fileinfo`, `filter`, `zip`

---

## 2. Monorepo Repository Structure

```text
Smart Apply Automation/
├── extension/          # Chrome Extension (Manifest V3, React 18, TypeScript, Vite)
├── dashboard/          # Web Dashboard (Next.js 16/React 19, TypeScript, Tailwind CSS)
│   ├── app/
│   │   ├── resumes/            # Resume upload & version management
│   │   │   └── [id]/review/    # Interactive extracted profile review interface
│   │   ├── profile/            # Structured candidate profile view & editor
│   │   ├── layout.tsx          # Navigation header
│   │   └── page.tsx            # Overview & health status
├── backend/            # REST API (Laravel 11, PHP 8.3, MySQL)
│   ├── app/
│   │   ├── Exceptions/         # ScannedPdfException, EncryptedPdfException
│   │   ├── Http/Controllers/   # ResumeController, CandidateProfileController, AuthController
│   │   ├── Models/             # User, CandidateProfile, Resume, Skill, WorkExperience, etc.
│   │   └── Services/           # PdfParserService, StructuredResumeExtractor
│   ├── database/migrations/    # 8 normalized candidate profile migrations
├── docs/               # Technical and setup documentation
│   ├── setup.md
│   └── architecture.md
├── .gitignore          # Root ignore rules
├── README.md           # Project readme
└── .env.example        # Monorepo environment variable template
```

---

## 3. Database Creation & Migrations

The application uses a dedicated database named `jobstreet_quick_apply`.

### Creating the Database
Using MySQL / MariaDB CLI:
```sql
CREATE DATABASE IF NOT EXISTS `jobstreet_quick_apply` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Running Migrations
From the `backend/` directory:
```bash
cd backend
php artisan migrate
```
To run seeders (creates default developer user & candidate profile):
```bash
php artisan db:seed
```

### Phase 2 Database Schema
- `candidate_profiles`: User profile (name, email, phone, location, headline, summary).
- `resumes`: Historical and active resume versions (file path, file size, hash, processing status, active flag).
- `skills` & `candidate_skills`: Normalized unique skills with categorized associations (Backend, Frontend, Database, Tools, Other).
- `work_experiences`: Classified employment, freelance, contract, and commission history.
- `portfolio_projects`: Standalone personal, academic, and client projects (kept strictly distinct from employment).
- `education_records` & `certifications`: Academic degrees, institutions, and credentials.

---

## 4. PDF Parser Service & Storage

### PDF Parser Library
- **Library:** `smalot/pdfparser` (`^2.13.1`)
- **Type:** Pure PHP text parser (no external C-binaries like `pdftotext` or `poppler` required).
- **Supported Formats:** Standard text-based PDF documents up to 5 MB.
- **Unsupported Formats:**
  - Password-protected or encrypted PDFs (rejected with `EncryptedPdfException`).
  - Scanned / image-only PDFs without text layers (detected and rejected with `ScannedPdfException` reporting OCR is required).
  - Malformed or non-PDF files disguised as `.pdf` (validated via magic bytes `%PDF-` and MIME type).

### Storage Security
- Resumes are stored privately in `storage/app/resumes/{user_id}/{sha256}.pdf`.
- Files are located outside the public web root and are never directly accessible via public URLs.
- Filenames on disk use SHA-256 hashes to prevent path traversal and arbitrary code execution.

---

## 5. API Endpoints (Phase 2)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/token` | Generates a Sanctum token for local developer user |
| `GET` | `/api/auth/me` | Returns current user information |
| `GET` | `/api/resumes` | Lists resume version history |
| `POST` | `/api/resumes` | Uploads and extracts text from a PDF resume |
| `GET` | `/api/resumes/{id}` | Retrieves parsed resume draft awaiting review |
| `POST` | `/api/resumes/{id}/confirm` | Confirms reviewed profile, activates resume, and updates database |
| `POST` | `/api/resumes/{id}/retry` | Re-parses an existing uploaded resume |
| `GET` | `/api/candidate-profile` | Retrieves candidate profile with grouped skills, experience, projects |
| `PUT` | `/api/candidate-profile` | Updates candidate basic contact and summary details |
| `POST` | `/api/candidate-profile/skills` | Manually adds a technical skill |
| `DELETE` | `/api/candidate-profile/skills/{id}` | Deletes a technical skill |
| `POST` | `/api/candidate-profile/experiences` | Manually adds work experience |
| `DELETE` | `/api/candidate-profile/experiences/{id}` | Deletes work experience |
| `POST` | `/api/candidate-profile/projects` | Manually adds portfolio project |
| `DELETE` | `/api/candidate-profile/projects/{id}` | Deletes portfolio project |

---

## 6. Starting Each Application

### A. Backend API (Laravel)
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

### B. Web Dashboard (Next.js)
```bash
cd dashboard
npm start -- -p 3000
# Or for development:
npm run dev
```
Accessible at: `http://localhost:3000`
- Resumes page: `http://localhost:3000/resumes`
- Candidate Profile: `http://localhost:3000/profile`

### C. Chrome Extension
```bash
cd extension
npm run build
```
Load the `extension/dist` folder into Chrome via `chrome://extensions/` with Developer Mode enabled.

---

## 7. Running Automated Tests

Run backend automated test suite:
```bash
cd backend
php artisan test
```
All 13 unit and feature tests covering PDF validation, scanned detection, encryption handling, structured parsing, review confirmation, and history retention will execute.

Run dashboard build & linting:
```bash
cd dashboard
npm run lint
npm run build
```
