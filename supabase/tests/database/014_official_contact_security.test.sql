begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

insert into auth.users (id)
values
  ('a0000000-0000-4000-8000-000000000031'),
  ('a0000000-0000-4000-8000-000000000032');

update private.app_config
set administrator_user_id = 'a0000000-0000-4000-8000-000000000031';

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000031', true);
set local role authenticated;

select lives_ok(
  $$insert into public.contacts (id, label, contact_type, value, url, description, display_order, created_by, updated_by) values ('c0000000-0000-4000-8000-000000000031', 'Kontak test', 'phone', '0370123456', 'tel:0370123456', 'Data khusus pengujian', 0, 'a0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000031')$$,
  'administrator can create a draft official contact'
);

select is(
  (select status::text from public.contacts where id = 'c0000000-0000-4000-8000-000000000031'),
  'draft',
  'new official contacts default to draft'
);

select lives_ok(
  $$update public.contacts set status = 'published', updated_by = 'a0000000-0000-4000-8000-000000000031' where id = 'c0000000-0000-4000-8000-000000000031'$$,
  'administrator can publish an official contact'
);

select lives_ok(
  $$insert into public.site_settings (key, value, value_type, label, description, is_public, is_editable, created_by, updated_by) values ('primary_whatsapp_number', '6281234567890', 'text', 'Nomor WhatsApp utama', 'Data khusus pengujian', true, true, 'a0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000031')$$,
  'administrator can create the approved public WhatsApp setting'
);

select throws_ok(
  $$delete from public.contacts where id = 'c0000000-0000-4000-8000-000000000031'$$,
  '42501'::char(5),
  null,
  'administrator has no permanent-delete privilege for official contacts'
);

reset role;

select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select results_eq(
  $$select id from public.published_contacts$$,
  $$values ('c0000000-0000-4000-8000-000000000031'::uuid)$$,
  'anonymous users can read the published official contact projection'
);

select results_eq(
  $$select key, value from public.public_site_settings where key = 'primary_whatsapp_number'$$,
  $$values ('primary_whatsapp_number'::text, '6281234567890'::text)$$,
  'anonymous users can read the explicitly public WhatsApp setting projection'
);

select throws_ok(
  $$select * from public.contacts$$,
  '42501'::char(5),
  null,
  'anonymous users cannot read the official contacts base table'
);

select throws_ok(
  $$select * from public.site_settings$$,
  '42501'::char(5),
  null,
  'anonymous users cannot read the site settings base table'
);

select throws_ok(
  $$update public.contacts set label = 'Denied' where id = 'c0000000-0000-4000-8000-000000000031'$$,
  '42501'::char(5),
  null,
  'anonymous users cannot update official contacts'
);

select throws_ok(
  $$insert into public.contacts (label, contact_type, value, created_by, updated_by) values ('Denied', 'phone', '00000', 'a0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000031')$$,
  '42501'::char(5),
  null,
  'anonymous users cannot insert official contacts'
);

select throws_ok(
  $$update public.site_settings set value = '6280000000000' where key = 'primary_whatsapp_number'$$,
  '42501'::char(5),
  null,
  'anonymous users cannot update public settings'
);

reset role;

select hasnt_column(
  'public',
  'published_contacts',
  'created_by',
  'published contacts omit creator audit UUIDs'
);
select hasnt_column(
  'public',
  'published_contacts',
  'updated_by',
  'published contacts omit updater audit UUIDs'
);
select hasnt_column(
  'public',
  'public_site_settings',
  'is_editable',
  'public settings omit administrator lifecycle controls'
);
select hasnt_column(
  'public',
  'public_site_settings',
  'updated_by',
  'public settings omit updater audit UUIDs'
);

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000032', true);
set local role authenticated;

select is(
  (select count(*) from public.contacts),
  0::bigint,
  'a non-administrator cannot read official-contact base rows'
);
select is(
  (select count(*) from public.site_settings),
  0::bigint,
  'a non-administrator cannot read site-setting base rows'
);
select results_eq(
  $$update public.contacts set label = 'Denied' where id = 'c0000000-0000-4000-8000-000000000031' returning 1$$,
  $$select 1 where false$$,
  'a non-administrator cannot update official contacts'
);
select results_eq(
  $$update public.site_settings set value = '6280000000000' where key = 'primary_whatsapp_number' returning 1$$,
  $$select 1 where false$$,
  'a non-administrator cannot update site settings'
);
select throws_ok(
  $$insert into public.contacts (label, contact_type, value, created_by, updated_by) values ('Denied', 'phone', '00000', 'a0000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000032')$$,
  '42501'::char(5),
  null,
  'a non-administrator cannot insert official contacts'
);
select throws_ok(
  $$delete from public.contacts where id = 'c0000000-0000-4000-8000-000000000031'$$,
  '42501'::char(5),
  null,
  'a non-administrator cannot delete official contacts'
);
select results_eq(
  $$select id from public.published_contacts$$,
  $$values ('c0000000-0000-4000-8000-000000000031'::uuid)$$,
  'a non-administrator has visitor-equivalent access to published contacts'
);

reset role;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000031', true);
set local role authenticated;

select lives_ok(
  $$update public.contacts set status = 'archived', updated_by = 'a0000000-0000-4000-8000-000000000031' where id = 'c0000000-0000-4000-8000-000000000031'$$,
  'administrator can archive a published official contact'
);

reset role;
set local role anon;

select is(
  (select count(*) from public.published_contacts),
  0::bigint,
  'archived official contacts disappear from the public projection'
);

reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000031', true);
set local role authenticated;

select lives_ok(
  $$update public.contacts set status = 'draft', updated_by = 'a0000000-0000-4000-8000-000000000031' where id = 'c0000000-0000-4000-8000-000000000031'$$,
  'administrator can restore an archived official contact to draft'
);
select throws_ok(
  $$update public.contacts set status = 'published', updated_by = 'a0000000-0000-4000-8000-000000000031' where id = 'c0000000-0000-4000-8000-000000000031'; update public.contacts set status = 'draft', updated_by = 'a0000000-0000-4000-8000-000000000031' where id = 'c0000000-0000-4000-8000-000000000031'$$,
  'P0001',
  'published content may only remain published or be archived',
  'published official contacts cannot transition directly back to draft'
);

reset role;

select * from finish();
rollback;
