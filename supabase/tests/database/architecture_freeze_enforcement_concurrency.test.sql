begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set search_path = extensions, public;
select no_plan();

select is(
  dblink_connect(
    'astra_setup',
    'host=supabase_db_arar-buluruz-gate1 port=5432 dbname=postgres user=postgres password=postgres'
  ),
  'OK',
  'Astra setup connection uses an independent password-authenticated database session'
);
select is(
  dblink_connect(
    'astra_a',
    'host=supabase_db_arar-buluruz-gate1 port=5432 dbname=postgres user=postgres password=postgres'
  ),
  'OK',
  'transaction A has an independent password-authenticated database session'
);
select is(
  dblink_connect(
    'astra_b',
    'host=supabase_db_arar-buluruz-gate1 port=5432 dbname=postgres user=postgres password=postgres'
  ),
  'OK',
  'transaction B has an independent password-authenticated database session'
);

select dblink_exec(
  'astra_setup',
  $$ delete from public.listings where id = 'f3160000-0000-4000-8000-000000000001'::uuid $$
);

select dblink_exec(
  'astra_setup',
  $$
    insert into public.listings (
      id, title, description, price_amount, category, province, district,
      seller_display_name, contact_channel, contact_e164, publication_instruction_at,
      listing_rules_version, listing_rules_accepted_at,
      status, published_at, expires_at
    ) values (
      'f3160000-0000-4000-8000-000000000001'::uuid,
      'Astra enforcement concurrency fixture',
      'Synthetic two-session serialization regression.',
      1,
      'electronics',
      'Tekirdağ',
      'Çorlu',
      'Synthetic Seller',
      'phone_whatsapp',
      '+12025550316',
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
  'astra_setup',
  $$
    insert into private.listing_external_sales_links (
      listing_id, canonical_url, canonical_host, provider_key, url_security_classification,
      ownership_status, listing_match_status, moderation_status, complaint_status,
      public_cta_decision
    ) values (
      'f3160000-0000-4000-8000-000000000001'::uuid,
      'https://shopier.com/astra-enforcement-concurrency-fixture',
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

select dblink_exec(
  'astra_setup',
  $$
    insert into private.listing_enforcement_cases (
      id, listing_id, reason_type, reason_detail, decision_action, action_at, created_origin
    ) values (
      'f3160000-0000-4000-8000-000000000101'::uuid,
      'f3160000-0000-4000-8000-000000000001'::uuid,
      'operator_review',
      'Astra existing remove A',
      'remove',
      now(),
      'operator'
    )
  $$
);

select results_eq(
  $$
    select enforcement_state, contact_state
    from private.listing_publication_controls
    where listing_id = 'f3160000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('removed'::text, 'suppressed'::text) $$,
  'fixture begins with remove A enforced'
);

select is(
  dblink_send_query(
    'astra_a',
    $$
      with inserted as (
        insert into private.listing_enforcement_cases (
          id, listing_id, reason_type, reason_detail, decision_action, action_at, created_origin
        ) values (
          'f3160000-0000-4000-8000-000000000102'::uuid,
          'f3160000-0000-4000-8000-000000000001'::uuid,
          'operator_review',
          'Astra concurrent unresolved remove B',
          'remove',
          now(),
          'operator'
        )
        returning 1
      ), waited as (
        select pg_sleep(5) from inserted
      )
      select 1::integer as completed from waited
    $$
  ),
  1,
  'transaction A asynchronously inserts unresolved remove B and keeps its transaction open'
);

select pg_sleep(1);

select is(
  dblink_send_query(
    'astra_b',
    $$
      update private.listing_enforcement_cases
      set appeal_state = 'restored', restored_at = now(), updated_at = now()
      where id = 'f3160000-0000-4000-8000-000000000101'::uuid
      returning 1::integer as completed
    $$
  ),
  1,
  'transaction B asynchronously restores A while A holds the per-listing serialization lock'
);

select is(
  (select completed from dblink_get_result('astra_a') as r(completed integer)),
  1,
  'transaction A commits unresolved remove B'
);
select is(
  (select completed from dblink_get_result('astra_b') as r(completed integer)),
  1,
  'transaction B completes after recomputing from the post-A committed state'
);

select results_eq(
  $$
    select
      c.enforcement_state,
      c.contact_state,
      exists (
        select 1
        from private.listing_enforcement_cases e
        where e.id = 'f3160000-0000-4000-8000-000000000102'::uuid
          and e.decision_action = 'remove'
          and e.restored_at is null
          and e.appeal_state <> 'restored'
      ) as unresolved_b,
      public.listing_has_public_capability(c.listing_id, 'search_index'),
      public.listing_has_public_capability(c.listing_id, 'detail'),
      public.listing_has_public_capability(c.listing_id, 'signed_photo'),
      public.listing_has_public_capability(c.listing_id, 'public_contact'),
      public.listing_has_public_capability(c.listing_id, 'external_cta')
    from private.listing_publication_controls c
    where c.listing_id = 'f3160000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('removed'::text, 'suppressed'::text, true, false, false, false, false, false) $$,
  'after both commits unresolved remove B remains authoritative and every public capability stays false'
);

select dblink_exec(
  'astra_setup',
  $$ delete from public.listings where id = 'f3160000-0000-4000-8000-000000000001'::uuid $$
);
select dblink_disconnect('astra_b');
select dblink_disconnect('astra_a');
select dblink_disconnect('astra_setup');

select * from finish();
rollback;
