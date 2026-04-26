ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS notify_tasks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_notes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_invoices boolean NOT NULL DEFAULT false;