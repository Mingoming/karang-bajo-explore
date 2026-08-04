-- Phase 2A: English translation storage for the singleton village profile.
-- This migration intentionally does not add application routes or translations
-- for any other content domain.

create table public.village_profile_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  village_profile_id uuid not null references public.village_profiles (id) on delete restrict,
  locale text not null default 'en',
  name text,
  summary text,
  description text,
  history text,
  vision text,
  mission text,
  address text,
  status public.publication_status not null default 'draft',
  source_updated_at_at_publish timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint village_profile_translations_source_locale_key unique (village_profile_id, locale),
  constraint village_profile_translations_locale_check check (locale = 'en'),
  constraint village_profile_translations_publication_fields_check check (
    status <> 'published'
    or (
      name is not null
      and btrim(name) <> ''
      and description is not null
      and btrim(description) <> ''
      and source_updated_at_at_publish is not null
    )
  )
);

create index village_profile_translations_public_lookup_idx
on public.village_profile_translations (village_profile_id, locale, status);

alter table public.village_profile_translations enable row level security;

revoke all on table public.village_profile_translations from public, anon, authenticated;
grant select on table public.village_profile_translations to authenticated;

create policy village_profile_translations_admin_select
on public.village_profile_translations
for select
to authenticated
using ((select public.is_admin()));

create function private.enforce_village_profile_translation_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_row public.village_profiles%rowtype;
begin
  if tg_op = 'INSERT' then
    if new.locale <> 'en' then
      raise exception using errcode = '23514', message = 'unsupported translation locale';
    end if;

    if new.status <> 'draft'::public.publication_status then
      raise exception using errcode = '23514', message = 'new translations must be draft';
    end if;

    if new.source_updated_at_at_publish is not null or new.published_at is not null then
      raise exception using errcode = '23514', message = 'draft publication metadata must be empty';
    end if;

    return new;
  end if;

  if new.id <> old.id
    or new.village_profile_id <> old.village_profile_id
    or new.locale <> old.locale
    or new.created_at <> old.created_at
    or new.created_by <> old.created_by then
    raise exception using errcode = '23514', message = 'immutable translation fields cannot change';
  end if;

  if old.status <> 'draft'::public.publication_status
    and row(
      new.name,
      new.summary,
      new.description,
      new.history,
      new.vision,
      new.mission,
      new.address
    ) is distinct from row(
      old.name,
      old.summary,
      old.description,
      old.history,
      old.vision,
      old.mission,
      old.address
    ) then
    raise exception using errcode = '55000', message = 'only draft translations may be edited';
  end if;

  if old.status = 'draft'::public.publication_status
    and new.status not in ('draft'::public.publication_status, 'published'::public.publication_status, 'archived'::public.publication_status) then
    raise exception using errcode = '23514', message = 'invalid translation lifecycle transition';
  elsif old.status = 'published'::public.publication_status
    and new.status not in ('published'::public.publication_status, 'archived'::public.publication_status) then
    raise exception using errcode = '23514', message = 'invalid translation lifecycle transition';
  elsif old.status = 'archived'::public.publication_status
    and new.status not in ('archived'::public.publication_status, 'draft'::public.publication_status) then
    raise exception using errcode = '23514', message = 'invalid translation lifecycle transition';
  end if;

  if old.status <> 'published'::public.publication_status
    and new.status = 'published'::public.publication_status then
    select source.*
    into source_row
    from public.village_profiles as source
    where source.id = new.village_profile_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'village profile source not found';
    end if;

    if source_row.status <> 'published'::public.publication_status then
      raise exception using errcode = '23514', message = 'source village profile must be published';
    end if;

    if new.name is null or btrim(new.name) = ''
      or new.description is null or btrim(new.description) = '' then
      raise exception using errcode = '23514', message = 'required English translation fields are incomplete';
    end if;

    if (source_row.summary is not null and btrim(source_row.summary) <> '')
      and (new.summary is null or btrim(new.summary) = '') then
      raise exception using errcode = '23514', message = 'English summary is required for this source';
    end if;

    if (source_row.history is not null and btrim(source_row.history) <> '')
      and (new.history is null or btrim(new.history) = '') then
      raise exception using errcode = '23514', message = 'English history is required for this source';
    end if;

    if (source_row.vision is not null and btrim(source_row.vision) <> '')
      and (new.vision is null or btrim(new.vision) = '') then
      raise exception using errcode = '23514', message = 'English vision is required for this source';
    end if;

    if (source_row.mission is not null and btrim(source_row.mission) <> '')
      and (new.mission is null or btrim(new.mission) = '') then
      raise exception using errcode = '23514', message = 'English mission is required for this source';
    end if;

    if (source_row.address is not null and btrim(source_row.address) <> '')
      and (new.address is null or btrim(new.address) = '') then
      raise exception using errcode = '23514', message = 'English address is required for this source';
    end if;

    new.source_updated_at_at_publish := source_row.updated_at;
    new.published_at := coalesce(old.published_at, statement_timestamp());
  elsif new.status = 'draft'::public.publication_status then
    new.source_updated_at_at_publish := null;
  else
    new.source_updated_at_at_publish := old.source_updated_at_at_publish;
    new.published_at := old.published_at;
  end if;

  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function private.enforce_village_profile_translation_lifecycle() from public;

create trigger village_profile_translations_lifecycle_trigger
before insert or update on public.village_profile_translations
for each row execute function private.enforce_village_profile_translation_lifecycle();

create function public.village_profile_translation_save_draft(
  p_village_profile_id uuid,
  p_name text,
  p_summary text,
  p_description text,
  p_history text,
  p_vision text,
  p_mission text,
  p_address text
)
returns table (
  id uuid,
  status public.publication_status,
  source_updated_at_at_publish timestamptz,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  translation_id uuid;
  translation_status public.publication_status;
begin
  if actor_id is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;

  perform 1
  from public.village_profiles as source
  where source.id = p_village_profile_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'village profile source not found';
  end if;

  select translation.id, translation.status
  into translation_id, translation_status
  from public.village_profile_translations as translation
  where translation.village_profile_id = p_village_profile_id
    and translation.locale = 'en'
  for update;

  if found and translation_status <> 'draft'::public.publication_status then
    raise exception using errcode = '55000', message = 'translation must be draft before editing';
  end if;

  if translation_id is null then
    insert into public.village_profile_translations (
      village_profile_id,
      locale,
      name,
      summary,
      description,
      history,
      vision,
      mission,
      address,
      created_by,
      updated_by
    )
    values (
      p_village_profile_id,
      'en',
      nullif(btrim(p_name), ''),
      nullif(btrim(p_summary), ''),
      nullif(btrim(p_description), ''),
      nullif(btrim(p_history), ''),
      nullif(btrim(p_vision), ''),
      nullif(btrim(p_mission), ''),
      nullif(btrim(p_address), ''),
      actor_id,
      actor_id
    )
    returning village_profile_translations.id into translation_id;
  else
    update public.village_profile_translations as translation
    set name = nullif(btrim(p_name), ''),
        summary = nullif(btrim(p_summary), ''),
        description = nullif(btrim(p_description), ''),
        history = nullif(btrim(p_history), ''),
        vision = nullif(btrim(p_vision), ''),
        mission = nullif(btrim(p_mission), ''),
        address = nullif(btrim(p_address), ''),
        updated_by = actor_id
    where translation.id = translation_id;
  end if;

  return query
  select translation.id,
         translation.status,
         translation.source_updated_at_at_publish,
         translation.published_at
  from public.village_profile_translations as translation
  where translation.id = translation_id;
end;
$$;

create function public.village_profile_translation_publish(p_translation_id uuid)
returns table (
  id uuid,
  status public.publication_status,
  source_updated_at_at_publish timestamptz,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  source_id uuid;
begin
  if actor_id is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'administrator authorization required';
  end if;

  select translation.village_profile_id
  into source_id
  from public.village_profile_translations as translation
  where translation.id = p_translation_id
    and translation.status = 'draft'::public.publication_status;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'draft translation not found';
  end if;

  perform 1
  from public.village_profiles as source
  where source.id = source_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'village profile source not found';
  end if;

  return query
  update public.village_profile_translations as translation
  set status = 'published'::public.publication_status,
      updated_by = actor_id
  where translation.id = p_translation_id
    and translation.status = 'draft'::public.publication_status
  returning translation.id,
            translation.status,
            translation.source_updated_at_at_publish,
            translation.published_at;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'draft translation not found';
  end if;
end;
$$;

create function public.village_profile_translation_archive(p_translation_id uuid)
returns table (
  id uuid,
  status public.publication_status,
  source_updated_at_at_publish timestamptz,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;

  return query
  update public.village_profile_translations as translation
  set status = 'archived'::public.publication_status,
      updated_by = actor_id
  where translation.id = p_translation_id
    and translation.status in ('draft'::public.publication_status, 'published'::public.publication_status)
  returning translation.id,
            translation.status,
            translation.source_updated_at_at_publish,
            translation.published_at;

  if not found then
    raise exception using errcode = '55000', message = 'active translation not found';
  end if;
end;
$$;

create function public.village_profile_translation_restore(p_translation_id uuid)
returns table (
  id uuid,
  status public.publication_status,
  source_updated_at_at_publish timestamptz,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;

  return query
  update public.village_profile_translations as translation
  set status = 'draft'::public.publication_status,
      updated_by = actor_id
  where translation.id = p_translation_id
    and translation.status = 'archived'::public.publication_status
  returning translation.id,
            translation.status,
            translation.source_updated_at_at_publish,
            translation.published_at;

  if not found then
    raise exception using errcode = '55000', message = 'archived translation not found';
  end if;
end;
$$;

alter function public.village_profile_translation_save_draft(uuid, text, text, text, text, text, text, text) owner to postgres;
alter function public.village_profile_translation_publish(uuid) owner to postgres;
alter function public.village_profile_translation_archive(uuid) owner to postgres;
alter function public.village_profile_translation_restore(uuid) owner to postgres;

revoke all on function public.village_profile_translation_save_draft(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.village_profile_translation_publish(uuid) from public, anon, authenticated;
revoke all on function public.village_profile_translation_archive(uuid) from public, anon, authenticated;
revoke all on function public.village_profile_translation_restore(uuid) from public, anon, authenticated;

grant execute on function public.village_profile_translation_save_draft(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.village_profile_translation_publish(uuid) to authenticated;
grant execute on function public.village_profile_translation_archive(uuid) to authenticated;
grant execute on function public.village_profile_translation_restore(uuid) to authenticated;

create view public.published_english_village_profiles
with (security_barrier = true, security_invoker = false)
as
select
  source.id,
  translation.name,
  translation.summary,
  translation.description,
  translation.history,
  translation.vision,
  translation.mission,
  translation.address,
  source.latitude,
  source.longitude,
  source.google_maps_url,
  translation.published_at
from public.village_profiles as source
join public.village_profile_translations as translation
  on translation.village_profile_id = source.id
where source.status = 'published'::public.publication_status
  and translation.locale = 'en'
  and translation.status = 'published'::public.publication_status
  and translation.source_updated_at_at_publish = source.updated_at;

alter view public.published_english_village_profiles owner to postgres;
revoke all on table public.published_english_village_profiles from public, anon, authenticated;
grant select on table public.published_english_village_profiles to anon, authenticated;

comment on table public.village_profile_translations is
  'Administrator-managed approved English translation for the singleton village profile.';
comment on column public.village_profile_translations.source_updated_at_at_publish is
  'Server-captured source updated_at value used to suppress stale English publication.';
comment on view public.published_english_village_profiles is
  'Public-safe English projection visible only while both records are published and the source snapshot is current.';
