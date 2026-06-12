-- seed.sql
-- Demo data: salon settings, services, and 2 stylists with DIFFERENT skill sets
-- (to demonstrate skill-based availability). Re-runnable.

-- Settings: capacity 4, Mon-Sat 09:00-18:00, 30-min slots.
insert into public.salon_settings
  (capacity, open_time, close_time, slot_interval_minutes, timezone, open_days)
select 4, '09:00', '18:00', 30, 'America/Argentina/Buenos_Aires', '{1,2,3,4,5,6}'
where not exists (select 1 from public.salon_settings);

-- Services (stable ids so the skills map below is deterministic).
insert into public.services (id, name, duration_minutes, price_cents, active) values
  ('11111111-1111-1111-1111-111111111111', 'Haircut',   30, 2500, true),
  ('22222222-2222-2222-2222-222222222222', 'Color',     90, 7000, true),
  ('33333333-3333-3333-3333-333333333333', 'Blow-dry',  45, 3000, true),
  ('44444444-4444-4444-4444-444444444444', 'Beard trim',15, 1200, true)
on conflict (id) do nothing;

-- Stylists (user_id linked later, after creating auth users — see README).
insert into public.stylists (id, full_name, active) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alex Rivera', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sam Chen',    true)
on conflict (id) do nothing;

-- Skills map (DIFFERENT on purpose):
--   Alex: Haircut, Color, Blow-dry      (no Beard trim)
--   Sam:  Haircut, Blow-dry, Beard trim (no Color)
-- => "Color" is only bookable with Alex; "Beard trim" only with Sam.
insert into public.stylist_services (stylist_id, service_id) values
  -- Alex
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333'),
  -- Sam
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444')
on conflict (stylist_id, service_id) do nothing;
