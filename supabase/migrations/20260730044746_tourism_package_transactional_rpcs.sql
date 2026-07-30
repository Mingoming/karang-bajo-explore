-- Transactional administrator mutations for tourism package parents and their
-- ordered destination relationships. Direct authenticated writes are revoked
-- so a package edit cannot be split into independently committed statements.

create or replace function private.validate_tourism_package_destinations(
  p_destinations jsonb,
  p_require_published boolean
)
returns table (
  destination_id uuid,
  display_order integer,
  notes text
)
language plpgsql
set search_path = ''
as $$
declare
  submitted jsonb := coalesce(p_destinations, '[]'::jsonb);
  item jsonb;
  item_index integer;
  parsed_destination_id uuid;
  parsed_display_order integer;
  parsed_notes text;
  destination_status public.publication_status;
  seen_destination_ids uuid[] := '{}'::uuid[];
begin
  if jsonb_typeof(submitted) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'invalid tourism package destinations';
  end if;

  for item, item_index in
    select entry.value, entry.ordinality::integer - 1
    from jsonb_array_elements(submitted) with ordinality as entry(value, ordinality)
  loop
    if jsonb_typeof(item) <> 'object'
      or not item ? 'destination_id'
      or not item ? 'display_order'
      or exists (
        select 1
        from jsonb_object_keys(item) as submitted_key(key)
        where submitted_key.key not in ('destination_id', 'display_order', 'notes')
      )
      or jsonb_typeof(item -> 'destination_id') <> 'string'
      or jsonb_typeof(item -> 'display_order') <> 'number'
      or (
        item ? 'notes'
        and jsonb_typeof(item -> 'notes') not in ('string', 'null')
      ) then
      raise exception using
        errcode = '22023',
        message = 'invalid tourism package destination item';
    end if;

    if (item ->> 'destination_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (item ->> 'display_order') !~ '^\d+$'
      or (item ->> 'display_order')::numeric > 2147483647 then
      raise exception using
        errcode = '22023',
        message = 'invalid tourism package destination value';
    end if;

    parsed_destination_id := (item ->> 'destination_id')::uuid;
    parsed_display_order := (item ->> 'display_order')::integer;
    parsed_notes := nullif(btrim(coalesce(item ->> 'notes', '')), '');

    if parsed_destination_id = any(seen_destination_ids) then
      raise exception using
        errcode = '23505',
        message = 'duplicate tourism package destination';
    end if;
    if parsed_display_order <> item_index then
      raise exception using
        errcode = '23514',
        message = 'invalid tourism package destination ordering';
    end if;

    select destination.status
    into destination_status
    from public.destinations as destination
    where destination.id = parsed_destination_id
    -- Status is part of package publication validity. FOR SHARE blocks
    -- concurrent non-key status updates until this package mutation commits.
    for share;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'tourism package destination not found';
    end if;
    if p_require_published and destination_status <> 'published'::public.publication_status then
      raise exception using
        errcode = '23514',
        message = 'published tourism package requires published destinations';
    end if;

    seen_destination_ids := array_append(seen_destination_ids, parsed_destination_id);
    destination_id := parsed_destination_id;
    display_order := parsed_display_order;
    notes := parsed_notes;
    return next;
  end loop;
end;
$$;

create or replace function public.tourism_package_create(
  p_name text,
  p_slug text,
  p_package_type public.package_type,
  p_duration_value integer,
  p_duration_unit text,
  p_price numeric,
  p_price_note text,
  p_included_facilities text[],
  p_souvenir text,
  p_summary text,
  p_description text,
  p_is_featured boolean,
  p_display_order integer,
  p_status public.publication_status,
  p_destinations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  created_package_id uuid;
begin
  if caller_id is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'administrator authorization required';
  end if;
  if btrim(coalesce(p_name, '')) = ''
    or btrim(coalesce(p_slug, '')) = ''
    or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_package_type is null
    or p_duration_value is null
    or p_duration_value <= 0
    or btrim(coalesce(p_duration_unit, '')) = ''
    or p_price < 0
    or btrim(coalesce(p_description, '')) = ''
    or p_display_order is null
    or p_display_order < 0
    or p_status <> 'draft'::public.publication_status then
    raise exception using
      errcode = '23514',
      message = 'invalid tourism package data';
  end if;

  -- Validate and lock every referenced destination before creating the parent.
  perform *
  from private.validate_tourism_package_destinations(p_destinations, false);

  insert into public.tourism_packages (
    name,
    slug,
    package_type,
    duration_value,
    duration_unit,
    price,
    price_note,
    included_facilities,
    souvenir,
    summary,
    description,
    is_featured,
    display_order,
    status,
    created_by,
    updated_by
  )
  values (
    btrim(p_name),
    p_slug,
    p_package_type,
    p_duration_value,
    btrim(p_duration_unit),
    p_price,
    nullif(btrim(coalesce(p_price_note, '')), ''),
    coalesce(p_included_facilities, '{}'::text[]),
    nullif(btrim(coalesce(p_souvenir, '')), ''),
    nullif(btrim(coalesce(p_summary, '')), ''),
    btrim(p_description),
    coalesce(p_is_featured, false),
    p_display_order,
    p_status,
    caller_id,
    caller_id
  )
  returning id into created_package_id;

  insert into public.package_destinations (
    package_id,
    destination_id,
    display_order,
    notes,
    created_by
  )
  select
    created_package_id,
    item.destination_id,
    item.display_order,
    item.notes,
    caller_id
  from private.validate_tourism_package_destinations(p_destinations, false) as item;

  return created_package_id;
end;
$$;

create or replace function public.tourism_package_update(
  p_package_id uuid,
  p_name text,
  p_package_type public.package_type,
  p_duration_value integer,
  p_duration_unit text,
  p_price numeric,
  p_price_note text,
  p_included_facilities text[],
  p_souvenir text,
  p_summary text,
  p_description text,
  p_is_featured boolean,
  p_display_order integer,
  p_status public.publication_status,
  p_destinations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  existing_package public.tourism_packages%rowtype;
  current_destinations jsonb;
  submitted_destinations jsonb := coalesce(p_destinations, '[]'::jsonb);
  relations_changed boolean;
begin
  if caller_id is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'administrator authorization required';
  end if;
  if p_package_id is null
    or btrim(coalesce(p_name, '')) = ''
    or p_package_type is null
    or p_duration_value is null
    or p_duration_value <= 0
    or btrim(coalesce(p_duration_unit, '')) = ''
    or p_price < 0
    or btrim(coalesce(p_description, '')) = ''
    or p_display_order is null
    or p_display_order < 0
    or p_status is null then
    raise exception using
      errcode = '23514',
      message = 'invalid tourism package data';
  end if;

  select package.*
  into existing_package
  from public.tourism_packages as package
  where package.id = p_package_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'tourism package not found';
  end if;

  -- Validate the complete replacement set and retain row locks before mutation.
  perform *
  from private.validate_tourism_package_destinations(
    submitted_destinations,
    p_status = 'published'::public.publication_status
  );

  if p_status = 'published'::public.publication_status
    and jsonb_array_length(submitted_destinations) = 0 then
    raise exception using
      errcode = '23514',
      message = 'published tourism package requires a destination';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'destination_id', relation.destination_id::text,
        'display_order', relation.display_order,
        'notes', relation.notes
      )
      order by relation.display_order, relation.destination_id
    ),
    '[]'::jsonb
  )
  into current_destinations
  from public.package_destinations as relation
  where relation.package_id = p_package_id;

  perform relation.id
  from public.package_destinations as relation
  where relation.package_id = p_package_id
  for update;

  relations_changed := current_destinations is distinct from submitted_destinations;
  if existing_package.status <> 'draft'::public.publication_status and relations_changed then
    raise exception using
      errcode = '23514',
      message = 'tourism package destinations are editable only in draft';
  end if;

  if relations_changed then
    delete from public.package_destinations
    where package_id = p_package_id;

    insert into public.package_destinations (
      package_id,
      destination_id,
      display_order,
      notes,
      created_by
    )
    select
      p_package_id,
      item.destination_id,
      item.display_order,
      item.notes,
      caller_id
    from private.validate_tourism_package_destinations(
      submitted_destinations,
      p_status = 'published'::public.publication_status
    ) as item;
  end if;

  update public.tourism_packages
  set name = btrim(p_name),
      package_type = p_package_type,
      duration_value = p_duration_value,
      duration_unit = btrim(p_duration_unit),
      price = p_price,
      price_note = nullif(btrim(coalesce(p_price_note, '')), ''),
      included_facilities = coalesce(p_included_facilities, '{}'::text[]),
      souvenir = nullif(btrim(coalesce(p_souvenir, '')), ''),
      summary = nullif(btrim(coalesce(p_summary, '')), ''),
      description = btrim(p_description),
      is_featured = coalesce(p_is_featured, false),
      display_order = p_display_order,
      status = p_status,
      updated_by = caller_id
  where id = p_package_id;

  return p_package_id;
end;
$$;

alter function private.validate_tourism_package_destinations(jsonb, boolean) owner to postgres;
alter function public.tourism_package_create(text, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) owner to postgres;
alter function public.tourism_package_update(uuid, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) owner to postgres;

revoke all on function private.validate_tourism_package_destinations(jsonb, boolean) from public, anon, authenticated;
revoke all on function public.tourism_package_create(text, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) from public, anon, authenticated;
revoke all on function public.tourism_package_update(uuid, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) from public, anon, authenticated;

grant execute on function public.tourism_package_create(text, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) to authenticated;
grant execute on function public.tourism_package_update(uuid, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) to authenticated;

revoke insert, update, delete on table public.tourism_packages from authenticated;
revoke insert, update, delete on table public.package_destinations from authenticated;

comment on function public.tourism_package_create(text, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) is
  'Creates one draft tourism package and its complete ordered destination set atomically for the configured administrator.';
comment on function public.tourism_package_update(uuid, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) is
  'Updates one tourism package and, while draft, atomically replaces its complete ordered destination set for the configured administrator.';
