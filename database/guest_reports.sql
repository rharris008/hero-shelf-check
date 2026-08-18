-- ============================================================
-- Hero Shelf Check — guest_reports table
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS guest_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz DEFAULT now(),
  store_id              uuid REFERENCES stores(id),
  store_name_manual     text,
  sku_id                text NOT NULL,
  sku_name              text NOT NULL,
  shelf_units           integer,
  is_oos                boolean DEFAULT false,
  comment               text,
  reporter_email        text,
  reporter_lat          double precision,
  reporter_lng          double precision,
  distance_to_store_m   double precision
);

ALTER TABLE guest_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a report (anon + authenticated)
CREATE POLICY "guest_reports_insert"
  ON guest_reports FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (admins/reps) can read reports
CREATE POLICY "guest_reports_select"
  ON guest_reports FOR SELECT
  USING (auth.role() = 'authenticated');

-- Ensure stores table allows anon reads (needed for geo matching without auth)
-- Run only if the policy doesn't already exist:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'stores_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY stores_public_read ON stores FOR SELECT USING (true)';
  END IF;
END $$;
