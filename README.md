# Offline Field Issue Tracker

A field reporting tool for infrastructure workers. Create, submit, and manage issue reports — even without internet access. Reports are saved on your device first and automatically sent to the server when you reconnect.

**Project:** WEDER Strategies Operations Platform  
**Author:** Abdurehman Kero

---

## What it does

- **Field workers** report problems they find on site (broken water points, equipment damage, safety hazards, etc.)
- **Coordinators** review, assign, and resolve those reports
- **Works offline** — reports are saved locally and sync automatically when internet is restored

---

## Quick Start

### Requirements
- Node.js 18+
- PostgreSQL database

### 1. Install dependencies

```bash
# From the project root
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure the server

Copy the example env file and fill in your database details:

```bash
cd server
cp .env.example .env
```

Open `server/.env` and set:
```
DATABASE_URL=postgresql://user:password@localhost:5432/your_db
PORT=4000
```

### 3. Start the app

Open two terminals:

**Terminal 1 — Server:**
```bash
cd server
npm run dev
```

**Terminal 2 — Client:**
```bash
cd client
npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## How to use

### First time? Click the "Help" button in the top-right of the navbar.

It explains everything from scratch with simple steps.

### Roles

| Role | Can do |
|------|--------|
| **Field Worker** | Create and submit reports |
| **Coordinator** | Review, assign, and update report status |

To switch role, click the **"Role: ..."** button in the top-right of the navbar. It has a ⇄ arrow icon to make it obvious.

### Creating a report

1. Make sure your role is **Field Worker**
2. Click **"+ New Report"** in the top-right
3. Fill in the form (location, category, priority, description)
4. Click **"Submit Report"**

If you're offline, the report saves to your device and syncs later automatically.

### Offline mode

When your internet is disconnected:
- The top banner turns red and says "Network disconnected"
- The status pill in the navbar shows **"Offline"**
- You can still create reports — they are saved on your device

When you reconnect:
- The app detects it within ~5 seconds
- All pending reports are automatically uploaded
- The Outbox badge clears once sync is complete

### The Outbox

The **Outbox** tab shows reports waiting to be sent to the server. The red badge number tells you how many are pending.

You can also click **"Sync Outbox Now"** to force an immediate upload.

---

## Project structure

```
offline-field-issue-tracker/
├── client/                   # React frontend (Vite)
│   └── src/
│       ├── components/       # Header, ReportCard, HelpModal, etc.
│       ├── pages/            # ReportList, ReportForm, ReportDetails, SyncPage
│       ├── hooks/            # useReports, useOnlineStatus, useRole
│       ├── db/               # localDb.ts — IndexedDB access
│       ├── sync/             # syncEngine.ts — background sync logic
│       └── shared/           # Types, constants, validation
├── server/                   # Node.js + Express backend
│   └── src/
│       ├── routes/           # API routes (reports, status changes)
│       ├── services/         # Business logic
│       ├── db/               # PostgreSQL pool + migrations
│       └── validation.js     # Zod schemas for incoming data
├── docs/                     # SRS, system design, QA checklist
└── README.md
```

---

## Architecture overview

```
Browser (client)
├── IndexedDB (local storage — always available)
├── Sync Engine — runs every 15s, skips when offline
└── Connectivity Probe — pings Google every 5s to detect true online state

Server (Node.js + Express)
└── PostgreSQL — source of truth for all synced reports
```

**Key principle:** The client is "local-first". All writes go to IndexedDB immediately, then sync to the server in the background. This ensures the app always works, even with no network.

---

## Available npm scripts

From the root:

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start both client and server together |
| `npm run build` | Build the client for production |

From `server/`:

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start the API server with hot reload |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed the database with sample data |

---

## Common issues

**Reports not showing after refresh while offline?**  
The app loads data from IndexedDB — it should appear within 1–2 seconds. If not, check that IndexedDB is not blocked in your browser settings.

**Outbox stuck at "0 Pending" but report not on server?**  
Reconnect your internet and wait 5 seconds. The app will auto-sync. You can also click "Sync Outbox Now" in the Outbox tab.

**Role button doesn't change anything?**  
Some actions (like creating reports) are only for Field Workers. Some (like changing status) are only for Coordinators. Make sure you're on the right role for what you're trying to do.
