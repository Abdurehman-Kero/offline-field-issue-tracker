# System Design Document: Offline Field Issue Tracker
**Author:** Abdurehman Kero  
**Submission For:** WEDER Strategies Internship Assessment

---

## 1. High-Level Architecture Overview

The system implements a **Local-First Architecture** with asynchronous background synchronization:

```
[ Field Worker UI (React 18) ]
             ▲
             │ (Sync & Immediate Read/Write)
             ▼
    [ IndexedDB Layer ]
    • reports store (keyed by clientId)
    • history store
             ▲
             │ (Background Sync Engine: retry, backoff, lock)
             ▼
      [ HTTP / JSON API ]  (Header: X-Role: field_worker | coordinator)
             ▲
             │ (Express 4 + Helmet + CORS + Zod Validation)
             ▼
   [ PostgreSQL 15 Database ]
   • reports table (UNIQUE client_id constraint)
   • report_history table (append-only audit log)
```

---

## 2. Synchronization Protocol & Idempotency

### A. Device UUID Generation
When a worker creates a report, the browser generates a random UUID (`crypto.randomUUID()`) as `clientId`. This identifier travels with the report permanently.

### B. Outbox States & Lifecycle
A report transitions through five explicit sync states:
1. `local_only`: Saved on device as a Draft. Never sent to the server.
2. `pending`: Marked as Submitted by worker; queued in the device outbox.
3. `syncing`: Acquired by the active sync loop; currently uploading.
4. `synced`: Server acknowledged receipt with HTTP 201 or 200; local state updated with `serverId` and server `version`.
5. `failed`: Exceeded maximum retry attempts (5 attempts) or received HTTP 400 validation rejection; requires user review and manual retry.

### C. Preventing Duplicate Submissions
Under flaky networks, a client might upload a payload, the server commits it, but the cellular tower drops before the HTTP response reaches the phone.
The client subsequently retries the exact same payload.

To guarantee zero duplicate records:
1. `reports.client_id` is defined with a `UNIQUE` constraint.
2. Insertion is performed with:
   ```sql
   INSERT INTO reports (...) VALUES (...)
   ON CONFLICT (client_id) DO NOTHING
   RETURNING *;
   ```
3. If a row is returned, the record was freshly inserted (`HTTP 201 Created`).
4. If no row is returned, the server queries the existing row by `client_id` and responds with `HTTP 200 OK`.
5. Result: **First version wins**. Retries are entirely safe and idempotent.

### D. Exponential Backoff Schedule
If an upload attempt encounters network timeout, DNS failure, or HTTP 5xx:
- Attempt 1: wait 5 seconds
- Attempt 2: wait 15 seconds
- Attempt 3: wait 60 seconds
- Attempt 4: wait 2 minutes
- Attempt 5: wait 5 minutes
- Beyond attempt 5: transition to `failed` state with user notification.

### E. App Start Interruption Recovery
If the user terminates the browser or phone while an item is in `syncing`, on the subsequent app launch, `resetInterruptedSyncs()` safely reverts all `syncing` items back to `pending`.

---

## 3. Concurrency & Conflict Handling

### Optimistic Locking on Server
Coordinator edits and status changes require sending the known record `version` counter:
```sql
UPDATE reports
SET status = $1, assigned_to = $2, version = version + 1, updated_at = now()
WHERE id = $3 AND version = $4
RETURNING *;
```
If two coordinators act on the same report simultaneously:
1. First coordinator succeeds and updates `version` from `1` to `2`.
2. Second coordinator sends `version = 1`, resulting in zero affected rows.
3. Server detects the discrepancy and throws `HTTP 409 VERSION_CONFLICT`.
4. Client UI traps the 409 error, informs the coordinator, and automatically reloads the freshest database state.

---

## 4. Possible Duplicate Detection Algorithm
When a report is received, the server checks whether an active (non-Rejected) issue with identical characteristics was logged recently:
```sql
SELECT id FROM reports
WHERE id != $1
  AND category = $2
  AND lower(trim(location_text)) = lower(trim($3))
  AND status != 'Rejected'
  AND reported_at >= ($4::timestamptz - interval '24 hours')
  AND reported_at <= ($4::timestamptz + interval '24 hours')
ORDER BY reported_at ASC
LIMIT 1;
```
If a matching record exists:
- Sets `possible_duplicate_of = match.id`
- Appends `DUPLICATE_FLAGGED` event to audit history
- Displays an amber advisory banner on the coordinator interface without blocking ticket progress.
