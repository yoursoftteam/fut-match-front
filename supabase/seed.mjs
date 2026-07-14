#!/usr/bin/env node
// Run after supabase db reset: node supabase/seed.mjs

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const USERS = [
  { email: "test@parti2.app", password: "test123" },
  { email: "jugador1@parti2.app", password: "test123" },
  { email: "jugador2@parti2.app", password: "test123" },
];

async function signup({ email, password }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data?.user?.id) {
    console.error(`Failed to create ${email}:`, data.msg || data);
    return null;
  }
  console.log(`✅ ${email} → ${data.user.id}`);
  return data.user.id;
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

  const { execSync } = await import("child_process");

  const ownerId = userIds[0];

  execSync(
    `npx supabase db query "UPDATE public.matches SET created_by = '${ownerId}'::uuid WHERE created_by IS NULL;"`,
    { stdio: "inherit" }
  );
  console.log("✅ Matches assigned to", USERS[0].email);

  execSync(
    `npx supabase db query "INSERT INTO public.match_templates (id, user_id, name, location, time, players_per_team, has_rented_goalkeepers, rented_goalkeepers_count, field_cost, rental_cost, save_participants, usage_count) VALUES ('d0000000-0000-4000-8000-000000000001', '${ownerId}'::uuid, 'Partido de los miércoles', 'Cancha San Fernando', '20:00', 6, false, 0, 120000, 30000, true, 3) ON CONFLICT DO NOTHING;"`,
    { stdio: "inherit" }
  );
  console.log("✅ Template created");

  execSync(
    `npx supabase db query "INSERT INTO public.match_template_participants (template_id, name, is_goalkeeper, sort_order) VALUES ('d0000000-0000-4000-8000-000000000001', 'Carlos Pérez', false, 1), ('d0000000-0000-4000-8000-000000000001', 'Andrés López', false, 2), ('d0000000-0000-4000-8000-000000000001', 'Pedro Ramírez', false, 3), ('d0000000-0000-4000-8000-000000000001', 'Luis García', true, 4), ('d0000000-0000-4000-8000-000000000001', 'Mario Díaz', true, 5) ON CONFLICT DO NOTHING;"`,
    { stdio: "inherit" }
  );
  console.log("✅ Template participants created");

  console.log("");
  console.log("🟢 Usuarios disponibles:");
  for (const u of USERS) {
    console.log(`   ${u.email} / ${u.password}`);
  }
}

main().catch(console.error);
