ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS primary_contact_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS primary_contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS primary_contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_contact_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS secondary_contact_email text NOT NULL DEFAULT '';