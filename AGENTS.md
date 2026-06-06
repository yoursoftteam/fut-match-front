<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build (OpenNext Cloudflare)
npm run typecheck     # TypeScript check without build (fast)
npm run lint          # ESLint — only verification step (no tests)
npm run preview       # OpenNext Cloudflare preview
npm run deploy        # Deploy to Cloudflare Pages
```

# CI

`.github/workflows/ci.yml` runs `typecheck` + `lint` on push/PR to `release/2.0.0`. Run `npm run typecheck` locally before deploy — catches TS errors fast (no bundle).

# Architecture

- Next.js 16 App Router + React 19 + TypeScript strict.
- Tailwind CSS 4 (PostCSS plugin) + shadcn/ui "base-nova" style + tw-animate-css.
- **Deploy: Cloudflare Pages** via `@opennextjs/cloudflare` (`open-next.config.ts`, `wrangler.jsonc`). Must keep `nodejs_compat` flag.
- `@teispace/next-themes` (not regular next-themes) for dark mode, default is dark.
- Auth is **browser-only** (no SSR client) — `@supabase/ssr` + PKCE flow via `src/lib/supabase.ts` singleton.
- `.env` is checked in (contains publishable keys only). Never add secrets.
- zod v4 (not v3) for schema validation. react-hook-form + `@hookform/resolvers` for forms.
- Fonts: Space Grotesk (body), Outfit (headings), Geist (via next/font).

# Routes & Conventions

| Route | Notes |
|---|---|
| `/` | Public landing. If user is logged in, redirects to `/dashboard`. |
| `/auth` | signin/signup/forgot/reset modes via `?mode=` param. Uses `router.replace` on mode switch. |
| `/create` | Multi-step match creation. |
| `/dashboard` | Authenticated. "Mis Partidos" shows matches from last 7 days. |
| `/matches` | Authenticated. All user matches. |
| `/join/[invite_code]` | **Edge runtime**. Accepts invite code from URL; passes to `JoinInviteGate` client component. |
| `/j/[code]` | Redirects to `/join/[code]` via `next.config.ts` redirects (no proxy.ts). |
| `/match/[id]` | **Edge runtime** (`export const runtime = "edge"`). Client component for the heavy work. |

# Database (Supabase)

Key tables in `supabase-schema.sql`:
- **matches** — fields: `field_cost`, `rental_cost`, `players_per_team`, `has_rented_goalkeepers`, `rented_goalkeepers_count`. Cost formula: `(field_cost + rental_cost) / max_players`.
- **match_registrations** — public registration (anyone can CRUD). DB trigger enforces: max 2 GK titular slots, reserve 2 GK slots, hard cap of `max_players + 10` for substitutes. Table is in `supabase_realtime` publication.
- **match_templates** / **match_template_participants** — "Partidos Frecuentes" (templates with optional saved participants).

RLS: matches & templates scoped to owner; registrations open to all (public signup).

Business: `time` is **not a column** — derived from `date` (ISO). Location "Por definir" means no venue set — use `getMatchTitleFromLocation()` from `src/lib/match-title.ts`.

# Next.js 16 gotchas

- `proxy.ts` (formerly `middleware.ts`) defaults to Node.js runtime, which **OpenNext Cloudflare doesn't support**. Solution: handle redirects via `next.config.ts` and use Edge runtime on pages directly. There is no `proxy.ts` in this project.
- For slow client navigations: export `unstable_instant` from the route. Read `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md` before making changes.
- `params` in page props is a **Promise** (not a plain object) — must `await` before use.

# Misc

- Path alias: `@/*` → `./src/*`
- UI primitives in `src/components/ui/` (shadcn generated). Utils: `cn()` in `src/lib/utils.ts`.
- Currency formatting: `formatCurrency()` in `src/lib/currency.ts` (Intl.NumberFormat("es-CO")).
- Client-side Supabase proxy in `src/lib/supabase.ts` — always import `supabase` or `getSupabaseClient` from there.
- Admin/service-role client in `src/lib/supabase-admin.ts` — use `getServiceClient()` (for private routes that bypass RLS) or `getAnonClient()` (for public-read routes). Both return `null` if env vars are missing, so guard with `if (!supabase) return error`. Never create a Supabase client at module level in API routes — lazy-create inside handler only.
- Realtime: subscribe to `match_registrations` changes via `supabase.channel()` with `postgres_changes`.

## Brand manual
- Always use /docs/brand_manual.md as brand manual to UI/UX design
