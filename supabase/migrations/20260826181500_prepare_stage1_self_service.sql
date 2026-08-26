-- Stage-1 self-service classifieds preparation only.
-- Synthetic/local/CI scope: this migration does not activate production, real users or paid services.

alter table public.listings
  add column category text not null default 'other',
  add column item_condition text not null default 'used',
  add column price_is_free boolean not null default false,
  add column private_seller_declaration_at timestamptz,
  add column content_rights_declaration_at timestamptz;

alter table public.listings
  add constraint listings_category_check
    check (category in ('electronics', 'home', 'fashion', 'hobby', 'sports', 'baby-kids', 'other')),
  add constraint listings_item_condition_check
    check (item_condition in ('like_new', 'good', 'used', 'needs_repair')),
  add constraint listings_free_price_check
    check (not price_is_free or price_amount = 0);

alter table public.listings
  drop constraint listings_contact_channel_check,
  add constraint listings_contact_channel_check
    check (contact_channel is null or contact_channel in ('whatsapp', 'phone', 'phone_whatsapp'));

alter table public.listings
  drop constraint listings_contact_verification_method_check,
  add constraint listings_contact_verification_method_check
  check (
    contact_verification_method is null
    or contact_verification_method = 'one_time_code'
    or (
      contact_channel = 'whatsapp'
      and contact_verification_method = 'whatsapp_same_number'
    )
    or (
      contact_channel in ('phone', 'phone_whatsapp')
      and contact_verification_method in ('manual_callback', 'founder_equivalent')
    )
  );

comment on column public.listings.category is
  'Stage-1 broad category only; no category-specific field tree is introduced.';
comment on column public.listings.item_condition is
  'Stage-1 seller-selected condition label.';
comment on column public.listings.price_is_free is
  'Explicit free-price state. When true, price_amount must be zero.';
comment on column public.listings.private_seller_declaration_at is
  'Operational timestamp for the Stage-1 private/occasional seller declaration.';
comment on column public.listings.content_rights_declaration_at is
  'Operational timestamp for seller content/photo rights and third-party-data declaration.';
comment on column public.listings.contact_channel is
  'Intentionally public contact preference for active listings: phone, whatsapp or phone_whatsapp.';

create table private.listing_submission_keys (
  key_hash text primary key,
  listing_id uuid not null unique references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint listing_submission_keys_hash_check check (key_hash ~ '^[0-9a-f]{64}$')
);

comment on table private.listing_submission_keys is
  'Server-only Stage-1 submission idempotency state. Raw browser idempotency keys are never stored.';

alter table private.listing_submission_keys enable row level security;
revoke all on table private.listing_submission_keys from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_submission_keys to service_role;

create function public.claim_listing_submission_key(p_key_hash text, p_listing_id uuid)
returns table (listing_id uuid, state text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid idempotency key hash';
  end if;

  insert into private.listing_submission_keys (key_hash, listing_id)
  values (p_key_hash, p_listing_id)
  on conflict (key_hash) do nothing;

  return query
  select
    k.listing_id,
    case
      when k.listing_id = p_listing_id and k.completed_at is null then 'claimed'
      when k.completed_at is not null then 'complete'
      else 'in_progress'
    end
  from private.listing_submission_keys as k
  where k.key_hash = p_key_hash;
end;
$$;

create function public.complete_listing_submission_key(p_key_hash text, p_listing_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update private.listing_submission_keys
  set completed_at = coalesce(completed_at, now())
  where key_hash = p_key_hash
    and listing_id = p_listing_id
  returning true
$$;

revoke all on function public.claim_listing_submission_key(text, uuid) from public, anon, authenticated;
revoke all on function public.complete_listing_submission_key(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_listing_submission_key(text, uuid) to service_role;
grant execute on function public.complete_listing_submission_key(text, uuid) to service_role;

-- Public browsers still have read-only access to active published rows only.
-- Self-service writes are mediated by the application server with a server-held privileged credential.
revoke insert, update, delete on table public.listings from anon, authenticated;
