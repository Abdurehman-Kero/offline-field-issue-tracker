-- Migration 001: Initial schema for reports and audit history

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  location_text TEXT NOT NULL CHECK (char_length(location_text) BETWEEN 3 AND 200),
  latitude NUMERIC(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(9,6) CHECK (longitude BETWEEN -180 AND 180),
  priority TEXT NOT NULL CHECK (priority IN ('Low','Medium','High','Critical')),
  status TEXT NOT NULL CHECK (status IN ('Submitted','Assigned','In Progress','Resolved','Rejected')),
  reporter_name TEXT NOT NULL,
  assigned_to TEXT,
  reported_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  possible_duplicate_of UUID REFERENCES reports(id)
);

CREATE TABLE IF NOT EXISTS report_history (
  id BIGSERIAL PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('CREATED','SUBMITTED','SYNC_FAILED','SYNCED','STATUS_CHANGED','DETAILS_EDITED','DUPLICATE_FLAGGED')),
  from_value TEXT,
  to_value TEXT,
  note TEXT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('field_worker','coordinator','system')),
  source TEXT NOT NULL CHECK (source IN ('client','server')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_reported_at ON reports(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_report ON report_history(report_id, id);
