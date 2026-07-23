#!/usr/bin/env node
// Run after supabase db reset: node supabase/seed.mjs

import { execSync } from "child_process";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const USERS = [
  { email: "admin@gmail.com", password: "test123" },
  { email: "user@gmail.com", password: "test123" },
  { email: "user2@gmail.com", password: "test123" },
  { email: "user3@gmail.com", password: "test123" },
  { email: "test@parti2.app", password: "test123" },
  { email: "jugador1@parti2.app", password: "test123" },
  { email: "jugador2@parti2.app", password: "test123" },
];

function runQuery(sql) {
  const out = execSync(
    `npx supabase db query -o csv "${sql.replace(/"/g, '\\"')}" 2>&1`,
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
  );
  return out?.toString().trim() || "";
}

async function signup({ email, password }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data?.user?.id) {
    console.log(`✅ ${email} → ${data.user.id}`);
    return data.user.id;
  }
  // Already registered — fetch from auth.users
  if (data?.msg?.includes("already registered")) {
    const csv = runQuery(`SELECT id FROM auth.users WHERE email = '${email}'`);
    const id = csv.split("\n").find((l) => l.length > 5 && l !== "id")?.trim();
    if (id) {
      console.log(`⏭️ ${email} already exists → ${id}`);
      return id;
    }
  }
  console.error(`Failed to create ${email}:`, data.msg || data);
  return null;
}

async function main() {
  const userIds = [];
  for (const u of USERS) {
    const id = await signup(u);
    if (id) userIds.push(id);
  }

  if (userIds.length === 0) {
    console.error("No users created, aborting");
    process.exit(1);
  }

  const adminId = userIds[0];
  const user2Id = userIds[2];
  const user3Id = userIds[3];

  runQuery(
    `UPDATE public.matches SET created_by = '${adminId}'::uuid WHERE created_by IS NULL;`
  );
  console.log("✅ Matches assigned to admin@gmail.com");

  runQuery(
    `INSERT INTO public.tournaments (id, owner_id, name, description, status, tournament_type, starts_at, registration_deadline, max_teams, min_players_per_team, registration_fee, league_mode, groups_count, qualifiers_per_group, has_knockout, knockout_phase, scheduled_days)
     VALUES (
       '470c93dd-c42f-48dd-943d-4880e20e0330', '${adminId}'::uuid,
       'Liga partiditos', 'Torneo de prueba para desarrollo local',
       'open', 'groups',
       NOW() + INTERVAL '7 days', NOW() + INTERVAL '3 days',
       8, 7, 1500000, 'single_leg', 2, 2, true, 'semifinals',
       '[{"day_of_week":1,"times":["20:00","21:00"]},{"day_of_week":3,"times":["20:00","21:00"]},{"day_of_week":5,"times":["19:00","20:00","21:00"]}]'::jsonb
     )
     ON CONFLICT DO NOTHING;`
  );
  console.log("✅ Tournament 'Liga partiditos' created");

  runQuery(
    `INSERT INTO public.tournament_teams (id, tournament_id, name, captain_name, captain_phone, captain_email)
     VALUES
       ('e0000000-0000-4000-8000-000000000001', '470c93dd-c42f-48dd-943d-4880e20e0330', 'Los Magos', 'Admin', '3001112233', 'admin@gmail.com'),
       ('e0000000-0000-4000-8000-000000000002', '470c93dd-c42f-48dd-943d-4880e20e0330', 'Los Titanes', 'User 2', '3002223344', 'user2@gmail.com'),
       ('e0000000-0000-4000-8000-000000000003', '470c93dd-c42f-48dd-943d-4880e20e0330', 'The Warriors', 'User 3', '3003334455', 'user3@gmail.com')
     ON CONFLICT DO NOTHING;`
  );
  console.log("✅ Tournament teams created");

  runQuery(
    `INSERT INTO public.tournament_team_players (team_id, user_id, name, email, phone, document_type, document_number, shirt_number)
     VALUES
       ('e0000000-0000-4000-8000-000000000001', '${adminId}'::uuid, 'Admin', 'admin@gmail.com', '3001112233', 'cc', '12345678', 10),
       ('e0000000-0000-4000-8000-000000000002', '${user2Id}'::uuid, 'User 2', 'user2@gmail.com', '3002223344', 'cc', '23456789', 7),
       ('e0000000-0000-4000-8000-000000000003', '${user3Id}'::uuid, 'User 3', 'user3@gmail.com', '3003334455', 'cc', '34567890', 9)
     ON CONFLICT DO NOTHING;`
  );
  console.log("✅ Team players linked to users");

  runQuery(
    `INSERT INTO public.tournament_team_players (team_id, name, email, phone, document_type, document_number, shirt_number)
     VALUES
       ('e0000000-0000-4000-8000-000000000001', 'Carlos Pérez', 'carlos@example.com', '3004445566', 'cc', '11111111', 1),
       ('e0000000-0000-4000-8000-000000000001', 'Andrés López', 'andres@example.com', '3005556677', 'cc', '22222222', 2)
     ON CONFLICT DO NOTHING;`
  );
  console.log("✅ Extra players added to Los Magos");

  runQuery(
    `INSERT INTO public.match_templates (id, user_id, name, location, time, players_per_team, has_rented_goalkeepers, rented_goalkeepers_count, field_cost, rental_cost, save_participants, usage_count)
     VALUES ('d0000000-0000-4000-8000-000000000001', '${adminId}'::uuid, 'Partido de los miércoles', 'Cancha San Fernando', '20:00', 6, false, 0, 120000, 30000, true, 3)
     ON CONFLICT DO NOTHING;`
  );
  console.log("✅ Template created");

  runQuery(
    `INSERT INTO public.match_template_participants (template_id, name, is_goalkeeper, sort_order)
     VALUES
       ('d0000000-0000-4000-8000-000000000001', 'Carlos Pérez', false, 1),
       ('d0000000-0000-4000-8000-000000000001', 'Andrés López', false, 2),
       ('d0000000-0000-4000-8000-000000000001', 'Pedro Ramírez', false, 3),
       ('d0000000-0000-4000-8000-000000000001', 'Luis García', true, 4),
       ('d0000000-0000-4000-8000-000000000001', 'Mario Díaz', true, 5)
     ON CONFLICT DO NOTHING;`
  );
  console.log("✅ Template participants created");

  console.log("\n🟢 Usuarios disponibles:");
  for (const u of USERS) console.log(`   ${u.email} / ${u.password}`);
  console.log("\n🟢 Admin es capitán de 'Los Magos' en 'Liga partiditos'");
  console.log("🟢 User2 es capitán de 'Los Titanes'");
  console.log("🟢 User3 es capitán de 'The Warriors'");
  console.log("🟢 User (user@gmail.com) está libre — no tiene equipo");
}

main().catch(console.error);
