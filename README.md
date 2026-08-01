# TCE Bonafide Certificate Application Portal

A secure, production-grade web application built to automate and manage student bonafide certificate requests at Thiagarajar College of Engineering. 

This application has been migrated from EJS/Firebase to a modern **React (Vite) + Node.js (Express) + PostgreSQL + Redis** stack with telemetry support.

---

## 🚀 Key Features

* **🔑 Passwordless Student Authentication**: OTP-based logins sent directly to institutional emails (with limit counters and brute-force protection).
* **📋 Dynamic CMS Form Fields**: Admin-managed active fields matching college guidelines.
* **📄 Automated Document Generation**: Asynchronous Generation of student certificates in Microsoft Word (.docx) format.
* **📬 Email Notification dispatch**: Auto-delivery of generated certificates to student mailboxes.
* **📊 Developer Portal (`/admin/dev`)**: Real-time system diagnostics, CPU/memory performance telemetry metrics, and color-coded database logs.
* **📈 In-Memory Caching & Performance**: Redis-backed persistent sessions and administrative list page caching with non-blocking key invalidations.

---

## 🛠️ Technology Stack

* **Frontend**: React.js, Vite, Axios, vanilla CSS (vibrant layout & premium styles).
* **Backend**: Node.js, Express, Winston logger.
* **Database**: PostgreSQL (Primary-Replica configuration ready).
* **Caching**: Redis (connect-redis sessions, admin page cache).
* **Scheduler**: node-cron (for daily cleanups and monthly report logs).

---

## ⚙️ Prerequisites

You must have the following installed on your machine:
1. **Node.js** (v18+)
2. **Docker** and **Docker Compose**
3. **npm** (comes with Node.js)

---

## ⚙️ Local Development Setup

### 1. Configure Environment Variables
Create a `.env` file in the root directory. You can use the template from `.env.example` as a base:
```bash
cp .env.example .env
```
Ensure you update the secrets and configurations inside `.env` (such as SMTP mail settings, session secrets, and postgres database passwords).

### 2. Start PostgreSQL and Redis Containers
Run the Docker Compose suite in the background:
```bash
docker compose up -d
```
This launches:
- **Primary PostgreSQL** database on host port `5434`
- **Replica PostgreSQL** database on host port `5435`
- **Redis Server** on host port `6379` (password-secured)

### 3. Install Dependencies & Start Backend Server
From the root directory:
```bash
# Install backend packages
npm install

# Start development backend (auto-reloads on edits)
npm run dev
```
The server will start listening at `http://localhost:3000`.

### 4. Install Dependencies & Start Frontend Client
From the `client` directory:
```bash
cd client

# Install client packages
npm install

# Start Vite React server
npm run dev
```
The client will start listening at `http://localhost:5173`.

---

## 📊 Developer Portal Diagnostics

The developer portal is located at `/admin/dev` and connects to `/api/dev/*` backend routes. 

* **To Access**: Log in as a developer user via the **Developer Tab** on the sign-in page using your email and password, or supply the `x-dev-token` header:
  ```bash
  curl -H "x-dev-token: your_dev_secret" http://localhost:3000/api/dev/health
  ```
* **Endpoints**:
  - `/api/dev/health`: System health monitor checking database connection states.
  - `/api/dev/metrics`: Diagnostics showing heap/RSS memory usage and Redis info.
  - `/api/dev/logs`: Pulls the latest 30 app logs from PostgreSQL Winston logger tables.

---

## 📤 Firebase Firestore Data Migration

If you are migrating legacy student records or certificates from Firebase Firestore to PostgreSQL, use the included migration utilities:

1. Place your private service account key downloaded from Firebase Console into `firebase/serviceAccount.json`.
2. Review the configurations in **[MIGRATION.md](file:///home/sooriya/Desktop/TCE-Bonafide-Application/firebase/MIGRATION.md)**.
3. Run the migration script:
   ```bash
   node firebase/migrate.js
   ```
