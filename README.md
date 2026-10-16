# Keren — AI Opportunity Intelligence Platform

Turn opportunities into capital. Find the opportunity. Know your fit. Build the application.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL + Prisma 6 (schema-based `url`; Prisma 7+ removes this in favor of
  `prisma.config.ts` — stay on 6.x until that migration is intentionally done)
- NextAuth v5 (beta) — email/password (Credentials) + Google OAuth
- OpenAI API — isolated AI services with graceful degradation when unconfigured
- Vitest for unit tests (deterministic matching engine)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL at minimum
npm run db:migrate           # creates tables (requires a real Postgres instance)
npm run dev
```

The database starts genuinely empty — no seed data. Opportunities are added through
`/admin/opportunities` once an administrator account exists.

### Creating the first admin

There is no seeded admin user by design. After registering your first account, promote it
manually:

```sql
update "User" set "platformRole" = 'SUPERADMIN' where email = 'you@example.com';
```

(or via `npm run db:studio`).

## Environment variables

See `.env.example` for the full list. Everything degrades gracefully when unset:

- No `OPENAI_API_KEY` → AI drafting/explanations fall back to deterministic templates
  with a clear "AI unavailable" message, rather than failing or fabricating.
- No storage provider configured → document uploads are blocked with an explicit
  "storage not configured" message instead of writing to local disk.
- No payments provider configured → billing page shows plans but upgrade is disabled.

## Architecture notes

- `src/lib/matching/engine.ts` — the deterministic match scoring engine (no LLM calls).
  Fully unit-tested in `engine.test.ts`.
- `src/lib/ai/*` — isolated AI services (matcher explanation, application writer). Each
  documents its allowed inputs and missing-information behavior; see PRD guardrails.
- `src/lib/compliance/checker.ts` — deterministic compliance/readiness checks.
- `src/lib/storage`, `src/lib/billing` — provider-agnostic interfaces; concrete S3 /
  Paystack implementations can be dropped in without touching call sites.
- `src/auth.config.ts` (edge-safe) vs `src/auth.ts` (full, Prisma-backed) — required split
  for NextAuth v5 + middleware on the edge runtime.

## Known limitations / remaining work

- No live Postgres instance was available in the build environment, so migrations were
  never applied or runtime-tested end-to-end — `npm run db:migrate` needs to be run
  against a real database before first use.
- No real logo/brand image assets existed in the workspace; the Keren mark and wordmark
  are coded as SVG/text components per the brand guide rather than traced from source
  files.
- Document upload (knowledge base) UI exists but has no wired storage provider.
- Payment provider (Paystack) is abstracted but not implemented.
- Email delivery for notifications is not wired up (in-app notifications only).
