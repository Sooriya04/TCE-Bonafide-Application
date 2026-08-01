-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'student',
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- LaTeX Certificate Templates (CMS managed)
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  -- raw .tex template
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);
-- Template History for rollbacks
CREATE TABLE IF NOT EXISTS certificate_template_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES certificate_templates(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  saved_by TEXT
);
-- Bonafide Forms Submissions
CREATE TABLE IF NOT EXISTS bonafide_forms (
  id TEXT PRIMARY KEY,
  -- Deterministic ID: ROLLNO_PURPOSE_DATE
  form_data JSONB NOT NULL,
  -- Contains all submitted form field values dynamically
  downloaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for Read Replica performance
CREATE INDEX IF NOT EXISTS idx_bonafide_rollno ON bonafide_forms ((form_data->>'rollno'));
CREATE INDEX IF NOT EXISTS idx_bonafide_name ON bonafide_forms (lower(form_data->>'name'));
CREATE INDEX IF NOT EXISTS idx_bonafide_created_at ON bonafide_forms (created_at DESC);
-- Application Logs for dev diagnostic route
CREATE TABLE IF NOT EXISTS app_logs (
  id BIGSERIAL PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON app_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON app_logs (level);