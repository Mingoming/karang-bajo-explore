insert into public.destination_categories (id, name, slug, display_order)
values
  ('10000000-0000-4000-8000-000000000001', 'Alam', 'alam', 1),
  ('10000000-0000-4000-8000-000000000002', 'Budaya', 'budaya', 2),
  ('10000000-0000-4000-8000-000000000003', 'Religi', 'religi', 3)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    display_order = excluded.display_order;
