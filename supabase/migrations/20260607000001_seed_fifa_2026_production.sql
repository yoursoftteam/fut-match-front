-- Seed FIFA 2026 tournament for production (idempotent)
INSERT INTO bet_tournaments (name, slug, status, kickoff_inaugural_at)
SELECT 'Copa Mundial de la FIFA 2026', 'fifa-2026', 'draft', '2026-06-15 14:00:00+00'
WHERE NOT EXISTS (SELECT 1 FROM bet_tournaments WHERE slug = 'fifa-2026');
