-- 0003_functions.sql
-- SECURITY DEFINER RPCs. Guests (anon key) never touch tables directly; they
-- call these functions which expose only slot times (no PII) and perform
-- booking atomically.

-- ---------------------------------------------------------------------------
-- get_available_slots(service, date)
-- Returns bookable slot start times for a service on a given date, considering:
--   * salon business hours / open days / slot interval (salon timezone)
--   * service duration (slot must fit before closing)
--   * skill-based availability: at least one *capable* stylist must be free
--   * global concurrency capacity across all stylists
-- ---------------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_date       date
)
returns table (
  slot_start              timestamptz,
  available_stylist_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_settings public.salon_settings%rowtype;
  v_dow      int;
  v_open_ts  timestamptz;
  v_close_ts timestamptz;
begin
  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and active = true;
  if v_duration is null then
    return; -- unknown or inactive service => no slots
  end if;

  select * into v_settings from public.salon_settings limit 1;
  if not found then
    return;
  end if;

  -- ISO day of week (1 = Mon ... 7 = Sun).
  v_dow := extract(isodow from p_date)::int;
  if not (v_dow = any (v_settings.open_days)) then
    return; -- salon closed that day
  end if;

  -- Build day boundaries as timestamptz from the salon's wall-clock hours.
  v_open_ts  := (p_date + v_settings.open_time)  at time zone v_settings.timezone;
  v_close_ts := (p_date + v_settings.close_time) at time zone v_settings.timezone;

  return query
  with candidates as (
    select
      gs as slot_start,
      gs + make_interval(mins => v_duration) as slot_end
    from generate_series(
           v_open_ts,
           v_close_ts - make_interval(mins => v_duration),
           make_interval(mins => v_settings.slot_interval_minutes)
         ) as gs
  ),
  scored as (
    select
      c.slot_start,
      -- Capable, active stylists with no overlapping booked appointment.
      (
        select count(*)
        from public.stylists st
        join public.stylist_services ss
          on ss.stylist_id = st.id and ss.service_id = p_service_id
        where st.active = true
          and not exists (
            select 1
            from public.appointments a
            where a.stylist_id = st.id
              and a.status = 'booked'
              and tstzrange(a.starts_at, a.ends_at)
                  && tstzrange(c.slot_start, c.slot_end)
          )
      ) as capable_free,
      -- Total concurrent booked appointments across all stylists.
      (
        select count(*)
        from public.appointments a
        where a.status = 'booked'
          and tstzrange(a.starts_at, a.ends_at)
              && tstzrange(c.slot_start, c.slot_end)
      ) as concurrent
    from candidates c
  )
  select
    s.slot_start,
    least(s.capable_free, v_settings.capacity - s.concurrent)::int
      as available_stylist_count
  from scored s
  where s.capable_free > 0
    and s.concurrent < v_settings.capacity
    and s.slot_start > now() -- never offer past slots
  order by s.slot_start;
end;
$$;

-- ---------------------------------------------------------------------------
-- book_appointment(...)
-- Atomically books an appointment. Re-validates availability server-side and
-- assigns a stylist. A transaction-level advisory lock serializes concurrent
-- calls so capacity can't be exceeded; the GiST exclusion constraint is the
-- final backstop against double-booking a stylist.
-- Returns the new appointment id.
-- ---------------------------------------------------------------------------
create or replace function public.book_appointment(
  p_service_id   uuid,
  p_starts_at    timestamptz,
  p_client_name  text,
  p_client_phone text,
  p_client_email text default null,
  p_stylist_id   uuid  default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration   int;
  v_settings   public.salon_settings%rowtype;
  v_ends_at    timestamptz;
  v_concurrent int;
  v_stylist    uuid;
  v_id         uuid;
begin
  -- Serialize bookings to prevent capacity races.
  perform pg_advisory_xact_lock(hashtext('book_appointment'));

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and active = true;
  if v_duration is null then
    raise exception 'Service not available' using errcode = 'P0001';
  end if;

  select * into v_settings from public.salon_settings limit 1;
  if not found then
    raise exception 'Salon not configured' using errcode = 'P0001';
  end if;

  if coalesce(btrim(p_client_name), '') = '' then
    raise exception 'Client name is required' using errcode = 'P0001';
  end if;
  if coalesce(btrim(p_client_phone), '') = '' then
    raise exception 'Client phone is required' using errcode = 'P0001';
  end if;
  if p_starts_at <= now() then
    raise exception 'Cannot book a time in the past' using errcode = 'P0001';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  -- Capacity check (concurrent booked across all stylists).
  select count(*) into v_concurrent
  from public.appointments a
  where a.status = 'booked'
    and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, v_ends_at);
  if v_concurrent >= v_settings.capacity then
    raise exception 'No capacity at the selected time' using errcode = 'P0001';
  end if;

  -- Pick the assigned stylist: the requested one if capable & free, otherwise
  -- the first capable, free stylist.
  select st.id into v_stylist
  from public.stylists st
  join public.stylist_services ss
    on ss.stylist_id = st.id and ss.service_id = p_service_id
  where st.active = true
    and (p_stylist_id is null or st.id = p_stylist_id)
    and not exists (
      select 1
      from public.appointments a
      where a.stylist_id = st.id
        and a.status = 'booked'
        and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, v_ends_at)
    )
  order by
    case when st.id = p_stylist_id then 0 else 1 end,
    st.full_name
  limit 1;

  if v_stylist is null then
    raise exception 'No stylist available for this service at the selected time'
      using errcode = 'P0001';
  end if;

  insert into public.appointments (
    service_id, stylist_id, client_name, client_phone, client_email,
    starts_at, ends_at, status
  ) values (
    p_service_id, v_stylist, btrim(p_client_name), btrim(p_client_phone),
    nullif(btrim(coalesce(p_client_email, '')), ''),
    p_starts_at, v_ends_at, 'booked'
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Allow guests (anon) and stylists (authenticated) to call the RPCs.
grant execute on function public.get_available_slots(uuid, date)
  to anon, authenticated;
grant execute on function
  public.book_appointment(uuid, timestamptz, text, text, text, uuid)
  to anon, authenticated;
