import React from 'react';
import { X, ClipboardList, WifiOff, RefreshCw, Users } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  {
    icon: <ClipboardList size={18} />,
    title: 'What is this app?',
    body: 'This is a Field Issue Tracker. It lets field workers report problems they find on site — like a broken water pump or a damaged road — and lets coordinators review and manage those reports. Everything is saved on your device first, so it works even without internet.',
  },
  {
    icon: <Users size={18} />,
    title: 'Two roles: Field Worker vs Coordinator',
    body: (
      <>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Field Worker</strong> — creates new reports from the field. You fill in the location, what the problem is, and submit it.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Coordinator</strong> — reviews submitted reports, assigns them, and changes their status (e.g. "In Progress" or "Resolved"). Coordinators can see all reports but not create new ones.
        </p>
        <p style={{ margin: '8px 0 0', color: '#555', fontSize: '13px' }}>
          👉 To switch role: click the <strong>"Switch Role"</strong> button in the top-right of the navbar.
        </p>
      </>
    ),
  },
  {
    icon: <WifiOff size={18} />,
    title: 'Working without internet (Offline mode)',
    body: (
      <>
        <p style={{ margin: '0 0 8px' }}>
          When your device is offline, the app still works. Any report you submit is saved directly on your device.
        </p>
        <p style={{ margin: 0 }}>
          The top banner will say <strong>"Network disconnected"</strong> and the status pill will show <strong>"Offline"</strong> in red. Your reports are safe — they wait in the Outbox until you reconnect.
        </p>
      </>
    ),
  },
  {
    icon: <RefreshCw size={18} />,
    title: 'The Outbox — syncing your reports',
    body: (
      <>
        <p style={{ margin: '0 0 8px' }}>
          The <strong>Outbox</strong> tab (in the navbar) shows reports that are waiting to be sent to the server. The number badge on it tells you how many are pending.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          When your internet comes back, the app will <strong>automatically sync</strong> within a few seconds — no action needed.
        </p>
        <p style={{ margin: 0 }}>
          You can also click <strong>"Sync Outbox Now"</strong> inside the Outbox tab to force an immediate sync.
        </p>
      </>
    ),
  },
];

const steps = [
  { num: 1, text: 'Make sure your role is set to Field Worker (top-right of the navbar).' },
  { num: 2, text: 'Click "+ New Report" in the top-right corner.' },
  { num: 3, text: 'Fill in the location, category, priority, your name, and a description of the problem.' },
  { num: 4, text: 'Optionally tap "Use My Location" to attach your GPS coordinates.' },
  { num: 5, text: 'Click "Submit Report". If you\'re offline, it saves locally and syncs later. If online, it goes straight to the server.' },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px 14px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#111' }}>
              How to use this app
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              A quick guide for new users
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Close help"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Sections */}
          {sections.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  flexShrink: 0,
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111', marginBottom: '6px' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                  {typeof s.body === 'string' ? <p style={{ margin: 0 }}>{s.body}</p> : s.body}
                </div>
              </div>
            </div>
          ))}

          {/* Step by step */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111', marginBottom: '12px' }}>
              How to submit a report — step by step
            </div>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {steps.map((s) => (
                <li key={s.num} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#2563EB',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.num}
                  </span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, paddingTop: '2px' }}>
                    {s.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Quick tips */}
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
              ✅ Quick tips
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: '#166534', lineHeight: 1.8 }}>
              <li>You can create reports even without internet — they sync automatically when you reconnect.</li>
              <li>Refresh the page if something looks stuck — your data is safely stored on your device.</li>
              <li>The Outbox badge shows how many reports are waiting to sync.</li>
              <li>Save a draft first if you're not ready to submit — use "Save Draft" on the form.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            className="btn-primary btn-full-mobile"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
