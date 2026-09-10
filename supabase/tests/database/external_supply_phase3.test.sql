begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_table('private', 'external_sources', 'external source registry exists');
select has_table('private', 'external_offers', 'external offer persistence exists');
select has_view(
  'private',
  'product_finding_search_candidates_v1',
  'internal native/external search candidate projection exists'
);

select hasnt_column(
  'private',
  'external_offers',
  'owner_user_id',
  'external offers do not have native listing ownership'
);
select hasnt_column(
  'private',
  'external_offers',
  'seller_id',
  'external offers do not have seller identity ownership'
);
select hasnt_column(
  'private',
  'external_offers',
  'contact_e164',
  'external offers do not inherit public phone semantics'
);
select hasnt_column(
  'private',
  'external_offers',
  'recovery_digest',
  'external offers do not have seller recovery semantics'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.external_sources'::regclass),
  'external source registry has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.external_offers'::regclass),
  'external offers have RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'private.external_sources', 'SELECT'),
  'anonymous callers cannot read external source eligibility state'
);
select ok(
  not has_table_privilege('authenticated', 'private.external_sources', 'SELECT'),
  'authenticated callers cannot read external source eligibility state'
);
select ok(
  not has_table_privilege('anon', 'private.external_offers', 'SELECT'),
  'anonymous callers cannot read internal external offers'
);
select ok(
  not has_table_privilege('authenticated', 'private.external_offers', 'SELECT'),
  'authenticated callers cannot read internal external offers'
);
select ok(
  not has_table_privilege('anon', 'private.external_offers', 'INSERT'),
  'anonymous callers cannot write external offers'
);
select ok(
  not has_table_privilege('authenticated', 'private.external_offers', 'INSERT'),
  'authenticated callers cannot write external offers'
);
select ok(
  not has_table_privilege('anon', 'private.product_finding_search_candidates_v1', 'SELECT'),
  'anonymous callers cannot read the internal common search projection'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'private.product_finding_search_candidates_v1',
    'SELECT'
  ),
  'authenticated callers cannot read the internal common search projection'
);
select ok(
  has_table_privilege('service_role', 'private.external_sources', 'SELECT'),
  'service role may read external source registry'
);
select ok(
  has_table_privilege('service_role', 'private.external_offers', 'INSERT'),
  'service role may ingest system-owned external offers'
);
select ok(
  has_table_privilege(
    'service_role',
    'private.product_finding_search_candidates_v1',
    'SELECT'
  ),
  'service role may read the internal common search projection'
);

insert into private.external_sources (
  id,
  display_name,
  canonical_domain,
  source_mode,
  eligibility_class,
  eligibility_state
) values (
  'e3000000-0000-4000-8000-000000000001',
  'Synthetic Merchant',
  'phase3-merchant.invalid',
  'synthetic_fixture',
  'synthetic',
  'synthetic_only'
);

select lives_ok(
  $sql$
    insert into private.external_offers (
      id,
      source_id,
      source_offer_key,
      canonical_url,
      title,
      category,
      product_type,
      product_attributes_version,
      product_attributes,
      search_terms,
      item_condition,
      provenance,
      structured_confidence,
      price_amount,
      price_currency,
      price_observed_at,
      price_valid_until,
      availability_state,
      availability_observed_at,
      first_seen_at,
      last_seen_at,
      last_checked_at,
      fresh_until
    ) values (
      'e3100000-0000-4000-8000-000000000001',
      'e3000000-0000-4000-8000-000000000001',
      'synthetic-iphone-13-128',
      'https://phase3-merchant.invalid/products/iphone-13-128',
      'Apple iPhone 13 128 GB',
      'electronics',
      'phone',
      1,
      '{"brand":"Apple","model":"iPhone 13","storage_gb":128}'::jsonb,
      array['telefon', 'Apple', 'iPhone 13', '128'],
      'new',
      'external_source_extracted',
      'deterministic',
      19999.90,
      'TRY',
      now() - interval '30 minutes',
      now() + interval '2 hours',
      'in_stock',
      now() - interval '30 minutes',
      now() - interval '1 hour',
      now() - interval '30 minutes',
      now() - interval '30 minutes',
      now() + interval '3 hours'
    )
  $sql$,
  'eligible synthetic Product/Offer facts persist without seller lifecycle data'
);

select is(
  (
    select record_kind
    from private.product_finding_search_candidates_v1
    where record_id = 'e3100000-0000-4000-8000-000000000001'
  ),
  'external_offer',
  'synthetic external offer remains an external record in the common projection'
);
select is(
  (
    select provenance
    from private.product_finding_search_candidates_v1
    where record_id = 'e3100000-0000-4000-8000-000000000001'
  ),
  'external_source_extracted',
  'external provenance survives the database projection'
);
select is(
  (
    select item_condition
    from private.product_finding_search_candidates_v1
    where record_id = 'e3100000-0000-4000-8000-000000000001'
  ),
  'new',
  'external condition remains explicitly new'
);
select is(
  (
    select current_price_amount::text
    from private.product_finding_search_candidates_v1
    where record_id = 'e3100000-0000-4000-8000-000000000001'
  ),
  '19999.90',
  'fresh in-stock external price projects as current TRY truth'
);
select ok(
  (
    select listing_province
    from private.product_finding_search_candidates_v1
    where record_id = 'e3100000-0000-4000-8000-000000000001'
  ) is null,
  'external merchant location is not fabricated as a listing province'
);
select ok(
  (
    select listing_district
    from private.product_finding_search_candidates_v1
    where record_id = 'e3100000-0000-4000-8000-000000000001'
  ) is null,
  'external merchant location is not fabricated as a listing district'
);

update private.external_offers
set
  price_valid_until = now() - interval '10 minutes',
  updated_at = now()
where id = 'e3100000-0000-4000-8000-000000000001';

select ok(
  (
    select current_price_amount
    from private.product_finding_search_candidates_v1
    where record_id = 'e3100000-0000-4000-8000-000000000001'
  ) is null,
  'stale price observation fails closed instead of projecting current price truth'
);

insert into private.external_sources (
  id,
  display_name,
  canonical_domain,
  source_mode,
  eligibility_class,
  eligibility_state
) values (
  'e3000000-0000-4000-8000-000000000002',
  'Uncleared Merchant',
  'merchant.example.com',
  'professional_merchant',
  'a',
  'pending_review'
);

select throws_ok(
  $sql$
    insert into private.external_offers (
      id,
      source_id,
      source_offer_key,
      canonical_url,
      title,
      category,
      product_type,
      product_attributes_version,
      product_attributes,
      item_condition,
      provenance,
      structured_confidence,
      price_amount,
      price_currency,
      price_observed_at,
      price_valid_until,
      availability_state,
      availability_observed_at,
      first_seen_at,
      last_seen_at,
      last_checked_at,
      fresh_until
    ) values (
      'e3100000-0000-4000-8000-000000000002',
      'e3000000-0000-4000-8000-000000000002',
      'uncleared-real-offer',
      'https://merchant.example.com/products/example',
      'Uncleared real product',
      'electronics',
      'phone',
      1,
      '{}'::jsonb,
      'new',
      'external_source_extracted',
      'deterministic',
      1000,
      'TRY',
      now() - interval '30 minutes',
      now() + interval '2 hours',
      'in_stock',
      now() - interval '30 minutes',
      now() - interval '1 hour',
      now() - interval '30 minutes',
      now() - interval '30 minutes',
      now() + interval '3 hours'
    )
  $sql$,
  'P0001',
  'Phase 3.0 external offer ingestion is synthetic-only',
  'an uncleared real merchant source cannot be ingested merely because it is represented'
);

select throws_ok(
  $sql$
    insert into private.external_offers (
      id,
      source_id,
      source_offer_key,
      canonical_url,
      title,
      category,
      product_type,
      product_attributes_version,
      product_attributes,
      item_condition,
      provenance,
      structured_confidence,
      price_amount,
      price_currency,
      price_observed_at,
      price_valid_until,
      availability_state,
      availability_observed_at,
      first_seen_at,
      last_seen_at,
      last_checked_at,
      fresh_until
    ) values (
      'e3100000-0000-4000-8000-000000000003',
      'e3000000-0000-4000-8000-000000000001',
      'synthetic-vehicle',
      'https://phase3-merchant.invalid/products/vehicle',
      'Synthetic automobile',
      'vehicle',
      'automobile',
      1,
      '{}'::jsonb,
      'new',
      'external_source_extracted',
      'deterministic',
      1000000,
      'TRY',
      now() - interval '30 minutes',
      now() + interval '2 hours',
      'in_stock',
      now() - interval '30 minutes',
      now() - interval '1 hour',
      now() - interval '30 minutes',
      now() - interval '30 minutes',
      now() + interval '3 hours'
    )
  $sql$,
  '23514',
  null,
  'vehicle external supply remains outside the Phase 3.0 persistence contract'
);

insert into public.listings (
  id,
  title,
  description,
  price_amount,
  price_is_free,
  category,
  product_type,
  product_attributes_version,
  product_attributes,
  item_condition,
  province,
  district,
  seller_display_name,
  search_keywords,
  contact_channel,
  contact_e164,
  publication_instruction_at,
  listing_rules_version,
  listing_rules_accepted_at,
  status,
  published_at,
  expires_at
) values (
  'e3200000-0000-4000-8000-000000000001',
  'Native Apple iPhone 13',
  'Native seller listing',
  24000,
  false,
  'electronics',
  'phone',
  1,
  '{"brand":"Apple","model":"iPhone 13","storage_gb":128}'::jsonb,
  'used',
  'Tekirdağ',
  'Çorlu',
  'Native Seller',
  array['telefon', 'Apple', 'iPhone 13', '128'],
  'phone_whatsapp',
  '+12025550123',
  now() - interval '2 hours',
  'phase3-db-test-v1',
  now() - interval '90 minutes',
  'published',
  now() - interval '1 hour',
  now() + interval '1 day'
);

select is(
  (
    select record_kind
    from private.product_finding_search_candidates_v1
    where record_id = 'e3200000-0000-4000-8000-000000000001'
  ),
  'native_listing',
  'native persisted listing remains native in the common projection'
);
select is(
  (
    select provenance
    from private.product_finding_search_candidates_v1
    where record_id = 'e3200000-0000-4000-8000-000000000001'
  ),
  'native_seller_declared',
  'native seller-declared provenance is not collapsed into external provenance'
);
select is(
  (
    select listing_province
    from private.product_finding_search_candidates_v1
    where record_id = 'e3200000-0000-4000-8000-000000000001'
  ),
  'Tekirdağ',
  'genuine native listing location keeps its existing semantics'
);

select * from finish();
rollback;
