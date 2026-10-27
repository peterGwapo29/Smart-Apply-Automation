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
  - Distinct portfolio projects recognition (e.g. *Golden Resort Booking System*, *CashiPay*, *Sumbong App* kept separate from employment history).
  - Interactive Review & Confirmation interface with provenance tracking (`pending_review`).
  - Resume versioning preserving application history upon replacement.
  - Normalized MySQL schema with Eloquent relationships and transaction safety.

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
