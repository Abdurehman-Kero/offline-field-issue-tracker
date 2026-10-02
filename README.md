# Offline Field Issue Tracker

A robust, local-first web application designed for field workers operating in environments with intermittent, low-bandwidth, or zero network connectivity. Infrastructure problem reports (broken water points, equipment damage, service disruptions, safety hazards) are saved instantly to local browser storage (IndexedDB) and automatically synchronized with a central PostgreSQL backend when connectivity is restored. Coordinators review, assign, update, and resolve reports through an audit-tracked workflow.

**Project:** WEDER Strategies Operations Platform  
**Author:** Abdurehman Kero  

---

## 1. Directory & Code Structure

The repository is organized into a clean, intuitive structure following this exact layout:

```
offline-field-issue-tracker/
├── .gitignore
├── package.json              # root scripts only (dev, build, test, seed, migrate)
├── README.md                 # System overview and quick-start guide
├── DEMO_SCRIPT.md            # Complete step-by-step presentation & live demo guide
├── docs/                     # SRS, design doc, QA checklist, AI usage log
│   ├── SRS.md
│   ├── SYSTEM_DESIGN.md
│   ├── QA_CHECKLIST.md
│   └── AI_USAGE.md
├── server/
│   ├── package.json          # Express server dependencies
│   ├── .env.example          # Variable names only
│   ├── src/
│   │   ├── index.js          # Starts the server
│   │   ├── app.js            # Express app (used by tests)
│   │   ├── workflow.js       # Status state machine & transition rules
│   │   ├── validation.js     # Input boundary rules (Zod)
│   │   ├── errors.js         # Error helper & centralized handler
│   │   ├── db/               # PostgreSQL pool, migrate, seed, migrations/001_init.sql
│   │   ├── routes/           # health.js, reports.js
│   │   └── services/         # reportService.js, historyService.js
│   └── tests/                # Server API, validation, and workflow test suites
└── client/
    ├── package.json          # React frontend dependencies & build scripts
    ├── vite.config.js        # Vite configuration & dev proxy
    ├── index.html            # Frontend HTML template
    └── src/
        ├── main.tsx, App.tsx # Application roots
        ├── api/              # Fetch wrapper & HTTP client
        ├── db/               # IndexedDB storage functions (localDb.ts)
        ├── sync/             # Sync engine + retry exponential backoff
        ├── shared/           # Shared constants, types, and workflow rules
        ├── hooks/            # useOnlineStatus, useRole, useReports
        ├── components/       # Header, Badge, ReportCard, HistoryTimeline, Modals
        ├── pages/            # ReportList, ReportForm, ReportDetails, SyncPage
        ├── styles/           # variables.css, base.css, layout.css
        └── tests/            # Client sync and retry test suite
```

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Client Frontend** | React 19, Vite, TypeScript | Fast component rendering, type-safe development |
| **Local Storage** | IndexedDB via `idb` | Reliable in-browser database surviving refreshes and reboots |
| **Styling** | Plain CSS with Design Variables | Flat, calm, accessible internal tool design; fast and responsive |
| **Backend API** | Node.js 20+, Express | Fast, modular HTTP REST API |
| **Database** | PostgreSQL 15+ / Embedded PGlite | Raw SQL transactions, `ON CONFLICT` idempotency, and embedded fallback |
| **Validation** | Zod | Strictly typed boundary validation on both server and client |
| **Security** | Helmet, CORS, parameterized queries | Protection against standard web vulnerabilities and SQL injection |
| **Testing** | Vitest + Supertest | 32 automated unit and integration tests across client and server |

---

## 3. Quick Start & Setup Instructions

### Prerequisites
- Node.js 20+ (LTS)
- npm 9+
- PostgreSQL 15+ (optional; the server includes a self-contained in-memory PGlite engine if an external PostgreSQL instance is not configured)

### Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/nexussphere0974/offline-field-issue-tracker.git
cd offline-field-issue-tracker
npm install
```

### Environment Configuration
Copy the environment example file:
```bash
cp .env.example .env
```
Default settings:
```env
PORT=3000
# Optional: Set your PostgreSQL connection string if running external Postgres
# DATABASE_URL=postgresql://postgres:password@localhost:5432/field_tracker
```
*(If `DATABASE_URL` is omitted, the application automatically uses the embedded PostgreSQL WASM engine, allowing immediate out-of-the-box execution without any external database setup).*

### Running the Application
Start the full-stack development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 4. Database Migration & Seeding

Run the schema migrations manually:
```bash
npm run migrate
```

Seed 12 realistic demo infrastructure reports covering every category, priority, status, and audit history:
```bash
npm run seed
```

---

## 5. Running Automated Tests

The test suite covers workflow transition permissions, Zod validation constraints, idempotent report insertion, version conflict resolution (HTTP 409), and client retry backoff calculations.

Run all tests:
```bash
npm test
```
*(Executes 32 test cases across 4 test suites)*.

---

## 6. Architecture & Synchronization Strategy

### The Local-First Principle
Field workers never experience loading spinners or network timeouts when creating or saving problem reports. All user actions immediately write to **IndexedDB**. A dedicated background **Sync Engine** reconciles the local state with the server.

```
[ Field Worker UI (React 19) ]
             ▲
             │ (Immediate Read/Write)
             ▼
    [ IndexedDB Layer ]
    • reports store (keyed by clientId)
    • history store
             ▲
             │ (Background Sync Engine: retry, backoff, lock)
             ▼
      [ HTTP / JSON API ]  (Header: X-Role: field_worker | coordinator)
             ▲
             │ (Express + Helmet + CORS + Zod Validation)
             ▼
   [ PostgreSQL Database ]
   • reports table (UNIQUE client_id constraint)
   • report_history table (append-only audit log)
```

### Outbox Lifecycle
1. `local_only`: Saved on device as a Draft. Never sent to the server until the worker submits.
2. `pending`: Marked as Submitted by worker; queued in the device outbox.
3. `syncing`: Acquired by the active sync loop; currently uploading.
4. `synced`: Server acknowledged receipt with HTTP 201 or 200; local state updated with `serverId` and server `version`.
5. `failed`: Exceeded maximum retry attempts (5 attempts) or received HTTP 400 validation rejection; requires user review and manual retry.

### Preventing Duplicate Submissions (Idempotency)
Each report is generated with a client UUID (`crypto.randomUUID()`). The backend enforces a `UNIQUE` constraint on `client_id` with `INSERT ... ON CONFLICT (client_id) DO NOTHING`. If a retry occurs under unstable network conditions, the existing record is returned safely with `HTTP 200 OK`.

### Concurrency & Conflict Handling (Optimistic Locking)
Coordinator updates send the record `version` counter:
```sql
UPDATE reports SET status = $1, version = version + 1 WHERE id = $2 AND version = $3 RETURNING *;
```
If two coordinators act on the same report simultaneously, the second receives `409 VERSION_CONFLICT` and the UI automatically reloads the freshest data.
