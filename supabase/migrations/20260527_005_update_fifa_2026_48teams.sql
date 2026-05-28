-- Parti2 Bet Module - Update Seed Data: FIFA 2026 Tournament with 48 Teams
-- Version: 2.0
-- Date: 2026-05-27
-- Description: Updates FIFA 2026 tournament with 48 teams (12 groups of 4) and 72 group stage matches

-- =============================================================================
-- BACKFILL: Delete old 32-team data and replace with 48-team format
-- =============================================================================

-- Delete old matches (if any)
DELETE FROM bet_matches WHERE tournament_id = (SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026');

-- Delete old teams (if any)
DELETE FROM bet_teams;

-- =============================================================================
-- 1. INSERT 48 TEAMS
-- =============================================================================

INSERT INTO bet_teams (name, fifa_code, flag_svg_url) VALUES
-- GRUPO A (Grupo A): México, Sudáfrica, Corea del Sur, República Checa
('México', 'MEX', 'https://flagcdn.com/w320/mx.png'),
('Sudáfrica', 'RSA', 'https://flagcdn.com/w320/za.png'),
('Corea del Sur', 'KOR', 'https://flagcdn.com/w320/kr.png'),
('República Checa', 'CZE', 'https://flagcdn.com/w320/cz.png'),

-- GRUPO B: Canadá, Bosnia y Herzegovina, Qatar, Suiza
('Canadá', 'CAN', 'https://flagcdn.com/w320/ca.png'),
('Bosnia y Herzegovina', 'BIH', 'https://flagcdn.com/w320/ba.png'),
('Qatar', 'QAT', 'https://flagcdn.com/w320/qa.png'),
('Suiza', 'SUI', 'https://flagcdn.com/w320/ch.png'),

-- GRUPO C: Brasil, Marruecos, Haití, Escocia
('Brasil', 'BRA', 'https://flagcdn.com/w320/br.png'),
('Marruecos', 'MAR', 'https://flagcdn.com/w320/ma.png'),
('Haití', 'HTI', 'https://flagcdn.com/w320/ht.png'),
('Escocia', 'SCO', 'https://flagcdn.com/w320/gb-sct.png'),

-- GRUPO D: Estados Unidos, Paraguay, Australia, Turquía
('Estados Unidos', 'USA', 'https://flagcdn.com/w320/us.png'),
('Paraguay', 'PAR', 'https://flagcdn.com/w320/py.png'),
('Australia', 'AUS', 'https://flagcdn.com/w320/au.png'),
('Turquía', 'TUR', 'https://flagcdn.com/w320/tr.png'),

-- GRUPO E: Alemania, Curazao, Costa de Marfil, Ecuador
('Alemania', 'GER', 'https://flagcdn.com/w320/de.png'),
('Curazao', 'CUW', 'https://flagcdn.com/w320/cw.png'),
('Costa de Marfil', 'CIV', 'https://flagcdn.com/w320/ci.png'),
('Ecuador', 'ECU', 'https://flagcdn.com/w320/ec.png'),

-- GRUPO F: Países Bajos, Japón, Suecia, Túnez
('Países Bajos', 'NED', 'https://flagcdn.com/w320/nl.png'),
('Japón', 'JPN', 'https://flagcdn.com/w320/jp.png'),
('Suecia', 'SWE', 'https://flagcdn.com/w320/se.png'),
('Túnez', 'TUN', 'https://flagcdn.com/w320/tn.png'),

-- GRUPO G: Bélgica, Egipto, Irán, Nueva Zelanda
('Bélgica', 'BEL', 'https://flagcdn.com/w320/be.png'),
('Egipto', 'EGY', 'https://flagcdn.com/w320/eg.png'),
('Irán', 'IRN', 'https://flagcdn.com/w320/ir.png'),
('Nueva Zelanda', 'NZL', 'https://flagcdn.com/w320/nz.png'),

-- GRUPO H: España, Cabo Verde, Arabia Saudita, Uruguay
('España', 'ESP', 'https://flagcdn.com/w320/es.png'),
('Cabo Verde', 'CPV', 'https://flagcdn.com/w320/cv.png'),
('Arabia Saudita', 'SAU', 'https://flagcdn.com/w320/sa.png'),
('Uruguay', 'URU', 'https://flagcdn.com/w320/uy.png'),

-- GRUPO I: Francia, Senegal, Irak, Noruega
('Francia', 'FRA', 'https://flagcdn.com/w320/fr.png'),
('Senegal', 'SEN', 'https://flagcdn.com/w320/sn.png'),
('Irak', 'IRQ', 'https://flagcdn.com/w320/iq.png'),
('Noruega', 'NOR', 'https://flagcdn.com/w320/no.png'),

-- GRUPO J: Argentina, Argelia, Austria, Jordania
('Argentina', 'ARG', 'https://flagcdn.com/w320/ar.png'),
('Argelia', 'ALG', 'https://flagcdn.com/w320/dz.png'),
('Austria', 'AUT', 'https://flagcdn.com/w320/at.png'),
('Jordania', 'JOR', 'https://flagcdn.com/w320/jo.png'),

-- GRUPO K: Portugal, República Democrática del Congo, Uzbekistán, Colombia
('Portugal', 'POR', 'https://flagcdn.com/w320/pt.png'),
('República Democrática del Congo', 'COD', 'https://flagcdn.com/w320/cd.png'),
('Uzbekistán', 'UZB', 'https://flagcdn.com/w320/uz.png'),
('Colombia', 'COL', 'https://flagcdn.com/w320/co.png'),

-- GRUPO L: Inglaterra, Croacia, Ghana, Panamá
('Inglaterra', 'ENG', 'https://flagcdn.com/w320/gb-eng.png'),
('Croacia', 'CRO', 'https://flagcdn.com/w320/hr.png'),
('Ghana', 'GHA', 'https://flagcdn.com/w320/gh.png'),
('Panamá', 'PAN', 'https://flagcdn.com/w320/pa.png');

-- Verify 48 teams inserted
SELECT COUNT(*) as total_teams FROM bet_teams;

-- =============================================================================
-- 2. GET TOURNAMENT ID
-- =============================================================================

\set tournament_id `SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1;`

-- =============================================================================
-- 3. CREATE HELPER FUNCTION
-- =============================================================================

CREATE TEMP FUNCTION get_team_id(code VARCHAR) 
RETURNS UUID AS $$
  SELECT id FROM bet_teams WHERE fifa_code = code LIMIT 1;
$$ LANGUAGE SQL;

-- =============================================================================
-- 4. FIFA 2026 GROUP STAGE FIXTURES (72 matches)
-- =============================================================================
-- Each group plays a round-robin: 4 teams × 3 matches per team ÷ 2 = 6 matches per group
-- Total: 12 groups × 6 matches = 72 matches

-- GROUP A: México, Sudáfrica, Corea del Sur, República Checa
INSERT INTO bet_matches (tournament_id, stage, group_name, kickoff_at, home_team_id, away_team_id, status)
VALUES
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-15 14:00:00+00', get_team_id('MEX'), get_team_id('RSA'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-15 17:00:00+00', get_team_id('KOR'), get_team_id('CZE'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-20 13:00:00+00', get_team_id('MEX'), get_team_id('CZE'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-20 16:00:00+00', get_team_id('RSA'), get_team_id('KOR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-26 20:00:00+00', get_team_id('CZE'), get_team_id('MEX'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-26 20:00:00+00', get_team_id('RSA'), get_team_id('KOR'), 'scheduled'::bet_match_status),

-- GROUP B: Canadá, Bosnia y Herzegovina, Qatar, Suiza
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-15 20:00:00+00', get_team_id('CAN'), get_team_id('BIH'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-15 23:00:00+00', get_team_id('QAT'), get_team_id('SUI'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-21 13:00:00+00', get_team_id('CAN'), get_team_id('QAT'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-21 16:00:00+00', get_team_id('BIH'), get_team_id('SUI'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-27 20:00:00+00', get_team_id('SUI'), get_team_id('CAN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-27 20:00:00+00', get_team_id('BIH'), get_team_id('QAT'), 'scheduled'::bet_match_status),

-- GROUP C: Brasil, Marruecos, Haití, Escocia
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-16 14:00:00+00', get_team_id('BRA'), get_team_id('MAR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-16 17:00:00+00', get_team_id('HTI'), get_team_id('SCO'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-21 19:00:00+00', get_team_id('BRA'), get_team_id('HTI'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-21 22:00:00+00', get_team_id('MAR'), get_team_id('SCO'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-27 17:00:00+00', get_team_id('SCO'), get_team_id('BRA'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-27 17:00:00+00', get_team_id('MAR'), get_team_id('HTI'), 'scheduled'::bet_match_status),

-- GROUP D: Estados Unidos, Paraguay, Australia, Turquía
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-16 20:00:00+00', get_team_id('USA'), get_team_id('PAR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-16 23:00:00+00', get_team_id('AUS'), get_team_id('TUR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-22 13:00:00+00', get_team_id('USA'), get_team_id('AUS'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-22 16:00:00+00', get_team_id('PAR'), get_team_id('TUR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-28 20:00:00+00', get_team_id('TUR'), get_team_id('USA'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-28 20:00:00+00', get_team_id('PAR'), get_team_id('AUS'), 'scheduled'::bet_match_status),

-- GROUP E: Alemania, Curazao, Costa de Marfil, Ecuador
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-17 14:00:00+00', get_team_id('GER'), get_team_id('CUW'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-17 17:00:00+00', get_team_id('CIV'), get_team_id('ECU'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-22 19:00:00+00', get_team_id('GER'), get_team_id('CIV'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-22 22:00:00+00', get_team_id('CUW'), get_team_id('ECU'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-28 17:00:00+00', get_team_id('ECU'), get_team_id('GER'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-28 17:00:00+00', get_team_id('CUW'), get_team_id('CIV'), 'scheduled'::bet_match_status),

-- GROUP F: Países Bajos, Japón, Suecia, Túnez
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-17 20:00:00+00', get_team_id('NED'), get_team_id('JPN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-17 23:00:00+00', get_team_id('SWE'), get_team_id('TUN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-23 13:00:00+00', get_team_id('NED'), get_team_id('SWE'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-23 16:00:00+00', get_team_id('JPN'), get_team_id('TUN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-29 20:00:00+00', get_team_id('TUN'), get_team_id('NED'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-29 20:00:00+00', get_team_id('JPN'), get_team_id('SWE'), 'scheduled'::bet_match_status),

-- GROUP G: Bélgica, Egipto, Irán, Nueva Zelanda
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-18 14:00:00+00', get_team_id('BEL'), get_team_id('EGY'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-18 17:00:00+00', get_team_id('IRN'), get_team_id('NZL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-23 19:00:00+00', get_team_id('BEL'), get_team_id('IRN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-23 22:00:00+00', get_team_id('EGY'), get_team_id('NZL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-29 17:00:00+00', get_team_id('NZL'), get_team_id('BEL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-29 17:00:00+00', get_team_id('EGY'), get_team_id('IRN'), 'scheduled'::bet_match_status),

-- GROUP H: España, Cabo Verde, Arabia Saudita, Uruguay
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-18 20:00:00+00', get_team_id('ESP'), get_team_id('CPV'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-18 23:00:00+00', get_team_id('SAU'), get_team_id('URU'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-24 13:00:00+00', get_team_id('ESP'), get_team_id('SAU'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-24 16:00:00+00', get_team_id('CPV'), get_team_id('URU'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-30 20:00:00+00', get_team_id('URU'), get_team_id('ESP'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-30 20:00:00+00', get_team_id('CPV'), get_team_id('SAU'), 'scheduled'::bet_match_status),

-- GROUP I: Francia, Senegal, Irak, Noruega
  (:tournament_id, 'group_stage'::bet_match_stage, 'I', '2026-06-19 14:00:00+00', get_team_id('FRA'), get_team_id('SEN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'I', '2026-06-19 17:00:00+00', get_team_id('IRQ'), get_team_id('NOR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'I', '2026-06-24 19:00:00+00', get_team_id('FRA'), get_team_id('IRQ'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'I', '2026-06-24 22:00:00+00', get_team_id('SEN'), get_team_id('NOR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'I', '2026-07-01 20:00:00+00', get_team_id('NOR'), get_team_id('FRA'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'I', '2026-07-01 20:00:00+00', get_team_id('SEN'), get_team_id('IRQ'), 'scheduled'::bet_match_status),

-- GROUP J: Argentina, Argelia, Austria, Jordania
  (:tournament_id, 'group_stage'::bet_match_stage, 'J', '2026-06-19 20:00:00+00', get_team_id('ARG'), get_team_id('ALG'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'J', '2026-06-19 23:00:00+00', get_team_id('AUT'), get_team_id('JOR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'J', '2026-06-25 13:00:00+00', get_team_id('ARG'), get_team_id('AUT'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'J', '2026-06-25 16:00:00+00', get_team_id('ALG'), get_team_id('JOR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'J', '2026-07-01 17:00:00+00', get_team_id('JOR'), get_team_id('ARG'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'J', '2026-07-01 17:00:00+00', get_team_id('ALG'), get_team_id('AUT'), 'scheduled'::bet_match_status),

-- GROUP K: Portugal, República Democrática del Congo, Uzbekistán, Colombia
  (:tournament_id, 'group_stage'::bet_match_stage, 'K', '2026-06-20 19:00:00+00', get_team_id('POR'), get_team_id('COD'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'K', '2026-06-20 22:00:00+00', get_team_id('UZB'), get_team_id('COL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'K', '2026-06-25 19:00:00+00', get_team_id('POR'), get_team_id('UZB'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'K', '2026-06-25 22:00:00+00', get_team_id('COD'), get_team_id('COL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'K', '2026-07-02 20:00:00+00', get_team_id('COL'), get_team_id('POR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'K', '2026-07-02 20:00:00+00', get_team_id('COD'), get_team_id('UZB'), 'scheduled'::bet_match_status),

-- GROUP L: Inglaterra, Croacia, Ghana, Panamá
  (:tournament_id, 'group_stage'::bet_match_stage, 'L', '2026-06-20 20:00:00+00', get_team_id('ENG'), get_team_id('CRO'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'L', '2026-06-20 23:00:00+00', get_team_id('GHA'), get_team_id('PAN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'L', '2026-06-26 13:00:00+00', get_team_id('ENG'), get_team_id('GHA'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'L', '2026-06-26 16:00:00+00', get_team_id('CRO'), get_team_id('PAN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'L', '2026-07-02 17:00:00+00', get_team_id('PAN'), get_team_id('ENG'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'L', '2026-07-02 17:00:00+00', get_team_id('CRO'), get_team_id('GHA'), 'scheduled'::bet_match_status);

-- Verify group stage matches (should be 72: 12 groups × 6 matches)
SELECT COUNT(*) as total_group_matches, 'Expected: 72' as note FROM bet_matches WHERE stage = 'group_stage'::bet_match_stage;

-- =============================================================================
-- 5. SUMMARY
-- =============================================================================

SELECT 
  'FIFA 2026 Tournament Updated' as status,
  COUNT(DISTINCT group_name) as total_groups,
  (SELECT COUNT(*) FROM bet_teams) as total_teams,
  (SELECT COUNT(*) FROM bet_matches WHERE stage = 'group_stage'::bet_match_stage) as group_stage_matches
FROM bet_matches
WHERE stage = 'group_stage'::bet_match_stage;

-- =============================================================================
-- NOTES
-- =============================================================================
-- - 48 teams updated (12 groups of 4 teams each)
-- - 72 group stage matches (6 matches per group)
-- - Knockout stage (32 teams: 2 first + 8 best third places) to be generated after group stage
-- - All matches scheduled with kickoff times
-- - All team flags from flagcdn.com
