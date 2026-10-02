# AI and Development Tool Disclosure Log
**Project:** Offline Field Issue Tracker  
**Developer:** Abdurehman Kero  
**Assessment:** WEDER Strategies Full Stack Developer Internship Technical Assessment

---

## 1. Tools Used
- **AI Pair Programming Assistant**: Google AI Studio Agent (Gemini 3.8 Flash model) used as an interactive pair programmer for code scaffolding, automated testing suites, and schema generation.
- **Node.js, Vite, Vitest, Supertest, Express, PostgreSQL / PGlite, idb, Zod**.

---

## 2. Process & Verification Methodology
In accordance with the assessment instructions, all generated code was verified step by step against the SRS requirements:
1. **Incremental Validation**: Every module (database migrations, workflow FSM, Zod validation, idempotent routes, IndexedDB storage, and sync engine) was written in isolated stages and checked via automated tests.
2. **Automated Test Coverage**: 32 test cases were created and executed with `vitest`, testing idempotent insertion retries, version conflict detection (HTTP 409), status workflow transitions (HTTP 422), role permissions (HTTP 403), and exponential backoff calculations.
3. **Manual QA**: The full 12-point QA checklist was tested in the browser, verifying offline draft persistence, simulated network drops, duplicate detection flags, and outbox reconciliation.

---

## 3. Step-by-Step AI Collaboration Log

| Step | Topic | AI Contribution | Developer Review & Adjustments |
|---|---|---|---|
| **Step 1** | **Repository Basics & Structure** | Provided folder layout, `.gitignore`, and root package scripts. | Ensured `.env` and `.data` are strictly excluded from git tracking. |
| **Step 2** | **Server Scaffold & Middleware** | Generated Express app skeleton with Helmet, CORS, and error handling. | Configured Helmet CSP settings to allow Vite development and iframe previewing. |
| **Step 3** | **Database Schema & Migrations** | Generated PostgreSQL DDL with `UNIQUE(client_id)` and check constraints. | Added hybrid database pool adapter supporting both PostgreSQL and in-memory PGlite for self-contained runtime testing. |
| **Step 4** | **Workflow State Machine** | Generated `workflow.js` finite state machine rules. | Enforced strict check ensuring Rejected status is terminal and cannot transition. |
| **Step 5** | **Zod Input Validation** | Created input validation schemas for reports and status updates. | Added coordinate constraint rule requiring both latitude and longitude or neither. |
| **Step 6** | **Idempotent Create Endpoint** | Generated `INSERT ... ON CONFLICT (client_id) DO NOTHING` logic. | Tested duplicate payload replay to confirm HTTP 200 return code and zero data loss. |
| **Step 7** | **List, Detail, & History APIs** | Built query filtering, pagination, and history endpoints. | Enforced parameterization on all dynamic filters to prevent SQL injection. |
| **Step 8** | **Optimistic Concurrency & Edits** | Built status update and details edit endpoints with version checks. | Verified 409 Conflict return when modifying stale version records. |
| **Step 9** | **Database Seeding** | Generated 12 diverse infrastructure reports across all categories and statuses. | Added a deliberate 24-hour location match to test duplicate detection flagging. |
| **Step 10** | **Client Theme & UI Scaffold** | Generated CSS variable design tokens and header components. | Enforced flat aesthetic with zero gradients, clear badges, and 44px touch targets. |
| **Step 11** | **IndexedDB Local Storage Layer** | Created `idb` repository for reports and audit events. | Added draft deletion and local draft modification guards. |
| **Step 12** | **Report Feed & Detail Views** | Created responsive ReportCard, ReportList, and ReportDetails components. | Added "Use Current Coordinates" GPS geolocation button with error handling. |
| **Step 13** | **Sync Engine & Backoff** | Implemented sync queue, backoff delays (5s, 15s, 60s, 2m, 5m), and retry limits. | Added single-flight mutex lock to guarantee no parallel sync loops execute simultaneously. |
| **Step 14** | **Coordinator Actions & 409 Handling** | Created interactive status transition modals and edit panels. | Added automatic reload upon receiving 409 Conflict from the server. |
| **Step 15** | **Offline Simulation & Polish** | Added simulated offline toggle in header for rapid manual QA. | Confirmed all touch targets exceed 44px and focus rings meet accessibility standards. |
| **Step 16** | **Documentation** | Scaffolding documentation, SRS, System Design, and QA checklist. | Authored complete review sections, assumptions, limitations, and time breakdown. |

---

## 4. Code Rejected or Heavily Modified
- **Overly complex ORM proposals**: Rejected proposals for heavy ORMs (such as Prisma or TypeORM) in favor of the required clean, parameterized raw SQL queries.
- **Third-party UI libraries**: Kept the styling 100% plain CSS with custom CSS variables, eliminating heavy dependencies like Tailwind or component libraries as requested in Section 3.
- **Client-only status validation**: Kept validation strictly duplicate on both the client (for instant UI feedback) and server (for security enforcement).
