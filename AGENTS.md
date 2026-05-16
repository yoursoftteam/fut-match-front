<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Context

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- TypeScript (strict mode)
- Supabase for auth/database
- Path alias: `@/*` → `./src/*`

# Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```

# Dev Server

Dev server allows `192.168.20.32` as allowed origin (`next.config.ts:4`).

# Supabase Auth Configuration

**CRITICAL for production:** Redirect URLs must be registered in Supabase Console:
- Go to: Authentication → URL Configuration
- Add `https://parti2.app/dashboard` in "Redirect URLs"
- Set "Site URL" to `https://parti2.app`
- For OAuth: also add `https://parti2.app/auth/callback`

Email confirmation flow uses `NEXT_PUBLIC_APP_URL` (`src/app/auth/page.tsx:54-55`). Verify in `.env` or `.env.local`.

# Deployment & Infrastructure

**CRITICAL for Cloudflare Pages deployment:**

Environment variables must be set in **Cloudflare Dashboard** (not in `.env`):
- Go to: Pages → parti2 → Settings → Environment variables
- Set these for **Production** environment:
  - `NEXT_PUBLIC_SUPABASE_URL=https://ooewvkfxvbxghqwgajem.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable__glpYBVn5KqbjCfGNdcSgA_HxL6pj9K`
  - `NEXT_PUBLIC_APP_URL=https://parti2.app`
- After saving, click "Redeploy"

Missing vars cause: "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL"

See `FIX_CLOUDFLARE_ENV_PRODUCTION.md` for detailed setup steps.

**Build & Deploy:**
- **Target**: Cloudflare Pages (via `opennextjs-cloudflare`)
- **Build command**: `npm run build` → then `opennextjs-cloudflare build`
- **Deploy**: `npm run deploy` (pushes to CF Pages)
- **Edge runtime**: Required for dynamic routes `/match/[id]` (already set)
- **Output directory**: `.vercel/output/static` (configured in `wrangler.jsonc`)
- **Node.js compat**: `compatibility_flags: ["nodejs_compat"]` in `wrangler.jsonc`

See `CONTEXT.md` for full infra decisions and runtime flags.

# Key Files & Patterns

- `src/lib/supabase.ts`: Browser client with session cookies (via `@supabase/ssr`)
- `src/proxy.ts`: Middleware protecting `/dashboard`, `/matches`, `/match/*`, `/create`
- `src/app/auth/page.tsx`: Login/signup with email redirect to `NEXT_PUBLIC_APP_URL/dashboard`
- `src/app/match/[id]/page.tsx`: Dynamic route (requires `runtime = "edge"`)
- `src/components/MatchDetails.tsx`: Large, sensitive file—test thoroughly after edits

See `CONTEXT.md` for detailed architecture, business rules, and gotchas.

# Common Mistakes

- **Auth setup fails silently**: Verify Supabase URL/key are in `.env` AND redirect URLs are registered in Supabase Console
- **"Invalid supabaseUrl" in production**: Missing `NEXT_PUBLIC_SUPABASE_URL` in Cloudflare Pages environment variables
- **Dynamic routes fail on Cloudflare**: Ensure `runtime = "edge"` export on `/match/[id]` and similar
- **Email confirmation links broken**: Check `NEXT_PUBLIC_APP_URL` matches Supabase "Site URL" and "Redirect URLs"
- **Parsing errors `<eof>`**: Usually truncated files in `supabase.ts` or `match/[id]/page.tsx`
- **Colors wrong in light mode**: Use theme tokens (`bg-card`, `text-foreground`) not hardcoded colors (`bg-white`, `text-black`)

# Verifying Changes Before Commit

```bash
npm run lint   # Check for style/type issues
npm run build  # Full typecheck & bundle (catches edge runtime issues)
```

Then verify locally (if applicable):
```bash
npm run dev    # Test locally
# or
npm run preview  # Test CF Pages build locally
```

# Notes

- No test framework configured
- No pre-commit hooks
- Components live in `src/components/`, pages in `src/app/`
- Use lucide-react for icons, next-themes for dark mode
- `.env` must NOT be committed (already in `.gitignore`)
- Local dev needs `.env` with Supabase credentials
- Production (Cloudflare Pages) needs same variables in Dashboard
