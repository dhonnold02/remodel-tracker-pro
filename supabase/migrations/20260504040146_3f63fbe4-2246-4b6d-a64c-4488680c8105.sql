
CREATE TABLE public.invite_codes (
  code text PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous + authenticated users to read codes so signup can validate.
CREATE POLICY "Anyone can read invite codes"
  ON public.invite_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.invite_codes (code) VALUES ('MAVSIGHTLINE'), ('AMAZED123');
