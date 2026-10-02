import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, HelpCircle, ArrowLeftRight } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useRole } from '../hooks/useRole';
import { getAllLocalReports, getQueueItems } from '../db/localDb';
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

  const [scrolled, setScrolled] = useState(false);

  const updateCounts = async () => {
    try {
      const [items, reports] = await Promise.all([getQueueItems(), getAllLocalReports()]);
      const draftCount = reports.filter((r) => r.status === 'Draft' || r.syncState === 'local_only').length;
      setPendingCount(items.length + draftCount);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    updateCounts();
    const handleUpdate = () => updateCounts();
    window.addEventListener('sync_updated', handleUpdate);

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('sync_updated', handleUpdate);
      window.removeEventListener('scroll', handleScroll);
    };
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
          boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'box-shadow 200ms ease',
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: scrolled ? '4px 0' : '6px 0',
                transition: 'padding 200ms ease',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => onSelectTab('list')}
              >
                <div
                  style={{
                    width: scrolled ? '24px' : '28px',
                    height: scrolled ? '24px' : '28px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                    transition: 'width 200ms ease, height 200ms ease',
                  }}
                >
                  <ClipboardList size={scrolled ? 13 : 15} />
                </div>
                <span
                  style={{
                    fontSize: scrolled ? '13px' : '14px',
                    fontWeight: 700,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    transition: 'font-size 200ms ease',
                  }}
                >
                  Field Tracker
                </span>
              </div>

              {/* Three perfectly equal-size control buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>

                {/* 1. Online status indicator */}
                <span
                  title={isOnline ? 'Online' : 'Offline'}
                  aria-live="polite"
                  style={{
                    width: '32px',
                    height: '32px',
                    minHeight: '32px',
                    borderRadius: '7px',
                    border: `1.5px solid ${isOnline ? '#A7F3D0' : '#FECACA'}`,
                    backgroundColor: isOnline ? '#F0FDF4' : '#FEF2F2',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isOnline ? '#16A34A' : '#DC2626',
                      display: 'block',
                      flexShrink: 0,
                    }}
                  />
                </span>

                {/* 2. Role toggle */}
                <button
                  type="button"
                  onClick={() => switchRole(nextRole)}
                  title={`Currently: ${isCoordinator ? 'Coordinator' : 'Field Worker'}. Tap to switch to ${nextRoleLabel}.`}
                  style={{
                    width: '32px',
                    height: '32px',
                    minHeight: '32px',
                    borderRadius: '7px',
                    border: `1.5px solid ${isCoordinator ? '#BFDBFE' : '#d1d5db'}`,
                    backgroundColor: isCoordinator ? '#EFF6FF' : '#f9fafb',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    padding: 0,
                    color: isCoordinator ? 'var(--primary)' : '#6B7280',
                    boxSizing: 'border-box',
                    transition: 'border-color 120ms, background 120ms',
                  }}
                >
                  <ArrowLeftRight size={14} />
                </button>

                {/* 3. Help */}
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  title="Help — how to use this app"
                  style={{
                    width: '32px',
                    height: '32px',
                    minHeight: '32px',
                    borderRadius: '7px',
                    border: '1.5px solid #d1d5db',
                    backgroundColor: '#f9fafb',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    padding: 0,
                    color: '#6B7280',
                    boxSizing: 'border-box',
                    transition: 'border-color 120ms, background 120ms',
                  }}
                >
                  <HelpCircle size={14} />
                </button>
              </div>
            </div>

            {/* Row 2: Nav tabs — compact when scrolled */}
            <nav
              className="segmented-nav"
              style={{
                width: '100%',
                display: 'flex',
                height: scrolled ? '32px' : '36px',
                minHeight: scrolled ? '32px' : '36px',
                transition: 'height 200ms ease, min-height 200ms ease',
                overflow: 'hidden',
              }}
              aria-label="Mobile Navigation"
            >
              <button
                type="button"
                onClick={() => onSelectTab('list')}
                style={{ flex: 1, justifyContent: 'center', fontSize: scrolled ? '11px' : '12px', transition: 'font-size 200ms' }}
                className={`segmented-nav-btn ${currentTab === 'list' ? 'segmented-nav-btn-active' : ''}`}
              >
                Reports
              </button>

              {onOpenNewReport && (
                <button
                  type="button"
                  onClick={onOpenNewReport}
                  style={{ flex: 1, justifyContent: 'center', color: 'var(--primary)', fontSize: scrolled ? '11px' : '12px', transition: 'font-size 200ms' }}
                  className="segmented-nav-btn"
                >
                  <Plus size={scrolled ? 11 : 13} />
                  <span>New</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelectTab('sync')}
                style={{ flex: 1, justifyContent: 'center', fontSize: scrolled ? '11px' : '12px', transition: 'font-size 200ms' }}
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
