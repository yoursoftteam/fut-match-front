-- Seed data for local development
-- Run via: supabase db reset
-- After reset, run: node supabase/seed.mjs to create the test user

BEGIN;

-- ==================== MATCHES ====================
INSERT INTO public.matches (id, title, location, date, max_players, created_by, field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, players_per_team, rules)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'Partido de prueba #1 — cancha sintética',
    'Cancha San Fernando',
    NOW() + INTERVAL '2 days',
    12,
    NULL,
    120000,
    30000,
    false,
    0,
    5,
    'Partido amistoso — cancha sintética'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Partido de prueba #2 — con arquero alquilado',
    'Por definir',
    NOW() + INTERVAL '5 days',
    14,
    NULL,
    200000,
    50000,
    true,
    1,
    7,
    NULL
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'Partido de prueba #3 — ya jugado',
    'Cancha La 33',
    NOW() - INTERVAL '1 day',
    10,
    NULL,
    100000,
    20000,
    false,
    0,
    5,
    NULL
  );

-- ==================== REGISTRATIONS ====================
INSERT INTO public.match_registrations (id, match_id, name, is_goalkeeper, position, registered_at, has_paid, paid_at)
VALUES
  -- Match #1 — 4 field players + 2 goalkeepers
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Carlos Pérez',  false, 'delantero',      NOW() - INTERVAL '2 days',  true,  NOW() - INTERVAL '2 days'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Andrés López',  false, 'centrocampista', NOW() - INTERVAL '2 days',  true,  NOW() - INTERVAL '2 days'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Juan Martínez', false, 'defensa',        NOW() - INTERVAL '1 day',   false, NULL),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Pedro Ramírez', false, 'delantero',      NOW() - INTERVAL '1 day',   false, NULL),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Luis García',   true,  'portero',       NOW(),                         false, NULL),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Mario Díaz',    true,  'portero',       NOW(),                         false, NULL),

  -- Match #2 — just a few players
  ('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002', 'Santiago Ospina', false, 'defensa',        NOW() - INTERVAL '3 days', false, NULL),
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002', 'Felipe Rojas',    false, 'centrocampista', NOW() - INTERVAL '2 days', false, NULL),

  -- Match #3 — full with substitutes
  ('b0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003', 'Jorge Vega',       false, 'delantero',      NOW() - INTERVAL '5 days',  true,  NOW() - INTERVAL '5 days'),
  ('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000003', 'Diego Moreno',     false, 'defensa',        NOW() - INTERVAL '5 days',  true,  NOW() - INTERVAL '5 days'),
  ('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000003', 'Oscar Torres',     false, 'centrocampista', NOW() - INTERVAL '4 days',  true,  NOW() - INTERVAL '4 days'),
  ('b0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000003', 'Henry Rivas',      false, 'delantero',      NOW() - INTERVAL '4 days',  true,  NOW() - INTERVAL '4 days'),
  ('b0000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000003', 'Jhon Henao',       false, 'centrocampista', NOW() - INTERVAL '3 days',  true,  NOW() - INTERVAL '3 days'),
  ('b0000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-000000000003', 'Kevín Londoño',    false, 'defensa',        NOW() - INTERVAL '3 days',  true,  NOW() - INTERVAL '3 days'),
  ('b0000000-0000-4000-8000-000000000026', 'a0000000-0000-4000-8000-000000000003', 'Cristian Parra',   false, 'delantero',      NOW() - INTERVAL '2 days',  true,  NOW() - INTERVAL '2 days'),
  ('b0000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-000000000003', 'Alex Serna',       false, 'centrocampista', NOW() - INTERVAL '2 days',  true,  NOW() - INTERVAL '2 days'),
  ('b0000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-000000000003', 'Andrés Rivera',    false, 'defensa',        NOW() - INTERVAL '1 day',   true,  NOW() - INTERVAL '1 day'),
  ('b0000000-0000-4000-8000-000000000029', 'a0000000-0000-4000-8000-000000000003', 'Brayan León',      true,  'portero',       NOW() - INTERVAL '1 day',   true,  NOW() - INTERVAL '1 day'),
  ('b0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000003', 'Tomás Agudelo',    true,  'portero',       NOW(),                         true,  NOW());

COMMIT;
