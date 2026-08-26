begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select no_plan();

select hasnt_table(
  'private',
  'listing_contacts',
  'obsolete private listing_contacts table is removed so there is one contact source of truth'
);

select has_column('public', 'listings', 'contact_channel', 'public contact channel exists');
select has_column('public', 'listings', 'contact_e164', 'public E.164 contact value exists');
select has_column(
  'public',
  'listings',
  'contact_verified_at',
  'contact verification timestamp exists'
);
select has_column(
  'public',
  'listings',
  'contact_verification_method',
  'contact verification method exists'
);
select has_column(
  'public',
  'listings',
  'publication_instruction_at',
  'publication instruction audit timestamp exists'
);

select ok(
  has_column_privilege('anon', 'public.listings', 'contact_channel', 'SELECT'),
  'anon may select the intentional public contact channel on RLS-visible rows'
);
select ok(
  has_column_privilege('anon', 'public.listings', 'contact_e164', 'SELECT'),
  'anon may select the intentional public contact value on RLS-visible rows'
);
select ok(
  not has_column_privilege('anon', 'public.listings', 'contact_verified_at', 'SELECT'),
  'anon cannot select verification timestamp'
);
select ok(
  not has_column_privilege('anon', 'public.listings', 'contact_verification_method', 'SELECT'),
  'anon cannot select verification method'
);
select ok(
  not has_column_privilege('anon', 'public.listings', 'publication_instruction_at', 'SELECT'),
  'anon cannot select publication instruction audit fact'
);

insert into public.listings (
  id,
  title,
  description,
  price_amount,
  province,
  district,
  seller_display_name,
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
    '70000000-0000-4000-8000-000000000001',
    'Active seller contact fixture',
    'Synthetic active listing proving intentional public seller contact behavior.',
    1,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
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
    '70000000-0000-4000-8000-000000000002',
    'Draft seller contact fixture',
    'Synthetic draft listing whose contact must not be anonymously obtainable.',
    2,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    'phone',
    '+12025550124',
    now() - interval '3 hours',
    'manual_callback',
    now() - interval '2 hours',
    now() - interval '90 minutes',
    now() - interval '90 minutes',
    'draft',
    null,
    null,
    null
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    'Pending seller contact fixture',
    'Synthetic pending listing whose contact must not be anonymously obtainable.',
    3,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    'whatsapp',
    '+12025550125',
    now() - interval '3 hours',
    'whatsapp_same_number',
    now() - interval '2 hours',
    now() - interval '90 minutes',
    now() - interval '90 minutes',
    'pending',
    null,
    null,
    null
  ),
  (
    '70000000-0000-4000-8000-000000000004',
    'Rejected seller contact fixture',
    'Synthetic rejected listing whose contact must not be anonymously obtainable.',
    4,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    'phone',
    '+12025550126',
    now() - interval '3 hours',
    'founder_equivalent',
    now() - interval '2 hours',
    now() - interval '90 minutes',
    now() - interval '90 minutes',
    'rejected',
    null,
    null,
    null
  ),
  (
    '70000000-0000-4000-8000-000000000005',
    'Expired seller contact fixture',
    'Synthetic expired listing whose contact must no longer be anonymously obtainable.',
    5,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    'whatsapp',
    '+12025550127',
    now() - interval '3 days',
    'whatsapp_same_number',
    now() - interval '2 days 12 hours',
    now() - interval '2 days 11 hours',
    now() - interval '2 days 11 hours',
    'published',
    now() - interval '2 days',
    now() - interval '1 minute',
    null
  ),
  (
    '70000000-0000-4000-8000-000000000006',
    'Unpublished seller contact fixture',
    'Synthetic unpublished listing whose contact must not be anonymously obtainable.',
    6,
    'Tekirdağ',
    'Çorlu',
    'Synthetic Seller',
    'phone',
    '+12025550128',
    now() - interval '3 days',
    'manual_callback',
    now() - interval '2 days 12 hours',
    now() - interval '2 days 11 hours',
    now() - interval '2 days 11 hours',
    'unpublished',
    now() - interval '2 days',
    now() + interval '1 day',
    now() - interval '1 hour'
  );

set local role anon;

select results_eq(
  $$
    select id, contact_channel, contact_e164
    from public.listings
    where id::text like '70000000-%'
    order by id
  $$,
  $$ values (
    '70000000-0000-4000-8000-000000000001'::uuid,
    'whatsapp'::text,
    '+12025550123'::text
  ) $$,
  'anonymous bulk contact query returns only the active published listing'
);

reset role;

update public.listings
set contact_e164 = '+12025550129'
where id = '70000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    select status, contact_e164, contact_verified_at, contact_verification_method,
      publication_instruction_at, (unpublished_at is not null)
    from public.listings
    where id = '70000000-0000-4000-8000-000000000001'
  $$,
  $$ values (
    'unpublished'::text,
    '+12025550129'::text,
    null::timestamptz,
    null::text,
    null::timestamptz,
    true
  ) $$,
  'contact identity change immediately unpublishes and resets verification/publication readiness'
);

set local role anon;
select is(
  (
    select count(*)::integer
    from public.listings
    where id = '70000000-0000-4000-8000-000000000001'
  ),
  0,
  'changed contact is not anonymously obtainable before re-verification and republish'
);
reset role;

update public.listings
set
  contact_verified_at = now() - interval '2 minutes',
  contact_verification_method = 'whatsapp_same_number'
where id = '70000000-0000-4000-8000-000000000001';

update public.listings
set publication_instruction_at = now() - interval '1 minute'
where id = '70000000-0000-4000-8000-000000000001';

update public.listings
set
  status = 'published',
  published_at = now(),
  expires_at = now() + interval '1 day',
  unpublished_at = null
where id = '70000000-0000-4000-8000-000000000001';

set local role anon;
select results_eq(
  $$
    select contact_channel, contact_e164
    from public.listings
    where id = '70000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('whatsapp'::text, '+12025550129'::text) $$,
  'reverified and explicitly re-instructed contact becomes public again only after republish'
);
reset role;

update public.listings
set publication_instruction_at = null
where id = '70000000-0000-4000-8000-000000000001';

select is(
  (
    select status
    from public.listings
    where id = '70000000-0000-4000-8000-000000000001'
  ),
  'unpublished'::text,
  'withdrawing publication instruction automatically unpublishes the listing'
);

set local role anon;
select is(
  (
    select count(*)::integer
    from public.listings
    where id = '70000000-0000-4000-8000-000000000001'
  ),
  0,
  'withdrawn publication instruction removes the contact from the anonymous public contract'
);
reset role;

select throws_ok(
  $$
    update public.listings
    set
      contact_channel = 'phone',
      contact_verification_method = 'whatsapp_same_number'
    where id = '70000000-0000-4000-8000-000000000002'
  $$,
  '23514',
  null,
  'verification method must match the selected contact channel'
);

select * from finish();
rollback;
