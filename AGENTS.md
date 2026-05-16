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

# Notes

- No test framework configured
- No pre-commit hooks
- Components live in `src/components/`, pages in `src/app/`
- Use lucide-react for icons, next-themes for dark mode