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
import {
  X,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  User,
  FileText,
  Tag,
  ArrowRight,
  Info,
  Send,
} from 'lucide-react';

interface ReportDetailsProps {
  isOpen: boolean;
  clientId: string | null;
  onClose: () => void;
  onEditDraft: (clientId: string) => void;
}

function formatSafeDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'Not recorded';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Not recorded';
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Not recorded';
  }
}

// ── Small helper: a labeled field block ──────────────────────────────────────
function Field({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

export function ReportDetails({ isOpen, clientId, onClose, onEditDraft }: ReportDetailsProps) {
  const { role } = useRole();
  const [report, setReport] = useState<ReportItem | null>(null);
  const [history, setHistory] = useState<ReportAuditEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Status transition state
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<string>('');
  const [assignedToInput, setAssignedToInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [transitionSuccess, setTransitionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    setActionError(null);
    try {
      const localReport = await getLocalReportByClientId(clientId);
      setReport(localReport);
      if (localReport) {
        const localHist = await getLocalHistory(localReport.id || localReport.clientId);
        setHistory(localHist);
        if (localReport.id) {
          try {
            const remote = await apiClient.get(`/api/reports/${localReport.id}/history`);
            if (remote && Array.isArray(remote.items)) {
              setHistory(remote.items);
              await saveLocalHistory(remote.items);
            }
          } catch {
            // fall back to local history when offline
          }
        }
      }
    } catch {
      setActionError('Failed to load report details.');
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
      setConfirmDelete(false);
      setTransitionSuccess(null);
    }
  }, [isOpen, clientId]);

  if (!isOpen || !clientId) return null;

  const allowedTransitions = report ? getAllowedTransitions(report.status, role) : [];
  const currentTransitionRule = allowedTransitions.find((t) => t.to === selectedTargetStatus);
  const headline = report?.title || report?.locationText || `${report?.category} Report`;
  const formattedDate = formatSafeDateTime(report?.reportedAt || report?.createdAt);
  const isDraft = report?.status === 'Draft';
  const isCoordinator = role === 'coordinator';

  const handleApplyStatusTransition = async () => {
    if (!report || !selectedTargetStatus) return;
    const payload = { assignedTo: assignedToInput.trim(), note: noteInput.trim() };
    const check = canTransition(report.status, selectedTargetStatus, role, payload);
    if (!check.ok) { setActionError(check.message); return; }

    setActionError(null);
    setIsUpdatingStatus(true);
    try {
      const reportId = report.id || report.clientId;
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

      const updatedReport: ReportItem = {
        ...report,
        status: selectedTargetStatus as any,
        assignedTo: payload.assignedTo || report.assignedTo,
        syncState: 'pending',
        updatedAt: new Date().toISOString(),
      };
      await saveLocalReport(updatedReport);
      setReport(updatedReport);

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

      processOutbox();
      setTransitionSuccess(`Status updated to "${selectedTargetStatus}" successfully.`);
      setSelectedTargetStatus('');
      setAssignedToInput('');
      setNoteInput('');
      window.dispatchEvent(new CustomEvent('sync_updated'));
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;
    await deleteLocalReport(report.clientId);
    window.dispatchEvent(new CustomEvent('sync_updated'));
    onClose();
  };

  // ─── Status color helper ─────────────────────────────────────────────────
  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
    Draft:       { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
    Submitted:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    Assigned:    { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
    'In Progress': { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
    Resolved:    { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
    Rejected:    { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  };
  const sc = statusColors[report?.status || 'Draft'] || statusColors.Draft;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
          <div style={{ flex: 1, paddingRight: '12px' }}>
            {/* Status pill row */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
              {report && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                  {report.status}
                </span>
              )}
              <Badge type="sync" value={report?.syncState || 'local_only'} />
              <Badge type="priority" value={report?.priority || 'Medium'} />
              {report?.assignedTo && (
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #DCFCE7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <User size={10} />
                  {report.assignedTo}
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
              {loading ? '—' : headline}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '6px', flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────────── */}
        <div className="modal-body">

          {/* Alert banners */}
          {transitionSuccess && (
            <div style={{ backgroundColor: '#F0FDF4', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #DCFCE7' }}>
              <CheckCircle size={15} />
              <span>{transitionSuccess}</span>
            </div>
          )}
          {actionError && (
            <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #FECACA' }}>
              <AlertTriangle size={15} />
              <span>{actionError}</span>
            </div>
          )}
          {report?.syncState === 'pending' && !transitionSuccess && (
            <div style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #BFDBFE' }}>
              <Info size={15} />
              <span>This report is saved locally and will sync to the server automatically when online.</span>
            </div>
          )}

          {loading ? (
            <div className="empty-state"><p>Loading report details...</p></div>
          ) : !report ? (
            <div className="empty-state"><p>Report not found on this device.</p></div>
          ) : (
            <>
              {/* ── METADATA GRID ─────────────────────────────────────────── */}
              <div style={{ backgroundColor: '#F8F9FA', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #EAECEF' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                  <Field label="Category" icon={<Tag size={10} />} value={report.category} />
                  <Field label="Location" icon={<MapPin size={10} />} value={report.locationText || report.title} />
                  <Field label="Reported" icon={<Clock size={10} />} value={formattedDate} />
                  {report.reporterName && <Field label="Reporter" icon={<User size={10} />} value={report.reporterName} />}
                  {report.latitude != null && report.longitude != null && (
                    <Field
                      label="GPS Coordinates"
                      icon={<MapPin size={10} />}
                      value={`${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`}
                    />
                  )}
                </div>
              </div>

              {/* ── DESCRIPTION ───────────────────────────────────────────── */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <FileText size={14} color="var(--muted)" />
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Description
                  </h4>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0, padding: '12px 14px', backgroundColor: '#FFFFFF', border: '1px solid #EAECEF', borderRadius: '8px' }}>
                  {report.description || <em style={{ color: 'var(--muted)' }}>No description provided.</em>}
                </p>
              </div>

              {/* ── WORKFLOW SECTION ──────────────────────────────────────── */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Send size={14} color="var(--muted)" />
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Workflow
                    </h4>
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', backgroundColor: isCoordinator ? '#EFF6FF' : '#F9FAFB', color: isCoordinator ? '#1D4ED8' : '#6B7280', border: `1px solid ${isCoordinator ? '#BFDBFE' : '#E5E7EB'}`, fontWeight: 600 }}>
                    {isCoordinator ? '🔑 Coordinator' : '👷 Field Worker'}
                  </span>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                  {allowedTransitions.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                      {report.status === 'Resolved'
                        ? '✅ This report has been resolved. No further actions needed.'
                        : report.status === 'Rejected'
                        ? '🚫 This report has been rejected and is now closed.'
                        : !isCoordinator
                        ? '💡 Only coordinators can update the workflow status. Switch your role in the header to triage this report.'
                        : 'No further transitions are available from this status.'}
                    </p>
                  ) : (
                    <div>
                      {/* Transition buttons */}
                      <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px', marginTop: 0 }}>
                        Select the next status to transition this report to:
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: selectedTargetStatus ? '14px' : 0 }}>
                        {allowedTransitions.map((t) => {
                          const active = selectedTargetStatus === t.to;
                          return (
                            <button
                              key={t.to}
                              type="button"
                              onClick={() => setSelectedTargetStatus(active ? '' : t.to)}
                              style={{
                                padding: '7px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '7px',
                                border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                                backgroundColor: active ? 'var(--primary-light)' : '#F9FAFB',
                                color: active ? 'var(--primary)' : 'var(--text)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 100ms ease',
                              }}
                            >
                              {active && <CheckCircle size={12} />}
                              <ArrowRight size={11} />
                              {t.to}
                            </button>
                          );
                        })}
                      </div>

                      {/* Expanded action form */}
                      {selectedTargetStatus && currentTransitionRule && (
                        <div style={{ paddingTop: '14px', borderTop: '1px solid #EDF2F7' }}>
                          {currentTransitionRule.needs.includes('assignedTo') && (
                            <div className="form-group" style={{ marginBottom: '10px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600 }}>Assign To *</label>
                              <input
                                type="text"
                                placeholder="Enter the name of the person to assign this to…"
                                value={assignedToInput}
                                onChange={(e) => setAssignedToInput(e.target.value)}
                                style={{ marginTop: '4px' }}
                              />
                            </div>
                          )}
                          {currentTransitionRule.needs.includes('note') && (
                            <div className="form-group" style={{ marginBottom: '10px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600 }}>Note / Reason *</label>
                              <textarea
                                rows={2}
                                placeholder="Add a justification, resolution note, or reason for rejection…"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                style={{ marginTop: '4px', resize: 'vertical' }}
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleApplyStatusTransition}
                            disabled={isUpdatingStatus}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                          >
                            <CheckCircle size={14} />
                            <span>
                              {isUpdatingStatus ? 'Updating…' : `Confirm → ${selectedTargetStatus}`}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── AUDIT HISTORY ─────────────────────────────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Clock size={14} color="var(--muted)" />
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Audit History
                  </h4>
                  {history.length > 0 && (
                    <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '10px', backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: 600 }}>
                      {history.length}
                    </span>
                  )}
                </div>
                <HistoryTimeline entries={history} />
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          {/* Delete confirmation inline */}
          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
              <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 500, flex: 1 }}>
                Delete this draft permanently?
              </span>
              <button type="button" onClick={() => setConfirmDelete(false)}
                style={{ background: 'transparent', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', fontWeight: 500 }}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete}
                style={{ background: 'var(--danger)', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
                Yes, Delete
              </button>
            </div>
          ) : (
            <>
              {isDraft && (
                <>
                  <button
                    type="button"
                    onClick={() => onEditDraft(report!.clientId)}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit2 size={13} />
                    Edit Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{ background: 'none', border: '1px solid #FECACA', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', color: 'var(--danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 20px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', fontWeight: 600 }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
