-- Parti2 Bet - Fix ranking tiebreakers: exact_predictions DESC as 2nd sort
-- Affects: fn_get_global_leaderboard, vw_bet_global_leaderboard, fn_get_pool_leaderboard

-- 1) Global leaderboard function
CREATE OR REPLACE FUNCTION fn_get_global_leaderboard(p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE(rank INT, user_id UUID, points_total INT, matches_predicted INT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY bsa.points_total DESC, ex.exact_count DESC, u.email ASC)::INT,
    bsa.user_id,
    bsa.points_total,
    COUNT(DISTINCT bmp.match_id)::INT
  FROM bet_scores_aggregate bsa
  LEFT JOIN bet_match_predictions bmp
    ON bmp.user_id = bsa.user_id AND bmp.mode = 'global'
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS exact_count
    FROM bet_match_predictions bp
    JOIN bet_matches bm ON bm.id = bp.match_id
      AND bm.home_score_official = bp.home_score_predicted
      AND bm.away_score_official = bp.away_score_predicted
      AND bm.status = 'finished'
    WHERE bp.user_id = bsa.user_id AND bp.mode = 'global'
  ) ex ON true
  JOIN auth.users u ON u.id = bsa.user_id
  WHERE bsa.mode = 'global'
  GROUP BY bsa.user_id, bsa.points_total, ex.exact_count, u.email
  ORDER BY bsa.points_total DESC, ex.exact_count DESC, u.email ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 2) Global leaderboard view (used by some queries)
DROP VIEW IF EXISTS vw_bet_global_leaderboard;
CREATE VIEW vw_bet_global_leaderboard
WITH (security_invoker = true)
AS
SELECT
  ROW_NUMBER() OVER (ORDER BY bsa.points_total DESC, ex.exact_count DESC, u.email ASC) as rank,
  bsa.user_id,
  bsa.points_total,
  COUNT(DISTINCT bmp.match_id) as matches_predicted
FROM bet_scores_aggregate bsa
LEFT JOIN bet_match_predictions bmp ON bmp.user_id = bsa.user_id AND bmp.mode = 'global'
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS exact_count
  FROM bet_match_predictions bp
  JOIN bet_matches bm ON bm.id = bp.match_id
    AND bm.home_score_official = bp.home_score_predicted
    AND bm.away_score_official = bp.away_score_predicted
    AND bm.status = 'finished'
  WHERE bp.user_id = bsa.user_id AND bp.mode = 'global'
) ex ON true
JOIN auth.users u ON u.id = bsa.user_id
WHERE bsa.mode = 'global'
GROUP BY bsa.user_id, bsa.points_total, ex.exact_count, u.email
ORDER BY bsa.points_total DESC, ex.exact_count DESC, u.email ASC;

-- 3) Pool leaderboard function
CREATE OR REPLACE FUNCTION fn_get_pool_leaderboard(p_pool_id UUID, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE(rank INT, user_id UUID, points_total INT, joined_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY bsa.points_total DESC, ex.exact_count DESC, u.email ASC)::INT,
    bsa.user_id,
    bsa.points_total,
    bpm.joined_at
  FROM bet_scores_aggregate bsa
  INNER JOIN bet_pool_members bpm
    ON bsa.user_id = bpm.user_id
    AND bpm.pool_id = p_pool_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS exact_count
    FROM bet_match_predictions bp
    JOIN bet_matches bm ON bm.id = bp.match_id
      AND bm.home_score_official = bp.home_score_predicted
      AND bm.away_score_official = bp.away_score_predicted
      AND bm.status = 'finished'
    WHERE bp.user_id = bsa.user_id AND bp.mode = 'pool' AND bp.pool_id = p_pool_id
  ) ex ON true
  JOIN auth.users u ON u.id = bsa.user_id
  WHERE bsa.pool_id = p_pool_id AND bsa.mode = 'pool'
  ORDER BY bsa.points_total DESC, ex.exact_count DESC, u.email ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
