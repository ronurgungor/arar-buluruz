-- Mandatory architecture-freeze closure.
-- Internal/repository architecture only. This migration does not activate production, real data,
-- external supply, EIDS provider calls, KYC, payments, chat, monetization or public external offers.

create table private.seller_role_assessments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references private.sellers (id) on delete cascade,
  assessed_role text not null,
  assessment_basis text not null,
  assessed_at timestamptz not null default now(),
  review_state text not null default 'current',
  reassess_after timestamptz,
  policy_version text not null,
  decision_origin text not null,
  evidence jsonb not null default '{}'::jsonb,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),

  constraint seller_role_assessed_role_check
    check (assessed_role in ('unknown', 'private_occasional', 'professional', 'regulated_business')),
  constraint seller_role_review_state_check
    check (review_state in ('current', 'reassessment_due', 'superseded')),
  constraint seller_role_origin_check
    check (decision_origin in ('system', 'operator')),
  constraint seller_role_basis_check
    check (assessment_basis = btrim(assessment_basis) and char_length(assessment_basis) between 1 and 1000),
  constraint seller_role_policy_version_check
    check (policy_version = btrim(policy_version) and char_length(policy_version) between 1 and 64),
  constraint seller_role_evidence_shape_check
    check (jsonb_typeof(evidence) = 'object' and octet_length(evidence::text) <= 16384),
  constraint seller_role_reassess_order_check
    check (reassess_after is null or reassess_after >= assessed_at),
  constraint seller_role_superseded_state_check
    check ((review_state = 'superseded') = (superseded_at is not null))
);

create unique index seller_role_one_current_idx
  on private.seller_role_assessments (seller_id)
  where review_state <> 'superseded';

comment on table private.seller_role_assessments is
  'Seller-role policy assessments separate from the persistent pseudonymous seller ownership principal. No company identity, tax number or KYC data is stored here.';

alter table private.seller_role_assessments enable row level security;
revoke all on table private.seller_role_assessments from public, anon, authenticated;
grant select, insert, update, delete on table private.seller_role_assessments to service_role;

create table private.listing_policy_decisions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  policy_scope text not null,
  decision_basis text not null,
  policy_version text not null,
  evaluated_at timestamptz not null default now(),
  decision_origin text not null,
  evidence_provenance text,
  evidence jsonb not null default '{}'::jsonb,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),

  constraint listing_policy_scope_check
    check (policy_scope in ('ordinary', 'eids_vehicle', 'eids_real_estate', 'review_required', 'restricted')),
  constraint listing_policy_basis_check
    check (decision_basis = btrim(decision_basis) and char_length(decision_basis) between 1 and 1000),
  constraint listing_policy_version_check
    check (policy_version = btrim(policy_version) and char_length(policy_version) between 1 and 64),
  constraint listing_policy_origin_check
    check (decision_origin in ('system', 'operator')),
  constraint listing_policy_evidence_provenance_check
    check (
      evidence_provenance is null
      or (
        evidence_provenance = btrim(evidence_provenance)
        and char_length(evidence_provenance) between 1 and 200
      )
    ),
  constraint listing_policy_evidence_shape_check
    check (jsonb_typeof(evidence) = 'object' and octet_length(evidence::text) <= 16384),
  constraint listing_policy_superseded_order_check
    check (superseded_at is null or superseded_at >= evaluated_at)
);

create unique index listing_policy_one_current_idx
  on private.listing_policy_decisions (listing_id)
  where superseded_at is null;

comment on table private.listing_policy_decisions is
  'Server-owned legal/product policy scope. Seller-selected category remains product metadata and cannot itself grant publication permission.';

alter table private.listing_policy_decisions enable row level security;
revoke all on table private.listing_policy_decisions from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_policy_decisions to service_role;

create table private.listing_publication_controls (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  lifecycle_state text not null,
  eligibility_state text not null,
  enforcement_state text not null default 'clear',
  contact_state text not null,
  contact_state_reason text,
  policy_version text not null,
  updated_at timestamptz not null default now(),

  constraint listing_control_lifecycle_check
    check (lifecycle_state in ('draft', 'active', 'sold', 'withdrawn', 'expired', 'deleted')),
  constraint listing_control_eligibility_check
    check (eligibility_state in ('eligible', 'review_required', 'regulated_verification_required', 'blocked')),
  constraint listing_control_enforcement_check
    check (enforcement_state in ('clear', 'held', 'removed')),
  constraint listing_control_contact_check
    check (contact_state in ('available', 'suppressed')),
  constraint listing_control_policy_version_check
    check (policy_version = btrim(policy_version) and char_length(policy_version) between 1 and 64),
  constraint listing_control_contact_reason_check
    check (
      contact_state_reason is null
      or (
        contact_state_reason = btrim(contact_state_reason)
        and char_length(contact_state_reason) between 1 and 500
      )
    )
);

comment on table private.listing_publication_controls is
  'Orthogonal listing lifecycle, publication eligibility, enforcement and contact-availability axes. public.listings.status is retained as legacy/current workflow state during migration.';

alter table private.listing_publication_controls enable row level security;
revoke all on table private.listing_publication_controls from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_publication_controls to service_role;

create table private.listing_enforcement_cases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reason_type text not null,
  reason_detail text not null,
  received_at timestamptz not null default now(),
  deadline_at timestamptz,
  decision_action text not null default 'none',
  action_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  audit_metadata jsonb not null default '{}'::jsonb,
  appeal_state text not null default 'none',
  restored_at timestamptz,
  created_origin text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listing_enforcement_reason_type_check
    check (reason_type in ('legal_notice', 'policy_violation', 'complaint', 'operator_review', 'other')),
  constraint listing_enforcement_reason_detail_check
    check (reason_detail = btrim(reason_detail) and char_length(reason_detail) between 1 and 2000),
  constraint listing_enforcement_deadline_check
    check (deadline_at is null or deadline_at >= received_at),
  constraint listing_enforcement_action_check
    check (decision_action in ('none', 'hold', 'remove', 'suppress_contact', 'restore')),
  constraint listing_enforcement_action_time_check
    check ((decision_action = 'none' and action_at is null) or (decision_action <> 'none' and action_at is not null)),
  constraint listing_enforcement_evidence_shape_check
    check (jsonb_typeof(evidence) = 'object' and octet_length(evidence::text) <= 32768),
  constraint listing_enforcement_audit_shape_check
    check (jsonb_typeof(audit_metadata) = 'object' and octet_length(audit_metadata::text) <= 32768),
  constraint listing_enforcement_appeal_check
    check (appeal_state in ('none', 'requested', 'under_review', 'upheld', 'restored')),
  constraint listing_enforcement_restore_check
    check (restored_at is null or restored_at >= received_at),
  constraint listing_enforcement_origin_check
    check (created_origin in ('system', 'operator', 'legal_notice'))
);

create index listing_enforcement_cases_listing_idx
  on private.listing_enforcement_cases (listing_id, received_at desc, id);

comment on table private.listing_enforcement_cases is
  'Durable legal/operator notice and enforcement case record. Public capability propagation is fail-closed and does not change listing ownership.';

alter table private.listing_enforcement_cases enable row level security;
revoke all on table private.listing_enforcement_cases from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_enforcement_cases to service_role;

create function private.classify_listing_policy_scope(
  p_category text,
  p_product_type text
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_category = 'vehicle' and (p_product_type is null or p_product_type = 'automobile')
      then 'eids_vehicle'
    when p_category = 'real-estate' and (p_product_type is null or p_product_type = 'housing')
      then 'eids_real_estate'
    when p_category = 'other' and p_product_type is null
      then 'review_required'
    else 'ordinary'
  end
$$;

revoke all on function private.classify_listing_policy_scope(text, text)
  from public, anon, authenticated;
grant execute on function private.classify_listing_policy_scope(text, text) to service_role;

create function private.default_listing_eligibility_for_scope(p_scope text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_scope = 'ordinary' then 'eligible'
    when p_scope in ('eids_vehicle', 'eids_real_estate') then 'regulated_verification_required'
    when p_scope = 'review_required' then 'review_required'
    else 'blocked'
  end
$$;

revoke all on function private.default_listing_eligibility_for_scope(text)
  from public, anon, authenticated;
grant execute on function private.default_listing_eligibility_for_scope(text) to service_role;

create function private.lifecycle_from_legacy_listing_status(
  p_status text,
  p_expires_at timestamptz
)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when p_status = 'published' and p_expires_at is not null and p_expires_at <= now() then 'expired'
    when p_status = 'published' then 'active'
    when p_status = 'sold' then 'sold'
    when p_status = 'unpublished' then 'withdrawn'
    else 'draft'
  end
$$;

revoke all on function private.lifecycle_from_legacy_listing_status(text, timestamptz)
  from public, anon, authenticated;
grant execute on function private.lifecycle_from_legacy_listing_status(text, timestamptz) to service_role;

insert into private.listing_policy_decisions (
  listing_id,
  policy_scope,
  decision_basis,
  policy_version,
  evaluated_at,
  decision_origin,
  evidence_provenance
)
select
  l.id,
  private.classify_listing_policy_scope(l.category, l.product_type),
  'Deterministic structured category/product-type architecture-freeze backfill',
  'architecture-freeze-v1',
  now(),
  'system',
  'public.listings.category+product_type'
from public.listings as l;

insert into private.listing_publication_controls (
  listing_id,
  lifecycle_state,
  eligibility_state,
  enforcement_state,
  contact_state,
  contact_state_reason,
  policy_version,
  updated_at
)
select
  l.id,
  private.lifecycle_from_legacy_listing_status(l.status, l.expires_at),
  private.default_listing_eligibility_for_scope(
    private.classify_listing_policy_scope(l.category, l.product_type)
  ),
  'clear',
  case
    when l.contact_channel is not null
      and l.contact_e164 is not null
      and l.publication_instruction_at is not null
      then 'available'
    else 'suppressed'
  end,
  case
    when l.contact_channel is not null
      and l.contact_e164 is not null
      and l.publication_instruction_at is not null
      then null
    else 'system_missing_publication_contact'
  end,
  'architecture-freeze-v1',
  now()
from public.listings as l;

create function private.initialize_listing_architecture_freeze()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
begin
  v_scope := private.classify_listing_policy_scope(new.category, new.product_type);

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
    'Deterministic structured category/product-type classification',
    'architecture-freeze-v1',
    'system',
    'public.listings.category+product_type'
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
    'architecture-freeze-v1'
  );
  return new;
end;
$$;

revoke all on function private.initialize_listing_architecture_freeze()
  from public, anon, authenticated;
grant execute on function private.initialize_listing_architecture_freeze() to service_role;

create trigger listings_initialize_architecture_freeze
after insert on public.listings
for each row
execute function private.initialize_listing_architecture_freeze();

create function private.sync_listing_architecture_freeze()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
begin
  if row(new.category, new.product_type) is distinct from row(old.category, old.product_type) then
    update private.listing_policy_decisions
    set superseded_at = now()
    where listing_id = new.id
      and superseded_at is null;

    v_scope := private.classify_listing_policy_scope(new.category, new.product_type);
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
      'Deterministic reclassification after structured product metadata change',
      'architecture-freeze-v1',
      'system',
      'public.listings.category+product_type'
    );

    update private.listing_publication_controls
    set
      eligibility_state = private.default_listing_eligibility_for_scope(v_scope),
      policy_version = 'architecture-freeze-v1',
      updated_at = now()
    where listing_id = new.id;
  end if;

  if row(new.status, new.expires_at) is distinct from row(old.status, old.expires_at) then
    update private.listing_publication_controls
    set
      lifecycle_state = private.lifecycle_from_legacy_listing_status(new.status, new.expires_at),
      updated_at = now()
    where listing_id = new.id;
  end if;

  if row(new.contact_channel, new.contact_e164, new.publication_instruction_at)
    is distinct from
    row(old.contact_channel, old.contact_e164, old.publication_instruction_at)
  then
    update private.listing_publication_controls
    set
      contact_state = case
        when new.contact_channel is not null
          and new.contact_e164 is not null
          and new.publication_instruction_at is not null
          then 'available'
        else 'suppressed'
      end,
      contact_state_reason = case
        when new.contact_channel is not null
          and new.contact_e164 is not null
          and new.publication_instruction_at is not null
          then null
        else 'system_missing_publication_contact'
      end,
      updated_at = now()
    where listing_id = new.id
      and (contact_state_reason is null or contact_state_reason = 'system_missing_publication_contact');
  end if;

  return new;
end;
$$;

revoke all on function private.sync_listing_architecture_freeze()
  from public, anon, authenticated;
grant execute on function private.sync_listing_architecture_freeze() to service_role;

create trigger listings_sync_architecture_freeze
after update of category, product_type, status, expires_at, contact_channel, contact_e164, publication_instruction_at
on public.listings
for each row
execute function private.sync_listing_architecture_freeze();

create function private.propagate_listing_enforcement_case()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.decision_action = 'hold' then
    update private.listing_publication_controls
    set enforcement_state = 'held', updated_at = now()
    where listing_id = new.listing_id;
  elsif new.decision_action = 'remove' then
    update private.listing_publication_controls
    set
      enforcement_state = 'removed',
      contact_state = 'suppressed',
      contact_state_reason = 'enforcement_case:' || new.id::text,
      updated_at = now()
    where listing_id = new.listing_id;
  elsif new.decision_action = 'suppress_contact' then
    update private.listing_publication_controls
    set
      contact_state = 'suppressed',
      contact_state_reason = 'enforcement_case:' || new.id::text,
      updated_at = now()
    where listing_id = new.listing_id;
  elsif new.decision_action = 'restore' and new.appeal_state = 'restored' then
    update private.listing_publication_controls
    set
      enforcement_state = 'clear',
      contact_state = case
        when exists (
          select 1
          from public.listings as l
          where l.id = new.listing_id
            and l.contact_channel is not null
            and l.contact_e164 is not null
            and l.publication_instruction_at is not null
        ) then 'available'
        else 'suppressed'
      end,
      contact_state_reason = case
        when exists (
          select 1
          from public.listings as l
          where l.id = new.listing_id
            and l.contact_channel is not null
            and l.contact_e164 is not null
            and l.publication_instruction_at is not null
        ) then null
        else 'system_missing_publication_contact'
      end,
      updated_at = now()
    where listing_id = new.listing_id;
  end if;
  return new;
end;
$$;

revoke all on function private.propagate_listing_enforcement_case()
  from public, anon, authenticated;
grant execute on function private.propagate_listing_enforcement_case() to service_role;

create trigger listing_enforcement_case_propagation
after insert or update of decision_action, action_at, appeal_state, restored_at
on private.listing_enforcement_cases
for each row
execute function private.propagate_listing_enforcement_case();

create function public.listing_has_public_capability(
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
      -- Conservative migration bridge: public.listings still carries contact columns, so an
      -- explicit contact suppression removes every public row-level surface until a later
      -- separately approved public projection can safely decouple detail from contact fields.
      when not contact_ready then false
      when p_capability in ('search_index', 'detail', 'signed_photo', 'public_contact', 'external_cta')
        then true
      else false
    end,
    false
  )
  from derived
$$;

comment on function public.listing_has_public_capability(uuid, text) is
  'Single fail-closed public capability decision seam. Supported capabilities: search_index, detail, signed_photo, public_contact, external_cta.';

revoke all on function public.listing_has_public_capability(uuid, text) from public;
grant execute on function public.listing_has_public_capability(uuid, text)
  to anon, authenticated, service_role;

-- Route existing anonymous listing visibility through the canonical capability seam.
drop policy if exists "Public can read active published listings" on public.listings;
create policy "Public can read capability-approved listings"
on public.listings
for select
to anon
using (public.listing_has_public_capability(id, 'detail'));

-- Reuse the working private-Storage path and only replace its listing-visibility predicate.
create or replace function public.is_deliverable_listing_photo_path(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.listing_photos as p
    where p.object_path = p_object_path
      and p.mime_type = 'image/webp'
      and p.byte_size between 1 and 8388608
      and p.object_path = ('listings/' || p.listing_id::text || '/' || p.id::text || '.webp')
      and public.listing_has_public_capability(p.listing_id, 'signed_photo')
  )
$$;

create or replace function public.get_public_listing_photos(p_listing_id uuid)
returns table (
  photo_id uuid,
  object_path text,
  mime_type text,
  byte_size bigint,
  sort_order smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.object_path, p.mime_type, p.byte_size, p.sort_order
  from private.listing_photos as p
  where p.listing_id = p_listing_id
    and public.listing_has_public_capability(p_listing_id, 'signed_photo')
    and p.mime_type = 'image/webp'
    and p.byte_size between 1 and 8388608
    and p.object_path = ('listings/' || p_listing_id::text || '/' || p.id::text || '.webp')
  order by p.sort_order, p.id
$$;

revoke all on function public.is_deliverable_listing_photo_path(text) from public;
grant execute on function public.is_deliverable_listing_photo_path(text)
  to anon, authenticated, service_role;
revoke all on function public.get_public_listing_photos(uuid) from public;
grant execute on function public.get_public_listing_photos(uuid)
  to anon, authenticated, service_role;
