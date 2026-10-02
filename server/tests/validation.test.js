import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  createReportSchema,
  statusChangeSchema,
  editReportSchema,
} = require('../src/validation');

describe('Zod input validation rules', () => {
  const validReport = {
    clientId: '5b3f6d5e-6a4f-4d65-9f57-0d3a2a2f6c11',
    category: 'Water Point',
    description: 'Community hand pump pressure valve is cracked and leaking.',
    locationText: 'Sector 4 Kebele 02 Well',
    latitude: 9.012345,
    longitude: 38.765432,
    priority: 'High',
    status: 'Submitted',
    reporterName: 'Abdurehman Kero',
    reportedAt: new Date().toISOString(),
    history: [],
  };

  it('validates a complete, correctly formed report', () => {
    const res = createReportSchema.safeParse(validReport);
    expect(res.success).toBe(true);
  });

  it('rejects description with fewer than 10 characters', () => {
    const res = createReportSchema.safeParse({
      ...validReport,
      description: 'Too short',
    });
    expect(res.success).toBe(false);
    expect(res.error.issues[0].message).toContain('at least 10 characters');
  });

  it('rejects locationText shorter than 3 characters', () => {
    const res = createReportSchema.safeParse({
      ...validReport,
      locationText: 'Ab',
    });
    expect(res.success).toBe(false);
    expect(res.error.issues[0].message).toContain('at least 3 characters');
  });

  it('rejects invalid category', () => {
    const res = createReportSchema.safeParse({
      ...validReport,
      category: 'Nuclear Plant',
    });
    expect(res.success).toBe(false);
  });

  it('enforces both or neither for latitude and longitude', () => {
    const missingLng = createReportSchema.safeParse({
      ...validReport,
      latitude: 9.0123,
      longitude: null,
    });
    expect(missingLng.success).toBe(false);
    expect(missingLng.error.issues[0].message).toContain(
      'Both latitude and longitude must be provided together'
    );

    const neither = createReportSchema.safeParse({
      ...validReport,
      latitude: null,
      longitude: null,
    });
    expect(neither.success).toBe(true);
  });

  it('rejects reportedAt timestamp more than 5 minutes in the future', () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const res = createReportSchema.safeParse({
      ...validReport,
      reportedAt: futureDate,
    });
    expect(res.success).toBe(false);
    expect(res.error.issues[0].message).toContain('5 minutes in the future');
  });

  it('validates status change payload with required version', () => {
    const validChange = statusChangeSchema.safeParse({
      toStatus: 'Assigned',
      assignedTo: 'Engineer Dawit',
      version: 1,
    });
    expect(validChange.success).toBe(true);

    const missingVersion = statusChangeSchema.safeParse({
      toStatus: 'Assigned',
      assignedTo: 'Engineer Dawit',
    });
    expect(missingVersion.success).toBe(false);
  });

  it('validates coordinator edit payload requiring version', () => {
    const res = editReportSchema.safeParse({
      priority: 'Critical',
      version: 2,
    });
    expect(res.success).toBe(true);
  });
});
