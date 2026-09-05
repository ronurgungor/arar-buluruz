begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(25);

select has_function(
  'public',
  'is_deliverable_listing_photo_path',
  array['text'],
  'historical Storage lifecycle helper exists'
);
select has_function(
  'public',
  'get_public_listing_photos',
  array['uuid'],
  'public listing photo manifest exists'
);

select ok(
  (
    select p.prosecdef
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_deliverable_listing_photo_path'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_object_path text'
  ),
  'historical lifecycle helper keeps its SECURITY DEFINER boundary'
);
select ok(
  (
    select position('search_path=""' in coalesce(array_to_string(p.proconfig, ','), '')) > 0
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_deliverable_listing_photo_path'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_object_path text'
  ),
  'historical lifecycle helper pins empty search_path'
);
select ok(
  (
    select p.prosecdef
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_public_listing_photos'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_listing_id uuid'
  ),
  'public photo manifest is SECURITY DEFINER with a narrow return contract'
);
select ok(
  (
    select position('search_path=""' in coalesce(array_to_string(p.proconfig, ','), '')) > 0
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_public_listing_photos'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_listing_id uuid'
  ),
  'public photo manifest pins empty search_path'
);

select function_privs_are(
  'public',
  'get_public_listing_photos',
  array['uuid'],
  'anon',
  array['EXECUTE'],
  'anon may execute only the lifecycle-gated public photo manifest'
);
select function_privs_are(
  'public',
  'is_deliverable_listing_photo_path',
  array['text'],
  'anon',
  array[]::text[],
  'anon cannot call the retired Storage-signing lifecycle helper'
);
select table_privs_are(
  'private',
  'listing_photos',
  'anon',
  array[]::text[],
  'anon still has no direct private listing_photos privileges'
);
select schema_privs_are(
  'private',
  'anon',
  array[]::text[],
  'anon still has no private schema privileges'
);

select is(
  (
    select count(*)::bigint
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can sign active listing photo objects'
  ),
  0::bigint,
  'anonymous direct Storage signing policy is absent'
);
select ok(
  exists (
    select 1
    from storage.buckets
    where id = 'listing_photos'
      and name = 'listing_photos'
      and public = false
  ),
  'listing photo bucket remains private'
);

insert into public.listings (
  id, title, description, price_amount, province, district, seller_display_name,
  contact_channel, contact_e164, contact_verified_at, contact_verification_method,
  publication_instruction_at, private_seller_declaration_at,
  content_rights_declaration_at, status, published_at, expires_at, unpublished_at, sold_at
) values
  (
    '81000000-0000-4000-8000-000000000001', 'Active public photo fixture',
    'Synthetic active listing for public photo delivery testing.', 1,
    'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'whatsapp', '+12025550131',
    now() - interval '3 hours', 'whatsapp_same_number', now() - interval '2 hours',
    now() - interval '90 minutes', now() - interval '90 minutes',
    'published', now() - interval '1 hour', now() + interval '1 day', null, null
  ),
  (
    '81000000-0000-4000-8000-000000000002', 'Pending public photo fixture',
    'Synthetic pending listing that must not expose photo delivery.', 2,
    'Tekirdağ', 'Çorlu', 'Synthetic Seller', null, null, null, null, null,
    null, null,
    'pending', null, null, null, null
  ),
  (
    '81000000-0000-4000-8000-000000000003', 'Expired public photo fixture',
    'Synthetic expired listing that must not expose photo delivery.', 3,
    'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'phone', '+12025550132',
    now() - interval '3 days', 'manual_callback', now() - interval '2 days',
    now() - interval '2 days 23 hours', now() - interval '2 days 23 hours',
    'published', now() - interval '2 days', now() - interval '1 minute', null, null
  ),
  (
    '81000000-0000-4000-8000-000000000004', 'Taken down public photo fixture',
    'Synthetic unpublished listing that must stop future photo issuance.', 4,
    'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'phone', '+12025550133',
    now() - interval '4 hours', 'manual_callback', now() - interval '3 hours',
    now() - interval '150 minutes', now() - interval '150 minutes',
    'unpublished', now() - interval '2 hours', now() + interval '1 day',
    now() - interval '1 hour', null
  ),
  (
    '81000000-0000-4000-8000-000000000005', 'Sold public photo fixture',
    'Synthetic sold listing that must stop future photo issuance.', 5,
    'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'phone', '+12025550134',
    now() - interval '5 hours', 'manual_callback', now() - interval '4 hours',
    now() - interval '210 minutes', now() - interval '210 minutes',
    'sold', now() - interval '3 hours', now() + interval '1 day',
    now() - interval '2 hours', now() - interval '1 hour'
  );

insert into private.listing_photos (id, listing_id, object_path, mime_type, byte_size, sort_order)
values
  (
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001',
    'listings/81000000-0000-4000-8000-000000000001/82000000-0000-4000-8000-000000000001.webp',
    'image/webp', 1234, 0
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    '81000000-0000-4000-8000-000000000002',
    'listings/81000000-0000-4000-8000-000000000002/82000000-0000-4000-8000-000000000002.webp',
    'image/webp', 1234, 0
  ),
  (
    '82000000-0000-4000-8000-000000000003',
    '81000000-0000-4000-8000-000000000003',
    'listings/81000000-0000-4000-8000-000000000003/82000000-0000-4000-8000-000000000003.webp',
    'image/webp', 1234, 0
  ),
  (
    '82000000-0000-4000-8000-000000000004',
    '81000000-0000-4000-8000-000000000004',
    'listings/81000000-0000-4000-8000-000000000004/82000000-0000-4000-8000-000000000004.webp',
    'image/webp', 1234, 0
  ),
  (
    '82000000-0000-4000-8000-000000000005',
    '81000000-0000-4000-8000-000000000005',
    'listings/81000000-0000-4000-8000-000000000005/82000000-0000-4000-8000-000000000005.webp',
    'image/webp', 1234, 0
  );

select is(
  (select count(*)::bigint from public.get_public_listing_photos('81000000-0000-4000-8000-000000000001')),
  1::bigint,
  'active published listing exposes exactly one photo manifest row'
);
select is(
  (select object_path from public.get_public_listing_photos('81000000-0000-4000-8000-000000000001') limit 1),
  'listings/81000000-0000-4000-8000-000000000001/82000000-0000-4000-8000-000000000001.webp',
  'public photo manifest returns only the canonical controlled object path'
);
select is(
  (select count(*)::bigint from public.get_public_listing_photos('81000000-0000-4000-8000-000000000002')),
  0::bigint,
  'pending listing exposes no public photo manifest'
);
select is(
  (select count(*)::bigint from public.get_public_listing_photos('81000000-0000-4000-8000-000000000003')),
  0::bigint,
  'expired listing exposes no public photo manifest'
);
select is(
  (select count(*)::bigint from public.get_public_listing_photos('81000000-0000-4000-8000-000000000004')),
  0::bigint,
  'taken-down listing exposes no public photo manifest'
);
select is(
  (select count(*)::bigint from public.get_public_listing_photos('81000000-0000-4000-8000-000000000005')),
  0::bigint,
  'sold listing exposes no public photo manifest'
);

select ok(
  public.is_deliverable_listing_photo_path(
    'listings/81000000-0000-4000-8000-000000000001/82000000-0000-4000-8000-000000000001.webp'
  ),
  'lifecycle helper accepts active canonical object for trusted server checks'
);
select ok(
  not public.is_deliverable_listing_photo_path(
    'listings/81000000-0000-4000-8000-000000000002/82000000-0000-4000-8000-000000000002.webp'
  ),
  'lifecycle helper rejects pending-listing object'
);
select ok(
  not public.is_deliverable_listing_photo_path(
    'listings/81000000-0000-4000-8000-000000000003/82000000-0000-4000-8000-000000000003.webp'
  ),
  'lifecycle helper rejects expired-listing object'
);
select ok(
  not public.is_deliverable_listing_photo_path(
    'listings/81000000-0000-4000-8000-000000000004/82000000-0000-4000-8000-000000000004.webp'
  ),
  'lifecycle helper rejects taken-down listing object'
);
select ok(
  not public.is_deliverable_listing_photo_path(
    'listings/81000000-0000-4000-8000-000000000005/82000000-0000-4000-8000-000000000005.webp'
  ),
  'lifecycle helper rejects sold listing object'
);
select ok(
  not public.is_deliverable_listing_photo_path('listings/not-a-controlled-object.webp'),
  'lifecycle helper rejects unregistered or malformed object path'
);

set local role anon;
select is(
  (select count(*)::bigint from public.get_public_listing_photos('81000000-0000-4000-8000-000000000001')),
  1::bigint,
  'anon can obtain active public photo manifest without direct private-table access'
);
reset role;

select * from finish();
rollback;
