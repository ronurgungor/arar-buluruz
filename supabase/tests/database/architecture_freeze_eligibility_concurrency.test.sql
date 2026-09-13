begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set search_path = extensions, public;
select no_plan();

select is(
  dblink_connect(
    'eligibility_setup',
    'host=supabase_db_arar-buluruz-gate1 port=5432 dbname=postgres user=postgres password=postgres'
  ),
  'OK',
  'eligibility setup connection uses an independent password-authenticated database session'
);
select is(
  dblink_connect(
    'eligibility_a',
    'host=supabase_db_arar-buluruz-gate1 port=5432 dbname=postgres user=postgres password=postgres'
  ),
  'OK',
  'trusted mutation transaction A has an independent database session'
);
select is(
  dblink_connect(
    'eligibility_b',
    'host=supabase_db_arar-buluruz-gate1 port=5432 dbname=postgres user=postgres password=postgres'
  ),
  'OK',
  'seller metadata transaction B has an independent database session'
);

select dblink_exec(
  'eligibility_setup',
  $$ delete from public.listings where id = 'f3170000-0000-4000-8000-000000000001'::uuid $$
);
select dblink_exec(
  'eligibility_setup',
  $$ delete from private.sellers where id = 'f3170000-0000-4000-8000-000000000010'::uuid $$
);

select dblink_exec(
  'eligibility_setup',
  $$
    insert into private.sellers (id, recovery_selector, recovery_digest)
    values (
      'f3170000-0000-4000-8000-000000000010'::uuid,
      'EligRaceOwner001',
      repeat('c', 64)
    )
  $$
);

select dblink_exec(
  'eligibility_setup',
  $$
    insert into public.listings (
      id, title, description, price_amount, category, province, district,
      seller_display_name, owner_user_id, contact_channel, contact_e164,
      publication_instruction_at, listing_rules_version, listing_rules_accepted_at,
      status, published_at, expires_at
    ) values (
      'f3170000-0000-4000-8000-000000000001'::uuid,
      'Trusted eligibility concurrency fixture',
      'Synthetic seller-metadata versus trusted-eligibility serialization regression.',
      1,
      'home',
      'Tekirdağ',
      'Çorlu',
      'Synthetic Seller',
      'f3170000-0000-4000-8000-000000000010'::uuid,
      'phone_whatsapp',
      '+12025550317',
      now() - interval '2 minutes',
      'architecture-freeze-v1',
      now() - interval '90 seconds',
      'published',
      now() - interval '1 minute',
      now() + interval '1 day'
    )
  $$
);

select dblink_exec(
  'eligibility_setup',
  $$
    insert into private.listing_external_sales_links (
      listing_id, canonical_url, canonical_host, provider_key, url_security_classification,
      ownership_status, listing_match_status, moderation_status, complaint_status,
      public_cta_decision
    ) values (
      'f3170000-0000-4000-8000-000000000001'::uuid,
      'https://shopier.com/trusted-eligibility-concurrency-fixture',
      'shopier.com',
      'shopier',
      'KNOWN_PROVIDER_CANDIDATE',
      'confirmed',
      'matched',
      'approved',
      'clear',
      'allow_public_cta'
    )
  $$
);

select results_eq(
  $$
    select
      c.eligibility_state,
      c.eligibility_origin,
      public.listing_has_public_capability(c.listing_id, 'search_index'),
      public.listing_has_public_capability(c.listing_id, 'detail'),
      public.listing_has_public_capability(c.listing_id, 'signed_photo'),
      public.listing_has_public_capability(c.listing_id, 'public_contact'),
      public.listing_has_public_capability(c.listing_id, 'external_cta')
    from private.listing_publication_controls c
    where c.listing_id = 'f3170000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('eligible'::text, 'system'::text, true, true, true, true, true) $$,
  'fixture begins as ordinary eligible and publicly capable before the trusted block race'
);

select is(
  dblink_send_query(
    'eligibility_a',
    $$
      select case
        when public.set_trusted_listing_eligibility_constraint(
          'f3170000-0000-4000-8000-000000000001'::uuid,
          'blocked',
          'operator',
          'Concurrent operator block must remain authoritative'
        ) = 'blocked'
        then (select 1::integer from pg_sleep(5))
        else 0::integer
      end as completed
    $$
  ),
  1,
  'transaction A sets trusted blocked/operator and holds the per-listing controls lock open'
);

select pg_sleep(1);

select is(
  dblink_send_query(
    'eligibility_b',
    $$
      update public.listings
      set category = 'electronics', product_type = null
      where id = 'f3170000-0000-4000-8000-000000000001'::uuid
      returning 1::integer as completed
    $$
  ),
  1,
  'transaction B concurrently performs a seller-like ordinary metadata reassessment'
);

select is(
  (select completed from dblink_get_result('eligibility_a') as r(completed integer)),
  1,
  'transaction A commits the trusted blocked/operator constraint'
);
select is(
  (select completed from dblink_get_result('eligibility_b') as r(completed integer)),
  1,
  'transaction B completes only after lock acquisition and post-A trusted-state recomputation'
);

select results_eq(
  $$
    select
      t.eligibility_state,
      t.decision_origin,
      c.eligibility_state,
      c.eligibility_origin,
      (c.eligibility_state = 'eligible' and c.eligibility_origin = 'system') as stale_eligible_system,
      public.listing_has_public_capability(c.listing_id, 'search_index'),
      public.listing_has_public_capability(c.listing_id, 'detail'),
      public.listing_has_public_capability(c.listing_id, 'signed_photo'),
      public.listing_has_public_capability(c.listing_id, 'public_contact'),
      public.listing_has_public_capability(c.listing_id, 'external_cta'),
      l.owner_user_id
    from private.listing_publication_controls c
    join private.listing_trusted_eligibility_constraints t using (listing_id)
    join public.listings l on l.id = c.listing_id
    where c.listing_id = 'f3170000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values (
    'blocked'::text,
    'operator'::text,
    'blocked'::text,
    'operator'::text,
    false,
    false,
    false,
    false,
    false,
    false,
    'f3170000-0000-4000-8000-000000000010'::uuid
  ) $$,
  'after both commits trusted blocked/operator remains effective, stale eligible/system is impossible, public capabilities fail closed, and ownership is unchanged'
);

select dblink_exec(
  'eligibility_setup',
  $$ delete from public.listings where id = 'f3170000-0000-4000-8000-000000000001'::uuid $$
);
select dblink_exec(
  'eligibility_setup',
  $$ delete from private.sellers where id = 'f3170000-0000-4000-8000-000000000010'::uuid $$
);
select dblink_disconnect('eligibility_b');
select dblink_disconnect('eligibility_a');
select dblink_disconnect('eligibility_setup');

select * from finish();
rollback;
