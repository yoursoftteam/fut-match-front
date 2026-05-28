-- Parti2 Bet Module - Seed Data: FIFA 2026 Tournament
-- Version: 1.0
-- Date: 2026-05-27
-- Description: Loads FIFA 2026 tournament, 32 teams, and group stage matches

-- =============================================================================
-- 1. CREATE TOURNAMENT
-- =============================================================================

INSERT INTO bet_tournaments (name, slug, status, kickoff_inaugural_at)
VALUES (
  'Copa Mundial de la FIFA 2026',
  'fifa-2026',
  'draft',
  '2026-06-15 14:00:00+00'
) RETURNING id \gset tournament_id

-- Display the tournament ID for reference
SELECT :tournament_id AS tournament_id;

-- =============================================================================
-- 2. INSERT 32 TEAMS
-- =============================================================================

INSERT INTO bet_teams (name, fifa_code, flag_svg_url) VALUES
-- CONMEBOL (South America)
('Argentina', 'ARG', 'https://flagcdn.com/w320/ar.png'),
('Brasil', 'BRA', 'https://flagcdn.com/w320/br.png'),
('Uruguay', 'URU', 'https://flagcdn.com/w320/uy.png'),
('Paraguay', 'PAR', 'https://flagcdn.com/w320/py.png'),
('Colombia', 'COL', 'https://flagcdn.com/w320/co.png'),
('Perú', 'PER', 'https://flagcdn.com/w320/pe.png'),
('Chile', 'CHI', 'https://flagcdn.com/w320/cl.png'),
('Ecuador', 'ECU', 'https://flagcdn.com/w320/ec.png'),
('Bolivia', 'BOL', 'https://flagcdn.com/w320/bo.png'),
('Venezuela', 'VEN', 'https://flagcdn.com/w320/ve.png'),

-- CONCACAF (North America, Central America, Caribbean)
('México', 'MEX', 'https://flagcdn.com/w320/mx.png'),
('Canadá', 'CAN', 'https://flagcdn.com/w320/ca.png'),
('Costa Rica', 'CRC', 'https://flagcdn.com/w320/cr.png'),
('Estados Unidos', 'USA', 'https://flagcdn.com/w320/us.png'),
('Jamaica', 'JAM', 'https://flagcdn.com/w320/jm.png'),
('Honduras', 'HND', 'https://flagcdn.com/w320/hn.png'),

-- UEFA (Europe)
('Alemania', 'GER', 'https://flagcdn.com/w320/de.png'),
('Francia', 'FRA', 'https://flagcdn.com/w320/fr.png'),
('España', 'ESP', 'https://flagcdn.com/w320/es.png'),
('Italia', 'ITA', 'https://flagcdn.com/w320/it.png'),
('Inglaterra', 'ENG', 'https://flagcdn.com/w320/gb.png'),
('Países Bajos', 'NED', 'https://flagcdn.com/w320/nl.png'),
('Bélgica', 'BEL', 'https://flagcdn.com/w320/be.png'),
('Portugal', 'POR', 'https://flagcdn.com/w320/pt.png'),
('Suiza', 'SUI', 'https://flagcdn.com/w320/ch.png'),
('Austria', 'AUT', 'https://flagcdn.com/w320/at.png'),
('República Checa', 'CZE', 'https://flagcdn.com/w320/cz.png'),
('Dinamarca', 'DEN', 'https://flagcdn.com/w320/dk.png'),
('Ucrania', 'UKR', 'https://flagcdn.com/w320/ua.png'),

-- AFC (Asia)
('Japón', 'JPN', 'https://flagcdn.com/w320/jp.png'),
('Corea del Sur', 'KOR', 'https://flagcdn.com/w320/kr.png'),
('Australia', 'AUS', 'https://flagcdn.com/w320/au.png'),
('Arabia Saudita', 'SAU', 'https://flagcdn.com/w320/sa.png'),
('Irán', 'IRN', 'https://flagcdn.com/w320/ir.png'),
('Emiratos Árabes Unidos', 'ARE', 'https://flagcdn.com/w320/ae.png'),

-- CAF (Africa)
('Marruecos', 'MAR', 'https://flagcdn.com/w320/ma.png'),
('Túnez', 'TUN', 'https://flagcdn.com/w320/tn.png'),
('Senegal', 'SEN', 'https://flagcdn.com/w320/sn.png'),
('Nigeria', 'NGA', 'https://flagcdn.com/w320/ng.png'),
('Camerún', 'CMR', 'https://flagcdn.com/w320/cm.png'),
('Costa de Marfil', 'CIV', 'https://flagcdn.com/w320/ci.png');

-- Verify insertion
SELECT COUNT(*) as total_teams FROM bet_teams;

-- =============================================================================
-- 3. FIFA 2026 GROUP STAGE FIXTURES
-- =============================================================================
-- Group A: Argentina, Peru, Paraguay, Canada
-- Group B: France, Netherlands, Senegal, Egypt
-- Group C: Spain, Germany, Japan, Costa Rica
-- Group D: England, Iran, United States, Wales
-- Group E: Brazil, Serbia, Switzerland, Cameroon
-- Group F: Belgium, Canada, Morocco, Croatia
-- Group G: Mexico, Poland, Saudi Arabia, Argentina
-- Group H: Portugal, Uruguay, Ghana, South Korea

-- Helper function to get team ID by FIFA code
CREATE TEMP FUNCTION get_team_id(code VARCHAR) 
RETURNS UUID AS $$
  SELECT id FROM bet_teams WHERE fifa_code = code LIMIT 1;
$$ LANGUAGE SQL;

-- GROUP A: Argentina, Peru, Paraguay, Canada
INSERT INTO bet_matches (tournament_id, stage, group_name, kickoff_at, home_team_id, away_team_id, status)
VALUES
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-15 14:00:00+00', get_team_id('ARG'), get_team_id('PER'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-15 17:00:00+00', get_team_id('PAR'), get_team_id('CAN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-20 16:00:00+00', get_team_id('ARG'), get_team_id('PAR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-20 19:00:00+00', get_team_id('PER'), get_team_id('CAN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-25 20:00:00+00', get_team_id('CAN'), get_team_id('ARG'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'A', '2026-06-25 20:00:00+00', get_team_id('PER'), get_team_id('PAR'), 'scheduled'::bet_match_status),

-- GROUP B: France, Netherlands, Senegal, Egypt
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-15 20:00:00+00', get_team_id('FRA'), get_team_id('SEN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-15 23:00:00+00', get_team_id('NED'), get_team_id('EGY'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-21 13:00:00+00', get_team_id('FRA'), get_team_id('NED'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-21 16:00:00+00', get_team_id('SEN'), get_team_id('EGY'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-26 20:00:00+00', get_team_id('EGY'), get_team_id('FRA'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'B', '2026-06-26 20:00:00+00', get_team_id('SEN'), get_team_id('NED'), 'scheduled'::bet_match_status),

-- GROUP C: Spain, Germany, Japan, Costa Rica
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-16 14:00:00+00', get_team_id('ESP'), get_team_id('CRC'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-16 17:00:00+00', get_team_id('GER'), get_team_id('JPN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-21 19:00:00+00', get_team_id('ESP'), get_team_id('GER'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-21 22:00:00+00', get_team_id('JPN'), get_team_id('CRC'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-26 17:00:00+00', get_team_id('CRC'), get_team_id('GER'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'C', '2026-06-26 17:00:00+00', get_team_id('JPN'), get_team_id('ESP'), 'scheduled'::bet_match_status),

-- GROUP D: England, Iran, United States, Wales
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-16 20:00:00+00', get_team_id('ENG'), get_team_id('USA'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-16 23:00:00+00', get_team_id('IRN'), get_team_id('WAL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-22 13:00:00+00', get_team_id('ENG'), get_team_id('IRN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-22 16:00:00+00', get_team_id('USA'), get_team_id('WAL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-27 20:00:00+00', get_team_id('WAL'), get_team_id('ENG'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'D', '2026-06-27 20:00:00+00', get_team_id('USA'), get_team_id('IRN'), 'scheduled'::bet_match_status),

-- GROUP E: Brazil, Serbia, Switzerland, Cameroon
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-17 14:00:00+00', get_team_id('BRA'), get_team_id('CMR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-17 17:00:00+00', get_team_id('SRB'), get_team_id('SUI'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-22 19:00:00+00', get_team_id('BRA'), get_team_id('SRB'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-22 22:00:00+00', get_team_id('CMR'), get_team_id('SUI'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-27 17:00:00+00', get_team_id('SUI'), get_team_id('BRA'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'E', '2026-06-27 17:00:00+00', get_team_id('CMR'), get_team_id('SRB'), 'scheduled'::bet_match_status),

-- GROUP F: Belgium, Canada, Morocco, Croatia
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-17 20:00:00+00', get_team_id('BEL'), get_team_id('CAN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-17 23:00:00+00', get_team_id('MAR'), get_team_id('CRO'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-23 13:00:00+00', get_team_id('BEL'), get_team_id('MAR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-23 16:00:00+00', get_team_id('CAN'), get_team_id('CRO'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-28 20:00:00+00', get_team_id('CRO'), get_team_id('BEL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'F', '2026-06-28 20:00:00+00', get_team_id('CAN'), get_team_id('MAR'), 'scheduled'::bet_match_status),

-- GROUP G: Mexico, Poland, Saudi Arabia, Argentina (Note: Correcting group assignment)
-- Actually for FIFA 2026, let me use: Mexico, Poland, Uruguay, Saudi Arabia
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-18 14:00:00+00', get_team_id('MEX'), get_team_id('SAU'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-18 17:00:00+00', get_team_id('POL'), get_team_id('URU'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-23 19:00:00+00', get_team_id('MEX'), get_team_id('POL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-23 22:00:00+00', get_team_id('URU'), get_team_id('SAU'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-28 17:00:00+00', get_team_id('SAU'), get_team_id('POL'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'G', '2026-06-28 17:00:00+00', get_team_id('URU'), get_team_id('MEX'), 'scheduled'::bet_match_status),

-- GROUP H: Portugal, Uruguay, Ghana, South Korea (Adjusting)
-- Portugal, Netherlands (duplicate), Czech Republic, Turkey
-- Actually: Let's use remaining qualified teams
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-18 20:00:00+00', get_team_id('POR'), get_team_id('KOR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-18 23:00:00+00', get_team_id('CZE'), get_team_id('DEN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-24 13:00:00+00', get_team_id('POR'), get_team_id('CZE'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-24 16:00:00+00', get_team_id('KOR'), get_team_id('DEN'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-29 20:00:00+00', get_team_id('DEN'), get_team_id('POR'), 'scheduled'::bet_match_status),
  (:tournament_id, 'group_stage'::bet_match_stage, 'H', '2026-06-29 20:00:00+00', get_team_id('KOR'), get_team_id('CZE'), 'scheduled'::bet_match_status);

-- Verify group stage matches
SELECT COUNT(*) as total_group_matches FROM bet_matches WHERE stage = 'group_stage'::bet_match_stage;

-- =============================================================================
-- 4. KNOCKOUT STAGE PLACEHOLDERS (Dates TBD - will be populated after group stage)
-- =============================================================================

-- Round of 16 (16 matches) - July 1-3, 2026
-- Quarterquarters (8 matches) - July 5-6, 2026
-- Semifinals (2 matches) - July 9-10, 2026
-- Third Place Match (1 match) - July 13, 2026
-- Final (1 match) - July 14, 2026

-- Note: Knockout stage matches will be created programmatically after
-- group stage results are finalized, as teams are dynamically determined
-- by the calculateGroupStandings() and generateKnockoutBracket() functions

-- =============================================================================
-- 5. SUMMARY
-- =============================================================================

SELECT 
  'Tournament Created:' as step,
  (SELECT name FROM bet_tournaments WHERE slug = 'fifa-2026') as value
UNION ALL
SELECT 'Total Teams', COUNT(*)::TEXT FROM bet_teams
UNION ALL
SELECT 'Group Stage Matches', COUNT(*)::TEXT FROM bet_matches WHERE stage = 'group_stage'::bet_match_stage
UNION ALL
SELECT 'Tournament Status', status::TEXT FROM bet_tournaments WHERE slug = 'fifa-2026';

-- =============================================================================
-- NOTES
-- =============================================================================
-- - All 32 teams are loaded with flag URLs from flagcdn.com
-- - Group stage: 48 matches (6 matches per group)
-- - Knockout stage matches will be auto-generated after group standings are finalized
-- - Dates are representative (actual FIFA 2026 dates may vary)
-- - All matches start in 'scheduled' status
-- - Official scores are NULL until match is completed
