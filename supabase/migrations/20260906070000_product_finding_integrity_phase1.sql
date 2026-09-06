-- Product Finding Integrity Phase 1.
-- Domain/schema foundation only. No production activation, AI search, filter UI, EIDS provider call,
-- payment, chat, ads or monetization is introduced by this migration.

alter table public.listings
  add column product_type text,
  add column product_attributes_version smallint,
  add column product_attributes jsonb not null default '{}'::jsonb;

comment on column public.listings.product_type is
  'Optional seller-confirmed shallow product type. Null is valid for legacy and unsupported long-tail listings; values must never be guessed merely to fill the field.';
comment on column public.listings.product_attributes_version is
  'Version of the server-owned structured product-attribute schema. Version 1 is used only when product_type is non-null.';
comment on column public.listings.product_attributes is
  'Server-validated product-specific structured attributes. This is not arbitrary seller JSON and is not a generic EAV store.';

alter table public.listings
  add constraint listings_category_product_type_check
    check (
      product_type is null
      or (
        category = 'vehicle'
        and product_type in ('automobile', 'automobile-part', 'automobile-accessory')
      )
      or (category = 'real-estate' and product_type = 'housing')
      or (category = 'electronics' and product_type in ('phone', 'phone-accessory'))
      or (category = 'home' and product_type = 'wardrobe')
      or (category = 'fashion' and product_type = 'shoes')
      or (category = 'hobby-sports' and product_type in ('bicycle', 'bicycle-part'))
    ),
  add constraint listings_product_attributes_shape_check
    check (
      jsonb_typeof(product_attributes) = 'object'
      and octet_length(product_attributes::text) <= 8192
    ),
  add constraint listings_product_attributes_version_check
    check (
      (
        product_type is null
        and product_attributes_version is null
        and product_attributes = '{}'::jsonb
      )
      or (
        product_type is not null
        and product_attributes_version = 1
      )
    );

-- The old schema allowed price_is_free=false with price_amount=0, but that state did not say
-- whether an individual historical row meant "Free" or an invalid/missing priced value. Do not
-- invent semantics by bulk-converting ambiguous rows. Repository-owned synthetic fixtures audited
-- for this migration are either explicitly Free already or have a positive price, so no automatic
-- row remediation is justified here. Any unexpected ambiguous persisted row must be classified
-- explicitly before this migration may proceed.
do $$
begin
  if exists (
    select 1
    from public.listings
    where price_is_free = false
      and price_amount = 0
  ) then
    raise exception using
      errcode = '23514',
      message = 'ambiguous legacy price rows exist: classify each price_is_free=false, price_amount=0 row explicitly before applying Product Finding Integrity Phase 1';
  end if;
end;
$$;

alter table public.listings
  drop constraint if exists listings_free_price_check,
  add constraint listings_price_truth_check
    check (
      (price_is_free = true and price_amount = 0)
      or (price_is_free = false and price_amount > 0)
    );

comment on column public.listings.price_is_free is
  'Canonical price mode: true requires price_amount=0; false requires price_amount>0.';
comment on column public.listings.search_keywords is
  'System-generated non-visible search/index terms derived from validated structured data and controlled aliases. Seller request payloads do not control this field.';

-- These buyer-visible structured facts remain behind the existing active-published RLS policy.
grant select (product_type, product_attributes_version, product_attributes)
  on table public.listings to anon;

create index listings_active_product_scope_idx
  on public.listings (category, product_type, price_amount, published_at desc, id)
  where status = 'published';
