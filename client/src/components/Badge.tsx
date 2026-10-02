import React from 'react';
import { Status, Priority, SyncState } from '../shared/constants';

interface BadgeProps {
  type: 'status' | 'priority' | 'sync';
  value: Status | Priority | SyncState | string;
}

export function Badge({ type, value }: BadgeProps) {
  let bg = '#EDF2F7';
  let color = '#4A5568';
  let border = '#CBD5E0';
  let label = String(value);

  if (type === 'status') {
    switch (value) {
      case 'Draft':
        bg = '#EDF2F7';
        color = '#4A5568';
        border = '#CBD5E0';
        break;
      case 'Submitted':
        bg = '#EBF8FF';
        color = '#2B6CB0';
        border = '#BEE3F8';
        break;
      case 'Assigned':
        bg = '#FAF5FF';
        color = '#6B46C1';
        border = '#E9D8FD';
        break;
      case 'In Progress':
        bg = '#FFFAF0';
        color = '#C05621';
        border = '#FEEBC8';
        break;
      case 'Resolved':
        bg = '#F0FFF4';
        color = '#276749';
        border = '#C6F6D5';
        break;
      case 'Rejected':
        bg = '#FFF5F5';
        color = '#C53030';
        border = '#FED7D7';
        break;
    }
  } else if (type === 'priority') {
    switch (value) {
      case 'Low':
        bg = '#F7FAFC';
        color = '#718096';
        border = '#E2E8F0';
        break;
      case 'Medium':
        bg = '#EBF8FF';
        color = '#3182CE';
        border = '#BEE3F8';
        break;
      case 'High':
        bg = '#FFFAF0';
        color = '#DD6B20';
        border = '#FEEBC8';
        break;
      case 'Critical':
        bg = '#FFF5F5';
        color = '#E53E3E';
        border = '#FEB2B2';
        break;
    }
  } else if (type === 'sync') {
    switch (value) {
      case 'synced':
        bg = '#F0FFF4';
        color = '#2F855A';
        border = '#9AE6B4';
        label = 'Synced';
        break;
      case 'pending':
        bg = '#FFFAF0';
        color = '#DD6B20';
        border = '#FBD38D';
        label = 'Pending Sync';
        break;
      case 'local_only':
        bg = '#EDF2F7';
        color = '#4A5568';
        border = '#CBD5E0';
        label = 'Draft (Local)';
        break;
      case 'failed':
        bg = '#FFF5F5';
        color = '#C53030';
        border = '#FEB2B2';
        label = 'Sync Error';
        break;
    }
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  );
}
