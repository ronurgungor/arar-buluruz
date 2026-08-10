begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(27);

select has_function(
  'public',
  'register_sanitized_listing_photo',
  array['uuid', 'uuid', 'text', 'bigint', 'smallint'],
  'sanitized photo metadata bridge exists'
);
select has_function(
  'public',
  'get_deliverable_listing_photo',
  array['uuid', 'uuid'],
  'active-listing photo delivery gate exists'
);

select schema_privs_are(
  'private',
  'anon',
  array[]::text[],
  'anon has no USAGE or CREATE privilege on private schema'
);
select schema_privs_are(
  'private',
  'authenticated',
  array[]::text[],
  'authenticated has no USAGE or CREATE privilege on private schema'
);

select table_privs_are(
  'private',
  'listing_photos',
  'anon',
  array[]::text[],
  'anon has no table privileges on private listing_photos'
);
select table_privs_are(
  'private',
  'listing_photos',
  'authenticated',
  array[]::text[],
  'authenticated has no table privileges on private listing_photos'
);

select function_privs_are(
  'public',
  'register_sanitized_listing_photo',
  array['uuid', 'uuid', 'text', 'bigint', 'smallint'],
  'anon',
  array[]::text[],
  'anon cannot execute sanitized photo metadata registration'
);
select function_privs_are(
  'public',
  'register_sanitized_listing_photo',
  array['uuid', 'uuid', 'text', 'bigint', 'smallint'],
  'authenticated',
  array[]::text[],
  'authenticated cannot execute sanitized photo metadata registration'
);
select function_privs_are(
  'public',
  'register_sanitized_listing_photo',
  array['uuid', 'uuid', 'text', 'bigint', 'smallint'],
  'service_role',
  array['EXECUTE'],
  'service_role can execute sanitized photo metadata registration'
);
select function_privs_are(
  'public',
  'get_deliverable_listing_photo',
  array['uuid', 'uuid'],
  'anon',
  array[]::text[],
  'anon cannot execute private photo delivery metadata gate'
);
select function_privs_are(
  'public',
  'get_deliverable_listing_photo',
  array['uuid', 'uuid'],
  'authenticated',
  array[]::text[],
  'authenticated cannot execute private photo delivery metadata gate'
);
select function_privs_are(
  'public',
  'get_deliverable_listing_photo',
  array['uuid', 'uuid'],
  'service_role',
  array['EXECUTE'],
  'service_role can execute private photo delivery metadata gate'
);

select ok(
  (
    select not p.prosecdef
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'register_sanitized_listing_photo'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'p_listing_id uuid, p_photo_id uuid, p_object_path text, p_byte_size bigint, p_sort_order smallint'
  ),
  'sanitized photo metadata bridge is SECURITY INVOKER'
);
select ok(
  (
    select position('search_path=""' in coalesce(array_to_string(p.proconfig, ','), '')) > 0
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'register_sanitized_listing_photo'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'p_listing_id uuid, p_photo_id uuid, p_object_path text, p_byte_size bigint, p_sort_order smallint'
  ),
  'sanitized photo metadata bridge pins an empty search_path'
);
select ok(
  (
    select not p.prosecdef
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_deliverable_listing_photo'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'p_listing_id uuid, p_photo_id uuid'
  ),
  'photo delivery gate is SECURITY INVOKER'
);
select ok(
  (
    select position('search_path=""' in coalesce(array_to_string(p.proconfig, ','), '')) > 0
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_deliverable_listing_photo'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'p_listing_id uuid, p_photo_id uuid'
  ),
  'photo delivery gate pins an empty search_path'
);

insert into public.listings (
  id,
  title,
  description,
  price_amount,
  province,
  district,
  seller_display_name,
  contact_channel,
  contact_e164,
  contact_verified_at,
  contact_verification_method,
  publication_instruction_at,
  status,
  published_at,
  expires_at,
  unpublished_at
)
values
  (
    '61000000-0000-4000-8000-000000000001',
    'Pending photo gate fixture',
    'Synthetic pending listing for trusted photo delivery tests.',
    1,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    null,
    null,
    null,
    null,
    null,
    'pending',
    null,
    null,
    null
  ),
  (
    '61000000-0000-4000-8000-000000000002',
    'Rejected photo gate fixture',
    'Synthetic rejected listing for trusted photo delivery tests.',
    2,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    null,
    null,
    null,
    null,
    null,
    'rejected',
    null,
    null,
    null
  ),
  (
    '61000000-0000-4000-8000-000000000003',
    'Active photo gate fixture',
    'Synthetic active listing for trusted photo delivery tests.',
    3,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    'whatsapp',
    '+12025550123',
    now() - interval '3 hours',
    'whatsapp_same_number',
    now() - interval '2 hours',
    'published',
    now() - interval '1 minute',
    now() + interval '1 day',
    null
  ),
  (
    '61000000-0000-4000-8000-000000000004',
    'Unpublished photo gate fixture',
    'Synthetic unpublished listing for trusted photo delivery tests.',
    4,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    null,
    null,
    null,
    null,
    null,
    'unpublished',
    now() - interval '2 days',
    now() + interval '1 day',
    now() - interval '1 minute'
  ),
  (
    '61000000-0000-4000-8000-000000000005',
    'Expired photo gate fixture',
    'Synthetic expired listing for trusted photo delivery tests.',
    5,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    'phone',
    '+12025550124',
    now() - interval '3 days',
    'manual_callback',
    now() - interval '2 days 12 hours',
    'published',
    now() - interval '2 days',
    now() - interval '1 minute',
    null
  );

select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000001'::uuid,
    '62000000-0000-4000-8000-000000000001'::uuid,
    'listings/61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001.webp'::text,
    101::bigint,
    0::smallint
  ) $$,
  'pending listing accepts trusted sanitized metadata without making it deliverable'
);
select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000002'::uuid,
    '62000000-0000-4000-8000-000000000002'::uuid,
    'listings/61000000-0000-4000-8000-000000000002/62000000-0000-4000-8000-000000000002.webp'::text,
    102::bigint,
    0::smallint
  ) $$,
  'rejected listing accepts private metadata without making it deliverable'
);
select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000003'::uuid,
    '62000000-0000-4000-8000-000000000003'::uuid,
    'listings/61000000-0000-4000-8000-000000000003/62000000-0000-4000-8000-000000000003.webp'::text,
    103::bigint,
    0::smallint
  ) $$,
  'active listing accepts canonical sanitized metadata'
);
select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000004'::uuid,
    '62000000-0000-4000-8000-000000000004'::uuid,
    'listings/61000000-0000-4000-8000-000000000004/62000000-0000-4000-8000-000000000004.webp'::text,
    104::bigint,
    0::smallint
  ) $$,
  'unpublished listing keeps private photo metadata non-public'
);
select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000005'::uuid,
    '62000000-0000-4000-8000-000000000005'::uuid,
    'listings/61000000-0000-4000-8000-000000000005/62000000-0000-4000-8000-000000000005.webp'::text,
    105::bigint,
    0::smallint
  ) $$,
  'expired listing keeps private photo metadata non-public'
);

select throws_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000003'::uuid,
    '62000000-0000-4000-8000-000000000099'::uuid,
    'listings/61000000-0000-4000-8000-000000000003/62000000-0000-4000-8000-000000000099.jpg'::text,
    100::bigint,
    1::smallint
  ) $$,
  '22023',
  null,
  'trusted metadata bridge rejects a non-WebP controlled path'
);

select is(
  (
    select count(*)::integer
    from public.get_deliverable_listing_photo(
      '61000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001'
    )
  ),
  0,
  'pending listing has no deliverable photo metadata'
);
select is(
  (
    select count(*)::integer
    from public.get_deliverable_listing_photo(
      '61000000-0000-4000-8000-000000000002',
      '62000000-0000-4000-8000-000000000002'
    )
  ),
  0,
  'rejected listing has no deliverable photo metadata'
);
select is(
  (
    select count(*)::integer
    from public.get_deliverable_listing_photo(
      '61000000-0000-4000-8000-000000000003',
      '62000000-0000-4000-8000-000000000003'
    )
  ),
  1,
  'active published listing has one deliverable sanitized photo'
);
select is(
  (
    select count(*)::integer
    from public.get_deliverable_listing_photo(
      '61000000-0000-4000-8000-000000000004',
      '62000000-0000-4000-8000-000000000004'
    )
  ),
  0,
  'unpublished listing has no deliverable photo metadata'
);
select is(
  (
    select count(*)::integer
    from public.get_deliverable_listing_photo(
      '61000000-0000-4000-8000-000000000005',
      '62000000-0000-4000-8000-000000000005'
    )
  ),
  0,
  'expired listing has no deliverable photo metadata'
);

select * from finish();
rollback;
