-- Karang Bajo Explore — initial Version 1 application schema draft.
-- This migration is intended for local review and has not been pushed remotely.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.package_type as enum ('budget', 'standard', 'premium');
create type public.site_setting_value_type as enum ('text', 'number', 'boolean', 'url', 'json');

create table private.app_config (
  singleton boolean primary key default true check (singleton),
  administrator_user_id uuid unique references auth.users (id) on delete restrict,
  updated_at timestamptz not null default statement_timestamp()
);

insert into private.app_config (singleton, administrator_user_id)
values (true, null)
on conflict (singleton) do nothing;

revoke all on table private.app_config from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    auth.uid() is not null
    and auth.uid() = (
      select app_config.administrator_user_id
      from private.app_config as app_config
      where app_config.singleton
    ),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function private.protect_created_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by then
    raise exception 'created_at and created_by are immutable';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_content_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft'::public.publication_status then
      raise exception 'new managed content must start as draft';
    end if;
    return new;
  end if;

  if old.status = 'draft'::public.publication_status
    and new.status not in ('draft'::public.publication_status, 'published'::public.publication_status, 'archived'::public.publication_status) then
    raise exception 'invalid publication status transition';
  elsif old.status = 'published'::public.publication_status
    and new.status not in ('published'::public.publication_status, 'archived'::public.publication_status) then
    raise exception 'published content may only remain published or be archived';
  elsif old.status = 'archived'::public.publication_status
    and new.status not in ('archived'::public.publication_status, 'draft'::public.publication_status) then
    raise exception 'archived content must restore to draft before publication';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_slug_publication_history()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    new.published_at := null;
    return new;
  end if;

  if old.published_at is not null then
    if new.slug is distinct from old.slug then
      raise exception 'slug is immutable after first publication';
    end if;
    new.published_at := old.published_at;
  elsif new.status = 'published'::public.publication_status then
    new.published_at := statement_timestamp();
  else
    new.published_at := null;
  end if;

  return new;
end;
$$;

create table public.village_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  summary text,
  description text,
  history text,
  vision text,
  mission text,
  address text,
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint village_profiles_coordinate_pair check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  ),
  constraint village_profiles_publication_fields check (
    status <> 'published' or description is not null and btrim(description) <> ''
  )
);

create unique index village_profiles_singleton_idx on public.village_profiles ((true));
create index village_profiles_status_idx on public.village_profiles (status);

create table public.destination_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  display_order integer not null check (display_order >= 0),
  constraint destination_categories_fixed_name check (name in ('Alam', 'Budaya', 'Religi')),
  constraint destination_categories_fixed_slug check (slug in ('alam', 'budaya', 'religi')),
  constraint destination_categories_name_slug_match check (
    (name = 'Alam' and slug = 'alam')
    or (name = 'Budaya' and slug = 'budaya')
    or (name = 'Religi' and slug = 'religi')
  )
);

create index destination_categories_display_order_idx on public.destination_categories (display_order);

insert into public.destination_categories (id, name, slug, display_order)
values
  ('10000000-0000-4000-8000-000000000001', 'Alam', 'alam', 1),
  ('10000000-0000-4000-8000-000000000002', 'Budaya', 'budaya', 2),
  ('10000000-0000-4000-8000-000000000003', 'Religi', 'religi', 3)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    display_order = excluded.display_order;

create table public.destinations (
  id uuid primary key default extensions.gen_random_uuid(),
  category_id uuid not null references public.destination_categories (id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  summary text not null check (btrim(summary) <> ''),
  description text not null check (btrim(description) <> ''),
  history text,
  latitude numeric not null check (latitude between -90 and 90),
  longitude numeric not null check (longitude between -180 and 180),
  google_maps_url text,
  opening_hours text,
  entrance_fee numeric check (entrance_fee >= 0),
  price_note text,
  facilities text[] not null default '{}'::text[],
  contact_name text,
  contact_phone text,
  contact_consent_confirmed boolean not null default false,
  thumbnail_path text,
  thumbnail_bucket text,
  is_featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint destinations_thumbnail_pair check (
    (thumbnail_bucket is null and thumbnail_path is null)
    or (thumbnail_bucket is not null and thumbnail_path is not null)
  ),
  constraint destinations_contact_consent check (
    status <> 'published'
    or (contact_name is null and contact_phone is null)
    or contact_consent_confirmed
  ),
  constraint destinations_publication_thumbnail check (
    status <> 'published' or thumbnail_bucket is not null and thumbnail_path is not null
  )
);

create unique index destinations_active_name_idx on public.destinations (lower(name)) where status <> 'archived';
create index destinations_category_idx on public.destinations (category_id);
create index destinations_status_idx on public.destinations (status);
create index destinations_featured_idx on public.destinations (is_featured);
create index destinations_display_order_idx on public.destinations (display_order);
create index destinations_status_category_idx on public.destinations (status, category_id);
create index destinations_status_display_order_idx on public.destinations (status, display_order);

create table public.destination_images (
  id uuid primary key default extensions.gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete restrict,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path)
);

create unique index destination_images_primary_idx on public.destination_images (destination_id) where is_primary;
create index destination_images_parent_idx on public.destination_images (destination_id);
create index destination_images_order_idx on public.destination_images (destination_id, display_order);

create table public.tourism_packages (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  package_type public.package_type not null,
  duration_value integer not null check (duration_value > 0),
  duration_unit text not null check (btrim(duration_unit) <> ''),
  price numeric check (price >= 0),
  price_note text,
  included_facilities text[] not null default '{}'::text[],
  souvenir text,
  summary text,
  description text not null check (btrim(description) <> ''),
  thumbnail_path text,
  thumbnail_bucket text,
  is_featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint tourism_packages_thumbnail_pair check (
    (thumbnail_bucket is null and thumbnail_path is null)
    or (thumbnail_bucket is not null and thumbnail_path is not null)
  ),
  constraint tourism_packages_publication_thumbnail check (
    status <> 'published' or thumbnail_bucket is not null and thumbnail_path is not null
  )
);

create unique index tourism_packages_active_name_idx on public.tourism_packages (lower(name)) where status <> 'archived';
create index tourism_packages_type_idx on public.tourism_packages (package_type);
create index tourism_packages_status_idx on public.tourism_packages (status);
create index tourism_packages_featured_idx on public.tourism_packages (is_featured);
create index tourism_packages_display_order_idx on public.tourism_packages (display_order);

create table public.package_destinations (
  id uuid primary key default extensions.gen_random_uuid(),
  package_id uuid not null references public.tourism_packages (id) on delete restrict,
  destination_id uuid not null references public.destinations (id) on delete restrict,
  display_order integer not null default 0 check (display_order >= 0),
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (package_id, destination_id)
);

create index package_destinations_package_idx on public.package_destinations (package_id);
create index package_destinations_destination_idx on public.package_destinations (destination_id);
create index package_destinations_order_idx on public.package_destinations (package_id, display_order);

create table public.package_images (
  id uuid primary key default extensions.gen_random_uuid(),
  package_id uuid not null references public.tourism_packages (id) on delete restrict,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path)
);

create unique index package_images_primary_idx on public.package_images (package_id) where is_primary;
create index package_images_parent_idx on public.package_images (package_id);
create index package_images_order_idx on public.package_images (package_id, display_order);

create table public.homestays (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  owner_name text,
  phone text,
  contact_consent_confirmed boolean not null default false,
  description text not null check (btrim(description) <> ''),
  address text,
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  price_per_night numeric check (price_per_night >= 0),
  price_note text,
  facilities text[] not null default '{}'::text[],
  thumbnail_path text,
  thumbnail_bucket text,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  is_featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint homestays_coordinate_pair check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  ),
  constraint homestays_thumbnail_pair check (
    (thumbnail_bucket is null and thumbnail_path is null)
    or (thumbnail_bucket is not null and thumbnail_path is not null)
  ),
  constraint homestays_contact_consent check (
    status <> 'published' or (owner_name is null and phone is null) or contact_consent_confirmed
  ),
  constraint homestays_publication_thumbnail check (
    status <> 'published' or thumbnail_bucket is not null and thumbnail_path is not null
  )
);

create unique index homestays_active_name_idx on public.homestays (lower(name)) where status <> 'archived';
create index homestays_status_idx on public.homestays (status);
create index homestays_featured_idx on public.homestays (is_featured);
create index homestays_display_order_idx on public.homestays (display_order);

create table public.homestay_images (
  id uuid primary key default extensions.gen_random_uuid(),
  homestay_id uuid not null references public.homestays (id) on delete restrict,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path)
);

create unique index homestay_images_primary_idx on public.homestay_images (homestay_id) where is_primary;
create index homestay_images_parent_idx on public.homestay_images (homestay_id);
create index homestay_images_order_idx on public.homestay_images (homestay_id, display_order);

create table public.umkms (
  id uuid primary key default extensions.gen_random_uuid(),
  business_name text not null check (btrim(business_name) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  owner_name text,
  category text not null check (btrim(category) <> ''),
  description text not null check (btrim(description) <> ''),
  address text,
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  contact_name text,
  contact_phone text,
  contact_whatsapp text,
  contact_consent_confirmed boolean not null default false,
  thumbnail_path text,
  thumbnail_bucket text,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  is_featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint umkms_coordinate_pair check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  ),
  constraint umkms_thumbnail_pair check (
    (thumbnail_bucket is null and thumbnail_path is null)
    or (thumbnail_bucket is not null and thumbnail_path is not null)
  ),
  constraint umkms_contact_consent check (
    status <> 'published'
    or (owner_name is null and contact_name is null and contact_phone is null and contact_whatsapp is null)
    or contact_consent_confirmed
  ),
  constraint umkms_publication_reachability check (
    status <> 'published'
    or latitude is not null
    or contact_phone is not null
    or contact_whatsapp is not null
  ),
  constraint umkms_publication_thumbnail check (
    status <> 'published' or thumbnail_bucket is not null and thumbnail_path is not null
  )
);

create unique index umkms_active_name_idx on public.umkms (lower(business_name)) where status <> 'archived';
create index umkms_category_idx on public.umkms (category);
create index umkms_status_idx on public.umkms (status);
create index umkms_featured_idx on public.umkms (is_featured);
create index umkms_display_order_idx on public.umkms (display_order);

create table public.umkm_images (
  id uuid primary key default extensions.gen_random_uuid(),
  umkm_id uuid not null references public.umkms (id) on delete restrict,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path)
);

create unique index umkm_images_primary_idx on public.umkm_images (umkm_id) where is_primary;
create index umkm_images_parent_idx on public.umkm_images (umkm_id);
create index umkm_images_order_idx on public.umkm_images (umkm_id, display_order);

create table public.traditional_houses (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  summary text,
  description text not null check (btrim(description) <> ''),
  history text,
  cultural_significance text,
  location_name text,
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  visitor_information text,
  thumbnail_path text,
  thumbnail_bucket text,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  is_featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint traditional_houses_coordinate_pair check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  ),
  constraint traditional_houses_thumbnail_pair check (
    (thumbnail_bucket is null and thumbnail_path is null)
    or (thumbnail_bucket is not null and thumbnail_path is not null)
  ),
  constraint traditional_houses_publication_thumbnail check (
    status <> 'published' or thumbnail_bucket is not null and thumbnail_path is not null
  )
);

create unique index traditional_houses_active_name_idx on public.traditional_houses (lower(name)) where status <> 'archived';
create index traditional_houses_status_idx on public.traditional_houses (status);
create index traditional_houses_featured_idx on public.traditional_houses (is_featured);
create index traditional_houses_display_order_idx on public.traditional_houses (display_order);

create table public.traditional_house_images (
  id uuid primary key default extensions.gen_random_uuid(),
  traditional_house_id uuid not null references public.traditional_houses (id) on delete restrict,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path)
);

create unique index traditional_house_images_primary_idx on public.traditional_house_images (traditional_house_id) where is_primary;
create index traditional_house_images_parent_idx on public.traditional_house_images (traditional_house_id);
create index traditional_house_images_order_idx on public.traditional_house_images (traditional_house_id, display_order);

create table public.cultural_articles (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  summary text,
  content text not null check (btrim(content) <> ''),
  article_category text,
  source_note text,
  thumbnail_path text,
  thumbnail_bucket text,
  status public.publication_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint cultural_articles_thumbnail_pair check (
    (thumbnail_bucket is null and thumbnail_path is null)
    or (thumbnail_bucket is not null and thumbnail_path is not null)
  ),
  constraint cultural_articles_publication_thumbnail check (
    status <> 'published' or thumbnail_bucket is not null and thumbnail_path is not null
  )
);

create index cultural_articles_category_idx on public.cultural_articles (article_category);
create index cultural_articles_status_idx on public.cultural_articles (status);
create index cultural_articles_featured_idx on public.cultural_articles (is_featured);
create index cultural_articles_published_at_idx on public.cultural_articles (published_at);

create table public.cultural_article_images (
  id uuid primary key default extensions.gen_random_uuid(),
  cultural_article_id uuid not null references public.cultural_articles (id) on delete restrict,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path)
);

create unique index cultural_article_images_primary_idx on public.cultural_article_images (cultural_article_id) where is_primary;
create index cultural_article_images_parent_idx on public.cultural_article_images (cultural_article_id);
create index cultural_article_images_order_idx on public.cultural_article_images (cultural_article_id, display_order);

create table public.customary_institution_articles (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  summary text,
  content text not null check (btrim(content) <> ''),
  institution_name text,
  institution_role text,
  historical_context text,
  source_note text,
  thumbnail_path text,
  thumbnail_bucket text,
  status public.publication_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint customary_articles_thumbnail_pair check (
    (thumbnail_bucket is null and thumbnail_path is null)
    or (thumbnail_bucket is not null and thumbnail_path is not null)
  ),
  constraint customary_articles_publication_thumbnail check (
    status <> 'published' or thumbnail_bucket is not null and thumbnail_path is not null
  )
);

create index customary_articles_institution_idx on public.customary_institution_articles (institution_name);
create index customary_articles_status_idx on public.customary_institution_articles (status);
create index customary_articles_featured_idx on public.customary_institution_articles (is_featured);
create index customary_articles_published_at_idx on public.customary_institution_articles (published_at);

create table public.customary_institution_article_images (
  id uuid primary key default extensions.gen_random_uuid(),
  customary_institution_article_id uuid not null references public.customary_institution_articles (id) on delete restrict,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path)
);

create unique index customary_article_images_primary_idx on public.customary_institution_article_images (customary_institution_article_id) where is_primary;
create index customary_article_images_parent_idx on public.customary_institution_article_images (customary_institution_article_id);
create index customary_article_images_order_idx on public.customary_institution_article_images (customary_institution_article_id, display_order);

create table public.cultural_events (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  slug text not null unique check (btrim(slug) <> ''),
  summary text,
  description text not null check (btrim(description) <> ''),
  event_type text,
  start_at timestamptz,
  end_at timestamptz,
  all_day boolean not null default false,
  date_note text,
  location_name text,
  address text,
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  organizer text,
  contact_phone text,
  contact_consent_confirmed boolean not null default false,
  visitor_information text,
  thumbnail_path text,
  thumbnail_bucket text,
  status public.publication_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint cultural_events_time_range check (
    (end_at is null or start_at is not null) and (end_at is null or end_at >= start_at)
  ),
  constraint cultural_events_coordinate_pair check (
    (latitude is null and longitude is null)
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  ),
  constraint cultural_events_thumbnail_pair check (
    (thumbnail_bucket is null and thumbnail_path is null)
    or (thumbnail_bucket is not null and thumbnail_path is not null)
  ),
  constraint cultural_events_confirmed_date_for_publication check (
    status <> 'published' or start_at is not null
  ),
  constraint cultural_events_contact_consent check (
    status <> 'published' or contact_phone is null or contact_consent_confirmed
  ),
  constraint cultural_events_publication_thumbnail check (
    status <> 'published' or thumbnail_bucket is not null and thumbnail_path is not null
  )
);

comment on column public.cultural_events.start_at is
  'Confirmed event start instant. Application presentation uses Asia/Makassar.';
comment on column public.cultural_events.end_at is
  'Optional confirmed event end instant. Application presentation uses Asia/Makassar.';
comment on column public.cultural_events.date_note is
  'Unconfirmed scheduling context; date-note-only records remain draft and are never upcoming.';

create index cultural_events_status_idx on public.cultural_events (status);
create index cultural_events_start_idx on public.cultural_events (start_at);
create index cultural_events_end_idx on public.cultural_events (end_at);
create index cultural_events_type_idx on public.cultural_events (event_type);
create index cultural_events_featured_idx on public.cultural_events (is_featured);
create index cultural_events_status_start_idx on public.cultural_events (status, start_at);

create table public.cultural_event_images (
  id uuid primary key default extensions.gen_random_uuid(),
  cultural_event_id uuid not null references public.cultural_events (id) on delete restrict,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  display_order integer not null default 0 check (display_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path)
);

create unique index cultural_event_images_primary_idx on public.cultural_event_images (cultural_event_id) where is_primary;
create index cultural_event_images_parent_idx on public.cultural_event_images (cultural_event_id);
create index cultural_event_images_order_idx on public.cultural_event_images (cultural_event_id, display_order);

create table public.gallery_items (
  id uuid primary key default extensions.gen_random_uuid(),
  title text,
  storage_bucket text not null check (btrim(storage_bucket) <> ''),
  storage_path text not null check (btrim(storage_path) <> ''),
  thumbnail_path text,
  caption text,
  alt_text text not null check (btrim(alt_text) <> ''),
  category text,
  taken_at timestamptz,
  display_order integer not null default 0 check (display_order >= 0),
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  unique (storage_bucket, storage_path),
  constraint gallery_items_publication_thumbnail check (
    status <> 'published' or thumbnail_path is not null
  )
);

create index gallery_items_status_idx on public.gallery_items (status);
create index gallery_items_category_idx on public.gallery_items (category);
create index gallery_items_display_order_idx on public.gallery_items (display_order);
create index gallery_items_taken_at_idx on public.gallery_items (taken_at);

create table public.contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  label text not null check (btrim(label) <> ''),
  contact_type text not null check (btrim(contact_type) <> ''),
  value text not null check (btrim(value) <> ''),
  url text,
  description text,
  display_order integer not null default 0 check (display_order >= 0),
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict
);

create unique index contacts_active_value_idx on public.contacts (contact_type, value) where status <> 'archived';
create index contacts_type_idx on public.contacts (contact_type);
create index contacts_status_idx on public.contacts (status);
create index contacts_display_order_idx on public.contacts (display_order);

create table public.site_settings (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique check (btrim(key) <> ''),
  value text,
  value_type public.site_setting_value_type not null default 'text',
  label text not null check (btrim(label) <> ''),
  description text,
  is_public boolean not null default false,
  is_editable boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict
);

create index site_settings_public_idx on public.site_settings (is_public);
create index site_settings_editable_idx on public.site_settings (is_editable);

create or replace function private.validate_package_publication()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status = 'published'::public.publication_status
    and not exists (
      select 1
      from public.package_destinations as package_destination
      join public.destinations as destination
        on destination.id = package_destination.destination_id
      where package_destination.package_id = new.id
        and destination.status = 'published'::public.publication_status
    ) then
    raise exception 'a published package requires at least one published destination';
  end if;

  return new;
end;
$$;

create or replace function private.validate_package_destination_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  affected_package_id uuid;
  affected_destination_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_package_id := old.package_id;
    affected_destination_id := old.destination_id;
  else
    affected_package_id := new.package_id;
    affected_destination_id := new.destination_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE')
    and exists (
      select 1
      from public.tourism_packages as package
      where package.id = affected_package_id
        and package.status = 'published'::public.publication_status
    )
    and not exists (
      select 1
      from public.destinations as destination
      where destination.id = affected_destination_id
        and destination.status = 'published'::public.publication_status
    ) then
    raise exception 'published packages may reference only published destinations';
  end if;

  if (
    tg_op = 'DELETE'
    or (tg_op = 'UPDATE' and new.package_id is distinct from old.package_id)
  )
    and exists (
      select 1
      from public.tourism_packages as package
      where package.id = old.package_id
        and package.status = 'published'::public.publication_status
    )
    and not exists (
      select 1
      from public.package_destinations as remaining
      join public.destinations as destination
        on destination.id = remaining.destination_id
      where remaining.package_id = old.package_id
        and remaining.id <> old.id
        and destination.status = 'published'::public.publication_status
    ) then
    raise exception 'a published package must retain at least one published destination';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function private.protect_published_package_destinations()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.status = 'published'::public.publication_status
    and new.status <> 'published'::public.publication_status
    and exists (
      select 1
      from public.package_destinations as package_destination
      join public.tourism_packages as package
        on package.id = package_destination.package_id
      where package_destination.destination_id = old.id
        and package.status = 'published'::public.publication_status
    ) then
    raise exception 'archive related published packages before unpublishing this destination';
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'village_profiles',
    'destinations',
    'tourism_packages',
    'homestays',
    'umkms',
    'traditional_houses',
    'cultural_articles',
    'customary_institution_articles',
    'cultural_events',
    'gallery_items',
    'contacts'
  ] loop
    execute format(
      'create trigger %I before insert or update of status on public.%I for each row execute function private.enforce_content_lifecycle()',
      table_name || '_lifecycle_trigger',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'village_profiles',
    'destinations',
    'tourism_packages',
    'homestays',
    'umkms',
    'traditional_houses',
    'cultural_articles',
    'customary_institution_articles',
    'cultural_events'
  ] loop
    execute format(
      'create trigger %I before insert or update of slug, status, published_at on public.%I for each row execute function private.enforce_slug_publication_history()',
      table_name || '_slug_history_trigger',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'village_profiles',
    'destinations',
    'tourism_packages',
    'homestays',
    'umkms',
    'traditional_houses',
    'cultural_articles',
    'customary_institution_articles',
    'cultural_events',
    'gallery_items',
    'contacts',
    'site_settings'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.protect_created_audit_fields()',
      table_name || '_protect_created_trigger',
      table_name
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      table_name || '_updated_at_trigger',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'destination_images',
    'package_destinations',
    'package_images',
    'homestay_images',
    'umkm_images',
    'traditional_house_images',
    'cultural_article_images',
    'customary_institution_article_images',
    'cultural_event_images'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.protect_created_audit_fields()',
      table_name || '_protect_created_trigger',
      table_name
    );
  end loop;
end;
$$;

create trigger tourism_packages_publication_trigger
before insert or update of status on public.tourism_packages
for each row execute function private.validate_package_publication();

create trigger package_destinations_change_trigger
before insert or update or delete on public.package_destinations
for each row execute function private.validate_package_destination_change();

create trigger destinations_published_package_trigger
before update of status on public.destinations
for each row execute function private.protect_published_package_destinations();

revoke create on schema public from public;
grant usage on schema public to anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'village_profiles',
    'destination_categories',
    'destinations',
    'destination_images',
    'tourism_packages',
    'package_destinations',
    'package_images',
    'homestays',
    'homestay_images',
    'umkms',
    'umkm_images',
    'traditional_houses',
    'traditional_house_images',
    'cultural_articles',
    'cultural_article_images',
    'customary_institution_articles',
    'customary_institution_article_images',
    'cultural_events',
    'cultural_event_images',
    'gallery_items',
    'contacts',
    'site_settings'
  ] loop
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'village_profiles',
    'destinations',
    'tourism_packages',
    'homestays',
    'umkms',
    'traditional_houses',
    'cultural_articles',
    'customary_institution_articles',
    'cultural_events',
    'gallery_items',
    'contacts'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update on table public.%I to authenticated', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_admin()))',
      table_name || '_admin_select',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()) and status = ''draft''::public.publication_status and created_by = auth.uid() and updated_by = auth.uid())',
      table_name || '_admin_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()) and updated_by = auth.uid())',
      table_name || '_admin_update',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'destination_images',
    'package_destinations',
    'package_images',
    'homestay_images',
    'umkm_images',
    'traditional_house_images',
    'cultural_article_images',
    'customary_institution_article_images',
    'cultural_event_images'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_admin()))',
      table_name || '_admin_select',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()) and created_by = auth.uid())',
      table_name || '_admin_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      table_name || '_admin_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
      table_name || '_admin_delete',
      table_name
    );
  end loop;
end;
$$;

alter table public.destination_categories enable row level security;
grant select on table public.destination_categories to anon, authenticated;
create policy destination_categories_public_select
on public.destination_categories
for select to anon, authenticated
using (true);

alter table public.site_settings enable row level security;
grant select, insert, update on table public.site_settings to authenticated;
create policy site_settings_admin_select
on public.site_settings
for select to authenticated
using ((select public.is_admin()));
create policy site_settings_admin_insert
on public.site_settings
for insert to authenticated
with check ((select public.is_admin()) and created_by = auth.uid() and updated_by = auth.uid());
create policy site_settings_admin_update
on public.site_settings
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()) and updated_by = auth.uid());

-- Anonymous and non-administrator authenticated clients receive public data
-- exclusively through these security-definer, column-limited views. Base-table
-- grants remain revoked, so private notes, consent metadata, and audit fields
-- cannot be selected through the Data API.

create view public.published_village_profiles
with (security_barrier = true, security_invoker = false)
as
select
  id,
  name,
  slug,
  summary,
  description,
  history,
  vision,
  mission,
  address,
  latitude,
  longitude,
  google_maps_url,
  published_at
from public.village_profiles
where status = 'published';

create view public.published_destinations
with (security_barrier = true, security_invoker = false)
as
select
  id,
  category_id,
  name,
  slug,
  summary,
  description,
  history,
  latitude,
  longitude,
  google_maps_url,
  opening_hours,
  entrance_fee,
  price_note,
  facilities,
  case when contact_consent_confirmed then contact_name end as contact_name,
  case when contact_consent_confirmed then contact_phone end as contact_phone,
  thumbnail_path,
  thumbnail_bucket,
  is_featured,
  display_order,
  published_at
from public.destinations
where status = 'published';

create view public.published_destination_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.destination_id,
  image.storage_bucket,
  image.storage_path,
  image.caption,
  image.alt_text,
  image.display_order,
  image.is_primary
from public.destination_images as image
join public.destinations as destination on destination.id = image.destination_id
where destination.status = 'published';

create view public.published_tourism_packages
with (security_barrier = true, security_invoker = false)
as
select
  id,
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
  thumbnail_path,
  thumbnail_bucket,
  is_featured,
  display_order,
  published_at
from public.tourism_packages
where status = 'published';

create view public.published_package_destinations
with (security_barrier = true, security_invoker = false)
as
select
  package_destination.id,
  package_destination.package_id,
  package_destination.destination_id,
  package_destination.display_order,
  package_destination.notes
from public.package_destinations as package_destination
join public.tourism_packages as package on package.id = package_destination.package_id
join public.destinations as destination on destination.id = package_destination.destination_id
where package.status = 'published'
  and destination.status = 'published';

create view public.published_package_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.package_id,
  image.storage_bucket,
  image.storage_path,
  image.caption,
  image.alt_text,
  image.display_order,
  image.is_primary
from public.package_images as image
join public.tourism_packages as package on package.id = image.package_id
where package.status = 'published';

create view public.published_homestays
with (security_barrier = true, security_invoker = false)
as
select
  id,
  name,
  slug,
  case when contact_consent_confirmed then owner_name end as owner_name,
  case when contact_consent_confirmed then phone end as phone,
  description,
  address,
  latitude,
  longitude,
  google_maps_url,
  price_per_night,
  price_note,
  facilities,
  thumbnail_path,
  thumbnail_bucket,
  is_featured,
  display_order,
  published_at
from public.homestays
where status = 'published';

create view public.published_homestay_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.homestay_id,
  image.storage_bucket,
  image.storage_path,
  image.caption,
  image.alt_text,
  image.display_order,
  image.is_primary
from public.homestay_images as image
join public.homestays as homestay on homestay.id = image.homestay_id
where homestay.status = 'published';

create view public.published_umkms
with (security_barrier = true, security_invoker = false)
as
select
  id,
  business_name,
  slug,
  case when contact_consent_confirmed then owner_name end as owner_name,
  category,
  description,
  address,
  latitude,
  longitude,
  google_maps_url,
  case when contact_consent_confirmed then contact_name end as contact_name,
  case when contact_consent_confirmed then contact_phone end as contact_phone,
  case when contact_consent_confirmed then contact_whatsapp end as contact_whatsapp,
  thumbnail_path,
  thumbnail_bucket,
  is_featured,
  display_order,
  published_at
from public.umkms
where status = 'published';

create view public.published_umkm_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.umkm_id,
  image.storage_bucket,
  image.storage_path,
  image.caption,
  image.alt_text,
  image.display_order,
  image.is_primary
from public.umkm_images as image
join public.umkms as umkm on umkm.id = image.umkm_id
where umkm.status = 'published';

create view public.published_traditional_houses
with (security_barrier = true, security_invoker = false)
as
select
  id,
  name,
  slug,
  summary,
  description,
  history,
  cultural_significance,
  location_name,
  latitude,
  longitude,
  google_maps_url,
  visitor_information,
  thumbnail_path,
  thumbnail_bucket,
  is_featured,
  display_order,
  published_at
from public.traditional_houses
where status = 'published';

create view public.published_traditional_house_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.traditional_house_id,
  image.storage_bucket,
  image.storage_path,
  image.caption,
  image.alt_text,
  image.display_order,
  image.is_primary
from public.traditional_house_images as image
join public.traditional_houses as house on house.id = image.traditional_house_id
where house.status = 'published';

create view public.published_cultural_articles
with (security_barrier = true, security_invoker = false)
as
select
  id,
  title,
  slug,
  summary,
  content,
  article_category,
  thumbnail_path,
  thumbnail_bucket,
  is_featured,
  published_at
from public.cultural_articles
where status = 'published';

create view public.published_cultural_article_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.cultural_article_id,
  image.storage_bucket,
  image.storage_path,
  image.caption,
  image.alt_text,
  image.display_order,
  image.is_primary
from public.cultural_article_images as image
join public.cultural_articles as article on article.id = image.cultural_article_id
where article.status = 'published';

create view public.published_customary_institution_articles
with (security_barrier = true, security_invoker = false)
as
select
  id,
  title,
  slug,
  summary,
  content,
  institution_name,
  institution_role,
  historical_context,
  thumbnail_path,
  thumbnail_bucket,
  is_featured,
  published_at
from public.customary_institution_articles
where status = 'published';

create view public.published_customary_institution_article_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.customary_institution_article_id,
  image.storage_bucket,
  image.storage_path,
  image.caption,
  image.alt_text,
  image.display_order,
  image.is_primary
from public.customary_institution_article_images as image
join public.customary_institution_articles as article
  on article.id = image.customary_institution_article_id
where article.status = 'published';

create view public.published_cultural_events
with (security_barrier = true, security_invoker = false)
as
select
  id,
  title,
  slug,
  summary,
  description,
  event_type,
  start_at,
  end_at,
  all_day,
  date_note,
  location_name,
  address,
  latitude,
  longitude,
  google_maps_url,
  organizer,
  case when contact_consent_confirmed then contact_phone end as contact_phone,
  visitor_information,
  thumbnail_path,
  thumbnail_bucket,
  is_featured,
  published_at
from public.cultural_events
where status = 'published'
  and start_at is not null;

create view public.published_cultural_event_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.cultural_event_id,
  image.storage_bucket,
  image.storage_path,
  image.caption,
  image.alt_text,
  image.display_order,
  image.is_primary
from public.cultural_event_images as image
join public.cultural_events as event on event.id = image.cultural_event_id
where event.status = 'published'
  and event.start_at is not null;

create view public.published_gallery_items
with (security_barrier = true, security_invoker = false)
as
select
  id,
  title,
  storage_bucket,
  storage_path,
  thumbnail_path,
  caption,
  alt_text,
  category,
  taken_at,
  display_order
from public.gallery_items
where status = 'published';

create view public.published_contacts
with (security_barrier = true, security_invoker = false)
as
select
  id,
  label,
  contact_type,
  value,
  url,
  description,
  display_order
from public.contacts
where status = 'published';

create view public.public_site_settings
with (security_barrier = true, security_invoker = false)
as
select
  key,
  value,
  value_type,
  label,
  description
from public.site_settings
where is_public;

do $$
declare
  view_name text;
begin
  foreach view_name in array array[
    'published_village_profiles',
    'published_destinations',
    'published_destination_images',
    'published_tourism_packages',
    'published_package_destinations',
    'published_package_images',
    'published_homestays',
    'published_homestay_images',
    'published_umkms',
    'published_umkm_images',
    'published_traditional_houses',
    'published_traditional_house_images',
    'published_cultural_articles',
    'published_cultural_article_images',
    'published_customary_institution_articles',
    'published_customary_institution_article_images',
    'published_cultural_events',
    'published_cultural_event_images',
    'published_gallery_items',
    'published_contacts',
    'public_site_settings'
  ] loop
    execute format('revoke all on table public.%I from public', view_name);
    execute format('grant select on table public.%I to anon, authenticated', view_name);
  end loop;
end;
$$;

comment on schema private is
  'Not exposed through the Data API. Contains operator-managed administrator configuration.';
comment on table private.app_config is
  'Singleton administrator UUID configuration. The UUID remains null until the Auth account exists.';
comment on function public.is_admin() is
  'Returns true only when auth.uid() matches the protected singleton administrator UUID.';
comment on view public.published_cultural_articles is
  'Public-safe article projection. Private source_note and audit columns are intentionally excluded.';
comment on view public.published_customary_institution_articles is
  'Public-safe customary article projection. Private source_note and audit columns are intentionally excluded.';
