export const CATEGORIES = [
  'Water Point',
  'Equipment Damage',
  'Service Interruption',
  'Safety Concern',
  'Maintenance',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const VALID_STATUSES = [
  'Draft',
  'Submitted',
  'Assigned',
  'In Progress',
  'Resolved',
  'Rejected',
] as const;
export type Status = (typeof VALID_STATUSES)[number];

export const STATUSES = VALID_STATUSES;

export const SYNC_STATES = ['local_only', 'pending', 'synced', 'failed'] as const;
export type SyncState = (typeof SYNC_STATES)[number];

export const ROLES = ['field_worker', 'coordinator'] as const;
export type Role = (typeof ROLES)[number];

export const RETRY_DELAYS_MS = [5000, 15000, 45000, 120000, 300000] as const;
export const MAX_SYNC_RETRIES = 5;
