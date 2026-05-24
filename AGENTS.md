# VendorFlow Hub — Agent Guide

## Quick start
```bash
npm run dev            # Vite on http://localhost:8080
npm run build          # Production build
npm run lint           # ESLint (no-unused-vars OFF, only-export-components: warn)
npm run test           # Vitest (jsdom, globals, setup: src/test/setup.ts)
npm run test:watch     # Vitest watch mode
```

## Architecture
- **Vite + React 18 SPA** (NOT Next.js — `page.tsx` is a stale artifact)
- **Supabase** for auth, DB, storage, edge functions
- **React Router** SPA routing; Vercel serves `index.html` for all paths (SPA fallback)
- **PWA** with workbox auto-update (caches js,css,html,ico,png,svg,woff2 up to 5MB)
- Tests: `src/**/*.{test,spec}.{ts,tsx}`

## Project structure
```
src/
  pages/              # 62 page components (routes in App.tsx)
  services/
    database.ts       # Central Supabase DB abstraction layer
    api.ts            # API layer delegating to database.ts
  integrations/supabase/
    client.ts         # Auto-generated Supabase client
    types.ts          # Auto-generated DB types (2300+ lines)
  contexts/
    AuthContext.tsx    # Role-based auth (admin/vendor/operations)
    AIAccessContext.tsx
  components/ui/      # shadcn/ui components
scripts/              # 35+ data import/analysis/migration scripts
supabase/
  functions/          # 8 edge functions (chat, ai-insights, map-columns, etc.)
  migrations/         # 24 SQL migration files
```

## Key conventions
- Path alias: `@/` → `./src/` (configured in vite.config.ts, vitest.config.ts, tsconfig)
- `tsconfig.json`: `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`
- CSS-in-TS with Tailwind + shadcn/ui (CSS variables via `index.css`)
- `error` boundary: API functions throw on Supabase errors, callers handle
- Orders use a client-side cache (60s TTL) + in-flight request dedup

## Developer commands
```bash
npm run verify:imports  # Check script imports are correct
npm run build:dev       # Vite build --mode development
npm run preview         # Vite preview of production build
```

## Database
- **Firstcry importer**: `scripts/import_firstcry_to_supabase.js` needs `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`
- Admin setup: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` → `node scripts/setup-admin.js`
- Dev admin: `admin@local.test` / `Admin123!`
- Run new SQL migrations in Supabase SQL editor or via `supabase migration up`

## CI/CD
- **Vercel deploy** via GitHub Actions on push to `main` or `fix/**`
- Node 18, `npm ci`, prod deploy with `amondnet/vercel-action`

## ⚠️ Notable
- `.env` is checked in (NOT in `.gitignore`) and contains real Supabase service keys — do NOT add more secrets there
- Supabase edge functions have `verify_jwt = false` in config.toml
- HMR overlay is disabled in vite config
- `lovable-tagger` plugin active in development mode only
