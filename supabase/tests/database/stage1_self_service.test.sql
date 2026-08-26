begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_column('public', 'listings', 'category', 'Stage-1 category exists');
select has_column('public', 'listings', 'item_condition', 'Stage-1 condition exists');
select has_column('public', 'listings', 'price_is_free', 'explicit free-price state exists');
select has_table('private', 'listing_submission_keys', 'server-only idempotency table exists');

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

insert into public.listings (
  id, title, description, price_amount, price_is_free, category, item_condition,
  province, district, seller_display_name, contact_channel, contact_e164,
  contact_verified_at, contact_verification_method, publication_instruction_at,
  private_seller_declaration_at, content_rights_declaration_at, status
)
values (
  '96000000-0000-4000-8000-000000000001',
  'Stage 1 self-service pending fixture',
  'Synthetic pending listing created by the constrained application-server contract.',
  0, true, 'home', 'good', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
  'phone_whatsapp', '+12025550188', now() - interval '2 minutes', 'one_time_code',
  now() - interval '1 minute', now() - interval '1 minute', now() - interval '1 minute',
  'pending'
);

set local role anon;
select is(
  (select count(*)::integer from public.listings where id = '96000000-0000-4000-8000-000000000001'),
  0,
  'pending self-service listing is not publicly readable'
);
reset role;

update public.listings
set status = 'published', published_at = now(), expires_at = now() + interval '30 days'
where id = '96000000-0000-4000-8000-000000000001';

set local role anon;
select results_eq(
  $$ select contact_channel, contact_e164 from public.listings where id = '96000000-0000-4000-8000-000000000001' $$,
  $$ values ('phone_whatsapp'::text, '+12025550188'::text) $$,
  'published self-service listing exposes the selected phone+WhatsApp contact contract'
);
reset role;

insert into public.listings (
  id, title, description, price_amount, price_is_free, category, item_condition,
  province, district, seller_display_name, contact_channel, contact_e164,
  contact_verified_at, contact_verification_method, publication_instruction_at,
  private_seller_declaration_at, content_rights_declaration_at, status
)
values
  (
    '96000000-0000-4000-8000-000000000002',
    'Missing private seller declaration',
    'Synthetic pending listing missing the private-seller declaration.',
    10, false, 'home', 'good', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
    'phone', '+12025550189', now() - interval '2 minutes', 'one_time_code',
    now() - interval '1 minute', null, now() - interval '1 minute', 'pending'
  ),
  (
    '96000000-0000-4000-8000-000000000003',
    'Missing content rights declaration',
    'Synthetic pending listing missing the content-rights declaration.',
    10, false, 'home', 'good', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
    'phone_whatsapp', '+12025550190', now() - interval '2 minutes', 'one_time_code',
    now() - interval '1 minute', now() - interval '1 minute', null, 'pending'
  );

select throws_like(
  $$
    update public.listings
    set status = 'published', published_at = now(), expires_at = now() + interval '1 day'
    where id = '96000000-0000-4000-8000-000000000002'
  $$,
  '%listings_published_stage1_declarations_ready_check%',
  'raw publish rejects missing private-seller declaration'
);

select throws_like(
  $$
    update public.listings
    set status = 'published', published_at = now(), expires_at = now() + interval '1 day'
    where id = '96000000-0000-4000-8000-000000000003'
  $$,
  '%listings_published_stage1_declarations_ready_check%',
  'raw publish rejects missing content-rights declaration'
);

select is(
  (select status from public.listings where id = '96000000-0000-4000-8000-000000000002'),
  'pending',
  'failed raw publish leaves missing-declaration listing pending'
);

set local role anon;
select is(
  (
    select count(*)::integer
    from public.get_public_listing_photos('96000000-0000-4000-8000-000000000002')
  ),
  0,
  'pending self-service photo manifest remains anonymous-invisible'
);
reset role;

select * from finish();
rollback;
