import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, HelpCircle, ArrowLeftRight } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRole } from '../hooks/useRole';
import { getAllLocalReports } from '../db/localDb';
import { HelpModal } from './HelpModal';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewReport?: () => void;
}

export function Header({ currentTab, onSelectTab, onOpenNewReport }: HeaderProps) {
  const { isOnline } = useOnlineStatus();
  const { role, switchRole } = useRole();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [helpOpen, setHelpOpen] = useState(false);

  const updateCounts = async () => {
    try {
      const reports = await getAllLocalReports();
      const count = reports.filter(
        (r) => r.syncState === 'pending' || r.syncState === 'failed'
      ).length;
      setPendingCount(count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    updateCounts();
    const handleUpdate = () => updateCounts();
    window.addEventListener('sync_updated', handleUpdate);
    return () => window.removeEventListener('sync_updated', handleUpdate);
  }, []);

  const isCoordinator = role === 'coordinator';
  const nextRole = isCoordinator ? 'field_worker' : 'coordinator';
  const nextRoleLabel = isCoordinator ? 'Field Worker' : 'Coordinator';

  return (
    <>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="container" style={{ padding: '8px 16px' }}>

          {/* ================================================================= */}
          {/* DESKTOP VIEW (>= 640px)                                           */}
          {/* ================================================================= */}
          <div className="header-desktop-view">
            {/* Left: Brand */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => onSelectTab('list')}
              title="Field Issue Tracker Home"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                <ClipboardList size={18} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                  Field Issue Tracker
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500 }}>
                  Offline Infrastructure Operations
                </div>
              </div>
            </div>

            {/* Center: Tabs */}
            <nav className="segmented-nav" aria-label="Desktop Navigation">
              <button
                type="button"
                onClick={() => onSelectTab('list')}
                className={`segmented-nav-btn ${currentTab === 'list' ? 'segmented-nav-btn-active' : ''}`}
              >
                Reports
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('sync')}
                className={`segmented-nav-btn ${currentTab === 'sync' ? 'segmented-nav-btn-active' : ''}`}
              >
                <span>Outbox</span>
                {pendingCount > 0 && (
                  <span
                    style={{
                      backgroundColor: 'var(--danger)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      padding: '0 5px',
                      minWidth: '16px',
                      height: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Right: Status, Role, Help, New Report */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              {/* Online/Offline status */}
              <span
                className={isOnline ? 'status-pill status-pill-online' : 'status-pill status-pill-offline'}
                aria-live="polite"
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </span>

              {/* Role toggle — explicit button with "Switch Role" label */}
              <button
                type="button"
                onClick={() => switchRole(nextRole)}
                title={`Currently: ${isCoordinator ? 'Coordinator' : 'Field Worker'} — click to switch to ${nextRoleLabel}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#374151',
                  fontWeight: 500,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#EFF6FF';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db';
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb';
                }}
              >
                <ArrowLeftRight size={12} />
                <span>
                  Role: <strong style={{ color: 'var(--primary)' }}>{isCoordinator ? 'Coordinator' : 'Field Worker'}</strong>
                </span>
              </button>

              {/* Help button */}
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                title="Help — how to use this app"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  border: '1.5px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontWeight: 500,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#9ca3af';
                  (e.currentTarget as HTMLElement).style.color = '#374151';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db';
                  (e.currentTarget as HTMLElement).style.color = '#6b7280';
                }}
              >
                <HelpCircle size={14} />
                <span>Help</span>
              </button>

              {onOpenNewReport && (
                <button
                  type="button"
                  onClick={onOpenNewReport}
                  className="btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Plus size={14} />
                  <span>New Report</span>
                </button>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* MOBILE VIEW (< 640px)                                             */}
          {/* ================================================================= */}
          <div className="header-mobile-view">
            {/* Row 1: Brand & Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => onSelectTab('list')}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <ClipboardList size={15} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Field Tracker</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span
                  className={isOnline ? 'status-pill status-pill-online' : 'status-pill status-pill-offline'}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                  aria-live="polite"
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </span>

                {/* Mobile role toggle */}
                <button
                  type="button"
                  onClick={() => switchRole(nextRole)}
                  title={`Switch to ${nextRoleLabel}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 7px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '5px',
                    backgroundColor: '#f9fafb',
                    cursor: 'pointer',
                    fontSize: '10px',
                    color: '#374151',
                    fontWeight: 500,
                  }}
                >
                  <ArrowLeftRight size={9} />
                  <span>{isCoordinator ? 'Coord' : 'Worker'}</span>
                </button>

                {/* Mobile help button */}
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 6px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: '5px',
                    backgroundColor: '#f9fafb',
                    cursor: 'pointer',
                    color: '#6b7280',
                  }}
                >
                  <HelpCircle size={13} />
                </button>
              </div>
            </div>

            {/* Row 2: Nav tabs */}
            <nav className="segmented-nav" style={{ width: '100%', display: 'flex' }} aria-label="Mobile Navigation">
              <button
                type="button"
                onClick={() => onSelectTab('list')}
                style={{ flex: 1, justifyContent: 'center' }}
                className={`segmented-nav-btn ${currentTab === 'list' ? 'segmented-nav-btn-active' : ''}`}
              >
                Reports
              </button>

              {onOpenNewReport && (
                <button
                  type="button"
                  onClick={onOpenNewReport}
                  style={{ flex: 1, justifyContent: 'center', color: 'var(--primary)' }}
                  className="segmented-nav-btn"
                >
                  <Plus size={13} />
                  <span>New</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectTab('sync')}
                style={{ flex: 1, justifyContent: 'center' }}
                className={`segmented-nav-btn ${currentTab === 'sync' ? 'segmented-nav-btn-active' : ''}`}
              >
                <span>Outbox</span>
                {pendingCount > 0 && (
                  <span
                    style={{
                      backgroundColor: 'var(--danger)',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      padding: '0 4px',
                      minWidth: '14px',
                      height: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
