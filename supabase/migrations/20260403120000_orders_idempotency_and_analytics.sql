-- Run in Supabase SQL editor or via CLI if you use migrations.
-- 1) Idempotent checkout (optional column + index)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_uidx
  ON public.orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2) Lightweight analytics (optional)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON public.analytics_events (created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Authenticated: server sets user_id from JWT — must match auth.uid()
DROP POLICY IF EXISTS "analytics_insert_authenticated" ON public.analytics_events;
CREATE POLICY "analytics_insert_authenticated"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Anonymous: optional events (e.g. browse) with null user_id only
DROP POLICY IF EXISTS "analytics_insert_anon" ON public.analytics_events;
CREATE POLICY "analytics_insert_anon"
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Optional: service role / dashboard reads — adjust for your org
-- DROP POLICY IF EXISTS "analytics_select_admin" ON public.analytics_events;
-- CREATE POLICY "analytics_select_admin" ...
