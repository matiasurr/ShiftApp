-- 0002_rls.sql
-- Row Level Security. Guests use the anon key and must only be able to read the
-- data needed to render the booking UI — never client PII or appointment rows.
-- Booking + availability happen through SECURITY DEFINER RPCs (0003_functions).

alter table public.salon_settings   enable row level security;
alter table public.services         enable row level security;
alter table public.stylists         enable row level security;
alter table public.stylist_services enable row level security;
alter table public.appointments     enable row level security;

-- salon_settings: anyone may read salon hours/capacity for the UI.
drop policy if exists salon_settings_read on public.salon_settings;
create policy salon_settings_read
  on public.salon_settings for select
  to anon, authenticated
  using (true);

-- services: anyone may read active services for the booking UI.
drop policy if exists services_read on public.services;
create policy services_read
  on public.services for select
  to anon, authenticated
  using (true);

-- stylists: anyone may read basic stylist info (id, full_name, active).
-- No sensitive columns live on this table.
drop policy if exists stylists_read on public.stylists;
create policy stylists_read
  on public.stylists for select
  to anon, authenticated
  using (true);

-- stylist_services: anyone may read the skills map (needed to compute which
-- services are bookable in the UI).
drop policy if exists stylist_services_read on public.stylist_services;
create policy stylist_services_read
  on public.stylist_services for select
  to anon, authenticated
  using (true);

-- appointments: NO anon access at all. An authenticated stylist may read only
-- their own appointments (rows whose stylist maps to their auth.uid()).
drop policy if exists appointments_select_own on public.appointments;
create policy appointments_select_own
  on public.appointments for select
  to authenticated
  using (
    exists (
      select 1
      from public.stylists s
      where s.id = appointments.stylist_id
        and s.user_id = (select auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE policies on appointments: all writes go through the
-- SECURITY DEFINER book_appointment() RPC, which bypasses RLS by design.
