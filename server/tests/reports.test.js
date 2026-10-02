import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const request = require('supertest');
const app = require('../src/app');
const migrate = require('../src/db/migrate');
const pool = require('../src/db/pool');

describe('Reports API integration tests', () => {
  beforeAll(async () => {
    await migrate();
  });

  it('GET /api/health returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects requests with missing X-Role header with 403', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  const testClientId = 'fa8d9e2a-1234-4567-89ab-cdef01234567';
  const newReportPayload = {
    clientId: testClientId,
    category: 'Water Point',
    description: 'Borehole submersible pump motor overheating continuously',
    locationText: 'Woreda 03 Wellhead',
    latitude: 9.1234,
    longitude: 38.5678,
    priority: 'High',
    status: 'Submitted',
    reporterName: 'Abdurehman Kero',
    reportedAt: new Date().toISOString(),
    history: [],
  };

  let createdReportId;

  it('POST /api/reports creates a new report (201)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('X-Role', 'field_worker')
      .send(newReportPayload);

    expect(res.status).toBe(201);
    expect(res.body.clientId).toBe(testClientId);
    expect(res.body.version).toBe(1);
    createdReportId = res.body.id;
  });

  it('POST /api/reports with same clientId is idempotent (200, no duplicates)', async () => {
    const retryRes = await request(app)
      .post('/api/reports')
      .set('X-Role', 'field_worker')
      .send(newReportPayload);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.id).toBe(createdReportId);
    expect(retryRes.body.clientId).toBe(testClientId);
  });

  it('coordinator updates status Submitted -> Assigned with assignedTo', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/status`)
      .set('X-Role', 'coordinator')
      .send({
        toStatus: 'Assigned',
        assignedTo: 'Engineer Bekele',
        version: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Assigned');
    expect(res.body.assignedTo).toBe('Engineer Bekele');
    expect(res.body.version).toBe(2);
  });

  it('rejects status change with stale version returning 409 VERSION_CONFLICT', async () => {
    // Attempting update using version 1 while database is already version 2
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/status`)
      .set('X-Role', 'coordinator')
      .send({
        toStatus: 'In Progress',
        version: 1,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('GET /api/reports/:id/history returns complete audit trail', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportId}/history`)
      .set('X-Role', 'coordinator');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const eventTypes = res.body.map((e) => e.eventType);
    expect(eventTypes).toContain('STATUS_CHANGED');
  });
});
