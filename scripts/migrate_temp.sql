-- Match Telegram Groups
-- Date: 2026-06-04
-- Description: Maps Telegram group chats to matches for bot integration

BEGIN;

CREATE TABLE public.match_telegram_groups (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (match_id, chat_id)
);

CREATE INDEX idx_match_telegram_groups_chat_id ON public.match_telegram_groups(chat_id);

ALTER TABLE public.match_telegram_groups ENABLE ROW LEVEL SECURITY;

-- Anyone can view telegram links (chat_id is not sensitive, needed for bot lookups with anon key)
CREATE POLICY "Anyone can view telegram links" ON public.match_telegram_groups
  FOR SELECT USING (true);

-- Anyone can insert (bot uses service role, but allow anon for flexibility)
CREATE POLICY "Anyone can link telegram group" ON public.match_telegram_groups
  FOR INSERT WITH CHECK (true);

-- Match owners can unlink
CREATE POLICY "Match owners can unlink telegram group" ON public.match_telegram_groups
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM matches WHERE id = match_id AND created_by = auth.uid())
  );

COMMIT;
