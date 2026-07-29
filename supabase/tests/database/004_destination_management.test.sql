begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

insert into auth.users (id)
values ('d1000000-0000-4000-8000-000000000001');

update private.app_config
set administrator_user_id = 'd1000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, display_order, created_by, updated_by) values ('d2000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Destination Active Name', 'destination-active-name', 'Destination management summary', 'Destination management description', -8.2, 116.4, 0, 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001')$$,
  'administrator can create a valid ordered destination draft'
);

select throws_ok(
  $$insert into public.destinations (category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by) values ('90000000-0000-4000-8000-000000000001', 'Invalid Category Destination', 'invalid-category-destination', 'Invalid category summary', 'Invalid category description', -8.2, 116.4, 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001')$$,
  '23503'::char(5),
  null,
  'destination rejects an unknown fixed-category foreign key'
);

select throws_ok(
  $$insert into public.destinations (category_id, name, slug, summary, description, latitude, longitude, display_order, created_by, updated_by) values ('10000000-0000-4000-8000-000000000001', 'Negative Order Destination', 'negative-order-destination', 'Negative order summary', 'Negative order description', -8.2, 116.4, -1, 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'destination rejects a negative display order'
);

select throws_ok(
  $$insert into public.destinations (category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by) values ('10000000-0000-4000-8000-000000000002', 'destination active name', 'duplicate-active-name', 'Duplicate active name summary', 'Duplicate active name description', -8.3, 116.5, 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'case-insensitive active destination names must be unique'
);

select lives_ok(
  $$update public.destinations set status = 'archived', updated_by = 'd1000000-0000-4000-8000-000000000001' where id = 'd2000000-0000-4000-8000-000000000001'; insert into public.destinations (category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by) values ('10000000-0000-4000-8000-000000000003', 'destination active name', 'replacement-active-name', 'Replacement active name summary', 'Replacement active name description', -8.3, 116.5, 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001')$$,
  'an archived destination releases its case-insensitive active name'
);

reset role;

select * from finish();
rollback;
