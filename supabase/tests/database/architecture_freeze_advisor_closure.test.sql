begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_table(
  'private',
  'listing_eligibility_transitions',
  'auditable listing eligibility-transition seam exists'
);
select function_privs_are(
  'public',
  'record_synthetic_regulated_listing_eligibility',
  array['uuid'],
  'anon',
  array[]::text[],
  'anon cannot satisfy regulated eligibility'
);
select function_privs_are(
  'public',
  'record_synthetic_regulated_listing_eligibility',
  array['uuid'],
  'authenticated',
  array[]::text[],
  'authenticated cannot satisfy regulated eligibility'
);
select function_privs_are(
  'public',
  'record_synthetic_regulated_listing_eligibility',
  array['uuid'],
  'service_role',
  array['EXECUTE'],
  'only the trusted service-role path may record the synthetic regulated bypass'
);

insert into public.listings (
  id, title, description, price_amount, category, product_type, province, district,
  seller_display_name, contact_channel, contact_e164, publication_instruction_at, status
) values
(
  'f3100000-0000-4000-8000-000000000001', 'Synthetic vehicle bypass', 'Advisor fixture',
  1, 'vehicle', 'automobile', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
  'phone_whatsapp', '+12025550201', now(), 'pending'
),
(
  'f3100000-0000-4000-8000-000000000002', 'Ordinary control', 'Advisor fixture',
  1, 'electronics', null, 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
  'phone_whatsapp', '+12025550202', now(), 'pending'
);

select results_eq(
  $$
    select d.policy_scope, c.eligibility_state, c.eligibility_origin
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3100000-0000-4000-8000-000000000001'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('eids_vehicle'::text, 'regulated_verification_required'::text, 'system'::text) $$,
  'regulated listing is fail-closed by default before the synthetic transition'
);

select is(
  public.record_synthetic_regulated_listing_eligibility(
    'f3100000-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'trusted synthetic test transition is acknowledged'
);
select results_eq(
  $$
    select eligibility_state, eligibility_origin
    from private.listing_publication_controls
    where listing_id = 'f3100000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('eligible'::text, 'synthetic_test'::text) $$,
  'synthetic regulated bypass is represented explicitly without changing policy scope'
);
select results_eq(
  $$
    select transition_origin, evidence_provenance,
           transition_basis like 'SYNTHETIC TEST BYPASS:%' as synthetic_basis,
           evidence ->> 'production_provider_verification' as provider_verified
    from private.listing_eligibility_transitions
    where listing_id = 'f3100000-0000-4000-8000-000000000001'::uuid
    order by recorded_at desc, id desc
    limit 1
  $$,
  $$ values ('synthetic_test'::text, 'stage1_local_triple_gate'::text, true, 'false'::text) $$,
  'persisted provenance explicitly identifies synthetic test bypass and denies production/provider verification'
);
select throws_ok(
  $$ select public.record_synthetic_regulated_listing_eligibility('f3100000-0000-4000-8000-000000000002'::uuid) $$,
  'P0001',
  'synthetic regulated eligibility transition requires current EIDS policy scope',
  'ordinary listings cannot use the synthetic regulated transition primitive'
);

-- Trusted restricted policy cannot be replaced by seller-editable metadata.
insert into public.listings (
  id, title, description, price_amount, category, province, district, seller_display_name, status
) values
  ('f3110000-0000-4000-8000-000000000001', 'Restricted precedence', 'Advisor fixture', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'),
  ('f3110000-0000-4000-8000-000000000002', 'Review precedence', 'Advisor fixture', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'),
  ('f3110000-0000-4000-8000-000000000003', 'Blocked eligibility precedence', 'Advisor fixture', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'),
  ('f3110000-0000-4000-8000-000000000004', 'Ordinary to vehicle', 'Advisor fixture', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'),
  ('f3110000-0000-4000-8000-000000000005', 'Vehicle trusted restriction', 'Advisor fixture', 1, 'vehicle', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending');

update private.listing_policy_decisions
set superseded_at = now()
where listing_id = 'f3110000-0000-4000-8000-000000000001'::uuid
  and superseded_at is null;
insert into private.listing_policy_decisions (
  listing_id, policy_scope, decision_basis, policy_version, decision_origin, evidence_provenance
) values (
  'f3110000-0000-4000-8000-000000000001', 'restricted', 'Trusted operator restriction',
  'advisor2-test', 'operator', 'synthetic_operator_fixture'
);
update private.listing_publication_controls
set eligibility_state = 'blocked', eligibility_origin = 'operator',
    eligibility_basis = 'Trusted operator restriction'
where listing_id = 'f3110000-0000-4000-8000-000000000001'::uuid;
update public.listings set category = 'home'
where id = 'f3110000-0000-4000-8000-000000000001'::uuid;
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state, c.eligibility_origin
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3110000-0000-4000-8000-000000000001'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('restricted'::text, 'blocked'::text, 'operator'::text) $$,
  'restricted operator decision survives a seller category edit'
);

update private.listing_policy_decisions
set superseded_at = now()
where listing_id = 'f3110000-0000-4000-8000-000000000002'::uuid
  and superseded_at is null;
insert into private.listing_policy_decisions (
  listing_id, policy_scope, decision_basis, policy_version, decision_origin, evidence_provenance
) values (
  'f3110000-0000-4000-8000-000000000002', 'review_required', 'Trusted operator review',
  'advisor2-test', 'operator', 'synthetic_operator_fixture'
);
update private.listing_publication_controls
set eligibility_state = 'review_required', eligibility_origin = 'operator',
    eligibility_basis = 'Trusted operator review'
where listing_id = 'f3110000-0000-4000-8000-000000000002'::uuid;
update public.listings set category = 'home'
where id = 'f3110000-0000-4000-8000-000000000002'::uuid;
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state, c.eligibility_origin
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3110000-0000-4000-8000-000000000002'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('review_required'::text, 'review_required'::text, 'operator'::text) $$,
  'trusted review-required decision survives a seller category edit'
);

update private.listing_publication_controls
set eligibility_state = 'blocked', eligibility_origin = 'operator',
    eligibility_basis = 'Trusted manual eligibility block'
where listing_id = 'f3110000-0000-4000-8000-000000000003'::uuid;
update public.listings set category = 'home'
where id = 'f3110000-0000-4000-8000-000000000003'::uuid;
select results_eq(
  $$
    select eligibility_state, eligibility_origin
    from private.listing_publication_controls
    where listing_id = 'f3110000-0000-4000-8000-000000000003'::uuid
  $$,
  $$ values ('blocked'::text, 'operator'::text) $$,
  'trusted blocked eligibility cannot become eligible from metadata edits'
);

update public.listings set category = 'vehicle'
where id = 'f3110000-0000-4000-8000-000000000004'::uuid;
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3110000-0000-4000-8000-000000000004'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('eids_vehicle'::text, 'regulated_verification_required'::text) $$,
  'ordinary to vehicle metadata edit becomes regulated and fail-closed'
);

update private.listing_policy_decisions
set superseded_at = now()
where listing_id = 'f3110000-0000-4000-8000-000000000005'::uuid
  and superseded_at is null;
insert into private.listing_policy_decisions (
  listing_id, policy_scope, decision_basis, policy_version, decision_origin, evidence_provenance
) values (
  'f3110000-0000-4000-8000-000000000005', 'restricted', 'Trusted restriction on regulated listing',
  'advisor2-test', 'legal_notice', 'synthetic_legal_fixture'
);
update private.listing_publication_controls
set eligibility_state = 'blocked', eligibility_origin = 'legal_notice',
    eligibility_basis = 'Trusted legal restriction'
where listing_id = 'f3110000-0000-4000-8000-000000000005'::uuid;
update public.listings set category = 'electronics'
where id = 'f3110000-0000-4000-8000-000000000005'::uuid;
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state, c.eligibility_origin
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3110000-0000-4000-8000-000000000005'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('restricted'::text, 'blocked'::text, 'legal_notice'::text) $$,
  'vehicle to ordinary edit cannot lift an existing trusted restriction'
);

-- Multiple active enforcement cases aggregate; restoring one cannot clear another.
insert into public.listings (
  id, title, description, price_amount, category, province, district, seller_display_name,
  owner_user_id, contact_channel, contact_e164, publication_instruction_at,
  status, published_at, expires_at
) values (
  'f3120000-0000-4000-8000-000000000001', 'Enforcement aggregation', 'Advisor fixture',
  1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
  null, 'phone_whatsapp', '+12025550220', now() - interval '2 minutes',
  'published', now() - interval '1 minute', now() + interval '1 day'
);
insert into private.listing_external_sales_links (
  listing_id, canonical_url, canonical_host, provider_key, url_security_classification,
  ownership_status, listing_match_status, moderation_status, complaint_status,
  public_cta_decision
) values (
  'f3120000-0000-4000-8000-000000000001',
  'https://shopier.com/advisor2-enforcement-fixture', 'shopier.com', 'shopier',
  'KNOWN_PROVIDER_CANDIDATE', 'confirmed', 'matched', 'approved', 'clear', 'allow_public_cta'
);

insert into private.listing_enforcement_cases (
  id, listing_id, reason_type, reason_detail, decision_action, action_at, created_origin
) values
  ('f3130000-0000-4000-8000-000000000001', 'f3120000-0000-4000-8000-000000000001', 'operator_review', 'Remove A', 'remove', now(), 'operator'),
  ('f3130000-0000-4000-8000-000000000002', 'f3120000-0000-4000-8000-000000000001', 'operator_review', 'Remove B', 'remove', now(), 'operator');
update private.listing_enforcement_cases
set decision_action = 'restore', action_at = now(), appeal_state = 'restored', restored_at = now()
where id = 'f3130000-0000-4000-8000-000000000001'::uuid;
select results_eq(
  $$ select enforcement_state, contact_state from private.listing_publication_controls
     where listing_id = 'f3120000-0000-4000-8000-000000000001'::uuid $$,
  $$ values ('removed'::text, 'suppressed'::text) $$,
  'restoring remove A does not neutralize active remove B'
);
update private.listing_enforcement_cases
set decision_action = 'restore', action_at = now(), appeal_state = 'restored', restored_at = now()
where id = 'f3130000-0000-4000-8000-000000000002'::uuid;

insert into private.listing_enforcement_cases (
  id, listing_id, reason_type, reason_detail, decision_action, action_at, created_origin
) values
  ('f3130000-0000-4000-8000-000000000003', 'f3120000-0000-4000-8000-000000000001', 'operator_review', 'Hold A', 'hold', now(), 'operator'),
  ('f3130000-0000-4000-8000-000000000004', 'f3120000-0000-4000-8000-000000000001', 'operator_review', 'Suppress B', 'suppress_contact', now(), 'operator');
update private.listing_enforcement_cases
set decision_action = 'restore', action_at = now(), appeal_state = 'restored', restored_at = now()
where id = 'f3130000-0000-4000-8000-000000000003'::uuid;
select results_eq(
  $$ select enforcement_state, contact_state from private.listing_publication_controls
     where listing_id = 'f3120000-0000-4000-8000-000000000001'::uuid $$,
  $$ values ('clear'::text, 'suppressed'::text) $$,
  'restoring hold A leaves contact suppressed while suppress-contact B is active'
);
select ok(
  not public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'detail'),
  'active contact suppression still removes row-level detail exposure'
);
update private.listing_enforcement_cases
set decision_action = 'restore', action_at = now(), appeal_state = 'restored', restored_at = now()
where id = 'f3130000-0000-4000-8000-000000000004'::uuid;
select results_eq(
  $$ select enforcement_state, contact_state from private.listing_publication_controls
     where listing_id = 'f3120000-0000-4000-8000-000000000001'::uuid $$,
  $$ values ('clear'::text, 'available'::text) $$,
  'final blocking case restoration recovers ordinary contact readiness'
);
select ok(
  public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'search_index')
  and public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'detail')
  and public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'signed_photo')
  and public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'public_contact')
  and public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'external_cta'),
  'all public capabilities recover only after every blocking case is restored and other gates are satisfied'
);

select * from finish();
rollback;
