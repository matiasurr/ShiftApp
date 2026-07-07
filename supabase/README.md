# Supabase setup

This directory holds the database schema, security policies, RPC functions, and
seed data for the salon booking app.

```
supabase/
  migrations/
    0001_init.sql       schema + no-double-booking exclusion constraint
    0002_rls.sql        Row Level Security policies
    0003_functions.sql  get_available_slots() + book_appointment() RPCs
  seed.sql              demo settings, services, stylists + skills
```

## 1. Create a project

1. Create a project at https://supabase.com.
2. In **Project Settings -> API**, copy the **Project URL** and the **anon
   public** key.
3. In the app root (`shift-app/`), copy `.env.local.example` to `.env.local` and
   fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

## 2. Apply migrations + seed

### Option A — Supabase SQL editor (no CLI)

Open the SQL editor in the dashboard and run, in order:

1. `migrations/0001_init.sql`
2. `migrations/0002_rls.sql`
3. `migrations/0003_functions.sql`
4. `seed.sql`

### Option B — Supabase CLI

```bash
# from shift-app/
supabase link --project-ref <your-project-ref>
supabase db push          # applies migrations/
supabase db execute --file supabase/seed.sql
```

## 3. Create stylist login accounts

Stylists sign in with Supabase email/password auth. The seed creates two
stylists (`Alex Rivera`, `Sam Chen`) but does not link them to auth users.

For each stylist:

1. **Authentication -> Users -> Add user** — create an email/password user.
2. Copy the new user's UUID.
3. Link it to the stylist row, e.g. in the SQL editor:
   ```sql
   update public.stylists
   set user_id = '<auth-user-uuid>'
   where full_name = 'Alex Rivera';
   ```

The stylist can now sign in at `/login` and see their schedule at `/stylist`.

## Notes

- **Skill-based demo data:** Alex does Haircut/Color/Blow-dry; Sam does
  Haircut/Blow-dry/Beard trim. So **Color** is only bookable with Alex and
  **Beard trim** only with Sam — handy for testing skill-based availability.
- **Security model:** guests use the anon key, which (via RLS) can only read
  services, stylists, the skills map, and salon settings. Appointment rows are
  never readable with the anon key. Availability and booking go through the two
  `SECURITY DEFINER` RPCs, which expose slot times only (no client PII) and book
  atomically.
- **Concurrency:** `book_appointment()` takes a transaction advisory lock and
  re-validates capacity/skills; the `appointments_no_overlap` GiST exclusion
  constraint guarantees a stylist is never double-booked even under races.
- Changing `capacity`, hours, services, or skills requires **no code changes** —
  edit `salon_settings` / `services` / `stylist_services`.
