-- Parti2 Bet Module - Tournament Stats View
-- Version: 1.0
-- Date: 2026-06-03
-- Description: Materialized view that aggregates tournament statistics from bet_matches
--              Used by the /bet page to display dynamic tournament info

CREATE OR REPLACE VIEW bet_tournament_stats AS
SELECT
  t.id AS tournament_id,
  t.slug,
  t.name AS tournament_name,
  COALESCE(
    (SELECT COUNT(DISTINCT team_id) FROM (
      SELECT m.home_team_id AS team_id FROM bet_matches m WHERE m.tournament_id = t.id
      UNION
      SELECT m.away_team_id AS team_id FROM bet_matches m WHERE m.tournament_id = t.id
    ) AS all_teams),
  0) AS total_teams,
  COALESCE(
    (SELECT COUNT(DISTINCT m.group_name) FROM bet_matches m WHERE m.tournament_id = t.id AND m.stage = 'group_stage'),
  0) AS total_groups,
  COALESCE(
    (SELECT COUNT(*) FROM bet_matches m WHERE m.tournament_id = t.id AND m.stage = 'group_stage'),
  0) AS group_stage_matches,
  COALESCE(
    (SELECT COUNT(*) FROM bet_matches m WHERE m.tournament_id = t.id AND m.stage != 'group_stage'),
  0) AS knockout_stage_matches,
  COALESCE(
    (SELECT COUNT(*) FROM bet_matches m WHERE m.tournament_id = t.id AND m.status = 'finished'),
  0) AS matches_completed,
  COALESCE(
    (SELECT COUNT(*) FROM bet_matches m WHERE m.tournament_id = t.id AND m.status = 'live'),
  0) AS matches_live,
  COALESCE(
    (SELECT COUNT(*) FROM bet_matches m WHERE m.tournament_id = t.id AND m.status = 'scheduled'),
  0) AS matches_scheduled,
  COALESCE(
    (SELECT COUNT(*) FROM bet_matches m WHERE m.tournament_id = t.id),
  0) AS total_matches
FROM bet_tournaments t;

COMMENT ON VIEW bet_tournament_stats IS 'Aggregated tournament statistics for the bet module dashboard';
