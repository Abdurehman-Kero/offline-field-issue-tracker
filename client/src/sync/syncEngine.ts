import { apiClient } from '../api/client';
import {
  getAllLocalReports,
  saveLocalReport,
  getQueueItems,
  dequeueMutation,
  updateQueueItem,
} from '../db/localDb';
import { getNextAttemptDate, isMaxRetriesExceeded } from './retry';
import { ReportItem } from '../shared/types';

let syncInterval: any = null;
let isSyncing = false;

export interface ProcessOutboxOptions {
  forceImmediate?: boolean;
}

// Helper: returns the true network status tracked by useOnlineStatus probe.
function isAppOnline(): boolean {
  if (typeof window === 'undefined') return true;
  if (typeof (window as any).__appIsOnline === 'boolean') return (window as any).__appIsOnline;
  return navigator.onLine;
}

export async function processOutbox(
  options: ProcessOutboxOptions = {}
): Promise<{ processed: number; errors: number; total: number }> {
  // Don't attempt to sync while offline — items stay pending, no retry counter consumed
  if (!isAppOnline()) return { processed: 0, errors: 0, total: 0 };

  if (isSyncing) return { processed: 0, errors: 0, total: 0 };
  isSyncing = true;

  let processed = 0;
  let errors = 0;
  let total = 0;

  try {
    const queue = await getQueueItems();
    total = queue.length;
    const now = Date.now();

    for (const item of queue) {
      // forceImmediate retries everything including failed items.
      // Normal run skips items whose next retry window hasn't passed.
      const isReadyToRetry =
        options.forceImmediate ||
        (item.status !== 'failed' && item.nextRetryAt <= now);

      if (!isReadyToRetry) continue;

      try {
        if (item.type === 'CREATE') {
          // Normalize payload for server validation schema
          const payload = {
            clientId: item.payload.clientId || item.clientId,
            category: item.payload.category,
            locationText: item.payload.locationText || item.payload.title || 'Field Site',
            description: item.payload.description,
            priority: item.payload.priority || 'Medium',
            reporterName: item.payload.reporterName || 'Field Worker',
            reportedAt: item.payload.reportedAt || new Date().toISOString(),
            status: 'Submitted',
            latitude: item.payload.latitude != null ? Number(item.payload.latitude) : null,
            longitude: item.payload.longitude != null ? Number(item.payload.longitude) : null,
            history: [],
          };

          const res = await apiClient.post('/api/reports', payload, {
            headers: { 'X-Role': 'field_worker' },
          });

          await dequeueMutation(item.id);

          const local = (await getAllLocalReports()).find((r) => r.clientId === item.clientId);
          if (local) {
            await saveLocalReport({
              ...local,
              id: res.id,
              status: res.status,
              serverVersion: res.version || 1,
              syncState: 'synced',
              syncedAt: new Date().toISOString(),
              lastSyncError: null,
            });
          }
          processed++;
        } else if (item.type === 'STATUS_CHANGE') {
          let reportId = item.payload.reportId;
          const targetStatus = item.payload.toStatus || item.payload.status;

          // Resolve the actual server ID — if the stored UUID is unknown on the server,
          // fall back to looking up by clientId (the server supports both).
          let serverReport: Record<string, any> | null = null;
          try {
            serverReport = await apiClient.get(`/api/reports/${reportId}`, {
              headers: { 'X-Role': 'coordinator' },
            });
          } catch (lookupErr: any) {
            // If 404, try lookup by clientId
            if (lookupErr?.status === 404) {
              try {
                serverReport = await apiClient.get(`/api/reports/${item.clientId}`, {
                  headers: { 'X-Role': 'coordinator' },
                });
                if (serverReport?.id) {
                  reportId = serverReport.id;
                  // Persist corrected server id to local record
                  const locals = await getAllLocalReports();
                  const local = locals.find((r) => r.clientId === item.clientId);
                  if (local) {
                    await saveLocalReport({ ...local, id: serverReport.id, serverVersion: serverReport.version || 1 });
                  }
                }
              } catch {
                // If clientId lookup also 404s, the report truly doesn't exist on server yet.
                // Re-throw so the item stays pending and will retry.
                throw new Error(`Report not yet synced to server. It will retry automatically.`);
              }
            } else {
              throw lookupErr;
            }
          }

          const version = serverReport?.version || item.payload.version || 1;

          const statusPayload: Record<string, any> = {
            toStatus: targetStatus,
            version: Number(version),
          };
          if (item.payload.assignedTo) statusPayload.assignedTo = item.payload.assignedTo;
          if (item.payload.note) statusPayload.note = item.payload.note;

          const res = await apiClient.post(`/api/reports/${reportId}/status`, statusPayload, {
            headers: { 'X-Role': 'coordinator' },
          });

          await dequeueMutation(item.id);

          const local = (await getAllLocalReports()).find((r) => r.clientId === item.clientId);
          if (local) {
            await saveLocalReport({
              ...local,
              id: res.id || reportId,
              status: res.status,
              serverVersion: res.version || Number(version) + 1,
              assignedTo: res.assignedTo || local.assignedTo,
              syncState: 'synced',
              syncedAt: new Date().toISOString(),
              lastSyncError: null,
            });
          }
          processed++;
        }
      } catch (err: any) {
        errors++;
        const errorMessage = err?.message || 'Sync request failed';

        // Only permanently fail items for definitive server errors (4xx client errors).
        // Network errors (Failed to fetch, timeout, etc.) should NEVER permanently fail —
        // the item stays pending so it retries when connectivity is restored.
        const isServerError = typeof err?.status === 'number' && err.status >= 400 && err.status < 500;
        const newRetryCount = options.forceImmediate ? 0 : item.retryCount + 1;
        const permanentlyFailed = isServerError && !options.forceImmediate && isMaxRetriesExceeded(newRetryCount);
        const nextDate = getNextAttemptDate(newRetryCount);

        await updateQueueItem({
          ...item,
          retryCount: isServerError ? newRetryCount : item.retryCount, // don't increment on network errors
          nextRetryAt: options.forceImmediate ? Date.now() + 5000 : nextDate.getTime(),
          status: permanentlyFailed ? 'failed' : 'pending',
          lastError: errorMessage,
        });

        const local = (await getAllLocalReports()).find((r) => r.clientId === item.clientId);
        if (local) {
          await saveLocalReport({
            ...local,
            syncState: permanentlyFailed ? 'failed' : 'pending',
            lastSyncError: isServerError ? errorMessage : null,
          });
        }
      }
    }

    if (processed > 0 || errors > 0 || total > 0) {
      window.dispatchEvent(new CustomEvent('sync_updated'));
    }
  } catch (err) {
    console.error('Outbox execution error:', err);
  } finally {
    isSyncing = false;
  }

  return { processed, errors, total };
}

export async function refreshServerCache(): Promise<void> {
  try {
    const res = await apiClient.get('/api/reports', {
      headers: { 'X-Role': 'coordinator' },
    });

    if (res && Array.isArray(res.items)) {
      const localReports = await getAllLocalReports();
      const localMap = new Map(localReports.map((r) => [r.clientId, r]));

      for (const serverReport of res.items) {
        const existing = localMap.get(serverReport.clientId);

        // Never overwrite unsynced drafts or pending outbox items
        if (!existing || existing.syncState === 'synced') {
          const reportToSave: ReportItem = {
            id: serverReport.id,
            clientId: serverReport.clientId,
            title: serverReport.title || serverReport.locationText,
            locationText: serverReport.locationText,
            category: serverReport.category,
            priority: serverReport.priority,
            status: serverReport.status,
            description: serverReport.description,
            latitude: serverReport.latitude != null ? Number(serverReport.latitude) : null,
            longitude: serverReport.longitude != null ? Number(serverReport.longitude) : null,
            reporterName: serverReport.reporterName,
            assignedTo: serverReport.assignedTo,
            reportedAt: serverReport.reportedAt,
            receivedAt: serverReport.receivedAt,
            serverVersion: serverReport.version || 1,
            createdAt: serverReport.reportedAt || serverReport.createdAt || new Date().toISOString(),
            updatedAt: serverReport.updatedAt || new Date().toISOString(),
            syncState: 'synced',
            syncedAt: new Date().toISOString(),
            lastSyncError: null,
            possibleDuplicateOf: serverReport.possibleDuplicateOf,
          };
          await saveLocalReport(reportToSave);
        }
      }

      window.dispatchEvent(new CustomEvent('sync_updated'));
    }
  } catch (err) {
    console.warn('Background cache refresh unavailable (offline):', err);
  }
}

// Reset all failed queue items back to pending so they get retried when we come back online.
async function resetFailedItems(): Promise<void> {
  const queue = await getQueueItems();
  const failed = queue.filter((item) => item.status === 'failed');

  for (const item of failed) {
    await updateQueueItem({
      ...item,
      retryCount: 0,
      nextRetryAt: Date.now(),
      status: 'pending',
      lastError: undefined,
    });

    // Also clear the failed state on the local report record
    const local = (await getAllLocalReports()).find((r) => r.clientId === item.clientId);
    if (local) {
      await saveLocalReport({
        ...local,
        syncState: 'pending',
        lastSyncError: null,
      });
    }
  }

  if (failed.length > 0) {
    window.dispatchEvent(new CustomEvent('sync_updated'));
  }
}

export function startSyncEngine(intervalMs = 15000): void {
  if (syncInterval) return;

  // Initial outbox check on startup (will bail early if offline)
  processOutbox();

  // Poll periodically — processOutbox checks online status itself and skips when offline
  syncInterval = setInterval(() => {
    processOutbox();
  }, intervalMs);

  // When the real probe detects we are back online:
  // 1. Reset any stuck "failed" items back to pending so they are retried
  // 2. Force an immediate outbox flush
  // 3. Refresh the local cache from the server
  window.addEventListener('app_came_online', async () => {
    await resetFailedItems();
    await processOutbox({ forceImmediate: true });
    await refreshServerCache();
  });
}

export function stopSyncEngine(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
