-- Public seller-contact contract preparation only.
-- Synthetic/local/CI only. This migration does not authorize real personal data or production activation.

-- The earlier private contact table represented a rejected resolver-oriented model.
-- No real data exists, so remove that duplicate source before defining the intentional-public model.
drop table private.listing_contacts;
drop function private.set_private_updated_at();

alter table public.listings
  add column contact_channel text,
  add column contact_e164 text,
  add column contact_verified_at timestamptz,
  add column contact_verification_method text,
  add column contact_publication_instruction_at timestamptz;

alter table public.listings
  add constraint listings_contact_channel_check
    check (contact_channel is null or contact_channel in ('whatsapp', 'phone')),
  add constraint listings_contact_e164_check
    check (contact_e164 is null or contact_e164 ~ '^[+][1-9][0-9]{7,14}$'),
  add constraint listings_contact_e164_trimmed_check
    check (contact_e164 is null or contact_e164 = btrim(contact_e164)),
  add constraint listings_contact_pair_check
    check ((contact_channel is null) = (contact_e164 is null)),
  add constraint listings_contact_verification_pair_check
    check ((contact_verified_at is null) = (contact_verification_method is null)),
  add constraint listings_contact_verification_requires_contact_check
    check (contact_verified_at is null or contact_e164 is not null),
  add constraint listings_contact_verification_method_check
    check (
      contact_verification_method is null
      or (contact_channel = 'whatsapp' and contact_verification_method = 'whatsapp_same_number')
      or (contact_channel = 'phone' and contact_verification_method = 'phone_manual_callback')
    ),
  add constraint listings_contact_publication_instruction_check
    check (
      contact_publication_instruction_at is null
      or (
        contact_verified_at is not null
        and contact_publication_instruction_at >= contact_verified_at
      )
    ),
  add constraint listings_published_contact_readiness_check
    check (
      status <> 'published'
      or contact_e164 is null
      or (
        contact_verified_at is not null
        and contact_verification_method is not null
        and contact_publication_instruction_at is not null
      )
    );

comment on column public.listings.contact_channel is
  'Intentional public contact channel for an active published listing: whatsapp or phone.';
comment on column public.listings.contact_e164 is
  'Single authoritative seller contact value. Synthetic-only until the separate real-data activation gate.';
comment on column public.listings.contact_verified_at is
  'Operational timestamp proving present control of the selected contact; not identity or item-ownership proof.';
comment on column public.listings.contact_verification_method is
  'Operational verification method: whatsapp_same_number or phone_manual_callback.';
comment on column public.listings.contact_publication_instruction_at is
  'Operational record that the seller instructed publication of this contact. This field is not itself a legal-basis or explicit-consent conclusion.';

-- The application intentionally omits contact from collection-card queries, but that omission is not a security boundary.
-- Anonymous callers may request these two columns for rows already admitted by the active-listing RLS policy.
grant select (contact_channel, contact_e164) on table public.listings to anon;

-- Keep one lifecycle gate for all public listing data, including contact.
drop policy "Public can read active published listings" on public.listings;
create policy "Public can read active published listings"
on public.listings
for select
to anon
using (
  status = 'published'
  and published_at <= now()
  and expires_at > now()
  and unpublished_at is null
);

create function public.reset_listing_contact_readiness_on_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(new.contact_channel, new.contact_e164)
      is distinct from
     row(old.contact_channel, old.contact_e164) then
    if old.status = 'published' then
      raise exception using
        errcode = '23514',
        message = 'unpublish listing before changing public seller contact';
    end if;

    new.contact_verified_at = null;
    new.contact_verification_method = null;
    new.contact_publication_instruction_at = null;
  end if;

  return new;
end;
$$;

revoke all on function public.reset_listing_contact_readiness_on_change()
  from public, anon, authenticated;
grant execute on function public.reset_listing_contact_readiness_on_change() to service_role;

create trigger listings_reset_contact_readiness
before update of contact_channel, contact_e164 on public.listings
for each row
execute function public.reset_listing_contact_readiness_on_change();
