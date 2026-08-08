-- Real Corlu pilot backend preparation only.
-- This migration does not activate the public application backend or create real user data.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter table public.listings
  drop constraint listings_status_check;

alter table public.listings
  add constraint listings_status_check
  check (status in ('draft', 'pending', 'published', 'unpublished', 'rejected'));

alter table public.listings
  drop constraint listings_status_dates_check;

alter table public.listings
  add constraint listings_status_dates_check
  check (
    (
      status in ('draft', 'pending', 'rejected')
      and published_at is null
      and expires_at is null
      and unpublished_at is null
    )
    or (
      status = 'published'
      and published_at is not null
      and expires_at is not null
      and unpublished_at is null
    )
    or (
      status = 'unpublished'
      and published_at is not null
      and expires_at is not null
      and unpublished_at is not null
    )
  );

alter table public.listings
  add constraint listings_corlu_pilot_location_check
  check (province = 'Tekirdağ' and district = 'Çorlu');

comment on constraint listings_corlu_pilot_location_check on public.listings is
  'Temporary real-pilot scope lock. A later founder-approved expansion migration must replace this with broader catalog validation.';

create function public.normalize_corlu_pilot_location()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Preserve compatibility with pre-existing synthetic Gate 1 fixtures while storing
  -- the canonical Turkish location spelling used by the application catalog.
  if new.province = 'Tekirdag' then
    new.province = 'Tekirdağ';
  end if;
  if new.district = 'Corlu' then
    new.district = 'Çorlu';
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_corlu_pilot_location()
  from public, anon, authenticated;
grant execute on function public.normalize_corlu_pilot_location() to service_role;

create trigger listings_normalize_corlu_pilot_location
before insert or update of province, district on public.listings
for each row
execute function public.normalize_corlu_pilot_location();

grant select, insert, update, delete on table public.listings to service_role;

create table private.listing_contacts (
  listing_id uuid primary key
    references public.listings (id)
    on delete cascade,
  preferred_channel text not null,
  contact_e164 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listing_contacts_preferred_channel_check
    check (preferred_channel in ('phone', 'whatsapp')),
  constraint listing_contacts_e164_check
    check (contact_e164 ~ '^[+][1-9][0-9]{7,14}$'),
  constraint listing_contacts_e164_trimmed_check
    check (contact_e164 = btrim(contact_e164))
);

comment on table private.listing_contacts is
  'Private pilot contact data. Never expose this schema through the anonymous Data API.';
comment on column private.listing_contacts.contact_e164 is
  'Synthetic-only until the separate privacy/KVKK activation gate approves real personal data.';

alter table private.listing_contacts enable row level security;
revoke all on table private.listing_contacts from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_contacts to service_role;

create table private.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null
    references public.listings (id)
    on delete cascade,
  object_path text not null unique,
  mime_type text not null,
  byte_size bigint not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),

  constraint listing_photos_mime_type_check
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint listing_photos_byte_size_check
    check (byte_size between 1 and 8388608),
  constraint listing_photos_sort_order_check
    check (sort_order >= 0),
  constraint listing_photos_path_check
    check (
      object_path =
        'listings/' || listing_id::text || '/' || id::text ||
        case mime_type
          when 'image/jpeg' then '.jpg'
          when 'image/png' then '.png'
          when 'image/webp' then '.webp'
        end
    ),
  constraint listing_photos_listing_sort_order_key
    unique (listing_id, sort_order)
);

comment on table private.listing_photos is
  'Private Storage metadata. Original user filenames are discarded; only controlled listing-owned object paths are stored.';

create index listing_photos_listing_id_idx
  on private.listing_photos (listing_id, sort_order);

alter table private.listing_photos enable row level security;
revoke all on table private.listing_photos from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_photos to service_role;

create table private.listing_external_sales_links (
  listing_id uuid primary key
    references public.listings (id)
    on delete cascade,
  canonical_url text not null,
  canonical_host text not null,
  provider_key text,
  url_security_classification text not null,
  ownership_status text not null default 'not_checked',
  listing_match_status text not null default 'not_checked',
  moderation_status text not null default 'pending',
  complaint_status text not null default 'clear',
  public_cta_decision text not null default 'block_public_cta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listing_external_sales_links_url_length_check
    check (char_length(canonical_url) between 9 and 2048),
  constraint listing_external_sales_links_https_check
    check (canonical_url ~ '^https://'),
  constraint listing_external_sales_links_host_check
    check (
      canonical_host = lower(btrim(canonical_host))
      and char_length(canonical_host) between 3 and 253
      and canonical_host ~ '^[a-z0-9.-]+$'
    ),
  constraint listing_external_sales_links_provider_key_check
    check (
      provider_key is null
      or (
        provider_key = lower(btrim(provider_key))
        and char_length(provider_key) between 2 and 64
        and provider_key ~ '^[a-z0-9_-]+$'
      )
    ),
  constraint listing_external_sales_links_security_classification_check
    check (
      url_security_classification in (
        'KNOWN_PROVIDER_CANDIDATE',
        'CUSTOM_DOMAIN_REQUIRES_REVIEW'
      )
    ),
  constraint listing_external_sales_links_ownership_status_check
    check (ownership_status in ('not_checked', 'pending', 'confirmed', 'failed')),
  constraint listing_external_sales_links_listing_match_status_check
    check (listing_match_status in ('not_checked', 'pending', 'matched', 'mismatch')),
  constraint listing_external_sales_links_moderation_status_check
    check (moderation_status in ('pending', 'approved', 'rejected')),
  constraint listing_external_sales_links_complaint_status_check
    check (complaint_status in ('clear', 'open', 'restricted')),
  constraint listing_external_sales_links_public_cta_decision_check
    check (public_cta_decision in ('block_public_cta', 'allow_public_cta')),
  constraint listing_external_sales_links_shopier_identity_check
    check (
      provider_key is distinct from 'shopier'
      or canonical_host = 'shopier.com'
    )
);

comment on table private.listing_external_sales_links is
  'Provider-neutral external sales review state. Pending or blocked links are never directly exposed to anon.';
comment on column private.listing_external_sales_links.public_cta_decision is
  'Explicit operator control: block_public_cta or allow_public_cta. This is only one input to fail-closed CTA eligibility.';

create index listing_external_sales_links_canonical_url_idx
  on private.listing_external_sales_links (canonical_url);

alter table private.listing_external_sales_links enable row level security;
revoke all on table private.listing_external_sales_links from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_external_sales_links to service_role;

create function private.set_private_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_private_updated_at() from public, anon, authenticated;
grant execute on function private.set_private_updated_at() to service_role;

create trigger listing_contacts_set_updated_at
before update on private.listing_contacts
for each row
execute function private.set_private_updated_at();

create function private.reset_external_sales_review_on_identity_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if row(
      new.canonical_url,
      new.canonical_host,
      new.provider_key,
      new.url_security_classification
    ) is distinct from row(
      old.canonical_url,
      old.canonical_host,
      old.provider_key,
      old.url_security_classification
    ) then
      new.ownership_status = 'not_checked';
      new.listing_match_status = 'not_checked';
      new.moderation_status = 'pending';
      new.complaint_status = 'clear';
      new.public_cta_decision = 'block_public_cta';
    end if;
  end if;

  -- Defense in depth: a complaint/review downgrade must never leave the CTA switch open.
  if not (
    new.ownership_status = 'confirmed'
    and new.listing_match_status = 'matched'
    and new.moderation_status = 'approved'
    and new.complaint_status = 'clear'
  ) then
    new.public_cta_decision = 'block_public_cta';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.reset_external_sales_review_on_identity_change()
  from public, anon, authenticated;
grant execute on function private.reset_external_sales_review_on_identity_change()
  to service_role;

create trigger listing_external_sales_links_reset_review
before insert or update on private.listing_external_sales_links
for each row
execute function private.reset_external_sales_review_on_identity_change();
