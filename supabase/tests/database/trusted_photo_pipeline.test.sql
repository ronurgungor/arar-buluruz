begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select no_plan();

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

select ok(
  has_function_privilege(
    'service_role',
    'public.register_sanitized_listing_photo(uuid,uuid,text,bigint,smallint)',
    'EXECUTE'
  ),
  'service_role can register sanitized photo metadata'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.register_sanitized_listing_photo(uuid,uuid,text,bigint,smallint)',
    'EXECUTE'
  ),
  'anon cannot register sanitized photo metadata'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.register_sanitized_listing_photo(uuid,uuid,text,bigint,smallint)',
    'EXECUTE'
  ),
  'authenticated cannot register sanitized photo metadata'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.get_deliverable_listing_photo(uuid,uuid)',
    'EXECUTE'
  ),
  'service_role can evaluate the private photo delivery gate'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_deliverable_listing_photo(uuid,uuid)',
    'EXECUTE'
  ),
  'anon cannot obtain private photo metadata through the delivery helper'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_deliverable_listing_photo(uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated cannot obtain private photo metadata through the delivery helper'
);

select ok(
  (
    select p.prosecdef
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'register_sanitized_listing_photo'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'p_listing_id uuid, p_photo_id uuid, p_object_path text, p_byte_size bigint, p_sort_order smallint'
  ),
  'sanitized photo metadata bridge is SECURITY DEFINER'
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
    select p.prosecdef
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_deliverable_listing_photo'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
        'p_listing_id uuid, p_photo_id uuid'
  ),
  'photo delivery gate is SECURITY DEFINER'
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
    'published',
    now() - interval '2 days',
    now() - interval '1 minute',
    null
  );

select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000001',
    'listings/61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001.webp',
    101,
    0
  ) $$,
  'pending listing accepts trusted sanitized metadata without making it deliverable'
);
select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002',
    'listings/61000000-0000-4000-8000-000000000002/62000000-0000-4000-8000-000000000002.webp',
    102,
    0
  ) $$,
  'rejected listing accepts private metadata without making it deliverable'
);
select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000003',
    '62000000-0000-4000-8000-000000000003',
    'listings/61000000-0000-4000-8000-000000000003/62000000-0000-4000-8000-000000000003.webp',
    103,
    0
  ) $$,
  'active listing accepts canonical sanitized metadata'
);
select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000004',
    '62000000-0000-4000-8000-000000000004',
    'listings/61000000-0000-4000-8000-000000000004/62000000-0000-4000-8000-000000000004.webp',
    104,
    0
  ) $$,
  'unpublished listing keeps private photo metadata non-public'
);
select lives_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000005',
    '62000000-0000-4000-8000-000000000005',
    'listings/61000000-0000-4000-8000-000000000005/62000000-0000-4000-8000-000000000005.webp',
    105,
    0
  ) $$,
  'expired listing keeps private photo metadata non-public'
);

select throws_ok(
  $$ select public.register_sanitized_listing_photo(
    '61000000-0000-4000-8000-000000000003',
    '62000000-0000-4000-8000-000000000099',
    'listings/61000000-0000-4000-8000-000000000003/62000000-0000-4000-8000-000000000099.jpg',
    100,
    1
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

set local role anon;
select throws_ok(
  $$ select * from private.listing_photos $$,
  '42501',
  null,
  'anon cannot directly query private photo metadata'
);
select throws_ok(
  $$ select * from public.get_deliverable_listing_photo(
    '61000000-0000-4000-8000-000000000003',
    '62000000-0000-4000-8000-000000000003'
  ) $$,
  '42501',
  null,
  'anon cannot execute the private photo delivery metadata gate'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select * from private.listing_photos $$,
  '42501',
  null,
  'authenticated cannot directly query private photo metadata'
);
select throws_ok(
  $$ select * from public.get_deliverable_listing_photo(
    '61000000-0000-4000-8000-000000000003',
    '62000000-0000-4000-8000-000000000003'
  ) $$,
  '42501',
  null,
  'authenticated cannot execute the private photo delivery metadata gate'
);
reset role;

select * from finish();
rollback;
