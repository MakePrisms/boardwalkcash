# BoardwalkCash Agent Guidelines

## Project Overview

- **Framework**: Remix on Express server
- **Development**: Nix + devenv, Bun for scripts/tests
- **Database**: Supabase with migrations in `supabase/migrations`

## Directory Structure

- `app/components/` – Reusable UI components
- `app/lib/` – Utilities and server helpers
- `app/features/` – Feature-specific code (see `GUIDELINES.md`)
- `app/routes/` – Remix routes
- `e2e/` – Playwright tests
- `supabase/`
    ├── migrations/           # Database migration files
    ├── database.types.ts     # Generated TypeScript types
    └── config.toml          # Supabase configuration

Use **kebab-case** for files/directories. Follow hierarchy in `GUIDELINES.md`.

## Development

- Run `bun run fix:all` for lint, format, and type checks
- After schema changes: `bun run db:generate-types`
- Tests: `bun test` (unit), `bun run test:e2e` (e2e)

## React Guidelines

- Use hooks for side effects and data fetching
- Use **@tanstack/react-query** for network requests (`useQuery`, `useSuspenseQuery`, `useMutation`)
- Avoid `useEffect` for data fetching
- Prefer `type` over `interface` when possible

## General Guidelines

- whenever handling amounts representing money, use `app/lib/money`
