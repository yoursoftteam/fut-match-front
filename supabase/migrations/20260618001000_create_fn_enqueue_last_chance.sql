-- Parti2 Bet - Enqueue Last Chance Alerts (T-60 min) — AGGREGATED per user
-- Runs every 15 minutes via pg_cron
-- ONE queue item per user — all pools + pending matches in a single payload

CREATE OR REPLACE FUNCTION fn_enqueue_last_chance_alerts()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_tournament_id uuid;
  v_inserted integer := 0;
  v_window_tag text;
BEGIN
  SELECT id INTO v_tournament_id
  FROM bet_tournaments WHERE status = 'active' LIMIT 1;
  IF v_tournament_id IS NULL THEN RETURN 0; END IF;

  v_window_tag := TO_CHAR(
    date_trunc('hour', NOW())
      + INTERVAL '15 min' * FLOOR(EXTRACT(MINUTE FROM NOW()) / 15),
    'YYYY-MM-DD-HH24:MI'
  );

  WITH
  upcoming AS (
    SELECT m.id AS match_id, m.kickoff_at,
      ht.name AS home_team, at.name AS away_team,
      ht.flag_svg_url AS home_flag_url, at.flag_svg_url AS away_flag_url
    FROM bet_matches m
    JOIN bet_teams ht ON ht.id = m.home_team_id
    JOIN bet_teams at ON at.id = m.away_team_id
    WHERE m.tournament_id = v_tournament_id
      AND m.status = 'scheduled'
      AND m.kickoff_at BETWEEN NOW() + INTERVAL '55 minutes'
                           AND NOW() + INTERVAL '65 minutes'
  ),
  per_pool AS (
    SELECT bpm.user_id, u.email, bpm.pool_id, bp.name AS pool_name
    FROM bet_pool_members bpm
    JOIN bet_pools bp ON bp.id = bpm.pool_id
    JOIN auth.users u ON u.id = bpm.user_id
    WHERE bp.tournament_id = v_tournament_id AND bp.competition_type = 'pool'
  ),
  missing AS (
    SELECT pp.user_id, pp.email, pp.pool_id, pp.pool_name,
      row_to_json(up.*)::jsonb AS match_data
    FROM per_pool pp
    CROSS JOIN upcoming up
    WHERE NOT EXISTS (
      SELECT 1 FROM bet_match_predictions bmp
      WHERE bmp.user_id = pp.user_id
        AND bmp.match_id = up.match_id
        AND bmp.mode = 'pool'
        AND bmp.pool_id = pp.pool_id
    )
  ),
  pool_agg AS (
    SELECT user_id, email, pool_id, pool_name,
      COUNT(*) AS pending_count,
      (SELECT m2.match_data->>'match_id'
       FROM missing m2
       WHERE m2.user_id = m.user_id AND m2.pool_id = m.pool_id
       LIMIT 1) AS first_match_id,
      jsonb_agg(m.match_data ORDER BY (m.match_data->>'kickoff_at')::timestamptz) AS matches
    FROM missing m
    GROUP BY user_id, email, pool_id, pool_name
  ),
  user_agg AS (
    SELECT user_id, email,
      jsonb_agg(
        jsonb_build_object(
          'pool_id', pool_id,
          'pool_name', pool_name,
          'pending_count', pending_count,
          'predict_url', 'https://parti2.app/bet/pools/' || pool_id || '?match=' || first_match_id,
          'matches', matches
        )
      ) AS pools,
      SUM(pending_count) AS total_pending
    FROM pool_agg
    GROUP BY user_id, email
  )
  INSERT INTO bet_notification_queue (user_id, email, notification_type, payload, idempotency_key, send_at, max_attempts)
  SELECT user_id, email,
    'last_chance'::varchar,
    jsonb_build_object('pools', pools, 'total_pending', total_pending),
    'last_chance_agg:' || user_id || ':' || v_window_tag,
    NOW(), 5
  FROM user_agg
  ON CONFLICT (idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
