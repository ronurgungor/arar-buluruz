-- External Supply Phase 3.0 internal architectural seam.
-- Repository/local/synthetic preparation only. This migration does not authorize or activate
-- public external results, real merchant ingestion, crawling, external images, monetization,
-- payments, orders, reservations, commission, chat, production infrastructure or real data.

create table private.external_sources (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  canonical_domain text not null unique,
  source_mode text not null,
  eligibility_class text not null,
  eligibility_state text not null,
  target_country text not null default 'TR',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_sources_display_name_check
    check (display_name = btrim(display_name) and char_length(display_name) between 2 and 120),
  constraint external_sources_canonical_domain_check
    check (
      canonical_domain = lower(btrim(canonical_domain))
      and canonical_domain ~ '^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$'
      and canonical_domain !~ '\.\.'
    ),
  constraint external_sources_source_mode_check
    check (source_mode in ('synthetic_fixture', 'professional_merchant')),
  constraint external_sources_eligibility_class_check
    check (eligibility_class in ('synthetic', 'a', 'b', 'c')),
  constraint external_sources_eligibility_state_check
    check (
      eligibility_state in (
        'synthetic_only',
        'pending_review',
        'cleared',
        'permission_required',
        'excluded',
        'opted_out',
        'takedown'
      )
    ),
  constraint external_sources_synthetic_state_check
    check (
      (
        source_mode = 'synthetic_fixture'
        and eligibility_class = 'synthetic'
        and eligibility_state = 'synthetic_only'
        and canonical_domain ~ '\.invalid$'
      )
      or (
        source_mode = 'professional_merchant'
        and eligibility_class in ('a', 'b', 'c')
        and eligibility_state <> 'synthetic_only'
      )
    ),
  constraint external_sources_target_country_check
    check (target_country = 'TR'),
  constraint external_sources_updated_at_check
    check (updated_at >= created_at),
  constraint external_sources_reviewed_at_check
    check (reviewed_at is null or reviewed_at >= created_at)
);

comment on table private.external_sources is
  'Domain-level external source registry. Phase 3.0 permits offer ingestion only from synthetic_fixture sources; public/real merchant launch remains closed.';
comment on column private.external_sources.eligibility_class is
  'Recorded source-review class (synthetic/A/B/C). robots.txt allow or schema.org markup is not legal permission and does not set this value automatically.';
comment on column private.external_sources.eligibility_state is
  'Domain-level review/permission state. An LLM must not make the final eligibility decision.';

alter table private.external_sources enable row level security;
revoke all on table private.external_sources from public, anon, authenticated;
grant select, insert, update, delete on table private.external_sources to service_role;

create table private.external_offers (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null
    references private.external_sources (id)
    on delete restrict,
  source_offer_key text not null,
  canonical_url text not null,
  title text not null,
  category text not null,
  product_type text,
  product_attributes_version smallint,
  product_attributes jsonb not null default '{}'::jsonb,
  search_terms text[] not null default '{}'::text[],
  item_condition text not null,
  provenance text not null,
  structured_confidence text not null,
  price_amount numeric(12, 2) not null,
  price_currency text not null,
  price_observed_at timestamptz not null,
  price_valid_until timestamptz not null,
  availability_state text not null,
  availability_observed_at timestamptz not null,
  listing_province text,
  listing_district text,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  last_checked_at timestamptz not null,
  fresh_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint external_offers_source_offer_key_check
    check (
      source_offer_key = btrim(source_offer_key)
      and char_length(source_offer_key) between 1 and 160
    ),
  constraint external_offers_canonical_url_check
    check (
      canonical_url = btrim(canonical_url)
      and char_length(canonical_url) between 10 and 2048
      and canonical_url ~ '^https://[^[:space:]]+$'
    ),
  constraint external_offers_title_check
    check (title = btrim(title) and char_length(title) between 3 and 120),
  constraint external_offers_category_check
    check (category in ('electronics', 'home', 'fashion', 'hobby-sports', 'baby-kids', 'other')),
  constraint external_offers_category_product_type_check
    check (
      product_type is null
      or (category = 'electronics' and product_type in ('phone', 'phone-accessory'))
      or (category = 'home' and product_type = 'wardrobe')
      or (category = 'fashion' and product_type = 'shoes')
      or (category = 'hobby-sports' and product_type in ('bicycle', 'bicycle-part'))
    ),
  constraint external_offers_product_attributes_shape_check
    check (
      jsonb_typeof(product_attributes) = 'object'
      and octet_length(product_attributes::text) <= 8192
    ),
  constraint external_offers_product_attributes_version_check
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
    ),
  constraint external_offers_condition_check
    check (item_condition = 'new'),
  constraint external_offers_provenance_check
    check (provenance = 'external_source_extracted'),
  constraint external_offers_structured_confidence_check
    check (structured_confidence in ('deterministic', 'insufficient')),
  constraint external_offers_low_confidence_hard_filter_check
    check (
      structured_confidence <> 'insufficient'
      or (
        product_type is null
        and product_attributes_version is null
        and product_attributes = '{}'::jsonb
      )
    ),
  constraint external_offers_search_terms_count_check
    check (cardinality(search_terms) <= 40),
  constraint external_offers_search_terms_empty_check
    check (array_position(search_terms, '') is null),
  constraint external_offers_price_truth_check
    check (price_amount > 0 and price_currency = 'TRY'),
  constraint external_offers_price_observation_check
    check (price_valid_until > price_observed_at),
  constraint external_offers_availability_state_check
    check (availability_state in ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
  constraint external_offers_location_pair_check
    check ((listing_province is null) = (listing_district is null)),
  constraint external_offers_location_semantics_check
    check (
      listing_province is null
      or (
        listing_province = btrim(listing_province)
        and listing_district = btrim(listing_district)
        and char_length(listing_province) between 2 and 64
        and char_length(listing_district) between 2 and 64
      )
    ),
  constraint external_offers_seen_order_check
    check (first_seen_at <= last_seen_at and last_seen_at <= last_checked_at),
  constraint external_offers_price_seen_order_check
    check (price_observed_at >= first_seen_at and price_observed_at <= last_checked_at),
  constraint external_offers_availability_seen_order_check
    check (availability_observed_at >= first_seen_at and availability_observed_at <= last_checked_at),
  constraint external_offers_freshness_window_check
    check (fresh_until > last_checked_at),
  constraint external_offers_updated_at_check
    check (updated_at >= created_at),
  unique (source_id, source_offer_key)
);

comment on table private.external_offers is
  'System-owned external product observations. They are not Arar Buluruz seller listings and have no seller ownership/session/recovery lifecycle.';
comment on column private.external_offers.item_condition is
  'Phase 3.0 requires explicit deterministic evidence of new condition. No inferred/default new state is permitted.';
comment on column private.external_offers.listing_province is
  'Only a genuine listing-location semantic may populate this field. Merchant headquarters or Türkiye-wide delivery must not be mapped here.';
comment on column private.external_offers.listing_district is
  'Only a genuine listing-location semantic may populate this field. Merchant headquarters or delivery scope must not be mapped here.';
comment on column private.external_offers.price_valid_until is
  'After this timestamp the stored observation is historical only and must not be treated as current price truth.';
comment on column private.external_offers.fresh_until is
  'Observation freshness expiry. Expiry is computed at read time rather than stored as a mutable truth label.';

create index external_offers_source_seen_idx
  on private.external_offers (source_id, last_checked_at desc, id);
create index external_offers_product_scope_idx
  on private.external_offers (category, product_type, price_amount, last_checked_at desc, id);

alter table private.external_offers enable row level security;
revoke all on table private.external_offers from public, anon, authenticated;
grant select, insert, update, delete on table private.external_offers to service_role;

create function private.enforce_phase3_synthetic_external_offer_source()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_domain text;
begin
  select s.canonical_domain
  into v_domain
  from private.external_sources as s
  where s.id = new.source_id
    and s.source_mode = 'synthetic_fixture'
    and s.eligibility_class = 'synthetic'
    and s.eligibility_state = 'synthetic_only'
    and s.canonical_domain ~ '\.invalid$';

  if v_domain is null then
    raise exception 'Phase 3.0 external offer ingestion is synthetic-only';
  end if;

  if new.canonical_url <> 'https://' || v_domain
    and new.canonical_url not like 'https://' || v_domain || '/%'
  then
    raise exception 'external offer canonical URL must remain on the approved synthetic source domain';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_phase3_synthetic_external_offer_source()
  from public, anon, authenticated;
grant execute on function private.enforce_phase3_synthetic_external_offer_source()
  to service_role;

create trigger external_offers_enforce_phase3_source
before insert or update of source_id, canonical_url on private.external_offers
for each row
execute function private.enforce_phase3_synthetic_external_offer_source();

-- The projection is internal and deliberately narrow. It unifies only Product Finding facts;
-- ownership/publication/contact semantics remain in their original domains.
create view private.product_finding_search_candidates_v1
with (security_invoker = true)
as
select
  'native_listing'::text as record_kind,
  l.id as record_id,
  l.title,
  l.description,
  l.search_keywords as search_terms,
  l.category,
  l.product_type,
  l.product_attributes_version,
  l.product_attributes,
  case when l.item_condition is null then 'unknown' else 'used' end::text as item_condition,
  l.price_amount as current_price_amount,
  'TRY'::text as current_price_currency,
  l.province as listing_province,
  l.district as listing_district,
  null::uuid as external_source_id,
  'Arar Buluruz'::text as source_name,
  'native_current'::text as freshness_state,
  'native_seller_declared'::text as provenance,
  'seller_declared'::text as structured_confidence,
  l.created_at as first_seen_at,
  l.updated_at as last_seen_at,
  l.updated_at as last_checked_at
from public.listings as l
where l.status = 'published'
  and l.published_at <= now()
  and l.expires_at > now()

union all

select
  'external_offer'::text as record_kind,
  o.id as record_id,
  o.title,
  ''::text as description,
  o.search_terms,
  o.category,
  o.product_type,
  o.product_attributes_version,
  o.product_attributes,
  o.item_condition,
  case
    when o.fresh_until > now()
      and o.price_valid_until > now()
      and o.availability_state = 'in_stock'
    then o.price_amount
    else null::numeric
  end as current_price_amount,
  case
    when o.fresh_until > now()
      and o.price_valid_until > now()
      and o.availability_state = 'in_stock'
    then o.price_currency
    else null::text
  end as current_price_currency,
  o.listing_province,
  o.listing_district,
  s.id as external_source_id,
  s.display_name as source_name,
  case
    when o.fresh_until > now() and o.last_checked_at <= now() then 'fresh'
    else 'stale'
  end::text as freshness_state,
  o.provenance,
  o.structured_confidence,
  o.first_seen_at,
  o.last_seen_at,
  o.last_checked_at
from private.external_offers as o
join private.external_sources as s on s.id = o.source_id
where s.source_mode = 'synthetic_fixture'
  and s.eligibility_class = 'synthetic'
  and s.eligibility_state = 'synthetic_only';

comment on view private.product_finding_search_candidates_v1 is
  'Internal native/external Product Finding candidate seam. External rows remain synthetic-only in Phase 3.0 and stale/unavailable price observations project as NULL current price.';

revoke all on table private.product_finding_search_candidates_v1 from public, anon, authenticated;
grant select on table private.product_finding_search_candidates_v1 to service_role;
