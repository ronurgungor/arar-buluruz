begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(9);

select has_function(
  'public',
  'get_listing_photo_inventory',
  array['uuid'],
  'operator photo inventory function exists'
);

select function_privs_are(
  'public',
  'get_listing_photo_inventory',
  array['uuid'],
  'anon',
  array[]::text[],
  'anon cannot execute operator photo inventory'
);
select function_privs_are(
  'public',
  'get_listing_photo_inventory',
  array['uuid'],
  'authenticated',
  array[]::text[],
  'authenticated cannot execute operator photo inventory'
);
select function_privs_are(
  'public',
  'get_listing_photo_inventory',
  array['uuid'],
  'service_role',
  array['EXECUTE'],
  'service_role can execute operator photo inventory'
);

select ok(
  (
    select not p.prosecdef
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_listing_photo_inventory'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_listing_id uuid'
  ),
  'operator photo inventory is SECURITY INVOKER'
);
select ok(
  (
    select position('search_path=""' in coalesce(array_to_string(p.proconfig, ','), '')) > 0
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_listing_photo_inventory'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_listing_id uuid'
  ),
  'operator photo inventory pins an empty search_path'
);

insert into public.listings (
  id,
  title,
  description,
  price_amount,
  province,
  district,
  seller_display_name,
  status
)
values (
  '71000000-0000-4000-8000-000000000001',
  'Operator inventory fixture',
  'Synthetic listing used only to verify founder deletion inventory semantics.',
  10,
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  'pending'
);

set local role service_role;
select public.register_sanitized_listing_photo(
  '71000000-0000-4000-8000-000000000001'::uuid,
  '72000000-0000-4000-8000-000000000001'::uuid,
  'listings/71000000-0000-4000-8000-000000000001/72000000-0000-4000-8000-000000000001.webp',
  72,
  0
);
select public.register_sanitized_listing_photo(
  '71000000-0000-4000-8000-000000000001'::uuid,
  '72000000-0000-4000-8000-000000000002'::uuid,
  'listings/71000000-0000-4000-8000-000000000001/72000000-0000-4000-8000-000000000002.webp',
  73,
  1
);
reset role;

select results_eq(
  $$
    select object_path
    from public.get_listing_photo_inventory(
      '71000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  $$ values
    ('listings/71000000-0000-4000-8000-000000000001/72000000-0000-4000-8000-000000000001.webp'::text),
    ('listings/71000000-0000-4000-8000-000000000001/72000000-0000-4000-8000-000000000002.webp'::text)
  $$,
  'service context returns deterministic listing-owned photo paths in sort order'
);

set local role anon;
select throws_ok(
  $$ select * from public.get_listing_photo_inventory('71000000-0000-4000-8000-000000000001'::uuid) $$,
  '42501',
  null,
  'anon execution is rejected'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select * from public.get_listing_photo_inventory('71000000-0000-4000-8000-000000000001'::uuid) $$,
  '42501',
  null,
  'authenticated execution is rejected'
);
reset role;

select * from finish();
rollback;
