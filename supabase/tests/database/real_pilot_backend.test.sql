begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select no_plan();

select ok(
  exists (select 1 from pg_catalog.pg_namespace where nspname = 'private'),
  'private schema exists'
);

select hasnt_table(
  'private',
  'listing_contacts',
  'obsolete private listing_contacts source is removed'
);
select has_table('private', 'listing_photos', 'private listing_photos exists');
select has_table(
  'private',
  'listing_external_sales_links',
  'private listing_external_sales_links exists'
);

select ok(
  not has_schema_privilege('anon', 'private', 'USAGE'),
  'anon has no private schema usage'
);

select ok(
  not has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated has no private schema usage'
);

select ok(
  has_schema_privilege('service_role', 'private', 'USAGE'),
  'service_role can use private schema for trusted server-side operations'
);

select ok(
  has_table_privilege('service_role', 'public.listings', 'INSERT'),
  'service_role has an operational listings write path'
);

select ok(
  has_table_privilege('service_role', 'private.listing_photos', 'INSERT'),
  'service_role can write private photo metadata'
);

select ok(
  has_table_privilege('service_role', 'private.listing_external_sales_links', 'INSERT'),
  'service_role can write private external-link review state'
);

select ok(
  (
    select c.relrowsecurity
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private' and c.relname = 'listing_photos'
  ),
  'RLS is enabled on private listing_photos'
);

select ok(
  (
    select c.relrowsecurity
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private' and c.relname = 'listing_external_sales_links'
  ),
  'RLS is enabled on private listing_external_sales_links'
);

insert into public.listings (
  id,
  title,
  description,
  price_amount,
  province,
  district,
  seller_display_name,
  search_keywords,
  contact_channel,
  contact_e164,
  contact_verified_at,
  contact_verification_method,
  publication_instruction_at,
  private_seller_declaration_at,
  content_rights_declaration_at,
  status,
  published_at,
  expires_at,
  unpublished_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Active real-pilot fixture',
    'Synthetic active listing for the real pilot backend preparation test.',
    100,
    'Tekirdag',
    'Corlu',
    'Synthetic Seller',
    array['active'],
    'whatsapp',
    '+12025550123',
    now() - interval '3 hours',
    'whatsapp_same_number',
    now() - interval '2 hours',
    now() - interval '90 minutes',
    now() - interval '90 minutes',
    'published',
    now() - interval '1 hour',
    now() + interval '1 day',
    null
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Pending real-pilot fixture',
    'Synthetic pending listing that must never be visible to anonymous users.',
    200,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    array['pending'],
    'whatsapp',
    '+12025550124',
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
    '10000000-0000-4000-8000-000000000003',
    'Rejected real-pilot fixture',
    'Synthetic rejected listing that must never be visible to anonymous users.',
    300,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    array['rejected'],
    null,
    null,
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
    '10000000-0000-4000-8000-000000000004',
    'Expired real-pilot fixture',
    'Synthetic expired listing that must never be visible to anonymous users.',
    400,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    array['expired'],
    'phone',
    '+12025550125',
    now() - interval '3 days',
    'manual_callback',
    now() - interval '2 days 12 hours',
    now() - interval '2 days 11 hours',
    now() - interval '2 days 11 hours',
    'published',
    now() - interval '2 days',
    now() - interval '1 day',
    null
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'Duplicate-link fixture one',
    'Synthetic listing used to prove duplicate canonical URL handling.',
    500,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    array['duplicate'],
    null,
    null,
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
    '10000000-0000-4000-8000-000000000006',
    'Duplicate-link fixture two',
    'Second synthetic listing used to prove duplicate canonical URL handling.',
    600,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    array['duplicate'],
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'pending',
    null,
    null,
    null
  );

select is(
  (
    select province || '/' || district
    from public.listings
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'Tekirdağ/Çorlu',
  'legacy synthetic location spelling is normalized to the canonical catalog spelling'
);

select throws_ok(
  $$
    insert into public.listings (
      title,
      description,
      price_amount,
      province,
      district,
      seller_display_name
    ) values (
      'Out of pilot scope',
      'The real Corlu pilot database must reject locations outside the approved pilot scope.',
      1,
      'İstanbul',
      'Kadıköy',
      'Synthetic Seller'
    )
  $$,
  '23514',
  null,
  'location outside the Corlu pilot scope is rejected'
);

set local role anon;

select results_eq(
  $$
    select title
    from public.listings
    where id::text like '10000000-%'
    order by title
  $$,
  $$ values ('Active real-pilot fixture'::text) $$,
  'anon sees only active published real-pilot rows; pending, rejected and expired stay hidden'
);

select results_eq(
  $$
    select contact_channel, contact_e164
    from public.listings
    where id::text like '10000000-%'
    order by id
  $$,
  $$ values ('whatsapp'::text, '+12025550123'::text) $$,
  'anon contact enumeration follows the same active published RLS boundary'
);

reset role;

select lives_ok(
  $$
    update public.listings
    set
      contact_verified_at = now() - interval '2 minutes',
      contact_verification_method = 'whatsapp_same_number'
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  'pending synthetic contact can record present-control verification'
);

select lives_ok(
  $$
    update public.listings
    set publication_instruction_at = now() - interval '1 minute'
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  'pending synthetic contact can record the publication instruction audit fact'
);

select throws_ok(
  $$
    update public.listings
    set contact_channel = 'email'
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  '23514',
  null,
  'contact model rejects unapproved channels such as email'
);

select throws_ok(
  $$
    update public.listings
    set contact_e164 = '05551112233'
    where id = '10000000-0000-4000-8000-000000000002'
  $$,
  '23514',
  null,
  'contact model rejects non-E.164 values'
);

select lives_ok(
  $$
    insert into private.listing_photos (
      id,
      listing_id,
      object_path,
      mime_type,
      byte_size,
      sort_order
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'listings/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001.jpg',
      'image/jpeg',
      1024,
      0
    )
  $$,
  'photo metadata accepts the controlled listing-owned JPEG path convention'
);

select throws_ok(
  $$
    insert into private.listing_photos (
      id,
      listing_id,
      object_path,
      mime_type,
      byte_size,
      sort_order
    ) values (
      '20000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',
      'listings/10000000-0000-4000-8000-000000000001/user-supplied-name.jpg',
      'image/jpeg',
      1024,
      1
    )
  $$,
  '23514',
  null,
  'photo metadata rejects arbitrary user-controlled filenames'
);

select throws_ok(
  $$
    insert into private.listing_photos (
      id,
      listing_id,
      object_path,
      mime_type,
      byte_size,
      sort_order
    ) values (
      '20000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000001',
      'listings/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000003.jpg',
      'application/javascript',
      1024,
      2
    )
  $$,
  '23514',
  null,
  'photo metadata rejects executable MIME types'
);

select throws_ok(
  $$
    insert into private.listing_photos (
      id,
      listing_id,
      object_path,
      mime_type,
      byte_size,
      sort_order
    ) values (
      '20000000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000001',
      'listings/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000004.webp',
      'image/webp',
      8388609,
      3
    )
  $$,
  '23514',
  null,
  'photo metadata enforces the 8 MiB maximum'
);

insert into private.listing_external_sales_links (
  listing_id,
  canonical_url,
  canonical_host,
  provider_key,
  url_security_classification,
  ownership_status,
  listing_match_status,
  moderation_status,
  complaint_status,
  public_cta_decision
)
values
  (
    '10000000-0000-4000-8000-000000000005',
    'https://shopier.com/store/synthetic',
    'shopier.com',
    'shopier',
    'KNOWN_PROVIDER_CANDIDATE',
    'confirmed',
    'matched',
    'approved',
    'clear',
    'allow_public_cta'
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'https://shopier.com/store/synthetic',
    'shopier.com',
    'shopier',
    'KNOWN_PROVIDER_CANDIDATE',
    'not_checked',
    'not_checked',
    'pending',
    'clear',
    'block_public_cta'
  );

select is(
  (
    select count(*)::integer
    from private.listing_external_sales_links
    where canonical_url = 'https://shopier.com/store/synthetic'
  ),
  2,
  'canonical URL reuse across different listings is allowed for manual duplicate review'
);

update private.listing_external_sales_links
set
  canonical_url = 'https://shopier.com/store/synthetic-changed',
  canonical_host = 'shopier.com',
  provider_key = 'shopier',
  url_security_classification = 'KNOWN_PROVIDER_CANDIDATE'
where listing_id = '10000000-0000-4000-8000-000000000005';

select is(
  (
    select concat_ws(
      '/',
      ownership_status,
      listing_match_status,
      moderation_status,
      complaint_status,
      public_cta_decision
    )
    from private.listing_external_sales_links
    where listing_id = '10000000-0000-4000-8000-000000000005'
  ),
  'not_checked/not_checked/pending/clear/block_public_cta',
  'link identity change resets review and public CTA state to fail-closed'
);

update private.listing_external_sales_links
set
  ownership_status = 'confirmed',
  listing_match_status = 'matched',
  moderation_status = 'approved',
  complaint_status = 'clear',
  public_cta_decision = 'allow_public_cta'
where listing_id = '10000000-0000-4000-8000-000000000006';

update private.listing_external_sales_links
set complaint_status = 'open'
where listing_id = '10000000-0000-4000-8000-000000000006';

select is(
  (
    select public_cta_decision
    from private.listing_external_sales_links
    where listing_id = '10000000-0000-4000-8000-000000000006'
  ),
  'block_public_cta',
  'complaint downgrade automatically suppresses an already-allowed public CTA'
);

select throws_ok(
  $$
    update private.listing_external_sales_links
    set public_cta_decision = 'enabled'
    where listing_id = '10000000-0000-4000-8000-000000000005'
  $$,
  '23514',
  null,
  'ambiguous enabled/disabled kill-switch naming is rejected by the database contract'
);

select throws_ok(
  $$
    insert into private.listing_external_sales_links (
      listing_id,
      canonical_url,
      canonical_host,
      provider_key,
      url_security_classification
    ) values (
      '10000000-0000-4000-8000-000000000003',
      'http://shopier.com/not-https',
      'shopier.com',
      'shopier',
      'KNOWN_PROVIDER_CANDIDATE'
    )
  $$,
  '23514',
  null,
  'database persistence rejects non-HTTPS external links even after trusted-path validation'
);

set local role anon;

select throws_ok(
  $$ select * from private.listing_photos $$,
  '42501',
  null,
  'anon cannot query private photo metadata'
);

select throws_ok(
  $$ select * from private.listing_external_sales_links $$,
  '42501',
  null,
  'anon cannot query pending or approved external-link review state directly'
);

reset role;

select * from finish();
rollback;
