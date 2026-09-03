begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_column('public', 'listings', 'category', 'broad category exists');
select has_column('public', 'listings', 'item_condition', 'optional condition exists');
select has_column('public', 'listings', 'price_is_free', 'explicit free-price state exists');
select has_column('public', 'listings', 'listing_rules_version', 'versioned listing rules evidence exists');
select has_column(
  'public',
  'listings',
  'listing_rules_accepted_at',
  'listing rules acceptance timestamp exists'
);
select has_table('private', 'listing_submission_keys', 'server-only idempotency table exists');

select is(
  (
    select is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name = 'item_condition'
  ),
  'YES',
  'condition is nullable'
);

select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name = 'item_condition'
  ),
  null,
  'condition has no silent database default'
);

select lives_ok(
  $sql$
    insert into public.listings (
      id, title, description, price_amount, price_is_free, category, item_condition,
      province, district, seller_display_name, status
    ) values (
      '96000000-0000-4000-8000-000000000010',
      'Optional fields fixture',
      '',
      0,
      true,
      'home',
      null,
      'Tekirdağ',
      'Çorlu',
      'Synthetic Seller',
      'pending'
    )
  $sql$,
  'empty description and null condition are valid pending listing values'
);

select ok(
  not has_table_privilege('anon', 'public.listings', 'INSERT'),
  'anon cannot insert listings directly'
);
select ok(
  not has_table_privilege('anon', 'private.listing_submission_keys', 'SELECT'),
  'anon cannot inspect submission idempotency state'
);
select ok(
  not has_function_privilege('anon', 'public.claim_listing_submission_key(text,uuid)', 'EXECUTE'),
  'anon cannot claim privileged submission keys'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.complete_and_publish_listing_submission(text,uuid,timestamptz)',
    'EXECUTE'
  ),
  'anon cannot invoke atomic publication'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.complete_and_publish_listing_submission(text,uuid,timestamptz)',
    'EXECUTE'
  ),
  'service role may invoke constrained atomic publication'
);

insert into private.sellers (id, recovery_selector, recovery_digest)
values (
  '96200000-0000-4000-8000-000000000001',
  'AAAAAAAAAAAAAAAA',
  repeat('1', 64)
);

insert into public.listings (
  id, title, description, price_amount, price_is_free, category, item_condition,
  province, district, seller_display_name, owner_user_id, contact_channel, contact_e164,
  publication_instruction_at, listing_rules_version, listing_rules_accepted_at,
  private_seller_declaration_at, content_rights_declaration_at, status
)
values (
  '96000000-0000-4000-8000-000000000001',
  'Simplified self-service pending fixture',
  '',
  0,
  true,
  'home',
  null,
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  '96200000-0000-4000-8000-000000000001',
  'phone_whatsapp',
  '+12025550188',
  now() - interval '1 minute',
  '2026-08-28-v1',
  now() - interval '1 minute',
  null,
  null,
  'pending'
);

set local role anon;
select is(
  (
    select count(*)::integer
    from public.listings
    where id = '96000000-0000-4000-8000-000000000001'
  ),
  0,
  'pending self-service listing is not publicly readable'
);
reset role;

insert into private.listing_submission_keys (key_hash, listing_id)
values (repeat('a', 64), '96000000-0000-4000-8000-000000000001');

insert into private.listing_photos (
  id, listing_id, object_path, mime_type, byte_size, sort_order
)
values (
  '96100000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000001',
  'listings/96000000-0000-4000-8000-000000000001/96100000-0000-4000-8000-000000000001.webp',
  'image/webp',
  72,
  0
);

select is(
  public.complete_and_publish_listing_submission(
    repeat('a', 64),
    '96000000-0000-4000-8000-000000000001',
    now() + interval '30 days'
  ),
  true,
  'atomic publication accepts versioned rules evidence without fabricating legacy declarations'
);

select results_eq(
  $$
    select
      status,
      private_seller_declaration_at,
      content_rights_declaration_at,
      listing_rules_version
    from public.listings
    where id = '96000000-0000-4000-8000-000000000001'
  $$,
  $$
    values (
      'published'::text,
      null::timestamptz,
      null::timestamptz,
      '2026-08-28-v1'::text
    )
  $$,
  'published self-service row keeps obsolete checkbox evidence null'
);

select ok(
  (
    select completed_at is not null
    from private.listing_submission_keys
    where key_hash = repeat('a', 64)
  ),
  'idempotency completion commits with publication'
);

set local role anon;
select results_eq(
  $$
    select contact_channel, contact_e164
    from public.listings
    where id = '96000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('phone_whatsapp'::text, '+12025550188'::text) $$,
  'published self-service row exposes one public phone with derived dual-contact metadata'
);
reset role;

insert into public.listings (
  id, title, description, price_amount, price_is_free, category, item_condition,
  province, district, seller_display_name, owner_user_id, contact_channel, contact_e164,
  publication_instruction_at, listing_rules_version, listing_rules_accepted_at, status
)
values (
  '96000000-0000-4000-8000-000000000004',
  'No photo publication fixture',
  '',
  10,
  false,
  'vehicle',
  null,
  'İstanbul',
  'Kadıköy',
  'Synthetic Seller',
  '96200000-0000-4000-8000-000000000001',
  'phone_whatsapp',
  '+12025550191',
  now() - interval '1 minute',
  '2026-08-28-v1',
  now() - interval '1 minute',
  'pending'
);

insert into private.listing_submission_keys (key_hash, listing_id)
values (repeat('b', 64), '96000000-0000-4000-8000-000000000004');

select throws_like(
  $sql$
    select public.complete_and_publish_listing_submission(
      repeat('b', 64),
      '96000000-0000-4000-8000-000000000004',
      now() + interval '30 days'
    )
  $sql$,
  '%publish-ready%',
  'atomic publication rejects missing trusted photo metadata'
);

select is(
  (
    select status
    from public.listings
    where id = '96000000-0000-4000-8000-000000000004'
  ),
  'pending',
  'photo readiness failure leaves listing non-public'
);

insert into public.listings (
  id, title, description, price_amount, price_is_free, category, item_condition,
  province, district, seller_display_name, contact_channel, contact_e164,
  contact_verified_at, contact_verification_method, publication_instruction_at,
  status
)
values (
  '96000000-0000-4000-8000-000000000005',
  'Missing rules fixture',
  '',
  10,
  false,
  'home',
  null,
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  'phone_whatsapp',
  '+12025550192',
  now() - interval '2 minutes',
  'one_time_code',
  now() - interval '1 minute',
  'pending'
);

select throws_like(
  $sql$
    update public.listings
    set
      status = 'published',
      published_at = now(),
      expires_at = now() + interval '1 day'
    where id = '96000000-0000-4000-8000-000000000005'
  $sql$,
  '%listings_published_rules_ready_check%',
  'raw one-time-code publication without current rules evidence is rejected'
);

select is(
  (
    select status
    from public.listings
    where id = '96000000-0000-4000-8000-000000000005'
  ),
  'pending',
  'failed raw publication remains pending'
);

set local role anon;
select is(
  (
    select count(*)::integer
    from public.get_public_listing_photos('96000000-0000-4000-8000-000000000005')
  ),
  0,
  'pending photo manifest stays anonymous-invisible'
);
reset role;

select * from finish();
rollback;
