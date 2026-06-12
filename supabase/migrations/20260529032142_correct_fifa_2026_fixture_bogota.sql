-- Correct FIFA 2026 fixture for Parti2 Bet.
-- All local dates/times are Colombia/Bogota time (UTC-5).

BEGIN;

ALTER TABLE bet_matches
  ADD COLUMN IF NOT EXISTS fifa_match_number INT,
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS home_placeholder TEXT,
  ADD COLUMN IF NOT EXISTS away_placeholder TEXT;

ALTER TABLE bet_matches
  ALTER COLUMN home_team_id DROP NOT NULL,
  ALTER COLUMN away_team_id DROP NOT NULL;

ALTER TABLE bet_matches
  DROP CONSTRAINT IF EXISTS valid_teams;

ALTER TABLE bet_matches
  ADD CONSTRAINT valid_teams CHECK (
    home_team_id IS NULL OR away_team_id IS NULL OR home_team_id != away_team_id
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_bet_matches_tournament_fifa_match_number
  ON bet_matches(tournament_id, fifa_match_number)
  WHERE fifa_match_number IS NOT NULL;

INSERT INTO bet_tournaments (
  name,
  slug,
  status,
  kickoff_inaugural_at
)
VALUES (
  'Copa Mundial de la FIFA 2026',
  'fifa-2026',
  'active',
  make_timestamptz(2026, 6, 11, 14, 0, 0, 'America/Bogota')
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  kickoff_inaugural_at = EXCLUDED.kickoff_inaugural_at,
  updated_at = NOW();

WITH fifa_matches AS (
  SELECT bm.id
  FROM bet_matches bm
  JOIN bet_tournaments bt ON bt.id = bm.tournament_id
  WHERE bt.slug = 'fifa-2026'
)
DELETE FROM bet_audit_logs
WHERE match_id IN (SELECT id FROM fifa_matches);

WITH fifa_matches AS (
  SELECT bm.id
  FROM bet_matches bm
  JOIN bet_tournaments bt ON bt.id = bm.tournament_id
  WHERE bt.slug = 'fifa-2026'
)
DELETE FROM bet_match_predictions
WHERE match_id IN (SELECT id FROM fifa_matches);

DELETE FROM bet_scores_aggregate;

DELETE FROM bet_matches
WHERE tournament_id = (SELECT id FROM bet_tournaments WHERE slug = 'fifa-2026');

INSERT INTO bet_teams (name, fifa_code, flag_svg_url)
VALUES
  ('México', 'MEX', 'https://flagcdn.com/w320/mx.png'),
  ('Sudáfrica', 'RSA', 'https://flagcdn.com/w320/za.png'),
  ('Corea del Sur', 'KOR', 'https://flagcdn.com/w320/kr.png'),
  ('República Checa', 'CZE', 'https://flagcdn.com/w320/cz.png'),
  ('Canadá', 'CAN', 'https://flagcdn.com/w320/ca.png'),
  ('Bosnia y Herzegovina', 'BIH', 'https://flagcdn.com/w320/ba.png'),
  ('Qatar', 'QAT', 'https://flagcdn.com/w320/qa.png'),
  ('Suiza', 'SUI', 'https://flagcdn.com/w320/ch.png'),
  ('Brasil', 'BRA', 'https://flagcdn.com/w320/br.png'),
  ('Marruecos', 'MAR', 'https://flagcdn.com/w320/ma.png'),
  ('Haití', 'HTI', 'https://flagcdn.com/w320/ht.png'),
  ('Escocia', 'SCO', 'https://flagcdn.com/w320/gb-sct.png'),
  ('Estados Unidos', 'USA', 'https://flagcdn.com/w320/us.png'),
  ('Paraguay', 'PAR', 'https://flagcdn.com/w320/py.png'),
  ('Australia', 'AUS', 'https://flagcdn.com/w320/au.png'),
  ('Turquía', 'TUR', 'https://flagcdn.com/w320/tr.png'),
  ('Alemania', 'GER', 'https://flagcdn.com/w320/de.png'),
  ('Curazao', 'CUW', 'https://flagcdn.com/w320/cw.png'),
  ('Costa de Marfil', 'CIV', 'https://flagcdn.com/w320/ci.png'),
  ('Ecuador', 'ECU', 'https://flagcdn.com/w320/ec.png'),
  ('Países Bajos', 'NED', 'https://flagcdn.com/w320/nl.png'),
  ('Japón', 'JPN', 'https://flagcdn.com/w320/jp.png'),
  ('Suecia', 'SWE', 'https://flagcdn.com/w320/se.png'),
  ('Túnez', 'TUN', 'https://flagcdn.com/w320/tn.png'),
  ('Bélgica', 'BEL', 'https://flagcdn.com/w320/be.png'),
  ('Egipto', 'EGY', 'https://flagcdn.com/w320/eg.png'),
  ('Irán', 'IRN', 'https://flagcdn.com/w320/ir.png'),
  ('Nueva Zelanda', 'NZL', 'https://flagcdn.com/w320/nz.png'),
  ('España', 'ESP', 'https://flagcdn.com/w320/es.png'),
  ('Cabo Verde', 'CPV', 'https://flagcdn.com/w320/cv.png'),
  ('Arabia Saudita', 'SAU', 'https://flagcdn.com/w320/sa.png'),
  ('Uruguay', 'URU', 'https://flagcdn.com/w320/uy.png'),
  ('Francia', 'FRA', 'https://flagcdn.com/w320/fr.png'),
  ('Senegal', 'SEN', 'https://flagcdn.com/w320/sn.png'),
  ('Irak', 'IRQ', 'https://flagcdn.com/w320/iq.png'),
  ('Noruega', 'NOR', 'https://flagcdn.com/w320/no.png'),
  ('Argentina', 'ARG', 'https://flagcdn.com/w320/ar.png'),
  ('Argelia', 'ALG', 'https://flagcdn.com/w320/dz.png'),
  ('Austria', 'AUT', 'https://flagcdn.com/w320/at.png'),
  ('Jordania', 'JOR', 'https://flagcdn.com/w320/jo.png'),
  ('Portugal', 'POR', 'https://flagcdn.com/w320/pt.png'),
  ('RD de Congo', 'COD', 'https://flagcdn.com/w320/cd.png'),
  ('Uzbekistán', 'UZB', 'https://flagcdn.com/w320/uz.png'),
  ('Colombia', 'COL', 'https://flagcdn.com/w320/co.png'),
  ('Inglaterra', 'ENG', 'https://flagcdn.com/w320/gb-eng.png'),
  ('Croacia', 'CRO', 'https://flagcdn.com/w320/hr.png'),
  ('Ghana', 'GHA', 'https://flagcdn.com/w320/gh.png'),
  ('Panamá', 'PAN', 'https://flagcdn.com/w320/pa.png')
ON CONFLICT (fifa_code) DO UPDATE
SET
  name = EXCLUDED.name,
  flag_svg_url = EXCLUDED.flag_svg_url;

CREATE TEMP TABLE fifa_2026_fixture (
  match_number INT,
  stage TEXT NOT NULL,
  group_name TEXT,
  local_date DATE NOT NULL,
  local_time TIME NOT NULL,
  home_code TEXT,
  away_code TEXT,
  home_placeholder TEXT,
  away_placeholder TEXT,
  venue TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO fifa_2026_fixture (
  match_number,
  stage,
  group_name,
  local_date,
  local_time,
  home_code,
  away_code,
  home_placeholder,
  away_placeholder,
  venue
)
SELECT *
FROM jsonb_to_recordset($fixture$
[
  {"stage":"group_stage","group_name":"A","local_date":"2026-06-11","local_time":"14:00","home_code":"MEX","away_code":"RSA","venue":"Ciudad de México"},
  {"stage":"group_stage","group_name":"A","local_date":"2026-06-11","local_time":"21:00","home_code":"KOR","away_code":"CZE","venue":"Guadalajara"},
  {"stage":"group_stage","group_name":"B","local_date":"2026-06-12","local_time":"14:00","home_code":"CAN","away_code":"BIH","venue":"Toronto"},
  {"stage":"group_stage","group_name":"D","local_date":"2026-06-12","local_time":"20:00","home_code":"USA","away_code":"PAR","venue":"Los Ángeles"},
  {"stage":"group_stage","group_name":"B","local_date":"2026-06-13","local_time":"14:00","home_code":"QAT","away_code":"SUI","venue":"San Francisco"},
  {"stage":"group_stage","group_name":"C","local_date":"2026-06-13","local_time":"17:00","home_code":"BRA","away_code":"MAR","venue":"Nueva Jersey"},
  {"stage":"group_stage","group_name":"C","local_date":"2026-06-13","local_time":"20:00","home_code":"HTI","away_code":"SCO","venue":"Boston"},
  {"stage":"group_stage","group_name":"D","local_date":"2026-06-13","local_time":"23:00","home_code":"AUS","away_code":"TUR","venue":"Vancouver"},
  {"stage":"group_stage","group_name":"E","local_date":"2026-06-14","local_time":"12:00","home_code":"GER","away_code":"CUW","venue":"Houston"},
  {"stage":"group_stage","group_name":"F","local_date":"2026-06-14","local_time":"15:00","home_code":"NED","away_code":"JPN","venue":"Dallas"},
  {"stage":"group_stage","group_name":"E","local_date":"2026-06-14","local_time":"18:00","home_code":"CIV","away_code":"ECU","venue":"Philadelphia"},
  {"stage":"group_stage","group_name":"F","local_date":"2026-06-14","local_time":"21:00","home_code":"SWE","away_code":"TUN","venue":"Monterrey"},
  {"stage":"group_stage","group_name":"H","local_date":"2026-06-15","local_time":"11:00","home_code":"ESP","away_code":"CPV","venue":"Atlanta"},
  {"stage":"group_stage","group_name":"G","local_date":"2026-06-15","local_time":"14:00","home_code":"BEL","away_code":"EGY","venue":"Seattle"},
  {"stage":"group_stage","group_name":"H","local_date":"2026-06-15","local_time":"17:00","home_code":"SAU","away_code":"URU","venue":"Miami"},
  {"stage":"group_stage","group_name":"G","local_date":"2026-06-15","local_time":"20:00","home_code":"IRN","away_code":"NZL","venue":"Los Ángeles"},
  {"stage":"group_stage","group_name":"I","local_date":"2026-06-16","local_time":"14:00","home_code":"FRA","away_code":"SEN","venue":"Nueva Jersey"},
  {"stage":"group_stage","group_name":"I","local_date":"2026-06-16","local_time":"17:00","home_code":"IRQ","away_code":"NOR","venue":"Boston"},
  {"stage":"group_stage","group_name":"J","local_date":"2026-06-16","local_time":"20:00","home_code":"ARG","away_code":"ALG","venue":"Kansas City"},
  {"stage":"group_stage","group_name":"J","local_date":"2026-06-16","local_time":"23:00","home_code":"AUT","away_code":"JOR","venue":"San Francisco"},
  {"stage":"group_stage","group_name":"K","local_date":"2026-06-17","local_time":"12:00","home_code":"POR","away_code":"COD","venue":"Houston"},
  {"stage":"group_stage","group_name":"L","local_date":"2026-06-17","local_time":"15:00","home_code":"ENG","away_code":"CRO","venue":"Dallas"},
  {"stage":"group_stage","group_name":"L","local_date":"2026-06-17","local_time":"18:00","home_code":"GHA","away_code":"PAN","venue":"Toronto"},
  {"stage":"group_stage","group_name":"K","local_date":"2026-06-17","local_time":"21:00","home_code":"UZB","away_code":"COL","venue":"Ciudad de México"},
  {"stage":"group_stage","group_name":"A","local_date":"2026-06-18","local_time":"11:00","home_code":"CZE","away_code":"RSA","venue":"Atlanta"},
  {"stage":"group_stage","group_name":"B","local_date":"2026-06-18","local_time":"14:00","home_code":"SUI","away_code":"BIH","venue":"Los Ángeles"},
  {"stage":"group_stage","group_name":"B","local_date":"2026-06-18","local_time":"17:00","home_code":"CAN","away_code":"QAT","venue":"Vancouver"},
  {"stage":"group_stage","group_name":"A","local_date":"2026-06-18","local_time":"20:00","home_code":"MEX","away_code":"KOR","venue":"Guadalajara"},
  {"stage":"group_stage","group_name":"D","local_date":"2026-06-19","local_time":"14:00","home_code":"USA","away_code":"AUS","venue":"Seattle"},
  {"stage":"group_stage","group_name":"C","local_date":"2026-06-19","local_time":"17:00","home_code":"SCO","away_code":"MAR","venue":"Boston"},
  {"stage":"group_stage","group_name":"C","local_date":"2026-06-19","local_time":"19:30","home_code":"BRA","away_code":"HTI","venue":"Philadelphia"},
  {"stage":"group_stage","group_name":"D","local_date":"2026-06-19","local_time":"22:00","home_code":"TUR","away_code":"PAR","venue":"San Francisco"},
  {"stage":"group_stage","group_name":"F","local_date":"2026-06-20","local_time":"12:00","home_code":"NED","away_code":"SWE","venue":"Houston"},
  {"stage":"group_stage","group_name":"E","local_date":"2026-06-20","local_time":"15:00","home_code":"GER","away_code":"CIV","venue":"Toronto"},
  {"stage":"group_stage","group_name":"E","local_date":"2026-06-20","local_time":"19:00","home_code":"ECU","away_code":"CUW","venue":"Kansas City"},
  {"stage":"group_stage","group_name":"F","local_date":"2026-06-20","local_time":"23:00","home_code":"TUN","away_code":"JPN","venue":"Monterrey"},
  {"stage":"group_stage","group_name":"H","local_date":"2026-06-21","local_time":"11:00","home_code":"ESP","away_code":"SAU","venue":"Atlanta"},
  {"stage":"group_stage","group_name":"G","local_date":"2026-06-21","local_time":"14:00","home_code":"BEL","away_code":"IRN","venue":"Los Ángeles"},
  {"stage":"group_stage","group_name":"H","local_date":"2026-06-21","local_time":"17:00","home_code":"URU","away_code":"CPV","venue":"Miami"},
  {"stage":"group_stage","group_name":"G","local_date":"2026-06-21","local_time":"20:00","home_code":"NZL","away_code":"EGY","venue":"Vancouver"},
  {"stage":"group_stage","group_name":"J","local_date":"2026-06-22","local_time":"12:00","home_code":"ARG","away_code":"AUT","venue":"Dallas"},
  {"stage":"group_stage","group_name":"I","local_date":"2026-06-22","local_time":"16:00","home_code":"FRA","away_code":"IRQ","venue":"Philadelphia"},
  {"stage":"group_stage","group_name":"I","local_date":"2026-06-22","local_time":"19:00","home_code":"NOR","away_code":"SEN","venue":"Nueva Jersey"},
  {"stage":"group_stage","group_name":"J","local_date":"2026-06-22","local_time":"22:00","home_code":"JOR","away_code":"ALG","venue":"San Francisco"},
  {"stage":"group_stage","group_name":"K","local_date":"2026-06-23","local_time":"12:00","home_code":"POR","away_code":"UZB","venue":"Houston"},
  {"stage":"group_stage","group_name":"L","local_date":"2026-06-23","local_time":"15:00","home_code":"ENG","away_code":"GHA","venue":"Boston"},
  {"stage":"group_stage","group_name":"L","local_date":"2026-06-23","local_time":"18:00","home_code":"PAN","away_code":"CRO","venue":"Toronto"},
  {"stage":"group_stage","group_name":"K","local_date":"2026-06-23","local_time":"21:00","home_code":"COL","away_code":"COD","venue":"Guadalajara"},
  {"stage":"group_stage","group_name":"B","local_date":"2026-06-24","local_time":"14:00","home_code":"SUI","away_code":"CAN","venue":"Vancouver"},
  {"stage":"group_stage","group_name":"B","local_date":"2026-06-24","local_time":"14:00","home_code":"BIH","away_code":"QAT","venue":"Seattle"},
  {"stage":"group_stage","group_name":"C","local_date":"2026-06-24","local_time":"17:00","home_code":"MAR","away_code":"HTI","venue":"Atlanta"},
  {"stage":"group_stage","group_name":"C","local_date":"2026-06-24","local_time":"17:00","home_code":"BRA","away_code":"SCO","venue":"Miami"},
  {"stage":"group_stage","group_name":"A","local_date":"2026-06-24","local_time":"20:00","home_code":"RSA","away_code":"KOR","venue":"Monterrey"},
  {"stage":"group_stage","group_name":"A","local_date":"2026-06-24","local_time":"20:00","home_code":"CZE","away_code":"MEX","venue":"Ciudad de México"},
  {"stage":"group_stage","group_name":"E","local_date":"2026-06-25","local_time":"15:00","home_code":"CUW","away_code":"CIV","venue":"Philadelphia"},
  {"stage":"group_stage","group_name":"E","local_date":"2026-06-25","local_time":"15:00","home_code":"ECU","away_code":"GER","venue":"Nueva Jersey"},
  {"stage":"group_stage","group_name":"F","local_date":"2026-06-25","local_time":"18:00","home_code":"JPN","away_code":"SWE","venue":"Dallas"},
  {"stage":"group_stage","group_name":"F","local_date":"2026-06-25","local_time":"18:00","home_code":"TUN","away_code":"NED","venue":"Kansas City"},
  {"stage":"group_stage","group_name":"D","local_date":"2026-06-25","local_time":"21:00","home_code":"PAR","away_code":"AUS","venue":"San Francisco"},
  {"stage":"group_stage","group_name":"D","local_date":"2026-06-25","local_time":"21:00","home_code":"TUR","away_code":"USA","venue":"Los Ángeles"},
  {"stage":"group_stage","group_name":"I","local_date":"2026-06-26","local_time":"14:00","home_code":"NOR","away_code":"FRA","venue":"Boston"},
  {"stage":"group_stage","group_name":"I","local_date":"2026-06-26","local_time":"14:00","home_code":"SEN","away_code":"IRQ","venue":"Toronto"},
  {"stage":"group_stage","group_name":"H","local_date":"2026-06-26","local_time":"19:00","home_code":"CPV","away_code":"SAU","venue":"Houston"},
  {"stage":"group_stage","group_name":"H","local_date":"2026-06-26","local_time":"19:00","home_code":"URU","away_code":"ESP","venue":"Guadalajara"},
  {"stage":"group_stage","group_name":"G","local_date":"2026-06-26","local_time":"22:00","home_code":"EGY","away_code":"IRN","venue":"Seattle"},
  {"stage":"group_stage","group_name":"G","local_date":"2026-06-26","local_time":"22:00","home_code":"NZL","away_code":"BEL","venue":"Vancouver"},
  {"stage":"group_stage","group_name":"L","local_date":"2026-06-27","local_time":"16:00","home_code":"CRO","away_code":"GHA","venue":"Philadelphia"},
  {"stage":"group_stage","group_name":"L","local_date":"2026-06-27","local_time":"16:00","home_code":"PAN","away_code":"ENG","venue":"Nueva Jersey"},
  {"stage":"group_stage","group_name":"K","local_date":"2026-06-27","local_time":"18:30","home_code":"COL","away_code":"POR","venue":"Miami"},
  {"stage":"group_stage","group_name":"K","local_date":"2026-06-27","local_time":"18:30","home_code":"COD","away_code":"UZB","venue":"Atlanta"},
  {"stage":"group_stage","group_name":"J","local_date":"2026-06-27","local_time":"21:00","home_code":"ALG","away_code":"AUT","venue":"Kansas City"},
  {"stage":"group_stage","group_name":"J","local_date":"2026-06-27","local_time":"21:00","home_code":"JOR","away_code":"ARG","venue":"Dallas"},
  {"match_number":73,"stage":"round_of_32","local_date":"2026-06-28","local_time":"14:00","home_placeholder":"2º Grupo A","away_placeholder":"2º Grupo B","venue":"Los Ángeles"},
  {"match_number":76,"stage":"round_of_32","local_date":"2026-06-29","local_time":"12:00","home_placeholder":"1º Grupo E","away_placeholder":"2º Grupo F","venue":"Houston"},
  {"match_number":74,"stage":"round_of_32","local_date":"2026-06-29","local_time":"15:30","home_placeholder":"1º Grupo E","away_placeholder":"3º Grupo A/B/C/D/F","venue":"Boston"},
  {"match_number":75,"stage":"round_of_32","local_date":"2026-06-29","local_time":"20:00","home_placeholder":"1º Grupo F","away_placeholder":"2º Grupo C","venue":"Monterrey"},
  {"match_number":78,"stage":"round_of_32","local_date":"2026-06-30","local_time":"12:00","home_placeholder":"2º Grupo E","away_placeholder":"2º Grupo I","venue":"Dallas"},
  {"match_number":77,"stage":"round_of_32","local_date":"2026-06-30","local_time":"16:00","home_placeholder":"1º Grupo I","away_placeholder":"3º Grupo C/D/F/G/H","venue":"Nueva Jersey"},
  {"match_number":79,"stage":"round_of_32","local_date":"2026-06-30","local_time":"20:00","home_placeholder":"1º Grupo A","away_placeholder":"3º Grupo C/E/F/H/I","venue":"Ciudad de México"},
  {"match_number":80,"stage":"round_of_32","local_date":"2026-07-01","local_time":"11:00","home_placeholder":"1º Grupo L","away_placeholder":"3º Grupo E/H/I/J/K","venue":"Atlanta"},
  {"match_number":82,"stage":"round_of_32","local_date":"2026-07-01","local_time":"15:00","home_placeholder":"1º Grupo G","away_placeholder":"3º Grupo A/E/H/I/J","venue":"Seattle"},
  {"match_number":81,"stage":"round_of_32","local_date":"2026-07-01","local_time":"19:00","home_placeholder":"1º Grupo D","away_placeholder":"3º Grupo B/E/F/I/J","venue":"San Francisco"},
  {"match_number":84,"stage":"round_of_32","local_date":"2026-07-02","local_time":"14:00","home_placeholder":"1º Grupo H","away_placeholder":"2º Grupo J","venue":"Los Ángeles"},
  {"match_number":83,"stage":"round_of_32","local_date":"2026-07-02","local_time":"18:00","home_placeholder":"2º Grupo K","away_placeholder":"2º Grupo L","venue":"Toronto"},
  {"match_number":85,"stage":"round_of_32","local_date":"2026-07-02","local_time":"22:00","home_placeholder":"1º Grupo B","away_placeholder":"3º Grupo E/F/G/I/J","venue":"Vancouver"},
  {"match_number":88,"stage":"round_of_32","local_date":"2026-07-03","local_time":"13:00","home_placeholder":"2º Grupo D","away_placeholder":"2º Grupo G","venue":"Dallas"},
  {"match_number":86,"stage":"round_of_32","local_date":"2026-07-03","local_time":"17:00","home_placeholder":"1º Grupo J","away_placeholder":"2º Grupo H","venue":"Miami"},
  {"match_number":87,"stage":"round_of_32","local_date":"2026-07-03","local_time":"20:30","home_placeholder":"1º Grupo K","away_placeholder":"3º Grupo D/E/I/J/L","venue":"Kansas City"},
  {"match_number":90,"stage":"round_of_16","local_date":"2026-07-04","local_time":"12:00","home_placeholder":"Ganador 73","away_placeholder":"Ganador 75","venue":"Houston"},
  {"match_number":89,"stage":"round_of_16","local_date":"2026-07-04","local_time":"16:00","home_placeholder":"Ganador 74","away_placeholder":"Ganador 77","venue":"Philadelphia"},
  {"match_number":91,"stage":"round_of_16","local_date":"2026-07-05","local_time":"15:00","home_placeholder":"Ganador 76","away_placeholder":"Ganador 78","venue":"Nueva Jersey"},
  {"match_number":92,"stage":"round_of_16","local_date":"2026-07-05","local_time":"19:00","home_placeholder":"Ganador 79","away_placeholder":"Ganador 80","venue":"Ciudad de México"},
  {"match_number":93,"stage":"round_of_16","local_date":"2026-07-06","local_time":"14:00","home_placeholder":"Ganador 83","away_placeholder":"Ganador 84","venue":"Dallas"},
  {"match_number":94,"stage":"round_of_16","local_date":"2026-07-06","local_time":"19:00","home_placeholder":"Ganador 81","away_placeholder":"Ganador 82","venue":"Seattle"},
  {"match_number":95,"stage":"round_of_16","local_date":"2026-07-07","local_time":"11:00","home_placeholder":"Ganador 86","away_placeholder":"Ganador 88","venue":"Atlanta"},
  {"match_number":96,"stage":"round_of_16","local_date":"2026-07-07","local_time":"15:00","home_placeholder":"Ganador 85","away_placeholder":"Ganador 87","venue":"Vancouver"},
  {"match_number":97,"stage":"quarter_finals","local_date":"2026-07-09","local_time":"15:00","home_placeholder":"Ganador 89","away_placeholder":"Ganador 90","venue":"Boston"},
  {"match_number":98,"stage":"quarter_finals","local_date":"2026-07-10","local_time":"14:00","home_placeholder":"Ganador 93","away_placeholder":"Ganador 94","venue":"Los Ángeles"},
  {"match_number":99,"stage":"quarter_finals","local_date":"2026-07-11","local_time":"16:00","home_placeholder":"Ganador 91","away_placeholder":"Ganador 92","venue":"Miami"},
  {"match_number":100,"stage":"quarter_finals","local_date":"2026-07-11","local_time":"20:00","home_placeholder":"Ganador 95","away_placeholder":"Ganador 96","venue":"Kansas City"},
  {"match_number":101,"stage":"semi_finals","local_date":"2026-07-14","local_time":"14:00","home_placeholder":"Ganador 97","away_placeholder":"Ganador 98","venue":"Dallas"},
  {"match_number":102,"stage":"semi_finals","local_date":"2026-07-15","local_time":"14:00","home_placeholder":"Ganador 99","away_placeholder":"Ganador 100","venue":"Atlanta"},
  {"match_number":103,"stage":"third_place","local_date":"2026-07-18","local_time":"16:00","home_placeholder":"Perdedor 101","away_placeholder":"Perdedor 102","venue":"Miami"},
  {"match_number":104,"stage":"final","local_date":"2026-07-19","local_time":"14:00","home_placeholder":"Ganador 101","away_placeholder":"Ganador 102","venue":"Nueva Jersey"}
]
$fixture$::jsonb) AS fixture(
  match_number INT,
  stage TEXT,
  group_name TEXT,
  local_date DATE,
  local_time TIME,
  home_code TEXT,
  away_code TEXT,
  home_placeholder TEXT,
  away_placeholder TEXT,
  venue TEXT
);

DO $$
DECLARE
  v_missing_teams INT;
BEGIN
  SELECT COUNT(*)
  INTO v_missing_teams
  FROM fifa_2026_fixture f
  LEFT JOIN bet_teams ht ON ht.fifa_code = f.home_code
  LEFT JOIN bet_teams at ON at.fifa_code = f.away_code
  WHERE f.stage = 'group_stage'
    AND (ht.id IS NULL OR at.id IS NULL);

  IF v_missing_teams > 0 THEN
    RAISE EXCEPTION 'Fixture has % group-stage rows with missing teams', v_missing_teams;
  END IF;
END $$;

INSERT INTO bet_matches (
  tournament_id,
  stage,
  group_name,
  kickoff_at,
  home_team_id,
  away_team_id,
  home_placeholder,
  away_placeholder,
  venue,
  fifa_match_number,
  status
)
SELECT
  bt.id,
  f.stage::bet_match_stage,
  f.group_name,
  make_timestamptz(
    EXTRACT(YEAR FROM f.local_date)::INT,
    EXTRACT(MONTH FROM f.local_date)::INT,
    EXTRACT(DAY FROM f.local_date)::INT,
    EXTRACT(HOUR FROM f.local_time)::INT,
    EXTRACT(MINUTE FROM f.local_time)::INT,
    0,
    'America/Bogota'
  ),
  ht.id,
  at.id,
  COALESCE(f.home_placeholder, ht.name),
  COALESCE(f.away_placeholder, at.name),
  f.venue,
  f.match_number,
  'scheduled'::bet_match_status
FROM fifa_2026_fixture f
CROSS JOIN bet_tournaments bt
LEFT JOIN bet_teams ht ON ht.fifa_code = f.home_code
LEFT JOIN bet_teams at ON at.fifa_code = f.away_code
WHERE bt.slug = 'fifa-2026'
ORDER BY f.local_date, f.local_time, f.match_number NULLS FIRST;

DO $$
DECLARE
  v_total INT;
  v_groups INT;
  v_group_matches INT;
  v_knockout_matches INT;
BEGIN
  SELECT COUNT(*)
  INTO v_total
  FROM bet_matches bm
  JOIN bet_tournaments bt ON bt.id = bm.tournament_id
  WHERE bt.slug = 'fifa-2026';

  SELECT COUNT(DISTINCT group_name)
  INTO v_groups
  FROM bet_matches bm
  JOIN bet_tournaments bt ON bt.id = bm.tournament_id
  WHERE bt.slug = 'fifa-2026'
    AND bm.stage = 'group_stage';

  SELECT COUNT(*)
  INTO v_group_matches
  FROM bet_matches bm
  JOIN bet_tournaments bt ON bt.id = bm.tournament_id
  WHERE bt.slug = 'fifa-2026'
    AND bm.stage = 'group_stage';

  SELECT COUNT(*)
  INTO v_knockout_matches
  FROM bet_matches bm
  JOIN bet_tournaments bt ON bt.id = bm.tournament_id
  WHERE bt.slug = 'fifa-2026'
    AND bm.stage != 'group_stage';

  IF v_total != 104 OR v_groups != 12 OR v_group_matches != 72 OR v_knockout_matches != 32 THEN
    RAISE EXCEPTION
      'Invalid FIFA 2026 fixture counts. total=%, groups=%, group_matches=%, knockout_matches=%',
      v_total, v_groups, v_group_matches, v_knockout_matches;
  END IF;
END $$;

COMMIT;
