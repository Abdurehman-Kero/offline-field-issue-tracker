import React from 'react';
import { ReportItem } from '../shared/types';
import { Badge } from './Badge';
import { MapPin, Clock, AlertTriangle, Pencil, Trash2 } from 'lucide-react';

interface ReportCardProps {
  report: ReportItem;
  onSelect: (clientId: string) => void;
  onEdit?: (clientId: string) => void;
  onDelete?: (clientId: string) => void;
}

function formatDate(report: ReportItem): string {
  const rawDate = report.reportedAt || report.createdAt || report.updatedAt || report.receivedAt;
  if (!rawDate) return 'Recently';

  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return 'Recently';

    // Format like: "Sep 30, 10:00 AM"
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export function ReportCard({ report, onSelect, onEdit, onDelete }: ReportCardProps) {
  const formattedDate = formatDate(report);
  const headline = report.title || report.locationText || `${report.category} Issue`;
  const locationSubtitle = report.locationText && report.title ? report.locationText : null;
  const isDraft = report.status === 'Draft';

  return (
    <div
      onClick={() => onSelect(report.clientId)}
      className="card"
      style={{
        cursor: 'pointer',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
        position: 'relative',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(report.clientId);
        }
      }}
    >
      {/* Top Header: Title & Badges */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {headline}
          </h4>
          {locationSubtitle && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                marginTop: '2px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <MapPin size={11} />
              <span>{locationSubtitle}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {/* Action icons — only show edit for drafts, delete always */}
          {isDraft && onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(report.clientId); }}
              title="Edit draft"
              style={{
                background: 'none',
                border: '1px solid transparent',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'auto',
                transition: 'color 120ms ease, background 120ms ease',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--primary-light)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this report? This action cannot be undone.')) {
                  onDelete(report.clientId);
                }
              }}
              title="Delete report"
              style={{
                background: 'none',
                border: '1px solid transparent',
                borderRadius: '4px',
                padding: '4px',
                cursor: 'pointer',
                color: 'var(--muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'auto',
                transition: 'color 120ms ease, background 120ms ease',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--danger)';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--danger-bg)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              <Trash2 size={14} />
            </button>
          )}

          <Badge type="sync" value={report.syncState} />
          <Badge type="status" value={report.status} />
        </div>
      </div>

      {/* Description Snippet */}
      <p
        style={{
          fontSize: '13px',
          color: '#4A5568',
          lineHeight: 1.5,
          marginBottom: '12px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {report.description}
      </p>

      {/* Metadata Bottom Strip */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--muted)',
          borderTop: '1px solid #F1F3F4',
          paddingTop: '10px',
        }}
      >
        {/* Category & Priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{report.category}</span>
          <span>•</span>
          <Badge type="priority" value={report.priority} />
        </div>

        {/* GPS Coordinates & Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
          {report.latitude != null && report.longitude != null && (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              title={`GPS Coordinates: ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
            >
              <MapPin size={12} color="#3182CE" />
              <span>
                {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}
              </span>
            </span>
          )}

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            <span>{formattedDate}</span>
          </span>
        </div>
      </div>

      {/* Assigned To Notice */}
      {report.assignedTo && (
        <div
          style={{
            marginTop: '10px',
            padding: '6px 10px',
            backgroundColor: '#F0FDF4',
            color: '#166534',
            fontSize: '11px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid #DCFCE7',
          }}
        >
          <span style={{ fontWeight: 600 }}>Assigned to:</span> {report.assignedTo}
        </div>
      )}

      {/* Sync Error Notice if any */}
      {report.syncState === 'failed' && report.lastSyncError && (
        <div
          style={{
            marginTop: '10px',
            padding: '6px 10px',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '11px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertTriangle size={13} />
          <span>Sync failed: {report.lastSyncError}</span>
        </div>
      )}
    </div>
  );
}
