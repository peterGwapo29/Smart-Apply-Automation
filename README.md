# JobStreet Quick Apply Automation

A job application automation platform designed to evaluate JobStreet job listings against resume credentials, technical skill sets, experience, and custom applicant preferences.

This repository is structured as a modular monorepo containing three core applications:

1. **Chrome Extension (`extension/`):** Chrome Extension Manifest V3 built with React, TypeScript, and Vite.
2. **Web Dashboard (`dashboard/`):** Administrative web interface built with Next.js (App Router), React, TypeScript, and Tailwind CSS.
3. **Backend API (`backend/`):** Central REST API built with Laravel 11, PHP 8.3, and MySQL/MariaDB.

---

## Repository Structure

```text
Smart Apply Automation/
├── extension/          # Chrome Extension (Manifest V3 + React + Vite)
├── dashboard/          # Web Dashboard (Next.js App Router + Tailwind CSS)
├── backend/            # REST API (Laravel 11 + MySQL)
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
Create the dedicated development database:
```sql
CREATE DATABASE IF NOT EXISTS `jobstreet_quick_apply` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --port=8000
```
Health endpoint: `http://127.0.0.1:8000/api/health`

### 4. Web Dashboard Setup
```bash
cd dashboard
cp .env.example .env.local
npm install
npm run dev
```
Dashboard interface: `http://localhost:3000`

### 5. Chrome Extension Setup
```bash
cd extension
cp .env.example .env
npm install
npm run build
```
Load the `extension/dist` folder into Chrome via `chrome://extensions/` with Developer Mode enabled.

---

## Detailed Documentation
- [Environment Setup & Installation Guide](file:///c:/petergwapo/Smart%20Apply%20Automation/docs/setup.md)
- [System Architecture & Boundaries](file:///c:/petergwapo/Smart%20Apply%20Automation/docs/architecture.md)

---

## Phase 1 Status
Phase 1 (Project Foundation and Dependency Setup) has been configured, built, and verified.
