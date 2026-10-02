import { describe, it, expect } from 'vitest';
import { getNextAttemptDate, isMaxRetriesExceeded } from '../sync/retry';
import { canTransition, getAllowedTransitions } from '../shared/workflow';
import { RETRY_DELAYS_MS } from '../shared/constants';

describe('Client sync and workflow tests', () => {
  it('calculates exponential backoff dates accurately', () => {
    const before = Date.now();
    const nextDate = getNextAttemptDate(0);
    const diff = nextDate.getTime() - before;

    // First delay is 5000ms
    expect(diff).toBeGreaterThanOrEqual(4900);
    expect(diff).toBeLessThanOrEqual(5200);

    const fourthDate = getNextAttemptDate(3);
    const fourthDiff = fourthDate.getTime() - before;
    expect(fourthDiff).toBeGreaterThanOrEqual(119000); // 2 minutes
  });

  it('determines max retry limit correctly', () => {
    expect(isMaxRetriesExceeded(4)).toBe(false);
    expect(isMaxRetriesExceeded(5)).toBe(true);
    expect(isMaxRetriesExceeded(6)).toBe(true);
  });

  it('client workflow rules mirror server rules', () => {
    expect(canTransition('Draft', 'Submitted', 'field_worker').ok).toBe(true);
    expect(canTransition('Draft', 'Submitted', 'coordinator').ok).toBe(false);
    expect(canTransition('Submitted', 'Assigned', 'coordinator', { assignedTo: 'Alice' }).ok).toBe(true);
    expect(canTransition('Submitted', 'Assigned', 'coordinator', {}).ok).toBe(false);
    expect(canTransition('Rejected', 'In Progress', 'coordinator').ok).toBe(false);
  });

  it('returns valid UI transition options for coordinator', () => {
    const transitions = getAllowedTransitions('In Progress', 'coordinator');
    expect(transitions.map((t) => t.to)).toContain('Resolved');
    expect(transitions.map((t) => t.to)).toContain('Assigned');
  });
});
