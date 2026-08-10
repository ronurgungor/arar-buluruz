-- Real Corlu pilot seller-contact preparation only.
-- Synthetic/local/CI scope: this migration does not activate a production backend or authorize real personal data.

-- The initial pilot intentionally treats the selected seller contact as public information
-- only while the listing itself is anonymously readable. Keep one authoritative value.
drop trigger if exists listing_contacts_set_updated_at on private.listing_contacts;
drop table if exists private.listing_contacts;
drop function if exists private.set_private_updated_at();

alter table public.listings
  add column contact_channel text,
  add column contact_e164 text,
  add column contact_verified_at timestamptz,
  add column contact_verification_method text,
  add column publication_instruction_at timestamptz;

alter table public.listings
  add constraint listings_contact_channel_check
  check (contact_channel is null or contact_channel in ('whatsapp', 'phone')),
  add constraint listings_contact_e164_check
  check (contact_e164 is null or contact_e164 ~ '^[+][1-9][0-9]{7,14}$'),
  add constraint listings_contact_pair_check
  check ((contact_channel is null) = (contact_e164 is null)),
  add constraint listings_contact_verification_pair_check
  check ((contact_verified_at is null) = (contact_verification_method is null)),
  add constraint listings_contact_verification_requires_contact_check
  check (contact_verified_at is null or contact_e164 is not null),
  add constraint listings_contact_verification_method_check
  check (
    contact_verification_method is null
    or (
      contact_channel = 'whatsapp'
      and contact_verification_method = 'whatsapp_same_number'
    )
    or (
      contact_channel = 'phone'
      and contact_verification_method in ('manual_callback', 'founder_equivalent')
    )
  ),
  add constraint listings_publication_instruction_check
  check (
    publication_instruction_at is null
    or (
      contact_verified_at is not null
      and publication_instruction_at >= contact_verified_at
    )
  ),
  add constraint listings_published_contact_ready_check
  check (
    status <> 'published'
    or (
      contact_channel is not null
      and contact_e164 is not null
      and contact_verified_at is not null
      and contact_verification_method is not null
      and publication_instruction_at is not null
    )
  );

comment on column public.listings.contact_channel is
  'Exactly one intentionally public seller-contact channel for a published pilot listing: whatsapp or phone.';
comment on column public.listings.contact_e164 is
  'Single authoritative E.164 contact value. Anonymous access is limited by the listings RLS lifecycle; active contacts are intentionally public and enumerable through the Data API.';
comment on column public.listings.contact_verified_at is
  'Operational timestamp recording when present control of the contact was verified. It does not establish legal identity, item ownership or permanent number ownership.';
comment on column public.listings.contact_verification_method is
  'Operational verification method: whatsapp_same_number, manual_callback or founder_equivalent.';
comment on column public.listings.publication_instruction_at is
  'Operational audit fact that the seller instructed publication of this contact. It is not labelled as KVKK explicit consent; legal basis is a separate activation decision.';

create function public.fail_closed_listing_contact_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  contact_identity_changed boolean;
begin
  contact_identity_changed :=
    row(new.contact_channel, new.contact_e164)
    is distinct from
    row(old.contact_channel, old.contact_e164);

  if contact_identity_changed then
    new.contact_verified_at := null;
    new.contact_verification_method := null;
    new.publication_instruction_at := null;
  end if;

  -- Any contact identity change or withdrawal of verification/publication readiness
  -- while live must immediately move the listing out of the anonymous public lifecycle.
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

create trigger listings_fail_closed_contact_change
before update of
  contact_channel,
  contact_e164,
  contact_verified_at,
  contact_verification_method,
  publication_instruction_at
on public.listings
for each row
execute function public.fail_closed_listing_contact_change();

-- UI omission is not a security boundary. These two columns are intentionally obtainable
-- for rows that already pass the anonymous active-published listings RLS policy.
grant select (contact_channel, contact_e164) on table public.listings to anon;
