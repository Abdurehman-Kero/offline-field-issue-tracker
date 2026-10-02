import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export function ConnectionBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      style={{
        backgroundColor: '#FEF2F2',
        borderBottom: '1px solid #FECACA',
        color: '#991B1B',
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}
      aria-live="polite"
    >
      <WifiOff size={14} />
      <span>
        Network disconnected. Working offline — all changes are stored locally and will sync once reconnected.
      </span>
    </div>
  );
}
