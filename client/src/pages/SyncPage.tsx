import React, { useState, useEffect } from 'react';
import { getQueueItems, getAllLocalReports, dequeueMutation } from '../db/localDb';
import { processOutbox, refreshServerCache } from '../sync/syncEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { MutationQueueItem, ReportItem } from '../shared/types';
import {
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Wifi,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface SyncPageProps {
  onSelectReport: (clientId: string) => void;
}

export function SyncPage({ onSelectReport }: SyncPageProps) {
  const { isOnline } = useOnlineStatus();
  const [queue, setQueue] = useState<MutationQueueItem[]>([]);
  const [reportsMap, setReportsMap] = useState<Map<string, ReportItem>>(new Map());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const loadQueue = async () => {
    try {
      const items = await getQueueItems();
      setQueue(items);

      const reports = await getAllLocalReports();
      setReportsMap(new Map(reports.map((r) => [r.clientId, r])));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadQueue();
    const handleUpdate = () => loadQueue();
    window.addEventListener('sync_updated', handleUpdate);
    return () => window.removeEventListener('sync_updated', handleUpdate);
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await processOutbox({ forceImmediate: true });
      await refreshServerCache();
      await loadQueue();

      if (result.errors === 0 && result.processed > 0) {
        setSyncFeedback({
          type: 'success',
          message: `Successfully synchronized ${result.processed} item${result.processed > 1 ? 's' : ''} to the server.`,
        });
      } else if (result.errors > 0) {
        setSyncFeedback({
          type: 'warning',
          message: `Synced ${result.processed} item${result.processed === 1 ? '' : 's'}, but ${result.errors} item${result.errors > 1 ? 's' : ''} encountered issues. Check details below.`,
        });
      } else if (result.total === 0) {
        setSyncFeedback({
          type: 'success',
          message: 'All local changes are already fully up to date.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Synchronization failed. Please check network connectivity.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscardItem = async (itemId: string) => {
    if (confirm('Discard this queued change? The local copy will remain as last saved.')) {
      await dequeueMutation(itemId);
      await loadQueue();
      window.dispatchEvent(new CustomEvent('sync_updated'));
    }
  };

  return (
    <div className="container" style={{ padding: '16px' }}>
      {/* Header Banner Card */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          marginBottom: '16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Synchronization Outbox
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: queue.length > 0 ? '#FEF3C7' : '#DEF7EC',
                  color: queue.length > 0 ? '#92400E' : '#03543F',
                }}
              >
                {queue.length} Pending
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
              Local-first changes stored in IndexedDB. Automatically uploaded with retry backoff.
            </p>
          </div>

          <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing || !isOnline}
              className="btn-primary btn-full-mobile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '38px',
              }}
            >
              <RotateCw size={15} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Synchronizing...' : 'Sync Outbox Now'}</span>
            </button>
        </div>

        {/* Feedback message banner if sync just completed */}
        {syncFeedback && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor:
                syncFeedback.type === 'success'
                  ? '#DEF7EC'
                  : syncFeedback.type === 'warning'
                  ? '#FEF3C7'
                  : '#FDE8E8',
              color:
                syncFeedback.type === 'success'
                  ? '#03543F'
                  : syncFeedback.type === 'warning'
                  ? '#92400E'
                  : '#9B1C1C',
              border: `1px solid ${
                syncFeedback.type === 'success'
                  ? '#BCF0DA'
                  : syncFeedback.type === 'warning'
                  ? '#FDE68A'
                  : '#FBD5D5'
              }`,
            }}
          >
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{syncFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div
          className="card empty-state"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '36px 16px',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={40} color="#057A55" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
            All changes synchronized
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '440px', margin: '0 auto' }}>
            Every offline submission, transition, and note on this device is committed to the central server.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {queue.map((item) => {
            const report = reportsMap.get(item.clientId);
            const headline =
              report?.title ||
              report?.locationText ||
              item.payload.locationText ||
              item.payload.title ||
              `${item.payload.category || 'Infrastructure'} Issue`;

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '16px',
                  marginBottom: 0,
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  borderLeft:
                    item.status === 'failed'
                      ? '4px solid var(--danger)'
                      : '4px solid var(--warning)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: item.type === 'CREATE' ? 'var(--primary)' : '#B45309',
                          letterSpacing: '0.4px',
                        }}
                      >
                        {item.type === 'CREATE' ? 'New Report' : 'Status Transition'}
                      </span>
                      {item.type === 'STATUS_CHANGE' && item.payload.toStatus && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          → {item.payload.toStatus}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', margin: '0 0 4px 0' }}>
                      {headline}
                    </h4>

                    {item.payload.description && (
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.payload.description}
                      </p>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: item.status === 'failed' ? '#FEE2E2' : '#FEF3C7',
                      color: item.status === 'failed' ? '#991B1B' : '#92400E',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.status === 'failed'
                      ? 'Max Retries Exceeded'
                      : item.retryCount > 0
                      ? `Retry #${item.retryCount}`
                      : 'Pending Sync'}
                  </span>
                </div>

                {item.lastError && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      backgroundColor: '#FEF2F2',
                      color: '#991B1B',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #FECACA',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span>Sync diagnostic: {item.lastError}</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid #F1F3F4',
                    fontSize: '12px',
                    color: 'var(--muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <Clock size={12} />
                    <span>Queued {new Date(item.createdAt).toLocaleTimeString()}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleDiscardItem(item.id)}
                      className="btn-sm"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                      }}
                      title="Discard this queue entry"
                    >
                      <Trash2 size={12} />
                      <span>Discard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectReport(item.clientId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>View Report</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
