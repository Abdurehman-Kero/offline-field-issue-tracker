import React, { useState, useMemo } from 'react';
import { useReports } from '../hooks/useReports';
import { ReportCard } from '../components/ReportCard';
import { deleteLocalReport } from '../db/localDb';
import { CATEGORIES, STATUSES, PRIORITIES, SYNC_STATES } from '../shared/constants';
import { Search, X, RotateCcw } from 'lucide-react';

interface ReportListProps {
  onSelectReport: (clientId: string) => void;
  onCreateNew?: () => void;
  onEditReport?: (clientId: string) => void;
}

export function ReportList({ onSelectReport, onEditReport }: ReportListProps) {
  const { reports, loading } = useReports();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedSync, setSelectedSync] = useState<string>('all');

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const titleText = (r.title || '').toLowerCase();
        const locText = (r.locationText || '').toLowerCase();
        const descText = (r.description || '').toLowerCase();
        const catText = (r.category || '').toLowerCase();
        const reporter = (r.reporterName || '').toLowerCase();

        const match =
          titleText.includes(query) ||
          locText.includes(query) ||
          descText.includes(query) ||
          catText.includes(query) ||
          reporter.includes(query);

        if (!match) return false;
      }
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (selectedPriority !== 'all' && r.priority !== selectedPriority) return false;
      if (selectedSync !== 'all' && r.syncState !== selectedSync) return false;
      return true;
    });
  }, [reports, search, selectedCategory, selectedStatus, selectedPriority, selectedSync]);

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedStatus !== 'all' ||
    selectedPriority !== 'all' ||
    selectedSync !== 'all';

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedPriority('all');
    setSelectedSync('all');
  };

  return (
    <div className="container" style={{ padding: '16px' }}>
      {/* Clean, Polished Search & Filter Card */}
      <div
        className="card"
        style={{
          padding: '16px',
          marginBottom: '16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Row 1: Full-Width Search Input (No duplicate New Report button) */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search reports by location, description, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '38px',
              paddingRight: search ? '36px' : '14px',
              minHeight: '44px', /* Touch friendly */
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#F9FAFB',
              fontSize: '16px', /* Prevents iOS zoom */
              color: 'var(--text)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Row 2: Four Clean Filter Dropdowns */}
        <div
          className="filters-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Category Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
              data-active={selectedCategory !== 'all'}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
              data-active={selectedStatus !== 'all'}
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="filter-select"
              data-active={selectedPriority !== 'all'}
            >
              <option value="all">All Priorities</option>
              {PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          {/* Sync State Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedSync}
              onChange={(e) => setSelectedSync(e.target.value)}
              className="filter-select"
              data-active={selectedSync !== 'all'}
            >
              <option value="all">All Sync States</option>
              {SYNC_STATES.map((syn) => (
                <option key={syn} value={syn}>
                  {syn === 'local_only'
                    ? 'Draft (Local)'
                    : syn === 'synced'
                    ? 'Synced'
                    : syn === 'pending'
                    ? 'Pending Sync'
                    : 'Sync Error'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Results Summary & Clear Action */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #F1F3F4',
            fontSize: '12px',
            color: 'var(--muted)',
          }}
        >
          <span>
            Showing <strong>{filteredReports.length}</strong> of {reports.length} reports
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              <RotateCcw size={12} />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Reports Feed */}
      {loading ? (
        <div className="empty-state">
          <p>Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div
          className="card empty-state"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '36px 16px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
            No reports found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
            {reports.length === 0
              ? 'No infrastructure reports recorded on this device yet.'
              : 'No reports matched your current filter criteria.'}
          </p>
          {hasActiveFilters && (
            <button type="button" className="btn-secondary" onClick={handleClearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div>
          {filteredReports.map((report) => (
            <ReportCard
              key={report.clientId}
              report={report}
              onSelect={onSelectReport}
              onEdit={onEditReport}
              onDelete={async (clientId) => {
                await deleteLocalReport(clientId);
                window.dispatchEvent(new CustomEvent('sync_updated'));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
