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
├── backend/            # REST API (Laravel 11, PHP 8.3, MySQL)
├── docs/               # Technical and setup documentation
├── .gitignore          # Root ignore rules
├── README.md           # Project readme
└── .env.example        # Monorepo environment variable template
```

---

## 3. Database Creation & Configuration

The application uses a dedicated database named `jobstreet_quick_apply`.

### Creating the Database
Using MySQL / MariaDB CLI:
```sql
CREATE DATABASE IF NOT EXISTS `jobstreet_quick_apply` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or via PowerShell:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS jobstreet_quick_apply CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## 4. Environment Variables Configuration

Copy the example environment files for each project:

### A. Backend (`backend/.env`)
```bash
cp backend/.env.example backend/.env
```
Ensure the database credentials match your local MySQL configuration:
```env
APP_NAME="JobStreet Quick Apply"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=jobstreet_quick_apply
DB_USERNAME=root
DB_PASSWORD=
DB_COLLATION=utf8mb4_unicode_ci
```
Generate an application key if not present:
```bash
cd backend
php artisan key:generate
```

### B. Web Dashboard (`dashboard/.env.local`)
```bash
cp dashboard/.env.example dashboard/.env.local
```
Contents:
```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
INTERNAL_API_BASE_URL=http://127.0.0.1:8000/api
```

### C. Chrome Extension (`extension/.env`)
```bash
cp extension/.env.example extension/.env
```
Contents:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

---

## 5. Running Database Migrations

Inside the `backend/` directory:
```bash
cd backend
php artisan migrate
```
To refresh the database:
```bash
php artisan migrate:fresh
```

---

## 6. Starting Each Application

Each application is independently runnable:

### A. Backend REST API
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```
- Endpoint: `http://127.0.0.1:8000`
- Health check: `http://127.0.0.1:8000/api/health`
- Database health check: `http://127.0.0.1:8000/api/health/db`

### B. Web Dashboard
```bash
cd dashboard
npm run dev
```
- Accessible at: `http://localhost:3000`

### C. Chrome Extension
To build the extension for production:
```bash
cd extension
npm run build
```
The output directory will be created at `extension/dist/`.

---

## 7. How to Load the Extension in Google Chrome

1. Open Google Chrome.
2. In the address bar, navigate to: `chrome://extensions/`
3. Enable **Developer mode** toggle in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file picker, select the `extension/dist` folder inside this project repository.
6. The extension **JobStreet Quick Apply** will appear in your extensions list.
7. Click the extension icon in Chrome's toolbar to open the popup and click **Test API Connection**.

---

## 8. Running Automated Tests & Builds

### Backend API Tests
```bash
cd backend
php artisan test
```

### Dashboard Production Build & Linting
```bash
cd dashboard
npm run lint
npm run build
```

### Extension Production Build & Linting
```bash
cd extension
npm run lint
npm run build
```

---

## 9. Troubleshooting & Common Issues

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| `Unknown collation: 'utf8mb4_0900_ai_ci'` | MariaDB does not support MySQL 8.0 default collation. | Set `DB_COLLATION=utf8mb4_unicode_ci` in `backend/.env`. |
| CORS error in browser / dashboard | Missing CORS headers on Laravel routes. | Verify `backend/config/cors.php` has `'paths' => ['api/*', ...]` and `'allowed_origins' => ['*']`. |
| Extension cannot reach `127.0.0.1:8000` | Host permissions missing in `manifest.json`. | Ensure `host_permissions` in `manifest.json` includes `"http://127.0.0.1:8000/*"`. |
| Port 8000 or 3000 already in use | Another service is using the port. | Change `--port=8001` or `-p 3001` and update `.env` references accordingly. |
