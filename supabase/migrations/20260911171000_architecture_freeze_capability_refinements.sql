-- Capability refinements for the architecture-freeze seam.
-- Keep existing photo and external-sales security requirements; centralize only the listing-level
-- public eligibility decision so routes cannot drift on lifecycle/legal/enforcement/contact state.

create or replace function public.listing_has_public_capability(
  p_listing_id uuid,
  p_capability text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with facts as (
    select
      l.id,
      l.status,
      l.published_at,
      l.expires_at,
      l.unpublished_at,
      l.contact_channel,
      l.contact_e164,
      l.publication_instruction_at,
      c.lifecycle_state,
      c.eligibility_state,
      c.enforcement_state,
      c.contact_state,
      d.policy_scope
    from public.listings as l
    join private.listing_publication_controls as c on c.listing_id = l.id
    join private.listing_policy_decisions as d
      on d.listing_id = l.id
      and d.superseded_at is null
    where l.id = p_listing_id
  ), derived as (
    select
      *,
      (
        status = 'published'
        and published_at is not null
        and published_at <= now()
        and expires_at is not null
        and expires_at > now()
        and unpublished_at is null
        and publication_instruction_at is not null
      ) as publication_ready,
      (
        policy_scope not in ('review_required', 'restricted')
        and eligibility_state = 'eligible'
      ) as legal_ready,
      (
        contact_state = 'available'
        and contact_channel is not null
        and contact_e164 is not null
        and publication_instruction_at is not null
      ) as contact_ready
    from facts
  )
  select coalesce(
    case
      when p_capability not in ('search_index', 'detail', 'signed_photo', 'public_contact', 'external_cta')
        then false
      when not publication_ready
        or lifecycle_state <> 'active'
        or enforcement_state <> 'clear'
        or not legal_ready
        then false
      -- Conservative migration bridge: public.listings still carries contact columns. Contact
      -- suppression therefore removes row-level public surfaces until a future approved public
      -- projection can safely separate detail fields from contact fields.
      when not contact_ready then false
      when p_capability = 'external_cta' then exists (
        select 1
        from private.listing_external_sales_links as x
        where x.listing_id = p_listing_id
          and x.ownership_status = 'confirmed'
          and x.listing_match_status = 'matched'
          and x.moderation_status = 'approved'
          and x.complaint_status = 'clear'
          and x.public_cta_decision = 'allow_public_cta'
      )
      else true
    end,
    false
  )
  from derived
$$;

comment on function public.listing_has_public_capability(uuid, text) is
  'Canonical fail-closed listing-level public capability decision. Existing link-specific fraud/moderation facts remain additionally required for external_cta.';

revoke all on function public.listing_has_public_capability(uuid, text) from public;
grant execute on function public.listing_has_public_capability(uuid, text)
  to anon, authenticated, service_role;

create or replace function public.get_deliverable_listing_photo(
  p_listing_id uuid,
  p_photo_id uuid
)
returns table (
  listing_id uuid,
  photo_id uuid,
  object_path text,
  mime_type text,
  byte_size bigint,
  sort_order smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.listing_id,
    p.id as photo_id,
    p.object_path,
    p.mime_type,
    p.byte_size,
    p.sort_order
  from private.listing_photos as p
  where p.listing_id = p_listing_id
    and p.id = p_photo_id
    and public.listing_has_public_capability(p_listing_id, 'signed_photo')
    and p.mime_type = 'image/webp'
    and p.byte_size between 1 and 8388608
    and p.object_path = (
      'listings/' || p_listing_id::text || '/' || p_photo_id::text || '.webp'
    )
  limit 1
$$;

comment on function public.get_deliverable_listing_photo(uuid, uuid) is
  'Service-role-only trusted-photo metadata gate. Canonical WebP/path checks remain unchanged; listing visibility is delegated to the single public capability seam.';

revoke all on function public.get_deliverable_listing_photo(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_deliverable_listing_photo(uuid, uuid)
  to service_role;
