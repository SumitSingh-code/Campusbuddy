-- Contributors table for the Contribution Wall
CREATE TABLE IF NOT EXISTS contributors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  role       TEXT NOT NULL,
  dept       TEXT,
  detail     TEXT NOT NULL,
  photo_url  TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read (no auth required for About page)
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_contributors" ON contributors FOR SELECT USING (true);
CREATE POLICY "admin_write_contributors" ON contributors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator','super_admin'))
);

-- Seed the founder
INSERT INTO contributors (name, role, dept, detail, sort_order)
VALUES ('Sumit Singh', 'Founder & Developer', 'CRSU, Jind', 'Ideated, designed, and built the entire Unigram platform from scratch to connect CRSU students.', 0)
ON CONFLICT DO NOTHING;
