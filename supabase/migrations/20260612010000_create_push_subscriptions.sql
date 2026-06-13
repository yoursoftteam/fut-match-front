-- Stores FCM tokens per match so the push worker can send individual pushes.
-- This replaces the deprecated IID topic subscription approach.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id  UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_match_id
  ON public.push_subscriptions (match_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert) and unsubscribe (delete).
DROP POLICY IF EXISTS "anyone can subscribe" ON public.push_subscriptions;
CREATE POLICY "anyone can subscribe"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "anyone can unsubscribe" ON public.push_subscriptions;
CREATE POLICY "anyone can unsubscribe"
  ON public.push_subscriptions
  FOR DELETE
  USING (true);

-- Worker reads via service role key (bypasses RLS), so no SELECT policy needed.
