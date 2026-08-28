begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select no_plan();

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
    'unpublished_at',
    'contact_channel',
    'contact_e164',
    'contact_verified_at',
    'contact_verification_method',
    'publication_instruction_at',
    'category',
    'item_condition',
    'price_is_free',
    'private_seller_declaration_at',
    'content_rights_declaration_at',
    'sold_at',
    'listing_rules_version',
    'listing_rules_accepted_at'
  ],
  'listings has the approved classifieds, seller-contact and rules-evidence columns'
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
  has_column_privilege('anon', 'public.listings', 'contact_channel', 'SELECT'),
  'anon can select the intentional public contact channel on RLS-visible rows'
);

select ok(
  has_column_privilege('anon', 'public.listings', 'contact_e164', 'SELECT'),
  'anon can select the intentional public contact value on RLS-visible rows'
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
  not has_column_privilege('anon', 'public.listings', 'contact_verified_at', 'SELECT'),
  'anon cannot select contact verification timestamp'
);

select ok(
  not has_column_privilege('anon', 'public.listings', 'contact_verification_method', 'SELECT'),
  'anon cannot select contact verification method'
);

select ok(
  not has_column_privilege('anon', 'public.listings', 'publication_instruction_at', 'SELECT'),
  'anon cannot select publication instruction audit timestamp'
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
    '00000000-0000-4000-8000-000000000001',
    'Visible test listing',
    'This published listing must be visible to the anonymous role.',
    100,
    'Tekirdag',
    'Corlu',
    'Test Seller',
    array['visible'],
    'whatsapp',
    '+12025550123',
    now() - interval '2 days',
    'whatsapp_same_number',
    now() - interval '36 hours',
    now() - interval '35 hours',
    now() - interval '35 hours',
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
    null,
    null,
    null,
    null,
    null,
    null,
    null,
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
    'phone',
    '+12025550124',
    now() - interval '11 days',
    'manual_callback',
    now() - interval '10 days 12 hours',
    now() - interval '10 days 11 hours',
    now() - interval '10 days 11 hours',
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
    'whatsapp',
    '+12025550125',
    now() - interval '2 hours',
    'whatsapp_same_number',
    now() - interval '1 hour',
    now() - interval '30 minutes',
    now() - interval '30 minutes',
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
    'phone',
    '+12025550126',
    now() - interval '11 days',
    'manual_callback',
    now() - interval '10 days 12 hours',
    now() - interval '10 days 11 hours',
    now() - interval '10 days 11 hours',
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

select results_eq(
  $$
    select contact_channel, contact_e164
    from public.listings
    order by id
  $$,
  $$ values ('whatsapp'::text, '+12025550123'::text) $$,
  'anon can obtain the selected contact only for the active published row'
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
  '42501',
  null,
  'anon INSERT is denied'
);

select throws_ok(
  $$ update public.listings set title = 'Changed by anon' $$,
  '42501',
  null,
  'anon UPDATE is denied'
);

select throws_ok(
  $$ delete from public.listings $$,
  '42501',
  null,
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
  '23514',
  null,
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
  '23514',
  null,
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
      contact_channel,
      contact_e164,
      contact_verified_at,
      contact_verification_method,
      publication_instruction_at,
      private_seller_declaration_at,
      content_rights_declaration_at,
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
      'whatsapp',
      '+12025550127',
      now() - interval '2 hours',
      'whatsapp_same_number',
      now() - interval '1 hour',
      now() - interval '30 minutes',
      now() - interval '30 minutes',
      'published',
      now(),
      now() - interval '1 day'
    )
  $$,
  '23514',
  null,
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
  '23502',
  null,
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
  '23514',
  null,
  'invalid status and timestamp lifecycle is rejected'
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
      private_seller_declaration_at,
      content_rights_declaration_at,
      status,
      published_at,
      expires_at
    )
    values (
      'Published without contact',
      'A published pilot listing must not bypass verified public contact readiness.',
      1,
      'Tekirdag',
      'Corlu',
      'Test Seller',
      now(),
      now(),
      'published',
      now(),
      now() + interval '1 day'
    )
  $$,
  '23514',
  null,
  'published listing without verified contact and publication instruction is rejected'
);

select has_trigger(
  'public',
  'listings',
  'listings_set_updated_at',
  'updated_at trigger exists'
);

select has_trigger(
  'public',
  'listings',
  'listings_fail_closed_contact_change',
  'contact change fail-closed trigger exists'
);

select has_index(
  'public',
  'listings',
  'listings_public_feed_idx',
  'public feed index exists'
);

select * from finish();
rollback;
