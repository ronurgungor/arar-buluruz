-- Near-final general-classifieds contract.
-- Synthetic/local/CI scope only: this migration does not activate production, real data or paid services.

-- Geographic rollout is operational. Product data accepts normal Türkiye province/district values,
-- which are validated by the application against the vendored 81-province/973-district catalog.
alter table public.listings
  drop constraint if exists listings_corlu_pilot_location_check;

drop trigger if exists listings_normalize_corlu_pilot_location on public.listings;
drop function if exists public.normalize_corlu_pilot_location();

comment on table public.listings is
  'General classified listings. Public visibility remains lifecycle-gated by RLS.';

-- Keep a deliberately broad taxonomy without silent defaults for new writes.
update public.listings
set category = 'hobby-sports'
where category in ('hobby', 'sports');

alter table public.listings
  drop constraint if exists listings_category_check,
  add constraint listings_category_check
    check (
      category in (
        'vehicle',
        'real-estate',
        'electronics',
        'home',
        'fashion',
        'hobby-sports',
        'baby-kids',
        'other'
      )
    ),
  alter column category drop default,
  alter column item_condition drop default;

comment on column public.listings.category is
  'Broad general-classifieds category metadata; no category-specific field tree is introduced.';
comment on column public.listings.item_condition is
  'Seller-selected item condition; application UI requires an explicit selection.';

-- Sold is a seller-controlled terminal public-lifecycle state.
alter table public.listings
  add column sold_at timestamptz;

alter table public.listings
  drop constraint listings_status_check,
  drop constraint listings_status_dates_check,
  add constraint listings_status_check
    check (status in ('draft', 'pending', 'published', 'unpublished', 'rejected', 'sold')),
  add constraint listings_sold_order_check
    check (sold_at is null or (published_at is not null and sold_at >= published_at)),
  add constraint listings_status_dates_check
    check (
      (
        status in ('draft', 'pending', 'rejected')
        and published_at is null
        and expires_at is null
        and unpublished_at is null
        and sold_at is null
      )
      or (
        status = 'published'
        and published_at is not null
        and expires_at is not null
        and unpublished_at is null
        and sold_at is null
      )
      or (
        status = 'unpublished'
        and published_at is not null
        and expires_at is not null
        and unpublished_at is not null
        and sold_at is null
      )
      or (
        status = 'sold'
        and published_at is not null
        and expires_at is not null
        and unpublished_at is not null
        and sold_at is not null
      )
    );

comment on column public.listings.sold_at is
  'Seller-controlled sold timestamp. Sold listings are outside the anonymous published lifecycle.';

-- A contact-preference change does not change ownership of the verified phone number.
-- A phone-number change still resets verification/publication evidence and fails closed.
create or replace function public.fail_closed_listing_contact_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  contact_identity_changed boolean;
begin
  contact_identity_changed := new.contact_e164 is distinct from old.contact_e164;

  if contact_identity_changed then
    new.contact_verified_at := null;
    new.contact_verification_method := null;
    new.publication_instruction_at := null;
  end if;

  if old.status = 'published'
    and (
      contact_identity_changed
      or new.contact_verified_at is null
      or new.contact_verification_method is null
      or new.publication_instruction_at is null
    )
  then
    new.status := 'unpublished';
    new.unpublished_at := coalesce(new.unpublished_at, now());
  end if;

  return new;
end;
$$;

revoke all on function public.fail_closed_listing_contact_change()
  from public, anon, authenticated;
grant execute on function public.fail_closed_listing_contact_change() to service_role;

-- Finalize idempotency and publication in one database transaction.
-- A pending row cannot become public until all declaration/contact evidence and at least one
-- trusted photo metadata row exist. Failure leaves the listing pending so application
-- compensation can remove all persistent state.
create function public.complete_and_publish_listing_submission(
  p_key_hash text,
  p_listing_id uuid,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid idempotency key hash';
  end if;

  if p_expires_at <= v_now or p_expires_at > v_now + interval '90 days' then
    raise exception 'invalid listing expiry';
  end if;

  if not exists (
    select 1
    from private.listing_submission_keys as k
    where k.key_hash = p_key_hash
      and k.listing_id = p_listing_id
      and k.completed_at is null
  ) then
    return false;
  end if;

  if not exists (
    select 1
    from public.listings as l
    where l.id = p_listing_id
      and l.status = 'pending'
      and l.contact_channel in ('phone', 'whatsapp', 'phone_whatsapp')
      and l.contact_e164 is not null
      and l.contact_verified_at is not null
      and l.contact_verification_method is not null
      and l.publication_instruction_at is not null
      and l.private_seller_declaration_at is not null
      and l.content_rights_declaration_at is not null
      and exists (
        select 1
        from private.listing_photos as p
        where p.listing_id = l.id
      )
  ) then
    raise exception 'listing is not publish-ready';
  end if;

  update public.listings
  set
    status = 'published',
    published_at = v_now,
    expires_at = p_expires_at,
    unpublished_at = null,
    sold_at = null
  where id = p_listing_id
    and status = 'pending';

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'listing publication did not update exactly one row';
  end if;

  update private.listing_submission_keys
  set completed_at = v_now
  where key_hash = p_key_hash
    and listing_id = p_listing_id
    and completed_at is null;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'idempotency completion did not update exactly one row';
  end if;

  return true;
end;
$$;

revoke all on function public.complete_and_publish_listing_submission(text, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.complete_and_publish_listing_submission(text, uuid, timestamptz)
  to service_role;
