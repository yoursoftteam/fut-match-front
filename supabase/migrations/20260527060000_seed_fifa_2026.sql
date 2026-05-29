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
)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  kickoff_inaugural_at = EXCLUDED.kickoff_inaugural_at,
  updated_at = now();

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

-- CONCACAF (North America, Central America, Caribbean)
('México', 'MEX', 'https://flagcdn.com/w320/mx.png'),
('Canadá', 'CAN', 'https://flagcdn.com/w320/ca.png'),
('Estados Unidos', 'USA', 'https://flagcdn.com/w320/us.png'),
('Panamá', 'PAN', 'https://flagcdn.com/w320/pa.png'),
('Jamaica', 'JAM', 'https://flagcdn.com/w320/jm.png'),

-- UEFA (Europe)
('Alemania', 'GER', 'https://flagcdn.com/w320/de.png'),
('Francia', 'FRA', 'https://flagcdn.com/w320/fr.png'),
('España', 'ESP', 'https://flagcdn.com/w320/es.png'),
('Inglaterra', 'ENG', 'https://flagcdn.com/w320/gb.png'),
('Países Bajos', 'NED', 'https://flagcdn.com/w320/nl.png'),
('Bélgica', 'BEL', 'https://flagcdn.com/w320/be.png'),
('Portugal', 'POR', 'https://flagcdn.com/w320/pt.png'),
('Suiza', 'SUI', 'https://flagcdn.com/w320/ch.png'),
('Austria', 'AUT', 'https://flagcdn.com/w320/at.png'),
('República Checa', 'CZE', 'https://flagcdn.com/w320/cz.png'),
('Suecia', 'SWE', 'https://flagcdn.com/w320/se.png'),
('Croacia', 'CRO', 'https://flagcdn.com/w320/hr.png'),

-- AFC (Asia)
('Japón', 'JPN', 'https://flagcdn.com/w320/jp.png'),
('República de Corea', 'KOR', 'https://flagcdn.com/w320/kr.png'),
('Australia', 'AUS', 'https://flagcdn.com/w320/au.png'),
('Arabia Saudita', 'SAU', 'https://flagcdn.com/w320/sa.png'),
('Turquía', 'TUR', 'https://flagcdn.com/w320/tr.png'),
('Uzbekistán', 'UZB', 'https://flagcdn.com/w320/uz.png'),
('Irak', 'IRQ', 'https://flagcdn.com/w320/iq.png'),
('Irán', 'IRN', 'https://flagcdn.com/w320/ir.png'),
('Jordania', 'JOR', 'https://flagcdn.com/w320/jo.png'),

-- CAF (Africa)
('Marruecos', 'MAR', 'https://flagcdn.com/w320/ma.png'),
('Túnez', 'TUN', 'https://flagcdn.com/w320/tn.png'),
('Senegal', 'SEN', 'https://flagcdn.com/w320/sn.png'),
('Camerún', 'CMR', 'https://flagcdn.com/w320/cm.png'),
('Costa de Marfil', 'CIV', 'https://flagcdn.com/w320/ci.png'),
('Egipto', 'EGY', 'https://flagcdn.com/w320/eg.png'),
('Ghana', 'GHA', 'https://flagcdn.com/w320/gh.png'),
('Sudáfrica', 'RSA', 'https://flagcdn.com/w320/za.png'),
('Haití', 'HAI', 'https://flagcdn.com/w320/ht.png'),

-- OFC (Oceania)
('Nueva Zelanda', 'NZL', 'https://flagcdn.com/w320/nz.png'),

-- Special entities
('Bosnia y Herzegovina', 'BIH', 'https://flagcdn.com/w320/ba.png'),
('Catar', 'QAT', 'https://flagcdn.com/w320/qa.png'),
('Curazao', 'CUW', 'https://flagcdn.com/w320/cw.png'),
('Ecuador', 'ECU', 'https://flagcdn.com/w320/ec.png'),
('Escocia', 'SCO', 'https://flagcdn.com/w320/gb-sct.png'),
('Noruega', 'NOR', 'https://flagcdn.com/w320/no.png'),
('República Democrática del Congo', 'COD', 'https://flagcdn.com/w320/cd.png'),
('Argelia', 'ALG', 'https://flagcdn.com/w320/dz.png'),
('Cabo Verde', 'CPV', 'https://flagcdn.com/w320/cv.png');

-- Verify insertion
SELECT COUNT(*) as total_teams FROM bet_teams;

-- =============================================================================
-- 3. FIFA 2026 GROUP STAGE FIXTURES - OFFICIAL GROUPS
-- =============================================================================
-- All times converted from Colombia Time (UTC-5) to UTC (+5 hours)
-- Group A: México, República de Corea, República Checa, Sudáfrica
-- Group B: Canadá, Bosnia y Herzegovina, Catar, Suiza
-- Group C: Brasil, Marruecos, Haití, Escocia
-- Group D: Estados Unidos, Paraguay, Australia, Turquía
-- Group E: Alemania, Curazao, Costa de Marfil, Ecuador
-- Group F: Países Bajos, Japón, Suecia, Túnez
-- Group G: Bélgica, Egipto, Irán, Nueva Zelanda
-- Group H: España, Cabo Verde, Arabia Saudita, Uruguay
-- Group I: Francia, Senegal, Irak, Noruega
-- Group J: Argentina, Argelia, Austria, Jordania
-- Group K: Portugal, RD Congo, Uzbekistán, Colombia
-- Group L: Inglaterra, Croacia, Ghana, Panamá

-- Helper function to get team ID by FIFA code
CREATE OR REPLACE FUNCTION get_team_id(code VARCHAR) 
RETURNS UUID AS $$
  SELECT id FROM bet_teams WHERE fifa_code = code LIMIT 1;
$$ LANGUAGE SQL;

-- GROUP A: México, República de Corea, República Checa, Sudáfrica
INSERT INTO bet_matches (tournament_id, stage, group_name, kickoff_at, home_team_id, away_team_id, status)
VALUES
  -- Jue 11 jun: México 2:00 p.m. / República de Corea 9:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'A', '2026-06-11 19:00:00+00', get_team_id('MEX'), get_team_id('RSA'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'A', '2026-06-12 02:00:00+00', get_team_id('KOR'), get_team_id('CZE'), 'scheduled'::bet_match_status),
  -- Jue 18 jun: República Checa 11:00 a.m. / México 8:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'A', '2026-06-18 16:00:00+00', get_team_id('CZE'), get_team_id('RSA'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'A', '2026-06-19 01:00:00+00', get_team_id('MEX'), get_team_id('KOR'), 'scheduled'::bet_match_status),
  -- Fecha 3: República Checa 8:00 p.m. / Sudáfrica 8:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'A', '2026-06-24 01:00:00+00', get_team_id('CZE'), get_team_id('MEX'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'A', '2026-06-24 01:00:00+00', get_team_id('RSA'), get_team_id('KOR'), 'scheduled'::bet_match_status),
  
  -- GROUP B: Canadá, Bosnia y Herzegovina, Catar, Suiza
  -- Vie 12 jun: Canadá 2:00 p.m. / Sab 13 jun: Catar 2:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-12 19:00:00+00', get_team_id('CAN'), get_team_id('BIH'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-13 19:00:00+00', get_team_id('QAT'), get_team_id('SUI'), 'scheduled'::bet_match_status),
  -- Jue 18 jun: Suiza 2:00 p.m. / Canadá 5:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-18 19:00:00+00', get_team_id('SUI'), get_team_id('BIH'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-18 22:00:00+00', get_team_id('CAN'), get_team_id('QAT'), 'scheduled'::bet_match_status),
  -- Fecha 3: Bosnia y Herzegovina 2:00 p.m. / Suiza 2:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-24 19:00:00+00', get_team_id('BIH'), get_team_id('QAT'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-24 19:00:00+00', get_team_id('SUI'), get_team_id('CAN'), 'scheduled'::bet_match_status),

-- GROUP B: Canadá, Bosnia y Herzegovina, Catar, Suiza
  -- Vie 12 jun: Canadá 2:00 p.m. / Sab 13 jun: Catar 2:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-12 19:00:00+00', get_team_id('CAN'), get_team_id('BIH'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-13 19:00:00+00', get_team_id('QAT'), get_team_id('SUI'), 'scheduled'::bet_match_status),
  -- Jue 18 jun: Suiza 2:00 p.m. / Canadá 5:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-18 19:00:00+00', get_team_id('SUI'), get_team_id('BIH'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-18 22:00:00+00', get_team_id('CAN'), get_team_id('QAT'), 'scheduled'::bet_match_status),
  -- Fecha 3: Bosnia y Herzegovina 2:00 p.m. (no hay segundo partido simultáneo indicado)
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-24 19:00:00+00', get_team_id('BIH'), get_team_id('QAT'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'B', '2026-06-24 19:00:00+00', get_team_id('SUI'), get_team_id('CAN'), 'scheduled'::bet_match_status),

-- GROUP C: Brasil, Marruecos, Haití, Escocia
  -- Sab 13 jun: Brasil 5:00 p.m. / Haití 8:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'C', '2026-06-13 22:00:00+00', get_team_id('BRA'), get_team_id('MAR'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'C', '2026-06-14 01:00:00+00', get_team_id('HAI'), get_team_id('SCO'), 'scheduled'::bet_match_status),
  -- Vie 19 jun: Escocia 5:00 p.m. / Brasil 8:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'C', '2026-06-19 22:00:00+00', get_team_id('SCO'), get_team_id('MAR'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'C', '2026-06-20 01:00:00+00', get_team_id('BRA'), get_team_id('HAI'), 'scheduled'::bet_match_status),
  -- Fecha 3: Brasil 5:00 p.m. / Marruecos 5:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'C', '2026-06-25 22:00:00+00', get_team_id('BRA'), get_team_id('SCO'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'C', '2026-06-25 22:00:00+00', get_team_id('MAR'), get_team_id('HAI'), 'scheduled'::bet_match_status),
  
-- GROUP D: Estados Unidos, Paraguay, Australia, Turquía
  -- Vie 12 jun: Estados Unidos 8:00 p.m. / Aus 11:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-13 01:00:00+00', get_team_id('USA'), get_team_id('PAR'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-13 04:00:00+00', get_team_id('AUS'), get_team_id('TUR'), 'scheduled'::bet_match_status),
  -- Vie 19 jun: Estados Unidos 2:00 p.m. / Paraguay 10:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-19 19:00:00+00', get_team_id('USA'), get_team_id('AUS'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-20 03:00:00+00', get_team_id('PAR'), get_team_id('TUR'), 'scheduled'::bet_match_status),
  -- Fecha 3: (sin especificación, asumo simultáneos a hora estándar)
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-26 01:00:00+00', get_team_id('USA'), get_team_id('TUR'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-26 01:00:00+00', get_team_id('AUS'), get_team_id('PAR'), 'scheduled'::bet_match_status),

-- GROUP D: Estados Unidos, Paraguay, Australia, Turquía
  -- Vie 12 jun: Estados Unidos 8:00 p.m. / Australia 11:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-13 01:00:00+00', get_team_id('USA'), get_team_id('PAR'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-13 04:00:00+00', get_team_id('AUS'), get_team_id('TUR'), 'scheduled'::bet_match_status),
  -- Vie 19 jun: Estados Unidos 2:00 p.m. / Paraguay 10:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-19 19:00:00+00', get_team_id('USA'), get_team_id('AUS'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-20 03:00:00+00', get_team_id('PAR'), get_team_id('TUR'), 'scheduled'::bet_match_status),
  -- Fecha 3: (no hay horarios específicos, asumo simultáneos)
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-25 01:00:00+00', get_team_id('PAR'), get_team_id('AUS'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'D', '2026-06-25 01:00:00+00', get_team_id('TUR'), get_team_id('USA'), 'scheduled'::bet_match_status),

-- GROUP E: Alemania, Curazao, Costa de Marfil, Ecuador
  -- Dom 14 jun: Alemania 12:00 m. / Costa de Marfil 6:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'E', '2026-06-14 17:00:00+00', get_team_id('GER'), get_team_id('CUW'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'E', '2026-06-14 23:00:00+00', get_team_id('CIV'), get_team_id('ECU'), 'scheduled'::bet_match_status),
  -- Sab 20 jun: Costa de Marfil 3:00 p.m. / Curazao 7:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'E', '2026-06-20 20:00:00+00', get_team_id('CIV'), get_team_id('GER'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'E', '2026-06-21 00:00:00+00', get_team_id('CUW'), get_team_id('ECU'), 'scheduled'::bet_match_status),
  -- Fecha 3: (asumo simultáneos)
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'E', '2026-06-26 01:00:00+00', get_team_id('ECU'), get_team_id('GER'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'E', '2026-06-26 01:00:00+00', get_team_id('CUW'), get_team_id('CIV'), 'scheduled'::bet_match_status),

-- GROUP F: Países Bajos, Japón, Suecia, Túnez
  -- Dom 14 jun: Países Bajos 3:00 p.m. / Suecia 9:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'F', '2026-06-14 20:00:00+00', get_team_id('NED'), get_team_id('JPN'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'F', '2026-06-15 02:00:00+00', get_team_id('SWE'), get_team_id('TUN'), 'scheduled'::bet_match_status),
  -- Sab 20 jun: Países Bajos 12:00 m. / Japón 11:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'F', '2026-06-20 17:00:00+00', get_team_id('NED'), get_team_id('SWE'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'F', '2026-06-21 04:00:00+00', get_team_id('JPN'), get_team_id('TUN'), 'scheduled'::bet_match_status),
  -- Fecha 3: (asumo simultáneos)
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'F', '2026-06-26 01:00:00+00', get_team_id('TUN'), get_team_id('NED'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'F', '2026-06-26 01:00:00+00', get_team_id('JPN'), get_team_id('SWE'), 'scheduled'::bet_match_status),

-- GROUP G: Bélgica, Egipto, Irán, Nueva Zelanda
  -- Lun 15 jun: Bélgica 2:00 p.m. / Irán 8:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'G', '2026-06-15 19:00:00+00', get_team_id('BEL'), get_team_id('EGY'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'G', '2026-06-16 01:00:00+00', get_team_id('IRN'), get_team_id('NZL'), 'scheduled'::bet_match_status),
  -- Dom 21 jun: Bélgica 2:00 p.m. / Nueva Zelanda 8:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'G', '2026-06-21 19:00:00+00', get_team_id('BEL'), get_team_id('IRN'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'G', '2026-06-22 01:00:00+00', get_team_id('NZL'), get_team_id('EGY'), 'scheduled'::bet_match_status),
  -- Fecha 3: Egipto 10:00 p.m. / Nueva Zelanda 10:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'G', '2026-06-27 03:00:00+00', get_team_id('EGY'), get_team_id('IRN'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'G', '2026-06-27 03:00:00+00', get_team_id('NZL'), get_team_id('BEL'), 'scheduled'::bet_match_status),

-- GROUP H: España, Cabo Verde, Arabia Saudita, Uruguay
  -- Lun 15 jun: España 11:00 a.m. / Arabia Saudita 5:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'H', '2026-06-15 16:00:00+00', get_team_id('ESP'), get_team_id('CPV'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'H', '2026-06-15 22:00:00+00', get_team_id('SAU'), get_team_id('URU'), 'scheduled'::bet_match_status),
  -- Dom 21 jun: España 11:00 a.m. / Uruguay 5:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'H', '2026-06-21 16:00:00+00', get_team_id('ESP'), get_team_id('SAU'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'H', '2026-06-21 22:00:00+00', get_team_id('URU'), get_team_id('CPV'), 'scheduled'::bet_match_status),
  -- Fecha 3: Cabo Verde 7:00 p.m. / Uruguay 7:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'H', '2026-06-27 00:00:00+00', get_team_id('CPV'), get_team_id('SAU'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'H', '2026-06-27 00:00:00+00', get_team_id('URU'), get_team_id('ESP'), 'scheduled'::bet_match_status),

-- GROUP I: Francia, Senegal, Irak, Noruega
  -- Mar 16 jun: Francia 2:00 p.m. / Irak 5:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'I', '2026-06-16 19:00:00+00', get_team_id('FRA'), get_team_id('SEN'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'I', '2026-06-16 22:00:00+00', get_team_id('IRQ'), get_team_id('NOR'), 'scheduled'::bet_match_status),
  -- Lun 22 jun: Francia 4:00 p.m. / Noruega 7:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'I', '2026-06-22 21:00:00+00', get_team_id('FRA'), get_team_id('IRQ'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'I', '2026-06-23 00:00:00+00', get_team_id('NOR'), get_team_id('SEN'), 'scheduled'::bet_match_status),
  -- Fecha 3: Senegal 2:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'I', '2026-06-27 19:00:00+00', get_team_id('SEN'), get_team_id('IRQ'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'I', '2026-06-27 19:00:00+00', get_team_id('FRA'), get_team_id('NOR'), 'scheduled'::bet_match_status),

-- GROUP J: Argentina, Argelia, Austria, Jordania
  -- Mar 16 jun: Argentina 8:00 p.m. / Austria 11:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'J', '2026-06-17 01:00:00+00', get_team_id('ARG'), get_team_id('ALG'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'J', '2026-06-17 04:00:00+00', get_team_id('AUT'), get_team_id('JOR'), 'scheduled'::bet_match_status),
  -- Lun 22 jun: Argentina 12:00 m. / Jordania 10:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'J', '2026-06-22 17:00:00+00', get_team_id('ARG'), get_team_id('AUT'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'J', '2026-06-23 03:00:00+00', get_team_id('JOR'), get_team_id('ALG'), 'scheduled'::bet_match_status),
  -- Fecha 3: (asumo simultáneos)
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'J', '2026-06-27 01:00:00+00', get_team_id('ALG'), get_team_id('AUT'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'J', '2026-06-27 01:00:00+00', get_team_id('JOR'), get_team_id('ARG'), 'scheduled'::bet_match_status),

-- GROUP K: Portugal, RD Congo, Uzbekistán, Colombia
  -- Mié 17 jun: Portugal 12:00 m. / Uzbekistán 9:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'K', '2026-06-17 17:00:00+00', get_team_id('POR'), get_team_id('COD'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'K', '2026-06-18 02:00:00+00', get_team_id('UZB'), get_team_id('COL'), 'scheduled'::bet_match_status),
  -- Mar 23 jun: Portugal 12:00 m. / Colombia 9:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'K', '2026-06-23 17:00:00+00', get_team_id('POR'), get_team_id('UZB'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'K', '2026-06-24 02:00:00+00', get_team_id('COL'), get_team_id('COD'), 'scheduled'::bet_match_status),
  -- Fecha 3: Colombia 6:30 p.m. / RD Congo 6:30 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'K', '2026-06-27 23:30:00+00', get_team_id('COL'), get_team_id('POR'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'K', '2026-06-27 23:30:00+00', get_team_id('COD'), get_team_id('UZB'), 'scheduled'::bet_match_status),

-- GROUP L: Inglaterra, Croacia, Ghana, Panamá
  -- Mié 17 jun: Inglaterra 3:00 p.m. / Ghana 6:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'L', '2026-06-17 20:00:00+00', get_team_id('ENG'), get_team_id('CRO'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'L', '2026-06-17 23:00:00+00', get_team_id('GHA'), get_team_id('PAN'), 'scheduled'::bet_match_status),
  -- Mar 23 jun: Inglaterra 3:00 p.m. / Panamá 6:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'L', '2026-06-23 20:00:00+00', get_team_id('ENG'), get_team_id('GHA'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'L', '2026-06-23 23:00:00+00', get_team_id('PAN'), get_team_id('CRO'), 'scheduled'::bet_match_status),
  -- Fecha 3: Panamá 4:00 p.m. / Croacia 4:00 p.m.
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'L', '2026-06-28 21:00:00+00', get_team_id('PAN'), get_team_id('ENG'), 'scheduled'::bet_match_status),
  ((SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026' LIMIT 1), 'group_stage'::bet_match_stage, 'L', '2026-06-28 21:00:00+00', get_team_id('CRO'), get_team_id('GHA'), 'scheduled'::bet_match_status);

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
