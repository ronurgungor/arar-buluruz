-- Narrow compatibility bridge for historical founder-operated rows and canonical synthetic fixtures.
-- New self-service `other` + NULL product_type listings remain review_required. Only legacy rows that
-- carry both superseded declaration timestamps and have no seller-owner principal are grandfathered
-- as ordinary so the architecture freeze does not retroactively hide already-valid legacy content.

update private.listing_policy_decisions as d
set
  policy_scope = 'ordinary',
  decision_basis = 'Grandfathered legacy founder-operated publication with superseded declaration evidence',
  policy_version = 'architecture-freeze-v1-legacy-bridge',
  evidence_provenance = 'legacy_declarations_without_owner_principal'
from public.listings as l
where d.listing_id = l.id
  and d.superseded_at is null
  and d.policy_scope = 'review_required'
  and l.category = 'other'
  and l.product_type is null
  and l.owner_user_id is null
  and l.private_seller_declaration_at is not null
  and l.content_rights_declaration_at is not null;

update private.listing_publication_controls as c
set
  eligibility_state = 'eligible',
  policy_version = 'architecture-freeze-v1-legacy-bridge',
  updated_at = now()
from public.listings as l
join private.listing_policy_decisions as d
  on d.listing_id = l.id
  and d.superseded_at is null
where c.listing_id = l.id
  and d.policy_scope = 'ordinary'
  and d.evidence_provenance = 'legacy_declarations_without_owner_principal';

create or replace function private.initialize_listing_architecture_freeze()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
  v_basis text;
  v_policy_version text;
  v_evidence_provenance text;
begin
  if new.category = 'other'
    and new.product_type is null
    and new.owner_user_id is null
    and new.private_seller_declaration_at is not null
    and new.content_rights_declaration_at is not null
  then
    v_scope := 'ordinary';
    v_basis := 'Grandfathered legacy founder-operated publication with superseded declaration evidence';
    v_policy_version := 'architecture-freeze-v1-legacy-bridge';
    v_evidence_provenance := 'legacy_declarations_without_owner_principal';
  else
    v_scope := private.classify_listing_policy_scope(new.category, new.product_type);
    v_basis := 'Deterministic structured category/product-type classification';
    v_policy_version := 'architecture-freeze-v1';
    v_evidence_provenance := 'public.listings.category+product_type';
  end if;

  insert into private.listing_policy_decisions (
    listing_id,
    policy_scope,
    decision_basis,
    policy_version,
    decision_origin,
    evidence_provenance
  ) values (
    new.id,
    v_scope,
    v_basis,
    v_policy_version,
    'system',
    v_evidence_provenance
  );

  insert into private.listing_publication_controls (
    listing_id,
    lifecycle_state,
    eligibility_state,
    enforcement_state,
    contact_state,
    contact_state_reason,
    policy_version
  ) values (
    new.id,
    private.lifecycle_from_legacy_listing_status(new.status, new.expires_at),
    private.default_listing_eligibility_for_scope(v_scope),
    'clear',
    case
      when new.contact_channel is not null
        and new.contact_e164 is not null
        and new.publication_instruction_at is not null
        then 'available'
      else 'suppressed'
    end,
    case
      when new.contact_channel is not null
        and new.contact_e164 is not null
        and new.publication_instruction_at is not null
        then null
      else 'system_missing_publication_contact'
    end,
    v_policy_version
  );
  return new;
end;
$$;

revoke all on function private.initialize_listing_architecture_freeze()
  from public, anon, authenticated;
grant execute on function private.initialize_listing_architecture_freeze() to service_role;

-- Preserve the historical policy identifier because database evidence and operations already pin it;
-- only its predicate changes to delegate the decision to the canonical capability seam.
drop policy if exists "Public can read capability-approved listings" on public.listings;
drop policy if exists "Public can read active published listings" on public.listings;
create policy "Public can read active published listings"
on public.listings
for select
to anon
using (public.listing_has_public_capability(id, 'detail'));

-- The historical Storage-signing helper remains retired from anonymous use. It is kept for trusted
-- server-side lifecycle probes only; public photo manifest delivery stays on the dedicated manifest RPC.
revoke all on function public.is_deliverable_listing_photo_path(text)
  from public, anon, authenticated;
grant execute on function public.is_deliverable_listing_photo_path(text) to service_role;
