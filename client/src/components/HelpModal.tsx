import React, { useState } from 'react';
import { X, ClipboardList, WifiOff, RefreshCw, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  {
    icon: <ClipboardList size={18} />,
    title: 'What is this app?',
    body: 'This is a Field Issue Tracker. It lets field workers report problems found on site — like a broken water pump or a damaged road — and lets coordinators review and manage those reports. Everything saves on your device first, so it works even without internet.',
  },
  {
    icon: <Users size={18} />,
    title: 'Two roles: Field Worker & Coordinator',
    body: (
      <>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Field Worker</strong> — creates new reports from the field. Fill in the location, what the problem is, and submit it.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Coordinator</strong> — reviews submitted reports, assigns them, and changes their status (e.g. "In Progress" or "Resolved").
        </p>
        <p style={{ margin: 0, padding: '8px 10px', backgroundColor: '#EFF6FF', borderRadius: '6px', fontSize: '12px', color: '#1E40AF' }}>
          👉 To switch role: tap the <strong>⇄ swap icon</strong> in the top-right of the navbar.
        </p>
      </>
    ),
  },
  {
    icon: <WifiOff size={18} />,
    title: 'Working offline',
    body: (
      <>
        <p style={{ margin: '0 0 8px' }}>
          When offline, the app still works. Reports are saved directly on your device.
        </p>
        <p style={{ margin: 0 }}>
          The top banner says <strong>"Network disconnected"</strong> and the status dot turns <strong style={{ color: '#DC2626' }}>red</strong>. Your reports are safe — they wait in the Outbox until you reconnect.
        </p>
      </>
    ),
  },
  {
    icon: <RefreshCw size={18} />,
    title: 'The Outbox & syncing',
    body: (
      <>
        <p style={{ margin: '0 0 8px' }}>
          The <strong>Outbox</strong> tab shows reports waiting to be sent. The red badge number tells you how many are pending.
        </p>
        <p style={{ margin: 0 }}>
          Reports sync <strong>automatically</strong> when internet returns. You can also tap <strong>"Sync Outbox Now"</strong> to force it immediately.
        </p>
      </>
    ),
  },
];

const steps = [
  { num: 1, text: 'Set your role to Field Worker (⇄ icon in the navbar top-right).' },
  { num: 2, text: 'Tap "+ New" in the navigation bar.' },
  { num: 3, text: 'Fill in the location, category, priority, your name, and a description.' },
  { num: 4, text: 'Optionally tap "Use My Location" to attach GPS coordinates.' },
  { num: 5, text: 'Tap "Submit Report". Offline? It saves locally and syncs when you\'re back online.' },
];

// Collapsible section for mobile
function Section({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
          {title}
        </span>
        <span style={{ color: '#9CA3AF', flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: '0 14px 14px 60px',
            fontSize: '13px',
            color: '#374151',
            lineHeight: 1.65,
            borderTop: '1px solid #F3F4F6',
            paddingTop: '12px',
          }}
        >
          {typeof body === 'string' ? <p style={{ margin: 0 }}>{body}</p> : body}
        </div>
      )}
    </div>
  );
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-container" style={{ maxWidth: '600px' }}>

        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              How to use this app
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
              Quick guide for new users
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          {/* Collapsible info sections */}
          {sections.map((s, i) => (
            <Section key={i} icon={s.icon} title={s.title} body={s.body} />
          ))}

          {/* Step by step */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '14px',
              marginTop: '4px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📋 How to submit a report
            </div>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {steps.map((s) => (
                <li key={s.num} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
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
              borderRadius: '10px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ✅ Quick Tips
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '13px', color: '#166534', lineHeight: 1.9 }}>
              <li>Create reports without internet — they sync automatically when you reconnect.</li>
              <li>Refresh if something looks stuck — your data is safely stored locally.</li>
              <li>The Outbox badge shows how many reports are waiting to sync.</li>
              <li>Save a draft to finish filling it out later — tap "Save Draft" on the form.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ minWidth: '100px' }}
          >
            Got it ✓
          </button>
        </div>
      </div>
    </div>
  );
}
