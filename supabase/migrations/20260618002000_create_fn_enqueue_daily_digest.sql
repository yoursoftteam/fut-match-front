-- Parti2 Bet - Enqueue Daily Digest (9:00 AM COL) — AGGREGATED per user
-- Runs daily at 14:00 UTC via pg_cron
-- ONE queue item per user — all pools with tier, stats, leaderboard

CREATE OR REPLACE FUNCTION fn_enqueue_daily_digests()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_tournament_id uuid;
  v_inserted integer := 0;
BEGIN
  SELECT id INTO v_tournament_id
  FROM bet_tournaments WHERE status = 'active' LIMIT 1;
  IF v_tournament_id IS NULL THEN RETURN 0; END IF;

  WITH
  exactas AS (
    SELECT bmp.user_id, bmp.pool_id, COUNT(*)::int AS exact_count
    FROM bet_match_predictions bmp
    JOIN bet_matches bm ON bm.id = bmp.match_id
      AND bm.home_score_official = bmp.home_score_predicted
      AND bm.away_score_official = bmp.away_score_predicted
      AND bm.status = 'finished'
    WHERE bmp.mode = 'pool'
    GROUP BY bmp.user_id, bmp.pool_id
  ),
  ranked AS (
    SELECT bsa.user_id, bsa.pool_id, bsa.points_total,
      bp.name AS pool_name, u.email,
      COALESCE(u.raw_user_meta_data->>'alias', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email) AS display_name,
      COALESCE(ex.exact_count, 0) AS exact_predictions,
      ROW_NUMBER() OVER (PARTITION BY bsa.pool_id ORDER BY bsa.points_total DESC, COALESCE(ex.exact_count, 0) DESC, u.email ASC) AS rank_pos,
      COUNT(*) OVER (PARTITION BY bsa.pool_id) AS total_members
    FROM bet_scores_aggregate bsa
    JOIN bet_pools bp ON bp.id = bsa.pool_id
    JOIN auth.users u ON u.id = bsa.user_id
    LEFT JOIN exactas ex ON ex.user_id = bsa.user_id AND ex.pool_id = bsa.pool_id
    WHERE bsa.mode = 'pool' AND bp.tournament_id = v_tournament_id
  ),
  tiered AS (
    SELECT *,
      CASE
        WHEN rank_pos <= 3 THEN 'top3'
        WHEN rank_pos > total_members - 2 THEN 'bottom2'
        ELSE 'mid'
      END::varchar AS tier
    FROM ranked
  ),
  leaderboard AS (
    SELECT pool_id,
      jsonb_agg(
        jsonb_build_object('rank', rank_pos, 'user_email', email, 'display_name', display_name, 'user_id', user_id, 'points', points_total, 'exact_predictions', exact_predictions)
        ORDER BY rank_pos
      ) AS entries
    FROM tiered
    GROUP BY pool_id
  ),
  user_pools_agg AS (
    SELECT t.user_id, t.email,
      jsonb_agg(
        jsonb_build_object(
          'pool_id', t.pool_id,
          'pool_name', t.pool_name,
          'pool_url', 'https://parti2.app/bet/pools/' || t.pool_id,
          'points', t.points_total,
          'rank', t.rank_pos,
          'total_members', t.total_members,
          'tier', t.tier,
          'leaderboard', COALESCE(lb.entries, '[]'::jsonb)
        )
        ORDER BY t.rank_pos
      ) AS pools
    FROM tiered t
    JOIN leaderboard lb ON lb.pool_id = t.pool_id
    GROUP BY t.user_id, t.email
  )
  INSERT INTO bet_notification_queue (user_id, email, notification_type, payload, idempotency_key, send_at, max_attempts)
  SELECT user_id, email,
    'daily_digest'::varchar,
    jsonb_build_object('pools', pools, 'user_email', email),
    'digest_agg:' || user_id || ':' || TO_CHAR(NOW(), 'YYYY-MM-DD'),
    NOW(), 5
  FROM user_pools_agg
  ON CONFLICT (idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
