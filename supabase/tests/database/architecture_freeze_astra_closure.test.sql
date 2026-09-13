begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_table(
  'private',
  'listing_trusted_eligibility_constraints',
  'trusted eligibility input is stored separately from effective controls state'
);

select function_privs_are(
  'public',
  'set_trusted_listing_eligibility_constraint',
  array['uuid', 'text', 'text', 'text'],
  'anon',
  array[]::text[],
  'anon cannot set or clear trusted eligibility authority'
);
select function_privs_are(
  'public',
  'set_trusted_listing_eligibility_constraint',
  array['uuid', 'text', 'text', 'text'],
  'authenticated',
  array[]::text[],
  'authenticated cannot set or clear trusted eligibility authority'
);
select function_privs_are(
  'public',
  'set_trusted_listing_eligibility_constraint',
  array['uuid', 'text', 'text', 'text'],
  'service_role',
  array['EXECUTE'],
  'service role may perform the explicit trusted eligibility reassessment operation'
);

select results_eq(
  $$
    select privilege_type
    from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name = 'listing_trusted_eligibility_constraints'
      and grantee = 'service_role'
    order by privilege_type
  $$,
  $$ values ('SELECT'::text) $$,
  'service role reads trusted constraints but mutation is forced through the explicit reassessment RPC'
);

insert into private.sellers (id, recovery_selector, recovery_digest)
values (
  'f3150000-0000-4000-8000-000000000001'::uuid,
  'AstraOwner000001',
  repeat('b', 64)
);

insert into public.listings (
  id, title, description, price_amount, category, province, district,
  seller_display_name, owner_user_id, status
) values
  ('f3150000-0000-4000-8000-000000000101', 'Astra counterexample', 'Synthetic regression', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'f3150000-0000-4000-8000-000000000001', 'pending'),
  ('f3150000-0000-4000-8000-000000000102', 'Trusted blocked', 'Synthetic regression', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'f3150000-0000-4000-8000-000000000001', 'pending'),
  ('f3150000-0000-4000-8000-000000000103', 'Trusted review', 'Synthetic regression', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'f3150000-0000-4000-8000-000000000001', 'pending'),
  ('f3150000-0000-4000-8000-000000000104', 'Deterministic regulated', 'Synthetic regression', 1, 'vehicle', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'f3150000-0000-4000-8000-000000000001', 'pending');

select is(
  public.set_trusted_listing_eligibility_constraint(
    'f3150000-0000-4000-8000-000000000101',
    'regulated_verification_required',
    'operator',
    'Astra trusted regulated constraint'
  ),
  'regulated_verification_required',
  'ordinary listing accepts explicit operator regulated constraint'
);

update public.listings
set category = 'other', product_type = null
where id = 'f3150000-0000-4000-8000-000000000101'::uuid;

select results_eq(
  $$
    select c.eligibility_state, c.eligibility_origin,
           t.eligibility_state, t.decision_origin
    from private.listing_publication_controls c
    join private.listing_trusted_eligibility_constraints t using (listing_id)
    where c.listing_id = 'f3150000-0000-4000-8000-000000000101'::uuid
  $$,
  $$ values ('review_required'::text, 'system'::text, 'regulated_verification_required'::text, 'operator'::text) $$,
  'Astra step 1: stricter deterministic review is effective while trusted regulated/operator source survives'
);

update public.listings
set category = 'electronics', product_type = null
where id = 'f3150000-0000-4000-8000-000000000101'::uuid;

select results_eq(
  $$
    select c.eligibility_state, c.eligibility_origin,
           t.eligibility_state, t.decision_origin
    from private.listing_publication_controls c
    join private.listing_trusted_eligibility_constraints t using (listing_id)
    where c.listing_id = 'f3150000-0000-4000-8000-000000000101'::uuid
  $$,
  $$ values ('regulated_verification_required'::text, 'operator'::text, 'regulated_verification_required'::text, 'operator'::text) $$,
  'Astra step 2: relaxing metadata reasserts the still-persisted trusted regulated/operator constraint'
);

select is(
  (select owner_user_id from public.listings where id = 'f3150000-0000-4000-8000-000000000101'::uuid),
  'f3150000-0000-4000-8000-000000000001'::uuid,
  'trusted/effective eligibility reassessment does not change owner_user_id'
);

select public.set_trusted_listing_eligibility_constraint(
  'f3150000-0000-4000-8000-000000000102', 'blocked', 'legal_notice', 'Astra trusted block'
);
update public.listings set category = 'other', product_type = null
where id = 'f3150000-0000-4000-8000-000000000102'::uuid;
update public.listings set category = 'electronics', product_type = null
where id = 'f3150000-0000-4000-8000-000000000102'::uuid;
select results_eq(
  $$ select c.eligibility_state, t.eligibility_state, t.decision_origin
     from private.listing_publication_controls c
     join private.listing_trusted_eligibility_constraints t using (listing_id)
     where c.listing_id = 'f3150000-0000-4000-8000-000000000102'::uuid $$,
  $$ values ('blocked'::text, 'blocked'::text, 'legal_notice'::text) $$,
  'trusted blocked survives every looser metadata change'
);

select public.set_trusted_listing_eligibility_constraint(
  'f3150000-0000-4000-8000-000000000103', 'review_required', 'operator', 'Astra trusted review'
);
update public.listings set category = 'electronics', product_type = null
where id = 'f3150000-0000-4000-8000-000000000103'::uuid;
select results_eq(
  $$ select c.eligibility_state, t.eligibility_state, t.decision_origin
     from private.listing_publication_controls c
     join private.listing_trusted_eligibility_constraints t using (listing_id)
     where c.listing_id = 'f3150000-0000-4000-8000-000000000103'::uuid $$,
  $$ values ('review_required'::text, 'review_required'::text, 'operator'::text) $$,
  'trusted review_required survives looser deterministic eligibility'
);

select public.set_trusted_listing_eligibility_constraint(
  'f3150000-0000-4000-8000-000000000104', 'eligible', 'operator', 'Astra deliberately looser trusted value'
);
select results_eq(
  $$ select c.eligibility_state, c.eligibility_origin, t.eligibility_state
     from private.listing_publication_controls c
     join private.listing_trusted_eligibility_constraints t using (listing_id)
     where c.listing_id = 'f3150000-0000-4000-8000-000000000104'::uuid $$,
  $$ values ('regulated_verification_required'::text, 'system'::text, 'eligible'::text) $$,
  'deterministic vehicle/EIDS requirement cannot be weakened by a looser trusted value'
);

select is(
  public.set_trusted_listing_eligibility_constraint(
    'f3150000-0000-4000-8000-000000000101',
    null,
    'operator',
    'Explicit Astra trusted constraint clear'
  ),
  'eligible',
  'explicit trusted clear returns the deterministic ordinary effective state'
);
select is(
  (select count(*)::bigint from private.listing_trusted_eligibility_constraints where listing_id = 'f3150000-0000-4000-8000-000000000101'::uuid),
  0::bigint,
  'trusted restriction disappears only after the explicit reassessment/clear operation'
);

select * from finish();
rollback;
