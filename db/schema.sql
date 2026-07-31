-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  verified    BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Dynamic Form Fields (CMS managed)
CREATE TABLE IF NOT EXISTS form_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'text',
  options     JSONB DEFAULT '[]',
  placeholder TEXT DEFAULT '',
  hint        TEXT DEFAULT '',
  required    BOOLEAN DEFAULT TRUE,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- LaTeX Certificate Templates (CMS managed)
CREATE TABLE IF NOT EXISTS certificate_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  content     TEXT NOT NULL, -- raw .tex template
  is_active   BOOLEAN DEFAULT TRUE,
  version     INT DEFAULT 1,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  TEXT
);

-- Template History for rollbacks
CREATE TABLE IF NOT EXISTS certificate_template_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES certificate_templates(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  version     INT NOT NULL,
  saved_at    TIMESTAMPTZ DEFAULT NOW(),
  saved_by    TEXT
);

-- Bonafide Forms Submissions
CREATE TABLE IF NOT EXISTS bonafide_forms (
  id               TEXT PRIMARY KEY, -- Deterministic ID: ROLLNO_PURPOSE_DATE
  form_data        JSONB NOT NULL,   -- Contains all submitted form field values dynamically
  downloaded       BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Read Replica performance
CREATE INDEX IF NOT EXISTS idx_bonafide_rollno ON bonafide_forms ((form_data->>'rollno'));
CREATE INDEX IF NOT EXISTS idx_bonafide_name ON bonafide_forms (lower(form_data->>'name'));
CREATE INDEX IF NOT EXISTS idx_bonafide_created_at ON bonafide_forms (created_at DESC);

-- Application Logs for dev diagnostic route
CREATE TABLE IF NOT EXISTS app_logs (
  id          BIGSERIAL PRIMARY KEY,
  level       TEXT NOT NULL,
  message     TEXT NOT NULL,
  meta        JSONB DEFAULT '{}',
  request_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON app_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON app_logs (level);

-- Seed Initial Form Fields (matching EJS forms)
INSERT INTO form_fields (key, label, field_type, options, placeholder, hint, required, sort_order) VALUES
('title', 'Mr/Ms', 'select', '["Mr", "Ms"]', '', '', true, 1),
('name', 'Name (Initial at last)', 'text', '[]', 'e.g., RAMESH R', 'Enter your name with the initial at the end.', true, 2),
('rollno', 'Roll No', 'text', '[]', 'e.g., 660000', 'Please enter your Roll Number. Do not enter Register Number.', true, 3),
('relation', 'S/o or D/o', 'select', '["S/o ", "D/o "]', '', '', true, 4),
('parentName', 'Parent Name (including initial)', 'text', '[]', 'e.g., R. Ramesh', 'Parent initial should come first followed by name.', true, 5),
('year', 'Year of study', 'select', '["I", "II", "III", "IV", "V"]', '', '', true, 6),
('course', 'Course', 'select', '["B.E.", "B.Tech.", "B.Arch.", "M.E.", "M.Tech.", "M.C.A.", "M.Sc."]', '', '', true, 7),
('branch', 'Branch', 'text', '[]', 'e.g., Civil Engineering', '', true, 8),
('certificateFor', 'Certificate For', 'select', '["Scholarship", "Passport", "Education Loan", "Bus Pass", "Other"]', '', '', true, 9),
('scholarshipType', 'Scholarship Type (If Scholarship selected)', 'text', '[]', 'e.g., Post Metric Scholarship', 'Required if you chose Scholarship.', false, 10)
ON CONFLICT (key) DO NOTHING;
