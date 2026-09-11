-- Mandatory architecture-freeze closure.
-- Repository/local/synthetic preparation only. This migration does not activate production,
-- real personal data, real merchant ingestion, crawling, EIDS provider calls, KYC, payments,
-- chat, monetization or any external service.

-- A. Seller ownership principal remains private.sellers. Role is a separate mutable assessment.
create table private.seller_role_assessments (
  seller_id uuid primary key references private.sellers (id) on delete cascade,
  assessed_role text not null,
  assessment_basis text not null,
  assessed_at timestamptz not null default now(),
  review_state text not null default 'current',
  reassess_after timestamptz,
  policy_version text not null,
  assessment_origin text not null,
  evidence_provenance text not null default 'none',
  updated_at timestamptz not null default now(),

  constraint seller_role_assessments_role_check
    check (assessed_role in ('unknown', 'private_occasional', 'professional', 'regulated_business')),
  constraint seller_role_assessments_review_state_check
    check (review_state in ('current', 'review_required')),
  constraint seller_role_assessments_origin_check
    check (assessment_origin in ('system', 'operator')),
  constraint seller_role_assessments_basis_check
    check (assessment_basis = btrim(assessment_basis) and char_length(assessment_basis) between 3 and 500),
  constraint seller_role_assessments_policy_version_check
    check (policy_version = btrim(policy_version) and char_length(policy_version) between 1 and 64),
  constraint seller_role_assessments_reassess_check
    check (reassess_after is null or reassess_after >= assessed_at),
  constraint seller_role_assessments_updated_at_check
    check (updated_at >= assessed_at)
);

comment on table private.seller_role_assessments is
  'Current seller-role assessment, deliberately separate from the persistent pseudonymous ownership principal and its session/recovery credentials.';
comment on column private.seller_role_assessments.assessed_role is
  'Policy role only. It is not encoded into seller UUID, session, recovery credential or public contact.';

alter table private.seller_role_assessments enable row level security;
revoke all on table private.seller_role_assessments from public, anon, authenticated;
grant select, insert, update, delete on table private.seller_role_assessments to service_role;

insert into private.seller_role_assessments (
  seller_id,
  assessed_role,
  assessment_basis,
  assessed_at,
  review_state,
  policy_version,
  assessment_origin,
  evidence_provenance
)
select
  s.id,
  'unknown',
  'Architecture-freeze bootstrap: no private/professional role is inferred from ownership or public contact.',
  now(),
  'current',
  'seller-role-v1',
  'system',
  'none'
from private.sellers as s
on conflict (seller_id) do nothing;

create function private.initialize_seller_role_assessment_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into private.seller_role_assessments (
    seller_id,
    assessed_role,
    assessment_basis,
    assessed_at,
    review_state,
    policy_version,
    assessment_origin,
    evidence_provenance
  ) values (
    new.id,
    'unknown',
    'New pseudonymous seller principal has no role assessment evidence yet.',
    now(),
    'current',
    'seller-role-v1',
    'system',
    'none'
  )
  on conflict (seller_id) do nothing;
  return new;
end;
$$;

revoke all on function private.initialize_seller_role_assessment_v1()
  from public, anon, authenticated;
grant execute on function private.initialize_seller_role_assessment_v1() to service_role;

create trigger sellers_initialize_role_assessment_v1
after insert on private.sellers
for each row
execute function private.initialize_seller_role_assessment_v1();

-- B. Seller-selected category is product metadata; legal/publication scope is server-owned.
create function private.classify_listing_policy_scope_v1(
  p_category text,
  p_product_type text,
  p_legacy_operator_evidence boolean default false
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_category = 'vehicle'
      and (p_product_type is null or p_product_type = 'automobile')
      then 'eids_vehicle'
    when p_category = 'real-estate'
      and (p_product_type is null or p_product_type = 'housing')
      then 'eids_real_estate'
    when p_category = 'other' and not p_legacy_operator_evidence
      then 'review_required'
    when p_category in (
      'vehicle', 'real-estate', 'electronics', 'home', 'fashion', 'hobby-sports', 'baby-kids', 'other'
    ) then 'ordinary'
    else 'review_required'
  end
$$;

comment on function private.classify_listing_policy_scope_v1(text, text, boolean) is
  'Deterministic architecture-freeze classifier. Broad category is evidence, not permanent publication authority; Other requires review unless preserved legacy operator evidence exists.';

revoke all on function private.classify_listing_policy_scope_v1(text, text, boolean)
  from public, anon, authenticated;
grant execute on function private.classify_listing_policy_scope_v1(text, text, boolean)
  to service_role;

create table private.listing_policy_decisions (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  policy_scope text not null,
  decision_basis text not null,
  policy_version text not null,
  evaluated_at timestamptz not null default now(),
  decision_origin text not null,
  evidence_provenance text not null,
  operator_override boolean not null default false,
  review_after timestamptz,
  updated_at timestamptz not null default now(),

  constraint listing_policy_decisions_scope_check
    check (policy_scope in ('ordinary', 'eids_vehicle', 'eids_real_estate', 'review_required', 'restricted')),
  constraint listing_policy_decisions_origin_check
    check (decision_origin in ('system', 'operator')),
  constraint listing_policy_decisions_basis_check
    check (decision_basis = btrim(decision_basis) and char_length(decision_basis) between 3 and 500),
  constraint listing_policy_decisions_policy_version_check
    check (policy_version = btrim(policy_version) and char_length(policy_version) between 1 and 64),
  constraint listing_policy_decisions_review_after_check
    check (review_after is null or review_after >= evaluated_at),
  constraint listing_policy_decisions_updated_at_check
    check (updated_at >= evaluated_at)
);

comment on table private.listing_policy_decisions is
  'Current server-owned listing legal/product policy decision. Seller category remains product metadata and cannot itself grant publication capability.';
comment on column private.listing_policy_decisions.operator_override is
  'True only for an explicit operator decision. A later structured scope change invalidates the override and fails closed to review_required.';

alter table private.listing_policy_decisions enable row level security;
revoke all on table private.listing_policy_decisions from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_policy_decisions to service_role;

-- C. Orthogonal axes coexist with legacy public.listings.status during migration.
create table private.listing_state_axes (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  lifecycle_state text not null,
  eligibility_state text not null,
  enforcement_state text not null default 'clear',
  contact_state text not null,
  state_version text not null default 'architecture-freeze-v1',
  updated_at timestamptz not null default now(),

  constraint listing_state_axes_lifecycle_check
    check (lifecycle_state in ('draft', 'active', 'sold', 'withdrawn', 'expired')),
  constraint listing_state_axes_eligibility_check
    check (eligibility_state in ('eligible', 'review_required', 'regulated_verification_required', 'blocked')),
  constraint listing_state_axes_enforcement_check
    check (enforcement_state in ('clear', 'held', 'removed')),
  constraint listing_state_axes_contact_check
    check (contact_state in ('available', 'suppressed')),
  constraint listing_state_axes_version_check
    check (state_version = 'architecture-freeze-v1')
);

comment on table private.listing_state_axes is
  'Orthogonal architecture-freeze state axes. Legacy listings.status remains the current workflow state and is not destructively rewritten.';

alter table private.listing_state_axes enable row level security;
revoke all on table private.listing_state_axes from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_state_axes to service_role;

-- Backfill current policy/state from explicit persisted facts. No seller role or legal identity is inferred.
insert into private.listing_policy_decisions (
  listing_id,
  policy_scope,
  decision_basis,
  policy_version,
  evaluated_at,
  decision_origin,
  evidence_provenance,
  operator_override
)
select
  l.id,
  private.classify_listing_policy_scope_v1(
    l.category,
    l.product_type,
    l.category = 'other'
      and l.contact_verification_method in ('whatsapp_same_number', 'manual_callback', 'founder_equivalent')
      and l.private_seller_declaration_at is not null
      and l.content_rights_declaration_at is not null
  ),
  case
    when l.category = 'other'
      and l.contact_verification_method in ('whatsapp_same_number', 'manual_callback', 'founder_equivalent')
      and l.private_seller_declaration_at is not null
      and l.content_rights_declaration_at is not null
      then 'Legacy operator evidence preserves the previously reviewed ordinary-goods path.'
    when l.category = 'other'
      then 'Broad Other metadata is insufficient to determine ordinary publication scope without review.'
    else 'Deterministic validated category/product-type facts.'
  end,
  'listing-policy-v1',
  now(),
  'system',
  case
    when l.category = 'other'
      and l.contact_verification_method in ('whatsapp_same_number', 'manual_callback', 'founder_equivalent')
      and l.private_seller_declaration_at is not null
      and l.content_rights_declaration_at is not null
      then 'legacy_operator_control_evidence'
    else 'validated_structured_listing_facts'
  end,
  false
from public.listings as l
on conflict (listing_id) do nothing;

insert into private.listing_state_axes (
  listing_id,
  lifecycle_state,
  eligibility_state,
  enforcement_state,
  contact_state
)
select
  l.id,
  case
    when l.status = 'sold' then 'sold'
    when l.status = 'published' and l.expires_at is not null and l.expires_at <= now() then 'expired'
    when l.status = 'published' then 'active'
    when l.status = 'unpublished' and l.expires_at is not null and l.expires_at <= now() then 'expired'
    when l.status in ('unpublished', 'rejected') then 'withdrawn'
    else 'draft'
  end,
  case p.policy_scope
    when 'ordinary' then 'eligible'
    when 'eids_vehicle' then 'regulated_verification_required'
    when 'eids_real_estate' then 'regulated_verification_required'
    when 'restricted' then 'blocked'
    else 'review_required'
  end,
  'clear',
  case
    when l.contact_channel is not null
      and l.contact_e164 is not null
      and l.publication_instruction_at is not null
      then 'available'
    else 'suppressed'
  end
from public.listings as l
join private.listing_policy_decisions as p on p.listing_id = l.id
on conflict (listing_id) do nothing;

create function private.sync_listing_architecture_freeze_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_policy_changed boolean := true;
  v_contact_changed boolean := true;
  v_legacy_operator_evidence boolean;
  v_scope text;
  v_existing_origin text;
  v_basis text;
  v_evidence text;
  v_eligibility text;
  v_lifecycle text;
  v_contact text;
begin
  if tg_op = 'UPDATE' then
    v_policy_changed := row(new.category, new.product_type)
      is distinct from row(old.category, old.product_type);
    v_contact_changed := row(new.contact_channel, new.contact_e164, new.publication_instruction_at)
      is distinct from row(old.contact_channel, old.contact_e164, old.publication_instruction_at);
  end if;

  v_legacy_operator_evidence :=
    new.category = 'other'
    and new.contact_verification_method in ('whatsapp_same_number', 'manual_callback', 'founder_equivalent')
    and new.private_seller_declaration_at is not null
    and new.content_rights_declaration_at is not null;

  if v_policy_changed then
    select p.decision_origin
      into v_existing_origin
    from private.listing_policy_decisions as p
    where p.listing_id = new.id;

    if tg_op = 'UPDATE' and v_existing_origin = 'operator' then
      v_scope := 'review_required';
      v_basis := 'Structured category/product-type facts changed after an operator override; re-review is required.';
      v_evidence := 'structured_fact_change_after_operator_override';
    else
      v_scope := private.classify_listing_policy_scope_v1(
        new.category,
        new.product_type,
        v_legacy_operator_evidence
      );
      v_basis := case
        when v_legacy_operator_evidence
          then 'Legacy operator evidence preserves the previously reviewed ordinary-goods path.'
        when new.category = 'other'
          then 'Broad Other metadata is insufficient to determine ordinary publication scope without review.'
        else 'Deterministic validated category/product-type facts.'
      end;
      v_evidence := case
        when v_legacy_operator_evidence then 'legacy_operator_control_evidence'
        else 'validated_structured_listing_facts'
      end;
    end if;

    insert into private.listing_policy_decisions (
      listing_id,
      policy_scope,
      decision_basis,
      policy_version,
      evaluated_at,
      decision_origin,
      evidence_provenance,
      operator_override,
      review_after,
      updated_at
    ) values (
      new.id,
      v_scope,
      v_basis,
      'listing-policy-v1',
      now(),
      'system',
      v_evidence,
      false,
      null,
      now()
    )
    on conflict (listing_id) do update set
      policy_scope = excluded.policy_scope,
      decision_basis = excluded.decision_basis,
      policy_version = excluded.policy_version,
      evaluated_at = excluded.evaluated_at,
      decision_origin = excluded.decision_origin,
      evidence_provenance = excluded.evidence_provenance,
      operator_override = excluded.operator_override,
      review_after = excluded.review_after,
      updated_at = excluded.updated_at;
  end if;

  select p.policy_scope
    into v_scope
  from private.listing_policy_decisions as p
  where p.listing_id = new.id;

  v_eligibility := case v_scope
    when 'ordinary' then 'eligible'
    when 'eids_vehicle' then 'regulated_verification_required'
    when 'eids_real_estate' then 'regulated_verification_required'
    when 'restricted' then 'blocked'
    else 'review_required'
  end;

  v_lifecycle := case
    when new.status = 'sold' then 'sold'
    when new.status = 'published' and new.expires_at is not null and new.expires_at <= now() then 'expired'
    when new.status = 'published' then 'active'
    when new.status = 'unpublished' and new.expires_at is not null and new.expires_at <= now() then 'expired'
    when new.status in ('unpublished', 'rejected') then 'withdrawn'
    else 'draft'
  end;

  v_contact := case
    when new.contact_channel is not null
      and new.contact_e164 is not null
      and new.publication_instruction_at is not null
      then 'available'
    else 'suppressed'
  end;

  insert into private.listing_state_axes (
    listing_id,
    lifecycle_state,
    eligibility_state,
    enforcement_state,
    contact_state,
    state_version,
    updated_at
  ) values (
    new.id,
    v_lifecycle,
    v_eligibility,
    'clear',
    v_contact,
    'architecture-freeze-v1',
    now()
  )
  on conflict (listing_id) do update set
    lifecycle_state = excluded.lifecycle_state,
    eligibility_state = case
      when v_policy_changed then excluded.eligibility_state
      else private.listing_state_axes.eligibility_state
    end,
    enforcement_state = private.listing_state_axes.enforcement_state,
    contact_state = case
      when v_contact_changed then excluded.contact_state
      else private.listing_state_axes.contact_state
    end,
    state_version = excluded.state_version,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function private.sync_listing_architecture_freeze_v1()
  from public, anon, authenticated;
grant execute on function private.sync_listing_architecture_freeze_v1() to service_role;

create trigger listings_sync_architecture_freeze_v1
after insert or update of
  category,
  product_type,
  status,
  published_at,
  expires_at,
  unpublished_at,
  sold_at,
  contact_channel,
  contact_e164,
  publication_instruction_at
on public.listings
for each row
execute function private.sync_listing_architecture_freeze_v1();

-- D. One derived capability contract for every public exposure decision.
create view private.listing_public_capabilities_v1
with (security_invoker = true)
as
with evaluated as (
  select
    l.id as listing_id,
    p.policy_scope,
    a.lifecycle_state,
    a.eligibility_state,
    a.enforcement_state,
    a.contact_state,
    (
      l.status = 'published'
      and l.published_at is not null
      and l.published_at <= now()
      and l.expires_at is not null
      and l.expires_at > now()
      and l.unpublished_at is null
      and a.lifecycle_state = 'active'
      and a.eligibility_state = 'eligible'
      and a.enforcement_state = 'clear'
      and p.policy_scope in ('ordinary', 'eids_vehicle', 'eids_real_estate')
      and l.publication_instruction_at is not null
      and (
        (
          l.listing_rules_version is not null
          and l.listing_rules_accepted_at is not null
        )
        or (
          l.contact_verification_method in ('whatsapp_same_number', 'manual_callback', 'founder_equivalent')
          and l.private_seller_declaration_at is not null
          and l.content_rights_declaration_at is not null
        )
      )
      and (
        l.owner_user_id is not null
        or l.listing_rules_accepted_at is not null
        or l.contact_verification_method in ('whatsapp_same_number', 'manual_callback', 'founder_equivalent')
      )
    ) as base_public,
    (
      a.contact_state = 'available'
      and l.contact_channel is not null
      and l.contact_e164 is not null
      and l.publication_instruction_at is not null
    ) as contact_ready
  from public.listings as l
  join private.listing_policy_decisions as p on p.listing_id = l.id
  join private.listing_state_axes as a on a.listing_id = l.id
)
select
  listing_id,
  policy_scope,
  lifecycle_state,
  eligibility_state,
  enforcement_state,
  contact_state,
  base_public as can_search_index,
  base_public as can_detail,
  base_public as can_signed_photo,
  (base_public and contact_ready) as can_public_contact,
  (base_public and contact_ready) as can_external_cta
from evaluated;

comment on view private.listing_public_capabilities_v1 is
  'Single derived public-capability contract. Search/detail/photo/contact/CTA decisions share lifecycle, policy, eligibility and enforcement truth; contact remains independently suppressible.';

revoke all on table private.listing_public_capabilities_v1 from public, anon, authenticated;
grant select on table private.listing_public_capabilities_v1 to service_role;

create function public.listing_has_public_capability_v1(
  p_listing_id uuid,
  p_capability text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case p_capability
      when 'search_index' then c.can_search_index
      when 'detail' then c.can_detail
      when 'signed_photo' then c.can_signed_photo
      when 'public_contact' then c.can_public_contact
      when 'external_cta' then c.can_external_cta
      else false
    end
    from private.listing_public_capabilities_v1 as c
    where c.listing_id = p_listing_id
  ), false)
$$;

comment on function public.listing_has_public_capability_v1(uuid, text) is
  'Narrow public-safe boolean wrapper over the private capability contract. It exposes no private policy or enforcement metadata.';

revoke all on function public.listing_has_public_capability_v1(uuid, text) from public;
grant execute on function public.listing_has_public_capability_v1(uuid, text)
  to anon, authenticated, service_role;

-- Direct contact columns are no longer the contact authorization boundary.
revoke select (contact_channel, contact_e164) on table public.listings from anon, authenticated;

create function public.get_public_listing_contact(p_listing_id uuid)
returns table (
  contact_channel text,
  contact_e164 text
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.contact_channel, l.contact_e164
  from public.listings as l
  join private.listing_public_capabilities_v1 as c on c.listing_id = l.id
  where l.id = p_listing_id
    and c.can_public_contact
    and l.contact_channel is not null
    and l.contact_e164 is not null
  limit 1
$$;

comment on function public.get_public_listing_contact(uuid) is
  'Capability-gated public contact projection. Contact suppression does not require ownership mutation or listing-row deletion.';

revoke all on function public.get_public_listing_contact(uuid) from public;
grant execute on function public.get_public_listing_contact(uuid)
  to anon, authenticated, service_role;

-- Anonymous listing rows now use the same capability decision seam.
drop policy if exists "Public can read active published listings" on public.listings;
create policy "Public can read active published listings"
on public.listings
for select
to anon
using (public.listing_has_public_capability_v1(id, 'detail'));

-- Reuse the same capability decision for public photo manifest and server-mediated signing.
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
      and public.listing_has_public_capability_v1(p.listing_id, 'signed_photo')
      and p.mime_type = 'image/webp'
      and p.byte_size between 1 and 8388608
      and p.object_path = ('listings/' || p.listing_id::text || '/' || p.id::text || '.webp')
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
  select
    p.id as photo_id,
    p.object_path,
    p.mime_type,
    p.byte_size,
    p.sort_order
  from private.listing_photos as p
  where p.listing_id = p_listing_id
    and public.listing_has_public_capability_v1(p.listing_id, 'signed_photo')
    and p.mime_type = 'image/webp'
    and p.byte_size between 1 and 8388608
    and p.object_path = ('listings/' || p_listing_id::text || '/' || p.id::text || '.webp')
  order by p.sort_order, p.id
$$;

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
    and public.listing_has_public_capability_v1(p.listing_id, 'signed_photo')
    and p.mime_type = 'image/webp'
    and p.byte_size between 1 and 8388608
    and p.object_path = ('listings/' || p_listing_id::text || '/' || p_photo_id::text || '.webp')
  limit 1
$$;

-- E. Minimal legal/operator notice model. Actions update axes; public exposure stays derived.
create table private.listing_enforcement_cases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  case_type text not null,
  reason text not null,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  deadline_at timestamptz,
  decision_action text not null default 'pending',
  action_at timestamptz,
  evidence_metadata jsonb not null default '{}'::jsonb,
  audit_origin text not null,
  appeal_state text not null default 'none',
  restored_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint listing_enforcement_cases_type_check
    check (case_type in ('legal_notice', 'operator_action', 'policy_review')),
  constraint listing_enforcement_cases_reason_check
    check (reason = btrim(reason) and char_length(reason) between 3 and 1000),
  constraint listing_enforcement_cases_action_check
    check (decision_action in ('pending', 'hold', 'remove', 'suppress_contact', 'no_action', 'restoration_recorded')),
  constraint listing_enforcement_cases_action_time_check
    check ((decision_action = 'pending' and action_at is null) or (decision_action <> 'pending' and action_at is not null)),
  constraint listing_enforcement_cases_deadline_check
    check (deadline_at is null or deadline_at >= coalesce(received_at, created_at)),
  constraint listing_enforcement_cases_evidence_shape_check
    check (jsonb_typeof(evidence_metadata) = 'object' and octet_length(evidence_metadata::text) <= 16384),
  constraint listing_enforcement_cases_origin_check
    check (audit_origin in ('system', 'operator', 'legal_notice')),
  constraint listing_enforcement_cases_appeal_check
    check (appeal_state in ('none', 'open', 'upheld', 'restoration_approved', 'restored')),
  constraint listing_enforcement_cases_restored_check
    check (restored_at is null or action_at is not null),
  constraint listing_enforcement_cases_updated_check
    check (updated_at >= created_at)
);

comment on table private.listing_enforcement_cases is
  'Durable internal notice/enforcement case record. No moderation dashboard or public exposure is introduced.';

create index listing_enforcement_cases_listing_idx
  on private.listing_enforcement_cases (listing_id, created_at desc, id);

alter table private.listing_enforcement_cases enable row level security;
revoke all on table private.listing_enforcement_cases from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_enforcement_cases to service_role;

create function private.propagate_listing_enforcement_case_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.decision_action = 'hold' then
    update private.listing_state_axes
    set enforcement_state = 'held', updated_at = now()
    where listing_id = new.listing_id;
  elsif new.decision_action = 'remove' then
    update private.listing_state_axes
    set enforcement_state = 'removed', contact_state = 'suppressed', updated_at = now()
    where listing_id = new.listing_id;
  elsif new.decision_action = 'suppress_contact' then
    update private.listing_state_axes
    set contact_state = 'suppressed', updated_at = now()
    where listing_id = new.listing_id;
  end if;
  return new;
end;
$$;

revoke all on function private.propagate_listing_enforcement_case_v1()
  from public, anon, authenticated;
grant execute on function private.propagate_listing_enforcement_case_v1() to service_role;

create trigger listing_enforcement_cases_propagate_v1
after insert or update of decision_action, action_at on private.listing_enforcement_cases
for each row
execute function private.propagate_listing_enforcement_case_v1();

-- Defense in depth for the atomic self-service publication path: a stored server-owned policy
-- decision and orthogonal eligibility/enforcement/contact state must permit publication.
create or replace function public.complete_and_publish_listing_submission(
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
    join private.listing_policy_decisions as p on p.listing_id = l.id
    join private.listing_state_axes as a on a.listing_id = l.id
    where l.id = p_listing_id
      and l.owner_user_id is not null
      and l.status = 'pending'
      and p.policy_scope = 'ordinary'
      and a.eligibility_state = 'eligible'
      and a.enforcement_state = 'clear'
      and a.contact_state = 'available'
      and l.contact_channel = 'phone_whatsapp'
      and l.contact_e164 is not null
      and l.publication_instruction_at is not null
      and l.listing_rules_version is not null
      and l.listing_rules_accepted_at is not null
      and exists (
        select 1
        from private.listing_photos as photo
        where photo.listing_id = l.id
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
