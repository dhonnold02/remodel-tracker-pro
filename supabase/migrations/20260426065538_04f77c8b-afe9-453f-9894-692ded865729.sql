ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;