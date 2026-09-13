begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_table('private', 'seller_role_assessments', 'seller role assessment seam exists');
select has_table('private', 'listing_policy_decisions', 'server-owned listing policy seam exists');
select has_table('private', 'listing_publication_controls', 'orthogonal listing state seam exists');
select has_table('private', 'listing_enforcement_cases', 'durable notice/enforcement case seam exists');
select has_function(
  'public',
  'listing_has_public_capability',
  array['uuid', 'text'],
  'one public capability decision seam exists'
);

select ok(
  not has_table_privilege('anon', 'private.seller_role_assessments', 'SELECT'),
  'anon cannot inspect seller-role assessments'
);
select ok(
  not has_table_privilege('authenticated', 'private.listing_policy_decisions', 'SELECT'),
  'authenticated callers cannot inspect server-owned policy decisions'
);
select ok(
  not has_table_privilege('anon', 'private.listing_publication_controls', 'SELECT'),
  'anon cannot inspect internal publication controls'
);
select ok(
  not has_table_privilege('anon', 'private.listing_enforcement_cases', 'SELECT'),
  'anon cannot inspect enforcement case metadata'
);
select ok(
  has_table_privilege('service_role', 'private.listing_enforcement_cases', 'INSERT'),
  'service role may create enforcement cases'
);

select is(
  public.create_seller_identity(
    'f2000000-0000-4000-8000-000000000001',
    'FFFFFFFFFFFFFFFF',
    repeat('1', 64),
    repeat('2', 64),
    now() + interval '7 days'
  ),
  'f2000000-0000-4000-8000-000000000001'::uuid,
  'existing SMS-less seller creation remains authoritative'
);

select results_eq(
  $$
    select assessed_role, review_state
    from private.seller_role_assessments
    where seller_id = 'f2000000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('unknown'::text, 'current'::text) $$,
  'new seller principal receives a non-blocking unknown role assessment'
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
  owner_user_id,
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
  'f2100000-0000-4000-8000-000000000001',
  'Architecture freeze phone fixture',
  'Synthetic architecture freeze fixture',
  1000,
  false,
  'electronics',
  'phone',
  1,
  '{"brand":"Apple","model":"iPhone 13","storage_gb":128}'::jsonb,
  'used',
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  'f2000000-0000-4000-8000-000000000001',
  array['phone', 'iphone'],
  'phone_whatsapp',
  '+12025550131',
  now() - interval '5 minutes',
  'architecture-freeze-v1',
  now() - interval '4 minutes',
  'published',
  now() - interval '3 minutes',
  now() + interval '1 day'
);

select results_eq(
  $$
    select policy_scope, decision_origin
    from private.listing_policy_decisions
    where listing_id = 'f2100000-0000-4000-8000-000000000001'::uuid
      and superseded_at is null
  $$,
  $$ values ('ordinary'::text, 'system'::text) $$,
  'ordinary structured product facts receive a separate server-owned policy decision'
);

select results_eq(
  $$
    select lifecycle_state, eligibility_state, enforcement_state, contact_state
    from private.listing_publication_controls
    where listing_id = 'f2100000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('active'::text, 'eligible'::text, 'clear'::text, 'available'::text) $$,
  'legacy published status is represented by independent state axes'
);

insert into private.listing_photos (
  id,
  listing_id,
  object_path,
  mime_type,
  byte_size,
  sort_order
) values (
  'f2200000-0000-4000-8000-000000000001',
  'f2100000-0000-4000-8000-000000000001',
  'listings/f2100000-0000-4000-8000-000000000001/f2200000-0000-4000-8000-000000000001.webp',
  'image/webp',
  100,
  0
);

select ok(
  public.listing_has_public_capability(
    'f2100000-0000-4000-8000-000000000001',
    'search_index'
  ),
  'valid ordinary published listing remains a search candidate'
);
select ok(
  public.listing_has_public_capability(
    'f2100000-0000-4000-8000-000000000001',
    'detail'
  ),
  'valid ordinary published listing remains detail-visible'
);
select ok(
  public.listing_has_public_capability(
    'f2100000-0000-4000-8000-000000000001',
    'signed_photo'
  ),
  'valid ordinary published listing may deliver signed photos'
);
select ok(
  public.listing_has_public_capability(
    'f2100000-0000-4000-8000-000000000001',
    'public_contact'
  ),
  'valid ordinary published listing may expose its instructed public contact'
);
select ok(
  not public.listing_has_public_capability(
    'f2100000-0000-4000-8000-000000000001',
    'external_cta'
  ),
  'external CTA remains blocked without the existing fraud/moderation approval facts'
);

select is(
  (
    select count(*)::integer
    from public.get_public_listing_photos('f2100000-0000-4000-8000-000000000001')
  ),
  1,
  'public photo manifest delegates to the same capability decision'
);
select is(
  (
    select count(*)::integer
    from public.get_deliverable_listing_photo(
      'f2100000-0000-4000-8000-000000000001',
      'f2200000-0000-4000-8000-000000000001'
    )
  ),
  1,
  'trusted service-role photo path delegates to the same capability decision'
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
) values (
  'f2100000-0000-4000-8000-000000000001',
  'https://shopier.com/synthetic-fixture',
  'shopier.com',
  'shopier',
  'KNOWN_PROVIDER_CANDIDATE',
  'confirmed',
  'matched',
  'approved',
  'clear',
  'allow_public_cta'
);

select ok(
  public.listing_has_public_capability(
    'f2100000-0000-4000-8000-000000000001',
    'external_cta'
  ),
  'external CTA requires both listing capability and existing fraud/moderation approval'
);

insert into private.listing_enforcement_cases (
  id,
  listing_id,
  reason_type,
  reason_detail,
  received_at,
  decision_action,
  action_at,
  evidence,
  audit_metadata,
  appeal_state,
  created_origin
) values (
  'f2300000-0000-4000-8000-000000000001',
  'f2100000-0000-4000-8000-000000000001',
  'legal_notice',
  'Synthetic legal notice proves fail-closed propagation',
  now(),
  'remove',
  now(),
  '{"fixture":true}'::jsonb,
  '{"operator":"synthetic"}'::jsonb,
  'none',
  'legal_notice'
);

select results_eq(
  $$
    select enforcement_state, contact_state
    from private.listing_publication_controls
    where listing_id = 'f2100000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('removed'::text, 'suppressed'::text) $$,
  'removal notice propagates enforcement and contact suppression without changing owner'
);

select results_eq(
  $$
    select owner_user_id
    from public.listings
    where id = 'f2100000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('f2000000-0000-4000-8000-000000000001'::uuid) $$,
  'enforcement does not change seller ownership principal'
);

select ok(
  not public.listing_has_public_capability('f2100000-0000-4000-8000-000000000001', 'search_index'),
  'removed listing is absent from collection/search capability'
);
select ok(
  not public.listing_has_public_capability('f2100000-0000-4000-8000-000000000001', 'detail'),
  'removed listing is absent from detail capability'
);
select ok(
  not public.listing_has_public_capability('f2100000-0000-4000-8000-000000000001', 'signed_photo'),
  'removed listing cannot expose signed photos'
);
select ok(
  not public.listing_has_public_capability('f2100000-0000-4000-8000-000000000001', 'public_contact'),
  'removed listing cannot expose public contact'
);
select ok(
  not public.listing_has_public_capability('f2100000-0000-4000-8000-000000000001', 'external_cta'),
  'removed listing cannot expose an approved external CTA'
);
select is(
  (
    select count(*)::integer
    from public.get_public_listing_photos('f2100000-0000-4000-8000-000000000001')
  ),
  0,
  'removed listing has no public photo manifest'
);
select is(
  (
    select count(*)::integer
    from public.get_deliverable_listing_photo(
      'f2100000-0000-4000-8000-000000000001',
      'f2200000-0000-4000-8000-000000000001'
    )
  ),
  0,
  'removed listing fails closed on trusted photo delivery too'
);

insert into public.listings (
  id, title, description, price_amount, price_is_free, category, product_type,
  product_attributes_version, product_attributes, province, district, seller_display_name,
  search_keywords, contact_channel, contact_e164, publication_instruction_at,
  listing_rules_version, listing_rules_accepted_at, status
) values
(
  'f2100000-0000-4000-8000-000000000002',
  'Synthetic automobile review fixture',
  'Synthetic vehicle fixture',
  1000,
  false,
  'vehicle',
  'automobile',
  1,
  '{"make":"Synthetic","model":"Fixture"}'::jsonb,
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  array['automobile'],
  'phone_whatsapp',
  '+12025550132',
  now(),
  'architecture-freeze-v1',
  now(),
  'pending'
),
(
  'f2100000-0000-4000-8000-000000000003',
  'Other category review fixture',
  'Synthetic other fixture',
  1000,
  false,
  'other',
  null,
  null,
  '{}'::jsonb,
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  array['other'],
  'phone_whatsapp',
  '+12025550133',
  now(),
  'architecture-freeze-v1',
  now(),
  'pending'
);

select results_eq(
  $$
    select d.policy_scope, c.eligibility_state
    from private.listing_policy_decisions as d
    join private.listing_publication_controls as c on c.listing_id = d.listing_id
    where d.listing_id = 'f2100000-0000-4000-8000-000000000002'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('eids_vehicle'::text, 'regulated_verification_required'::text) $$,
  'vehicle policy remains fail-closed pending regulated verification'
);
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state
    from private.listing_policy_decisions as d
    join private.listing_publication_controls as c on c.listing_id = d.listing_id
    where d.listing_id = 'f2100000-0000-4000-8000-000000000003'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('review_required'::text, 'review_required'::text) $$,
  'choosing Other does not permanently grant ordinary-goods policy scope'
);

select * from finish();
rollback;
