import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ConnectionBanner } from './components/ConnectionBanner';
import { ReportList } from './pages/ReportList';
import { ReportForm } from './pages/ReportForm';
import { ReportDetails } from './pages/ReportDetails';
import { SyncPage } from './pages/SyncPage';
import { startSyncEngine, refreshServerCache } from './sync/syncEngine';
import { useOnlineStatus } from './hooks/useOnlineStatus';

export default function App() {
  // Run the connectivity probe at the top level so __appIsOnline is set
  // before the sync engine starts (prevents localhost from bypassing offline state)
  useOnlineStatus();

  const [tab, setTab] = useState<string>('list');

  // View Report Modal State
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);

  // Create / Edit Report Form Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [modalEditClientId, setModalEditClientId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for the first connectivity probe to complete before starting the sync engine.
    // This prevents the engine from running while __appIsOnline is still unknown,
    // which would cause it to accidentally reach localhost even when the user is offline.
    const onReady = () => {
      startSyncEngine();
      // Only pre-populate from server if we're actually online
      if ((window as any).__appIsOnline) {
        refreshServerCache();
      }
    };

    window.addEventListener('app_online_status_ready', onReady, { once: true });

    // Safety fallback: if the event never fires within 6s, start anyway
    const fallback = setTimeout(() => {
      startSyncEngine();
    }, 6000);

    return () => {
      window.removeEventListener('app_online_status_ready', onReady);
      clearTimeout(fallback);
    };

    // Support direct hash navigation: #/list, #/sync, #/new, #/report/:id
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash === 'sync') {
        setTab('sync');
        setIsFormModalOpen(false);
      } else if (hash === 'new') {
        setModalEditClientId(null);
        setIsFormModalOpen(true);
      } else if (hash.startsWith('report/')) {
        const id = hash.replace('report/', '');
        if (id) setViewingClientId(id);
      } else {
        setTab('list');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSelectReport = (clientId: string) => {
    setViewingClientId(clientId);
  };

  const handleCloseViewModal = () => {
    setViewingClientId(null);
  };

  const handleOpenNewReport = () => {
    setModalEditClientId(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditReport = (clientId: string) => {
    // If viewing modal is open, close it and open edit modal
    setViewingClientId(null);
    setModalEditClientId(clientId);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    // If user was editing an existing report and cancelled, return to viewing it
    if (modalEditClientId) {
      setViewingClientId(modalEditClientId);
    }
    setModalEditClientId(null);
  };

  const handleReportSaved = (clientId: string, isSubmitted: boolean) => {
    setIsFormModalOpen(false);
    setModalEditClientId(null);
    window.dispatchEvent(new CustomEvent('sync_updated'));
    // Seamlessly transition to the view report modal
    setViewingClientId(clientId);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        currentTab={tab}
        onSelectTab={(selectedTab) => {
          setTab(selectedTab);
          window.location.hash = `#/${selectedTab}`;
        }}
        onOpenNewReport={() => {
          window.location.hash = '#/new';
          handleOpenNewReport();
        }}
      />
      <ConnectionBanner />

      <main style={{ flex: 1, paddingTop: 'var(--space-4)' }}>
        <div key={tab} className="page-transition">
          {tab === 'list' && (
            <ReportList
              onSelectReport={handleSelectReport}
              onCreateNew={handleOpenNewReport}
              onEditReport={handleOpenEditReport}
            />
          )}

          {tab === 'sync' && <SyncPage onSelectReport={handleSelectReport} />}
        </div>
      </main>

      {/* View Report Modal Dialog */}
      <ReportDetails
        isOpen={Boolean(viewingClientId)}
        clientId={viewingClientId}
        onClose={handleCloseViewModal}
        onEditDraft={handleOpenEditReport}
      />

      {/* Create / Edit Report Form Modal Dialog */}
      <ReportForm
        isOpen={isFormModalOpen}
        editClientId={modalEditClientId}
        onSaved={handleReportSaved}
        onCancel={handleCloseFormModal}
      />

      <footer
        style={{
          borderTop: '1px solid var(--border)',
          backgroundColor: '#FAF9F7',
          padding: '14px 0',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--muted)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
              Field Issue Tracker
            </span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span>WEDER Strategies Operations Platform</span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Production Release • Abdurehman Kero
          </div>
        </div>
      </footer>
    </div>
  );
}
