# Salon Booking PWA

A mobile-first booking app for a hair salon:

- **Guests** book appointments (no account) with live, skill-aware availability.
- **Stylists** sign in on their phones to view their daily schedule.
- Installable **PWA** (manifest + service worker).

Built with Next.js 16 (App Router, React 19, Tailwind v4) and Supabase
(Postgres + Auth + RLS).

## How scheduling works

- Each **service** has a duration; each **stylist** can perform only a subset of
  services (the skills map).
- A time slot is bookable only if a **capable** stylist is free — so a slot can
  be unavailable even when other (incapable) stylists are idle.
- A configurable **capacity** (default 4) caps total concurrent appointments
  across all stylists.
- Counts (stylists, capacity, services, hours) are **data, not code** — change
  them in the database with no redeploy.

Availability and booking run through two `SECURITY DEFINER` Postgres RPCs
(`get_available_slots`, `book_appointment`). Guests use the anon key, which RLS
restricts to non-PII reads only; booking is atomic (advisory lock + a GiST
exclusion constraint that makes double-booking impossible).

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase** — follow [`supabase/README.md`](./supabase/README.md):
   create a project, copy `.env.local.example` to `.env.local` and fill in the
   URL + anon key, run the migrations + seed, and create/link stylist auth users.

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

   To test PWA install + the service worker locally, use HTTPS:
   ```bash
   npx next dev --experimental-https
   ```

## Routes

| Route                 | Who           | Purpose                                  |
| --------------------- | ------------- | ---------------------------------------- |
| `/`                   | Guests        | Booking flow (service → date → time → details) |
| `/book/confirmation`  | Guests        | Booking success summary                  |
| `/login`              | Stylists      | Email/password sign-in                   |
| `/stylist`            | Stylists      | Protected daily schedule (RLS-scoped)    |

`/stylist/*` is protected by `proxy.ts` (the Next.js 16 successor to
`middleware.ts`), which also refreshes the Supabase session on each request.

## Project layout

```
app/
  page.tsx                booking entry (server component)
  book/booking-flow.tsx   client stepper
  book/confirmation/      success page
  login/                  sign-in page + form
  stylist/                protected schedule
  actions/                server actions (booking.ts, auth.ts)
  manifest.ts             PWA manifest
  sw-register.tsx         service worker registrar
lib/supabase/             server / client / middleware factories
proxy.ts                  session refresh + route protection
public/sw.js              service worker
supabase/                 migrations, seed, setup docs
types/database.ts         hand-written DB/RPC types
```

## Verification

See the **Verification** section of the implementation plan and
[`supabase/README.md`](./supabase/README.md). Quick checks:

- `npm run lint` and `npm run build` succeed.
- Booking a slot makes it disappear from availability.
- A service only one stylist can do shows fewer slots; once that stylist is
  booked at a time, that slot is gone even though the other stylist is free.
- Lowering `salon_settings.capacity` blocks overlapping bookings across stylists.
- `/stylist` shows only the signed-in stylist's appointments; unauthenticated
  access redirects to `/login`.
