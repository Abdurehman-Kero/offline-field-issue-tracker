import React, { useState, useEffect } from 'react';
import { ReportItem, ReportAuditEntry } from '../shared/types';
import {
  getLocalReportByClientId,
  saveLocalReport,
  getLocalHistory,
  saveLocalHistory,
  deleteLocalReport,
  enqueueMutation,
} from '../db/localDb';
import { getAllowedTransitions, canTransition } from '../shared/workflow';
import { useRole } from '../hooks/useRole';
import { apiClient } from '../api/client';
import { processOutbox } from '../sync/syncEngine';
import { Badge } from '../components/Badge';
import { HistoryTimeline } from '../components/HistoryTimeline';
import { X, MapPin, Clock, Edit2, Trash2, CheckCircle, AlertTriangle, User } from 'lucide-react';

interface ReportDetailsProps {
  isOpen: boolean;
  clientId: string | null;
  onClose: () => void;
  onEditDraft: (clientId: string) => void;
}

function formatSafeDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export function ReportDetails({ isOpen, clientId, onClose, onEditDraft }: ReportDetailsProps) {
  const { role } = useRole();
  const [report, setReport] = useState<ReportItem | null>(null);
  const [history, setHistory] = useState<ReportAuditEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // Status transition state
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<string>('');
  const [assignedToInput, setAssignedToInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    setActionError(null);

    try {
      const localReport = await getLocalReportByClientId(clientId);
      setReport(localReport);

      if (localReport) {
        // Load local history
        const localHist = await getLocalHistory(localReport.id || localReport.clientId);
        setHistory(localHist);

        // Try to fetch remote history if report is synced and has a server ID
        if (localReport.id) {
          try {
            const remote = await apiClient.get(`/api/reports/${localReport.id}/history`);
            if (remote && Array.isArray(remote.items)) {
              setHistory(remote.items);
              await saveLocalHistory(remote.items);
            }
          } catch {
            // Silently fallback to cached history when offline
          }
        }
      }
    } catch {
      setActionError('Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && clientId) {
      loadData();
      setSelectedTargetStatus('');
      setAssignedToInput('');
      setNoteInput('');
    }
  }, [isOpen, clientId]);

  if (!isOpen || !clientId) return null;

  const allowedTransitions = report ? getAllowedTransitions(report.status, role) : [];

  const handleApplyStatusTransition = async () => {
    if (!report || !selectedTargetStatus) return;

    const payload = {
      assignedTo: assignedToInput.trim(),
      note: noteInput.trim(),
    };

    const check = canTransition(report.status, selectedTargetStatus, role, payload);
    if (!check.ok) {
      setActionError(check.message);
      return;
    }

    setActionError(null);
    setIsUpdatingStatus(true);

    try {
      // Use the server UUID if available; fall back to clientId — the server supports both for lookup.
      const reportId = report.id || report.clientId;

      // Enqueue status change mutation
      await enqueueMutation({
        id: crypto.randomUUID(),
        clientId: report.clientId,
        type: 'STATUS_CHANGE',
        payload: {
          reportId,
          toStatus: selectedTargetStatus,
          status: selectedTargetStatus,
          assignedTo: payload.assignedTo || undefined,
          note: payload.note || undefined,
        },
        createdAt: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
        status: 'pending',
      });

      // Update local report status immediately (optimistic update)
      const updatedReport: ReportItem = {
        ...report,
        status: selectedTargetStatus as any,
        assignedTo: payload.assignedTo || report.assignedTo,
        syncState: 'pending',
        updatedAt: new Date().toISOString(),
      };
      await saveLocalReport(updatedReport);
      setReport(updatedReport);

      // Record optimistic local audit history
      const auditEntry: ReportAuditEntry = {
        id: crypto.randomUUID(),
        reportId: report.id || report.clientId,
        action: 'STATUS_CHANGE',
        fromStatus: report.status,
        toStatus: selectedTargetStatus,
        actorRole: role,
        actorName: role === 'coordinator' ? 'Coordinator' : 'Field Worker',
        comment: payload.note || null,
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [auditEntry, ...history];
      setHistory(updatedHistory);
      await saveLocalHistory(updatedHistory);

      // Trigger sync
      processOutbox();

      setSelectedTargetStatus('');
      setAssignedToInput('');
      setNoteInput('');
      window.dispatchEvent(new CustomEvent('sync_updated'));
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;
    if (confirm('Are you sure you want to remove this report from this device?')) {
      await deleteLocalReport(report.clientId);
      window.dispatchEvent(new CustomEvent('sync_updated'));
      onClose();
    }
  };

  const currentTransitionRule = allowedTransitions.find((t) => t.to === selectedTargetStatus);
  const headline = report?.title || report?.locationText || `${report?.category} Report`;
  const rawDate = report?.reportedAt || report?.createdAt || report?.updatedAt;
  const formattedDate = formatSafeDateTime(rawDate);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1, paddingRight: '12px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
              <Badge type="sync" value={report?.syncState || 'local_only'} />
              <Badge type="status" value={report?.status || 'Draft'} />
              <Badge type="priority" value={report?.priority || 'Medium'} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              {headline}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {actionError && (
            <div
              style={{
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={15} />
              <span>{actionError}</span>
            </div>
          )}
          
          {report?.syncState === 'pending' && (
            <div
              style={{
                backgroundColor: '#E3EEF6',
                color: '#1F5F8B',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Could not reach the server. Your report is saved and will be sent later.</span>
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              <p>Loading report details...</p>
            </div>
          ) : !report ? (
            <div className="empty-state">
              <p>Report not found.</p>
            </div>
          ) : (
            <div>
              {/* Meta details grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '8px',
                  backgroundColor: '#F8F9FA',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '14px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--muted)' }}>Category: </span>
                  <strong>{report.category}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Location: </span>
                  <strong>{report.locationText || report.title || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Reported: </span>
                  <span>{formattedDate}</span>
                </div>
                {report.reporterName && (
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Reporter: </span>
                    <span>{report.reporterName}</span>
                  </div>
                )}
                {report.assignedTo && (
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Assigned: </span>
                    <strong style={{ color: 'var(--primary)' }}>{report.assignedTo}</strong>
                  </div>
                )}
                {report.latitude != null && report.longitude != null && (
                  <div>
                    <span style={{ color: 'var(--muted)' }}>GPS: </span>
                    <span>
                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                  Description
                </h4>
                <p style={{ fontSize: '13px', color: '#2D3748', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {report.description}
                </p>
              </div>

              {/* Workflow Actions Section (Coordinator or Field Worker) */}
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '16px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                    Workflow Action
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Active Role: <strong>{role === 'coordinator' ? 'Coordinator' : 'Field Worker'}</strong>
                  </span>
                </div>

                {allowedTransitions.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                    {report.status === 'Rejected'
                      ? 'This report has been rejected and cannot be transitioned further.'
                      : role !== 'coordinator'
                      ? 'Field workers cannot alter assigned review workflow status. Switch to Coordinator in header to triage or update.'
                      : 'No further status transitions available for this state.'}
                  </p>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {allowedTransitions.map((t) => (
                        <button
                          key={t.to}
                          type="button"
                          onClick={() => setSelectedTargetStatus(t.to)}
                          className={selectedTargetStatus === t.to ? 'btn-primary' : 'btn-secondary'}
                          style={{ minHeight: '30px', fontSize: '12px' }}
                        >
                          Advance to {t.to}
                        </button>
                      ))}
                    </div>

                    {selectedTargetStatus && currentTransitionRule && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #EDF2F7' }}>
                        {currentTransitionRule.needs.includes('assignedTo') && (
                          <div className="form-group">
                            <label>Assignee Name *</label>
                            <input
                              type="text"
                              placeholder="e.g., Sarah Chen (Electrical Lead)"
                              value={assignedToInput}
                              onChange={(e) => setAssignedToInput(e.target.value)}
                            />
                          </div>
                        )}

                        {currentTransitionRule.needs.includes('note') && (
                          <div className="form-group">
                            <label>Reviewer Note / Justification *</label>
                            <textarea
                              rows={2}
                              placeholder="State reason, corrective action taken, or blocking factor..."
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn-primary btn-full-mobile"
                          onClick={handleApplyStatusTransition}
                          disabled={isUpdatingStatus}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <CheckCircle size={14} />
                          <span>Confirm Transition to {selectedTargetStatus}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Audit History Timeline */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                  Audit History
                </h4>
                <HistoryTimeline entries={history} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {report?.status === 'Draft' && (
            <button
              type="button"
              className="btn-secondary btn-full-mobile"
              onClick={() => onEditDraft(report.clientId)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Edit2 size={13} />
              Edit Draft
            </button>
          )}

          {report?.status === 'Draft' && (
            <button
              type="button"
              className="btn-danger btn-full-mobile"
              onClick={handleDelete}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash2 size={13} />
              Delete Draft
            </button>
          )}

          <button type="button" className="btn-secondary btn-full-mobile" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
