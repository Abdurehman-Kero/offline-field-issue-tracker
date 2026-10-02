import { useState, useEffect, useCallback } from 'react';
import { getAllLocalReports } from '../db/localDb';
import { ReportItem } from '../shared/types';

export type LocalReport = ReportItem;

export function useReports() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLocalReports = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);
      const local = await getAllLocalReports();
      setReports(local);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocalReports(true);

    // When sync completes or background updates occur, refresh local reports without flickering
    const handleSync = () => {
      loadLocalReports(false);
    };

    window.addEventListener('sync_updated', handleSync);
    return () => window.removeEventListener('sync_updated', handleSync);
  }, [loadLocalReports]);

  return {
    reports,
    loading,
    error,
    refresh: () => loadLocalReports(false),
    refetch: () => loadLocalReports(false),
  };
}
