# Manual QA Verification Checklist
**Offline Field Issue Tracker**  
**Author:** Abdurehman Kero

---

| # | Test Scenario | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| **1** | **Offline Draft Creation** | 1. Click "Simulate Offline" in header (or set DevTools Network to Offline).<br>2. Fill in form and click "Save as Draft".<br>3. Refresh the browser page. | Report card appears with "Draft" and "Local only" badges. Data persists across page reload. | PASS |
| **2** | **Edit & Delete Draft** | 1. Open saved Draft.<br>2. Click "Edit Draft", change description, save.<br>3. Click "Delete Draft" and confirm. | Edits save properly. Deletion removes the draft from IndexedDB cleanly. | PASS |
| **3** | **Offline Queueing to Outbox** | 1. In offline mode, create report and click "Submit Report".<br>2. Navigate to "Outbox & Sync" tab. | Sync badge shows "Pending". Outbox counter displays 1 pending item. | PASS |
| **4** | **Automatic Reconnect & Sync** | 1. With report pending in Outbox, click "End Offline Sim" (or toggle browser back Online).<br>2. Watch the outbox. | Background sync engine detects connectivity, uploads report to `/api/reports`, receives 201 Created, updates status to "Synced", and marks history events sent. | PASS |
| **5** | **Zero Duplicate on Retry** | 1. Send an identical `POST /api/reports` payload with the same `clientId`. | Server responds with 200 OK (idempotent match) returning the original row without creating a duplicate record in PostgreSQL. | PASS |
| **6** | **Validation Boundary Rules** | 1. Attempt submitting with description < 10 characters or location < 3 chars.<br>2. Provide latitude without longitude. | Inline red error messages appear below the inputs. Focus shifts to the first invalid field. Form blocks submission. | PASS |
| **7** | **Role Permission Checks** | 1. As Field Worker, try changing a report status to Assigned or In Progress.<br>2. Switch to Coordinator. | Field worker cannot trigger server status transitions (hidden in UI, and API returns 403 Forbidden). Coordinator sees permitted transitions. | PASS |
| **8** | **Status Workflow Constraints** | 1. As Coordinator, attempt transitioning "Submitted" directly to "Resolved".<br>2. Transition "Submitted" to "Assigned" without assignee name. | UI disallows illegal transitions. Transitioning to Assigned requires non-empty assignee name; API returns 422 if invalid. | PASS |
| **9** | **Optimistic Concurrency (409 Conflict)** | 1. Open the same report in two tabs.<br>2. In tab A, transition status to "In Progress".<br>3. In tab B (still showing old version), attempt transition to "Resolved". | Tab B receives 409 VERSION_CONFLICT. Banner displays warning: "Conflict: report was modified by another user. Reloading latest data...", and refreshes. | PASS |
| **10** | **Possible Duplicate Flagging** | 1. Submit a report with Category: "Water Point", Location: "Kebele 02 Central Square".<br>2. Submit a second report within 24 hours with Category: "Water Point", Location: "kebele 02 central square". | Second report receives `possibleDuplicateOf` reference and displays an amber advisory banner: "Possible Duplicate Detected". | PASS |
| **11** | **Audit Trail Logging** | 1. View report details and scroll to "Audit History & Activity". | Vertical timeline displays chronological entries: CREATED, SUBMITTED, SYNCED, STATUS_CHANGED, with actor roles and notes. | PASS |
| **12** | **Service Worker Offline Cache** | 1. Run `npm run build && npm run preview`.<br>2. Turn off network in DevTools.<br>3. Hard refresh (Ctrl+F5). | App shell, CSS styles, and IndexedDB data render seamlessly offline. | PASS |
