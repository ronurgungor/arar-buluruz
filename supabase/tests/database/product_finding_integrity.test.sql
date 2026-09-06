begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_column('public', 'listings', 'product_type', 'nullable product type exists');
select has_column(
  'public',
  'listings',
  'product_attributes_version',
  'versioned product attributes marker exists'
);
select has_column('public', 'listings', 'product_attributes', 'structured product attributes exist');

select lives_ok(
  $sql$
    insert into public.listings (
      id, title, description, price_amount, price_is_free, category, product_type,
      product_attributes_version, product_attributes, province, district, seller_display_name, status
    ) values (
      '9a000000-0000-4000-8000-000000000001',
      'Synthetic automobile',
      '',
      1250000,
      false,
      'vehicle',
      'automobile',
      1,
      '{"make":"Toyota","model":"Corolla","year":2022}'::jsonb,
      'Tekirdağ',
      'Çorlu',
      'Synthetic Seller',
      'pending'
    )
  $sql$,
  'compatible product type and structured object persist'
);

select lives_ok(
  $sql$
    insert into public.listings (
      id, title, description, price_amount, price_is_free, category, product_type,
      product_attributes_version, product_attributes, province, district, seller_display_name, status
    ) values (
      '9a000000-0000-4000-8000-000000000002',
      'Legacy long-tail listing',
      '',
      0,
      true,
      'other',
      null,
      null,
      '{}'::jsonb,
      'Tekirdağ',
      'Çorlu',
      'Synthetic Seller',
      'pending'
    )
  $sql$,
  'legacy null product type remains usable'
);

select throws_ok(
  $sql$
    insert into public.listings (
      id, title, description, price_amount, price_is_free, category, product_type,
      product_attributes_version, product_attributes, province, district, seller_display_name, status
    ) values (
      '9a000000-0000-4000-8000-000000000003',
      'Mismatched product type', '', 1000, false, 'fashion', 'phone', 1, '{}'::jsonb,
      'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'
    )
  $sql$,
  '23514',
  null,
  'database rejects category/product-type mismatch'
);

select throws_ok(
  $sql$
    insert into public.listings (
      id, title, description, price_amount, price_is_free, category, product_type,
      product_attributes_version, product_attributes, province, district, seller_display_name, status
    ) values (
      '9a000000-0000-4000-8000-000000000004',
      'Versionless structured product', '', 1000, false, 'electronics', 'phone', null, '{}'::jsonb,
      'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'
    )
  $sql$,
  '23514',
  null,
  'typed product requires current attributes version'
);

select throws_ok(
  $sql$
    insert into public.listings (
      id, title, description, price_amount, price_is_free, category, product_type,
      product_attributes_version, product_attributes, province, district, seller_display_name, status
    ) values (
      '9a000000-0000-4000-8000-000000000005',
      'Legacy type with stale attributes', '', 1000, false, 'other', null, null,
      '{"stale":"value"}'::jsonb,
      'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'
    )
  $sql$,
  '23514',
  null,
  'null product type cannot retain contextual attributes'
);

select throws_ok(
  $sql$
    insert into public.listings (
      id, title, description, price_amount, price_is_free, category,
      province, district, seller_display_name, status
    ) values (
      '9a000000-0000-4000-8000-000000000006',
      'Impossible priced zero', '', 0, false, 'home',
      'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'
    )
  $sql$,
  '23514',
  null,
  'priced plus zero is rejected'
);

select throws_ok(
  $sql$
    insert into public.listings (
      id, title, description, price_amount, price_is_free, category,
      province, district, seller_display_name, status
    ) values (
      '9a000000-0000-4000-8000-000000000007',
      'Impossible free amount', '', 10, true, 'home',
      'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'
    )
  $sql$,
  '23514',
  null,
  'free listing requires zero amount'
);

select ok(
  has_column_privilege('anon', 'public.listings', 'product_type', 'SELECT'),
  'anon may read product type only through existing listing RLS'
);
select ok(
  has_column_privilege('anon', 'public.listings', 'product_attributes', 'SELECT'),
  'anon may read structured product attributes only through existing listing RLS'
);
select ok(
  not has_table_privilege('anon', 'public.listings', 'UPDATE'),
  'anonymous buyer cannot mutate structured product facts or search keywords'
);

select * from finish();
rollback;
