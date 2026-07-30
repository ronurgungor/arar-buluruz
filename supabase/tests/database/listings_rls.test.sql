begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(22);

select has_table(
  'public',
  'listings',
  'listings table exists'
);

select columns_are(
  'public',
  'listings',
  array[
    'id',
    'title',
    'description',
    'price_amount',
    'province',
    'district',
    'seller_display_name',
    'search_keywords',
    'status',
    'created_at',
    'updated_at',
    'published_at',
    'expires_at',
    'unpublished_at'
  ],
  'listings has only the approved Gate 1 columns'
);

select ok(
  (
    select c.relrowsecurity
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'listings'
  ),
  'RLS is enabled on listings'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname = 'Public can read active published listings'
      and cmd = 'SELECT'
      and roles = array['anon']::name[]
  ),
  1,
  'exactly one anonymous SELECT policy exists'
);

select ok(
  has_column_privilege('anon', 'public.listings', 'id', 'SELECT'),
  'anon can select approved public columns'
);

select ok(
  not has_column_privilege('anon', 'public.listings', 'status', 'SELECT'),
  'anon cannot select internal status'
);

select ok(
  not has_column_privilege('anon', 'public.listings', 'expires_at', 'SELECT'),
  'anon cannot select internal expiry metadata'
);

select ok(
  not has_table_privilege('anon', 'public.listings', 'INSERT'),
  'anon has no INSERT grant'
);

select ok(
  not has_table_privilege('anon', 'public.listings', 'UPDATE'),
  'anon has no UPDATE grant'
);

select ok(
  not has_table_privilege('anon', 'public.listings', 'DELETE'),
  'anon has no DELETE grant'
);

insert into public.listings (
  id,
  title,
  description,
  price_amount,
  province,
  district,
  seller_display_name,
  search_keywords,
  status,
  published_at,
  expires_at,
  unpublished_at
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Visible test listing',
    'This published listing must be visible to the anonymous role.',
    100,
    'Tekirdag',
    'Corlu',
    'Test Seller',
    array['visible'],
    'published',
    now() - interval '1 day',
    now() + interval '1 day',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Draft test listing',
    'This draft listing must remain hidden from the anonymous role.',
    200,
    'Tekirdag',
    'Corlu',
    'Test Seller',
    array['draft'],
    'draft',
    null,
    null,
    null
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Unpublished test listing',
    'This unpublished listing must remain hidden from the anonymous role.',
    300,
    'Tekirdag',
    'Corlu',
    'Test Seller',
    array['unpublished'],
    'unpublished',
    now() - interval '10 days',
    now() + interval '10 days',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'Future test listing',
    'This future-published listing must remain hidden from the anonymous role.',
    400,
    'Tekirdag',
    'Corlu',
    'Test Seller',
    array['future'],
    'published',
    now() + interval '1 day',
    now() + interval '10 days',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'Expired test listing',
    'This expired listing must remain hidden from the anonymous role.',
    500,
    'Tekirdag',
    'Corlu',
    'Test Seller',
    array['expired'],
    'published',
    now() - interval '10 days',
    now() - interval '1 day',
    null
  );

set local role anon;

select results_eq(
  $$
    select title
    from public.listings
    order by title
  $$,
  $$ values ('Visible test listing'::text) $$,
  'anon sees only published, already-published and unexpired rows'
);

select throws_ok(
  $$
    insert into public.listings (
      title,
      description,
      price_amount,
      province,
      district,
      seller_display_name
    )
    values (
      'Anonymous insert',
      'Anonymous users must not be able to create a listing.',
      1,
      'Tekirdag',
      'Corlu',
      'Anonymous'
    )
  $$,
  'anon INSERT is denied'
);

select throws_ok(
  $$ update public.listings set title = 'Changed by anon' $$,
  'anon UPDATE is denied'
);

select throws_ok(
  $$ delete from public.listings $$,
  'anon DELETE is denied'
);

reset role;

select throws_ok(
  $$
    insert into public.listings (
      title,
      description,
      price_amount,
      province,
      district,
      seller_display_name,
      status
    )
    values (
      'Invalid status',
      'The invalid status constraint must reject this listing.',
      1,
      'Tekirdag',
      'Corlu',
      'Test Seller',
      'archived'
    )
  $$,
  'invalid status is rejected'
);

select throws_ok(
  $$
    insert into public.listings (
      title,
      description,
      price_amount,
      province,
      district,
      seller_display_name
    )
    values (
      'Negative price',
      'The price constraint must reject this listing safely.',
      -1,
      'Tekirdag',
      'Corlu',
      'Test Seller'
    )
  $$,
  'negative price is rejected'
);

select throws_ok(
  $$
    insert into public.listings (
      title,
      description,
      price_amount,
      province,
      district,
      seller_display_name,
      status,
      published_at,
      expires_at
    )
    values (
      'Invalid dates',
      'The date-order constraint must reject this listing safely.',
      1,
      'Tekirdag',
      'Corlu',
      'Test Seller',
      'published',
      now(),
      now() - interval '1 day'
    )
  $$,
  'invalid publication and expiry order is rejected'
);

select throws_ok(
  $$
    insert into public.listings (
      title,
      description,
      price_amount,
      province,
      district,
      seller_display_name
    )
    values (
      null,
      'Required fields must reject null values safely.',
      1,
      'Tekirdag',
      'Corlu',
      'Test Seller'
    )
  $$,
  'missing required field is rejected'
);

select throws_ok(
  $$
    insert into public.listings (
      title,
      description,
      price_amount,
      province,
      district,
      seller_display_name,
      status,
      published_at
    )
    values (
      'Invalid draft lifecycle',
      'Draft rows must not carry publication timestamps.',
      1,
      'Tekirdag',
      'Corlu',
      'Test Seller',
      'draft',
      now()
    )
  $$,
  'invalid status and timestamp lifecycle is rejected'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name in (
        'seller_phone',
        'phone',
        'contact_phone',
        'whatsapp_number'
      )
  ),
  0,
  'no seller phone or WhatsApp column exists'
);

select has_trigger(
  'public',
  'listings',
  'listings_set_updated_at',
  'updated_at trigger exists'
);

select has_index(
  'public',
  'listings',
  'listings_public_feed_idx',
  'public feed index exists'
);

select * from finish();
rollback;
