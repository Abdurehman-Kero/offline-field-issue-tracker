import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { canTransition, getAllowedTransitions } = require('../src/workflow');

describe('Workflow transitions and permission rules', () => {
  it('allows field_worker to submit a Draft', () => {
    const result = canTransition('Draft', 'Submitted', 'field_worker');
    expect(result.ok).toBe(true);
  });

  it('rejects coordinator from submitting a Draft', () => {
    const result = canTransition('Draft', 'Submitted', 'coordinator');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Only role');
  });

  it('allows coordinator to assign a Submitted report with assignedTo', () => {
    const result = canTransition('Submitted', 'Assigned', 'coordinator', { assignedTo: 'Eng Dawit' });
    expect(result.ok).toBe(true);
  });

  it('requires assignedTo when transitioning from Submitted to Assigned', () => {
    const result = canTransition('Submitted', 'Assigned', 'coordinator', {});
    expect(result.ok).toBe(false);
    expect(result.message).toContain("requires 'assignedTo'");
  });

  it('allows coordinator to reject a Submitted report with note', () => {
    const result = canTransition('Submitted', 'Rejected', 'coordinator', { note: 'Duplicate report' });
    expect(result.ok).toBe(true);
  });

  it('requires note when transitioning from Submitted to Rejected', () => {
    const result = canTransition('Submitted', 'Rejected', 'coordinator', { note: ' ' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("requires 'note'");
  });

  it('allows coordinator to start work (Assigned -> In Progress)', () => {
    const result = canTransition('Assigned', 'In Progress', 'coordinator');
    expect(result.ok).toBe(true);
  });

  it('allows coordinator to resolve In Progress with resolution note', () => {
    const result = canTransition('In Progress', 'Resolved', 'coordinator', { note: 'Fixed leak' });
    expect(result.ok).toBe(true);
  });

  it('requires note when resolving In Progress report', () => {
    const result = canTransition('In Progress', 'Resolved', 'coordinator', {});
    expect(result.ok).toBe(false);
    expect(result.message).toContain("requires 'note'");
  });

  it('allows reopening a Resolved report to In Progress with note', () => {
    const result = canTransition('Resolved', 'In Progress', 'coordinator', { note: 'Issue recurring' });
    expect(result.ok).toBe(true);
  });

  it('prevents any transition once a report is Rejected (final)', () => {
    const result = canTransition('Rejected', 'In Progress', 'coordinator', { note: 'Try anyway' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Rejected reports are final');
  });

  it('rejects arbitrary invalid jumps (e.g. Submitted straight to Resolved)', () => {
    const result = canTransition('Submitted', 'Resolved', 'coordinator', { note: 'Jump ahead' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('is not permitted');
  });

  it('returns allowed transitions for current state and role', () => {
    const workerTransitions = getAllowedTransitions('Draft', 'field_worker');
    expect(workerTransitions).toEqual([{ to: 'Submitted', needs: [] }]);

    const coordTransitions = getAllowedTransitions('Submitted', 'coordinator');
    expect(coordTransitions).toHaveLength(2);
    expect(coordTransitions.map((t) => t.to)).toEqual(['Assigned', 'Rejected']);
  });
});
