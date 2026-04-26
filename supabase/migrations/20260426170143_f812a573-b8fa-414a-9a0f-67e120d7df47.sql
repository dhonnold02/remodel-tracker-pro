-- Add notify_calendar_events to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS notify_calendar_events boolean NOT NULL DEFAULT false;

-- Create scheduled_notifications table
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  event_id uuid,
  event_title text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'other',
  event_date timestamptz NOT NULL,
  notify_at timestamptz NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled notifications"
  ON public.scheduled_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own scheduled notifications"
  ON public.scheduled_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own scheduled notifications"
  ON public.scheduled_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own scheduled notifications"
  ON public.scheduled_notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user ON public.scheduled_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending ON public.scheduled_notifications(notify_at) WHERE sent = false;