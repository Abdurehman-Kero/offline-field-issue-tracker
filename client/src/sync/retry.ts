import { RETRY_DELAYS_MS, MAX_SYNC_RETRIES } from '../shared/constants';

export function getNextAttemptDate(attemptIndex: number): Date {
  const index = Math.min(attemptIndex, RETRY_DELAYS_MS.length - 1);
  const delayMs = RETRY_DELAYS_MS[index];
  return new Date(Date.now() + delayMs);
}

export function isMaxRetriesExceeded(retryCount: number): boolean {
  return retryCount >= MAX_SYNC_RETRIES;
}
