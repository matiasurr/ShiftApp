-- 0001_init.sql
-- Core schema for the salon booking app.
-- Skill-based scheduling under a global concurrency capacity.

-- Required for the GiST exclusion constraint on appointments (no double-booking).
create extension if not exists btree_gist;
-- For gen_random_uuid().
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- salon_settings: a single configuration row for the salon.
-- ---------------------------------------------------------------------------
create table if not exists public.salon_settings (
  id                    uuid primary key default gen_random_uuid(),
  capacity              int  not null default 4 check (capacity > 0),
  open_time             time not null default '09:00',
  close_time            time not null default '18:00',
  slot_interval_minutes int  not null default 30 check (slot_interval_minutes > 0),
  timezone              text not null default 'America/Argentina/Buenos_Aires',
  -- ISO weekday numbers that the salon is open (1 = Mon ... 7 = Sun).
  open_days             int[] not null default '{1,2,3,4,5,6}',
  constraint salon_settings_hours_ck check (close_time > open_time)
);

-- ---------------------------------------------------------------------------
-- services: bookable services with a fixed duration.
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  duration_minutes int  not null check (duration_minutes > 0),
  price_cents      int  check (price_cents is null or price_cents >= 0),
  active           bool not null default true
);

-- ---------------------------------------------------------------------------
-- stylists: salon staff. user_id links to a Supabase auth user (nullable until
-- the stylist account is created and linked).
-- ---------------------------------------------------------------------------
create table if not exists public.stylists (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  active    bool not null default true
);

-- ---------------------------------------------------------------------------
-- stylist_services: which services each stylist can perform (the skills map).
-- ---------------------------------------------------------------------------
create table if not exists public.stylist_services (
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (stylist_id, service_id)
);

-- ---------------------------------------------------------------------------
-- appointments: booked appointments.
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.services (id),
  stylist_id   uuid not null references public.stylists (id),
  client_name  text not null,
  client_phone text not null,
  client_email text,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text not null default 'booked'
                 check (status in ('booked', 'cancelled', 'completed')),
  notes        text,
  created_at   timestamptz not null default now(),
  constraint appointments_time_ck check (ends_at > starts_at),
  -- Backstop: a stylist can never have two overlapping *booked* appointments,
  -- even under concurrent inserts.
  constraint appointments_no_overlap
    exclude using gist (
      stylist_id with =,
      tstzrange(starts_at, ends_at) with &&
    ) where (status = 'booked')
);

create index if not exists appointments_starts_at_idx
  on public.appointments (starts_at);
create index if not exists appointments_stylist_starts_idx
  on public.appointments (stylist_id, starts_at);
