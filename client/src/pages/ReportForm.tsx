import React, { useState, useEffect } from 'react';
import { CATEGORIES, PRIORITIES, Category, Priority } from '../shared/constants';
import { reportFormSchema } from '../shared/validation';
import { saveLocalReport, getLocalReportByClientId, enqueueMutation } from '../db/localDb';
import { processOutbox } from '../sync/syncEngine';
import { MapPin, X, AlertCircle } from 'lucide-react';

interface ReportFormProps {
  isOpen: boolean;
  editClientId: string | null;
  onSaved: (clientId: string, isSubmitted: boolean) => void;
  onCancel: () => void;
}

export function ReportForm({ isOpen, editClientId, onSaved, onCancel }: ReportFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [otherCategory, setOtherCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [reporterName, setReporterName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && editClientId) {
      getLocalReportByClientId(editClientId).then((report) => {
        if (report) {
          setTitle(report.title || report.locationText || '');
          // If the saved category isn't in the standard list it was a custom 'Other' value
          const isStandard = Array.from(CATEGORIES).includes(report.category as Category);
          if (isStandard) {
            setCategory(report.category as Category);
            setOtherCategory('');
          } else {
            setCategory('Other');
            setOtherCategory(report.category);
          }
          setPriority(report.priority);
          setReporterName(report.reporterName || '');
          setDescription(report.description);
          setLatitude(report.latitude != null ? String(report.latitude) : '');
          setLongitude(report.longitude != null ? String(report.longitude) : '');
        }
      });
    } else if (isOpen) {
      setTitle('');
      setCategory(CATEGORIES[0]);
      setOtherCategory('');
      setPriority('Medium');
      setReporterName('');
      setDescription('');
      setLatitude('');
      setLongitude('');
      setErrors({});
    }
  }, [isOpen, editClientId]);

  if (!isOpen) return null;

  const handleGetCoordinates = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, gps: 'Geolocation is not supported by your device' }));
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.gps;
          return updated;
        });
      },
      (err) => {
        setGpsLoading(false);
        setErrors((prev) => ({ ...prev, gps: `Could not retrieve GPS: ${err.message}` }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (submitNow: boolean) => {
    const latNum = latitude.trim() ? parseFloat(latitude) : undefined;
    const lngNum = longitude.trim() ? parseFloat(longitude) : undefined;

    // When the user picked 'Other', use the typed value as the actual category sent to the server.
    const resolvedCategory = category === 'Other' ? otherCategory.trim() : category;

    const validationResult = reportFormSchema.safeParse({
      title,
      category: resolvedCategory,
      priority,
      description,
      reporterName,
      latitude: latNum,
      longitude: lngNum,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const clientId = editClientId || crypto.randomUUID();
      const now = new Date().toISOString();

      const resolvedCategory = category === 'Other' ? otherCategory.trim() : category;

      let existingReport = null;
      if (editClientId) {
        existingReport = await getLocalReportByClientId(editClientId);
      }

      const reportData = {
        ...existingReport,
        clientId,
        title: title.trim(),
        locationText: title.trim(),
        category: resolvedCategory,
        priority,
        status: (submitNow ? 'Submitted' : 'Draft') as any,
        reporterName: reporterName.trim(),
        description: description.trim(),
        latitude: latNum ?? null,
        longitude: lngNum ?? null,
        reportedAt: existingReport?.reportedAt || now,
        createdAt: existingReport?.createdAt || now,
        updatedAt: now,
        syncState: (submitNow ? 'pending' : 'local_only') as any,
        syncedAt: existingReport?.syncedAt || null,
        lastSyncError: existingReport?.lastSyncError || null,
      };

      await saveLocalReport(reportData as any);

      // Immediately notify the UI that a new report exists in IndexedDB
      window.dispatchEvent(new CustomEvent('sync_updated'));

      if (submitNow) {
        // Enqueue background creation mutation with server-compatible schema
        await enqueueMutation({
          id: crypto.randomUUID(),
          clientId,
          type: 'CREATE',
          payload: {
            clientId,
            category: reportData.category,
            locationText: reportData.locationText,
            description: reportData.description,
            priority: reportData.priority,
            reporterName: reportData.reporterName,
            reportedAt: reportData.reportedAt,
            status: 'Submitted',
            latitude: reportData.latitude,
            longitude: reportData.longitude,
          },
          createdAt: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
          status: 'pending',
        });

        // Trigger sync attempt in background (non-blocking)
        processOutbox().catch(() => {});
      }

      onSaved(clientId, submitNow);
    } catch (err: any) {
      setErrors({ form: err?.message || 'Failed to save report' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              {editClientId ? 'Edit Draft Report' : 'New Infrastructure Report'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0 0' }}>
              Record field conditions with offline validation and GPS capture.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {errors.form && (
            <div
              style={{
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={15} />
              <span>{errors.form}</span>
            </div>
          )}

          <div className="form-group">
            <label>Location / Facility Title *</label>
            <input
              type="text"
              placeholder="e.g. Reservoir Tank Hill 7 or Sector 4 Water Point"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label>Category *</label>
              {category === 'Other' ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    style={{ flex: 1 }}
                    placeholder="Describe the category (e.g. Road Damage)"
                    value={otherCategory}
                    onChange={(e) => setOtherCategory(e.target.value)}
                    autoFocus
                  />
                  {/* Go back to the dropdown */}
                  <button
                    type="button"
                    onClick={() => { setCategory(CATEGORIES[0]); setOtherCategory(''); }}
                    title="Choose a category from the list"
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '0 10px',
                      height: '40px',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ← List
                  </button>
                </div>
              ) : (
                <select value={category} onChange={(e) => { setCategory(e.target.value as Category); setOtherCategory(''); }}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              {errors.category && <span className="field-error">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label>Priority Level *</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.priority && <span className="field-error">{errors.priority}</span>}
            </div>

            <div className="form-group">
              <label>Reporter Name</label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Enter your name"
              />
              {errors.reporterName && <span className="field-error">{errors.reporterName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Detailed Description *</label>
            <textarea
              rows={4}
              placeholder="Describe symptoms, safety impact, and immediate field actions required..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ margin: 0 }}>Coordinates (Optional)</label>
              <button
                type="button"
                onClick={handleGetCoordinates}
                disabled={gpsLoading}
                className="btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <MapPin size={12} />
                <span>{gpsLoading ? 'Capturing GPS...' : 'Use My Location'}</span>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="text"
                placeholder="Latitude (e.g. 9.072)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              <input
                type="text"
                placeholder="Longitude (e.g. 38.789)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
            {errors.gps && <span className="field-error">{errors.gps}</span>}
            {errors.latitude && <span className="field-error">{errors.latitude}</span>}
            {errors.longitude && <span className="field-error">{errors.longitude}</span>}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary btn-full-mobile" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-secondary btn-full-mobile"
            onClick={() => handleSave(false)}
            disabled={submitting}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="btn-primary btn-full-mobile"
            onClick={() => handleSave(true)}
            disabled={submitting}
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
