-- V2 Roles and Scopes Migration
-- Inserts V2 roles into the roles table and adds regional scope columns (state, district) to users.

-- 1. Insert new V2 roles
INSERT INTO roles (id, name, description)
VALUES 
  ('NATIONAL_AUTHORITY', 'National Authority', 'National oversight and clearinghouse monitoring scope'),
  ('STATE_AUTHORITY', 'State Authority', 'State-level sovereign monitoring and project oversight'),
  ('DISTRICT_AUTHORITY', 'District Authority', 'District-level acquisition supervisor and collectorate scope'),
  ('COMPENSATION_OFFICER', 'Compensation Officer', 'Land acquisition compensation assessment and payment officer'),
  ('POSSESSION_OFFICER', 'Possession Officer', 'Physical land possession and field clearing officer')
ON CONFLICT (id) DO NOTHING;

-- 2. Extend users table with state and district scoping columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'state') THEN
    ALTER TABLE users ADD COLUMN state VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'district') THEN
    ALTER TABLE users ADD COLUMN district VARCHAR(100);
  END IF;
END $$;
