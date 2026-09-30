# PLAN — Stingers Jersey Payment Dashboard

## Problem

Collector cannot quickly check who has paid / not paid for jerseys. Payments arrive
via GCash and checks, tracked manually in a CSV (`Stingers Jersey Payment - NONPLAYERS.csv`).
Need an admin dashboard listing all orders with status: **paid**, **unpaid**, **pending**.

## Decisions (confirmed)

| Topic | Choice |
|---|---|
| Database | Supabase (Postgres), access via server-only service role key |
| Auth | Simple env-based single admin login + signed session cookie |
| Data entry | Admin marks payments manually (GCash ref / check noted) |
| Schema shape | One row per jersey order (same person can have multiple rows) |
| Fields | CSV columns only — no amount, no due date |
| Seed | Import all ~70 CSV rows |

## Context

- Greenfield: Next.js 16.3.8 (App Router, Turbopack) + React 19 + TS strict + Tailwind v4
- Only stock scaffold exists — no DB, auth, models, API routes
- Next.js 16 has breaking changes; follow `node_modules/next/dist/docs/`

## Data model

`supabase/migrations/001_init.sql`:

```sql
create table jersey_orders (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                  -- "Bien Lausa"
  jersey_number text,                           -- "47"; "—" → null
  size          text,                           -- normalized: XS,S,M,L,XL,2XL,3XL,4XL
  jersey_name   text,                           -- printed name "Bien"
  status        text not null default 'unpaid'
                check (status in ('pending','unpaid','paid')),
  note          text,                           -- e.g. "ari sakon"
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS enabled, deny anon: all access goes through server-side service role key
alter table jersey_orders enable row level security;
```

Status semantics:

- **unpaid** — nothing received
- **pending** — payment submitted, awaiting verification (GCash proof received / check not yet cleared)
- **paid** — verified and recorded

## CSV import — `scripts/seed.ts`

Source: `Stingers Jersey Payment - NONPLAYERS.csv` (70 data rows).

- Parse **cols 1–5 only**. Cols 6–10 are scratch (paid/unpaid counts, "CASH ON HAND: 20250") — ignore.
- Header is mislabeled: data order is `Name, Number, Size, Jersey Name, PAYMENT`
  (header says `Size,Number` — swapped).
- Size normalization map: `xsmall, xs → XS`; `small, SMALL → S`;
  `LARGE, Large → L`; `2xl, XXL → 2XL`; `3xl, 3XL, XXXL → 3XL`; `XXXXL → 4XL`;
  `—, blank → null`; else uppercase as-is (S/M/L/XL already fine).
- `jersey_number`: `"—"` → null.
- Status: `paid`/`unpaid` as-is (no `pending` rows in CSV).
- `note`: col6 value when present (`ari sakon`).
- Keep duplicates as-is (Adriane x2, Aryana x5, Zeian x3).
- Idempotent: abort if `jersey_orders` non-empty.
- Expected result: 70 rows, split ≈ 45 paid / 25 unpaid.
- Run: `npx tsx scripts/seed.ts`

## Auth

- Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME`,
  `ADMIN_PASSWORD`, `SESSION_SECRET`
- `jose`-signed session cookie (httpOnly, secure) — pattern from Next.js
  `authentication.md` guide; `server-only` package for server libs
- `src/proxy.ts` — optimistic auth gate (redirect unauthenticated → `/login`).
  **Not** `middleware.ts` — renamed in Next 16; nodejs runtime only
- `requireAdmin()` re-check inside every server action (proxy = optimistic only)
- Login page → server action verifies env creds → sets cookie → redirect `/`
- Logout action clears cookie

## Structure

```
src/proxy.ts                              # auth gate, matcher: / except /login
src/lib/db.ts                             # supabase-js client (service role, server-only)
src/lib/auth.ts                           # signSession / verifySession / requireAdmin
src/lib/types.ts                          # JerseyOrder, Status
src/app/login/page.tsx
src/app/(dashboard)/layout.tsx            # requireAdmin + nav + logout
src/app/(dashboard)/page.tsx              # main dashboard: cards, filters, table
src/app/(dashboard)/orders/new/page.tsx   # create order form
src/app/(dashboard)/orders/[id]/page.tsx  # detail + edit + history
src/app/actions/auth.ts                   # 'use server': login, logout
src/app/actions/orders.ts                 # 'use server': createOrder, updateOrder, setStatus
src/components/order-table.tsx
src/components/status-badge.tsx
src/components/filter-tabs.tsx
src/components/summary-cards.tsx
src/components/order-form.tsx
src/components/status-buttons.tsx
supabase/migrations/001_init.sql
scripts/seed.ts
```

## Dashboard (main deliverable)

- **Summary cards**: counts — Paid / Unpaid / Pending / Total orders
- **Filter tabs** via `searchParams` (`?status=paid|unpaid|pending`), server-rendered;
  "All" default
- **Search**: name or jersey name (ILIKE), `?q=`
- **Table**: name, jersey number, size, jersey name, status badge, note, actions
- Row actions: **Mark paid**, **Mark pending**, **Mark unpaid**, **View**
- Sort: `created_at` desc (CSV order preserved by seed insertion)

## Actions

| Action | Behavior |
|---|---|
| `login` / `logout` | env credential check; set/clear httpOnly cookie |
| `createOrder` / `updateOrder` | zod-validated; size from enum select; `updated_at` touch |
| `setStatus` | flip status paid / unpaid / pending |

Every action: `requireAdmin()` first → mutate → `revalidatePath('/')`.

## Next 16 rules applied

- `await cookies()`, `await params`, `await searchParams` — sync access removed
- `proxy.ts` named export `proxy` (not `middleware` export)
- `useActionState` (not `useFormState`); action args: `(prevState, formData)`;
  row buttons via `.bind(null, id)`
- `revalidatePath` preferred; `revalidateTag(tag, 'max')` two-arg if used
- Lint via `eslint` CLI directly (`next lint` removed in v16)
- Turbopack default for dev/build; no webpack config
- Type-safe route helpers: `PageProps<'/orders/[id]'>`, `LayoutProps<'/dashboard'>`
- Keep the auto-generated AGENTS.md block — commit it, don't strip
- Env floor: Node 20.9+, TS 5.1+

## Phases

1. **Setup** — deps (`@supabase/supabase-js`, `jose`, `zod`, `server-only`, `tsx`),
   `.env.local` (user fills Supabase keys), migration SQL file
2. **Auth** — `lib/auth`, login page + action, `proxy.ts`, protected `(dashboard)` layout
3. **Seed** — `scripts/seed.ts`, run import, verify 70 rows + status split
4. **Actions** — order create/edit + status change server actions
5. **Dashboard** — summary cards, filter tabs, order table, search
6. **Detail/forms** — new order, edit order, record-payment buttons
7. **Verify** — `npx eslint .`, `npm run build`, manual flow in `next dev`
   (login → filter by status → mark paid → search → add order)

## Prereqs (user)

1. Supabase project → URL + service role key
2. `.env.local`:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
SESSION_SECRET=...
```

## Out of scope (future)

GCash API integration, price/cash-on-hand tracking, customer self-service portal,
multi-user roles, receipts/PDF exports.
