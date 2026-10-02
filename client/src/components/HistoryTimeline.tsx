import React from 'react';
import { ReportAuditEntry } from '../shared/types';
import { Clock, User } from 'lucide-react';

interface HistoryTimelineProps {
  entries: ReportAuditEntry[];
}

export function HistoryTimeline({ entries }: HistoryTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ color: 'var(--muted)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
        No audit history recorded yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
      {entries.map((entry, index) => {
        const time = new Date(entry.timestamp).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={entry.id || index}
            style={{
              display: 'flex',
              gap: '10px',
              position: 'relative',
              paddingLeft: '16px',
              borderLeft: '2px solid var(--border)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-5px',
                top: '4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
              }}
            />

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  {entry.action}
                  {entry.fromStatus && entry.toStatus && (
                    <span style={{ fontWeight: 400, color: 'var(--muted)' }}>
                      : {entry.fromStatus} → {entry.toStatus}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={11} />
                  {time}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <User size={11} />
                <span>{entry.actorName} ({entry.actorRole})</span>
              </div>

              {entry.comment && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text)',
                    backgroundColor: '#F7FAFC',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    border: '1px solid #EDF2F7',
                  }}
                >
                  "{entry.comment}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
