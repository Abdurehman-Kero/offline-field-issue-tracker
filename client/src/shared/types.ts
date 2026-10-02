import { Category, Priority, Status, SyncState } from './constants';

export interface ReportItem {
  id?: string;
  clientId: string;
  title?: string;
  locationText?: string;
  // category can be one of the standard CATEGORIES values or a custom string when 'Other' was selected
  category: string;
  priority: Priority;
  status: Status;
  description: string;
  latitude: number | null;
  longitude: number | null;
  reporterName?: string;
  assignedTo?: string | null;
  reportedAt?: string;
  receivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  syncState: SyncState;
  syncedAt?: string | null;
  lastSyncError?: string | null;
  serverVersion?: number;
  possibleDuplicateOf?: string | null;
}

export interface ReportAuditEntry {
  id: string;
  reportId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  actorRole: string;
  actorName: string;
  comment?: string | null;
  timestamp: string;
}

export interface MutationQueueItem {
  id: string;
  clientId: string;
  type: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE';
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
  nextRetryAt: number;
  status: 'pending' | 'processing' | 'failed';
  lastError?: string | null;
}
