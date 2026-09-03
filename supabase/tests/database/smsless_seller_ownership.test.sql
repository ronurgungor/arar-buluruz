begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_table('private', 'sellers', 'private pseudonymous seller table exists');
select has_table('private', 'seller_sessions', 'private revocable seller session table exists');
select has_column('public', 'listings', 'owner_user_id', 'listing owner UUID exists');

select ok(
  not has_table_privilege('anon', 'private.sellers', 'SELECT'),
  'anon cannot inspect seller identities'
);
select ok(
  not has_table_privilege('anon', 'private.seller_sessions', 'SELECT'),
  'anon cannot inspect seller sessions'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_seller_identity(uuid,text,text,text,timestamptz)',
    'EXECUTE'
  ),
  'anon cannot create seller identities'
);
select ok(
  not has_function_privilege('anon', 'public.resolve_seller_session(text)', 'EXECUTE'),
  'anon cannot resolve seller sessions'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.recover_seller_identity(text,text,text,text,text,timestamptz)',
    'EXECUTE'
  ),
  'service role may execute atomic recovery rotation'
);

select is(
  public.create_seller_identity(
    '96300000-0000-4000-8000-000000000001',
    'BBBBBBBBBBBBBBBB',
    repeat('3', 64),
    repeat('4', 64),
    now() + interval '7 days'
  ),
  '96300000-0000-4000-8000-000000000001'::uuid,
  'server can create pseudonymous seller plus initial opaque session digest'
);

select results_eq(
  $$
    select seller_id
    from public.resolve_seller_session(repeat('4', 64))
  $$,
  $$
    values ('96300000-0000-4000-8000-000000000001'::uuid)
  $$,
  'active session digest resolves to seller_id'
);

insert into public.listings (
  id, title, description, price_amount, province, district, seller_display_name,
  owner_user_id, contact_channel, contact_e164, publication_instruction_at, status
)
values (
  '96400000-0000-4000-8000-000000000001',
  'Seller ownership fixture',
  'Seller ownership fixture description',
  10,
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  '96300000-0000-4000-8000-000000000001',
  'phone_whatsapp',
  '+12025550120',
  now(),
  'pending'
);

select throws_like(
  $sql$
    update public.listings
    set owner_user_id = null
    where id = '96400000-0000-4000-8000-000000000001'
  $sql$,
  '%immutable%',
  'listing seller owner cannot be changed by update'
);

select lives_ok(
  $sql$
    update public.listings
    set
      contact_e164 = '+12025550121',
      publication_instruction_at = now()
    where id = '96400000-0000-4000-8000-000000000001'
  $sql$,
  'public phone may change when a fresh publication instruction is recorded'
);

select results_eq(
  $$
    select owner_user_id, contact_e164
    from public.listings
    where id = '96400000-0000-4000-8000-000000000001'
  $$,
  $$
    values (
      '96300000-0000-4000-8000-000000000001'::uuid,
      '+12025550121'::text
    )
  $$,
  'phone change does not transfer seller ownership'
);

select results_eq(
  $$
    select seller_id
    from public.recover_seller_identity(
      'BBBBBBBBBBBBBBBB',
      repeat('3', 64),
      'CCCCCCCCCCCCCCCC',
      repeat('5', 64),
      repeat('6', 64),
      now() + interval '7 days'
    )
  $$,
  $$
    values ('96300000-0000-4000-8000-000000000001'::uuid)
  $$,
  'valid recovery credential atomically rotates and creates a replacement session'
);

select is(
  (select count(*)::integer from public.resolve_seller_session(repeat('4', 64))),
  0,
  'recovery revokes the previous device session'
);

select is(
  (
    select count(*)::integer
    from public.recover_seller_identity(
      'BBBBBBBBBBBBBBBB',
      repeat('3', 64),
      'DDDDDDDDDDDDDDDD',
      repeat('7', 64),
      repeat('8', 64),
      now() + interval '7 days'
    )
  ),
  0,
  'consumed recovery credential cannot be replayed'
);

select results_eq(
  $$
    select seller_id
    from public.resolve_seller_session(repeat('6', 64))
  $$,
  $$
    values ('96300000-0000-4000-8000-000000000001'::uuid)
  $$,
  'replacement recovery session is active'
);

select is(
  public.revoke_seller_session(repeat('6', 64)),
  true,
  'current device session can be revoked server-side'
);
select is(
  (select count(*)::integer from public.resolve_seller_session(repeat('6', 64))),
  0,
  'revoked session no longer authorizes'
);

insert into public.listings (
  id, title, description, price_amount, province, district, seller_display_name,
  contact_channel, contact_e164, publication_instruction_at, status
)
values (
  '96400000-0000-4000-8000-000000000002',
  'Legacy public phone fixture',
  'Legacy public phone fixture description',
  10,
  'Tekirdağ',
  'Çorlu',
  'Historical Seller',
  'phone_whatsapp',
  '+12025550121',
  now(),
  'pending'
);

select is(
  (
    select owner_user_id
    from public.listings
    where id = '96400000-0000-4000-8000-000000000002'
  ),
  null::uuid,
  'phone equality never backfills historical ownership'
);

select * from finish();
rollback;
