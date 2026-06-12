-- Parti2 Bet Module - Seed Data: FIFA 2026 Tournament
-- Version: 1.0
-- Date: 2026-05-28
-- Description: Creates the FIFA 2026 tournament row used by the match seed files

INSERT INTO bet_tournaments (
  name,
  slug,
  status,
  kickoff_inaugural_at
)
VALUES (
  'Copa Mundial de la FIFA 2026',
  'fifa-2026',
  'draft',
  '2026-06-15 14:00:00+00'
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  kickoff_inaugural_at = EXCLUDED.kickoff_inaugural_at,
  updated_at = NOW();

SELECT
  id,
  name,
  slug,
  status,
  kickoff_inaugural_at
FROM bet_tournaments
WHERE slug = 'fifa-2026';