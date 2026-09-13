-- PR #89 Astra final-board targeted closure.
-- Append-only hardening only: serialize enforcement recomputation per listing and keep
-- trusted eligibility authority separate from the effective derived eligibility state.

create table private.listing_trusted_eligibility_constraints (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  eligibility_state text not null,
  decision_origin text not null,
  decision_basis text not null,
  policy_version text not null,
  updated_at timestamptz not null default now(),

  constraint listing_trusted_eligibility_state_check
    check (eligibility_state in ('eligible', 'review_required', 'regulated_verification_required', 'blocked')),
  constraint listing_trusted_eligibility_origin_check
    check (decision_origin in ('operator', 'legal_notice')),
  constraint listing_trusted_eligibility_basis_check
    check (decision_basis = btrim(decision_basis) and char_length(decision_basis) between 1 and 1000),
  constraint listing_trusted_eligibility_policy_version_check
    check (policy_version = btrim(policy_version) and char_length(policy_version) between 1 and 64)
);

comment on table private.listing_trusted_eligibility_constraints is
  'Current operator/legal eligibility input, stored separately from effective listing_publication_controls.eligibility_state so deterministic seller-metadata reassessment cannot erase trusted authority.';

alter table private.listing_trusted_eligibility_constraints enable row level security;
revoke all on table private.listing_trusted_eligibility_constraints
  from public, anon, authenticated, service_role;
grant select on table private.listing_trusted_eligibility_constraints to service_role;

-- Backfill any exact-head operator/legal effective state into the new trusted-input seam.
-- synthetic_test is intentionally excluded: it is a local test authorization, not a trusted
-- production eligibility constraint.
insert into private.listing_trusted_eligibility_constraints (
  listing_id,
  eligibility_state,
  decision_origin,
  decision_basis,
  policy_version,
  updated_at
)
select
  c.listing_id,
  c.eligibility_state,
  c.eligibility_origin,
  c.eligibility_basis,
  c.policy_version,
  c.updated_at
from private.listing_publication_controls as c
where c.eligibility_origin in ('operator', 'legal_notice')
on conflict (listing_id) do nothing;

comment on column private.listing_publication_controls.eligibility_state is
  'Effective eligibility derived fail-closed from deterministic/default eligibility plus any current trusted operator/legal eligibility constraint.';
comment on column private.listing_publication_controls.eligibility_origin is
  'Origin of the current effective eligibility result; trusted source authority is persisted separately in private.listing_trusted_eligibility_constraints.';

create function public.set_trusted_listing_eligibility_constraint(
  p_listing_id uuid,
  p_trusted_state text,
  p_trusted_origin text,
  p_basis text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_effective text;
  v_scope text;
  v_default_eligibility text;
  v_effective_eligibility text;
  v_effective_origin text;
  v_effective_basis text;
begin
  if p_trusted_origin not in ('operator', 'legal_notice') then
    raise exception 'trusted eligibility reassessment requires operator or legal_notice origin';
  end if;

  if p_basis is null
    or p_basis <> btrim(p_basis)
    or char_length(p_basis) not between 1 and 1000
  then
    raise exception 'trusted eligibility reassessment requires a bounded non-empty basis';
  end if;

  if p_trusted_state is not null
    and p_trusted_state not in ('eligible', 'review_required', 'regulated_verification_required', 'blocked')
  then
    raise exception 'unsupported trusted eligibility state: %', p_trusted_state;
  end if;

  select c.eligibility_state
  into v_previous_effective
  from private.listing_publication_controls as c
  where c.listing_id = p_listing_id
  for update;

  if not found then
    raise exception 'listing publication controls are missing';
  end if;

  select d.policy_scope
  into v_scope
  from private.listing_policy_decisions as d
  where d.listing_id = p_listing_id
    and d.superseded_at is null;

  if not found then
    raise exception 'current listing policy decision is missing';
  end if;

  if p_trusted_state is null then
    delete from private.listing_trusted_eligibility_constraints
    where listing_id = p_listing_id;
  else
    insert into private.listing_trusted_eligibility_constraints (
      listing_id,
      eligibility_state,
      decision_origin,
      decision_basis,
      policy_version,
      updated_at
    ) values (
      p_listing_id,
      p_trusted_state,
      p_trusted_origin,
      p_basis,
      'architecture-freeze-v1-astra',
      now()
    )
    on conflict (listing_id) do update
    set
      eligibility_state = excluded.eligibility_state,
      decision_origin = excluded.decision_origin,
      decision_basis = excluded.decision_basis,
      policy_version = excluded.policy_version,
      updated_at = excluded.updated_at;
  end if;

  v_default_eligibility := private.default_listing_eligibility_for_scope(v_scope);

  if p_trusted_state is null then
    v_effective_eligibility := v_default_eligibility;
    v_effective_origin := 'system';
    v_effective_basis := 'Explicit trusted eligibility clear completed; deterministic policy scope is authoritative';
  else
    v_effective_eligibility := private.resolve_listing_eligibility_precedence(
      v_default_eligibility,
      p_trusted_state
    );

    if v_effective_eligibility = p_trusted_state then
      v_effective_origin := p_trusted_origin;
      v_effective_basis := p_basis;
    else
      v_effective_origin := 'system';
      v_effective_basis := 'Deterministic policy scope is stricter than the persisted trusted eligibility constraint';
    end if;
  end if;

  update private.listing_publication_controls
  set
    eligibility_state = v_effective_eligibility,
    eligibility_origin = v_effective_origin,
    eligibility_basis = v_effective_basis,
    policy_version = 'architecture-freeze-v1-astra',
    updated_at = now()
  where listing_id = p_listing_id;

  insert into private.listing_eligibility_transitions (
    listing_id,
    from_eligibility_state,
    to_eligibility_state,
    transition_basis,
    transition_origin,
    evidence_provenance,
    evidence,
    policy_version
  ) values (
    p_listing_id,
    v_previous_effective,
    v_effective_eligibility,
    p_basis,
    p_trusted_origin,
    'trusted_eligibility_reassessment',
    jsonb_build_object(
      'trusted_constraint_state', p_trusted_state,
      'trusted_constraint_cleared', p_trusted_state is null,
      'deterministic_default', v_default_eligibility,
      'effective_eligibility', v_effective_eligibility
    ),
    'architecture-freeze-v1-astra'
  );

  return v_effective_eligibility;
end;
$$;

comment on function public.set_trusted_listing_eligibility_constraint(uuid, text, text, text) is
  'Service-role-only explicit operator/legal reassessment primitive. A NULL trusted state explicitly clears the trusted constraint; seller metadata cannot mutate this source of authority.';

revoke all on function public.set_trusted_listing_eligibility_constraint(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.set_trusted_listing_eligibility_constraint(uuid, text, text, text)
  to service_role;

create or replace function private.sync_listing_architecture_freeze()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deterministic_scope text;
  v_trusted_scope text;
  v_effective_scope text;
  v_current_policy_scope text;
  v_current_policy_origin text;
  v_trusted_eligibility text;
  v_trusted_eligibility_origin text;
  v_trusted_eligibility_basis text;
  v_default_eligibility text;
  v_effective_eligibility text;
  v_effective_eligibility_origin text;
  v_effective_eligibility_basis text;
begin
  if row(new.category, new.product_type) is distinct from row(old.category, old.product_type) then
    v_deterministic_scope := private.classify_listing_policy_scope(new.category, new.product_type);

    select d.policy_scope
    into v_trusted_scope
    from private.listing_policy_decisions as d
    where d.listing_id = new.id
      and d.decision_origin in ('operator', 'legal_notice')
    order by d.evaluated_at desc, d.created_at desc, d.id desc
    limit 1;

    v_effective_scope := private.resolve_listing_policy_scope_precedence(
      v_deterministic_scope,
      v_trusted_scope
    );

    select d.policy_scope, d.decision_origin
    into v_current_policy_scope, v_current_policy_origin
    from private.listing_policy_decisions as d
    where d.listing_id = new.id
      and d.superseded_at is null;

    if not (
      v_current_policy_origin in ('operator', 'legal_notice')
      and v_current_policy_scope = v_effective_scope
    ) then
      update private.listing_policy_decisions
      set superseded_at = now()
      where listing_id = new.id
        and superseded_at is null;

      insert into private.listing_policy_decisions (
        listing_id,
        policy_scope,
        decision_basis,
        policy_version,
        decision_origin,
        evidence_provenance,
        evidence
      ) values (
        new.id,
        v_effective_scope,
        'Deterministic metadata reassessment with fail-closed trusted-policy precedence',
        'architecture-freeze-v1-astra',
        'system',
        'public.listings.category+product_type;latest_trusted_policy_if_any',
        jsonb_build_object(
          'deterministic_scope', v_deterministic_scope,
          'trusted_scope', v_trusted_scope,
          'effective_scope', v_effective_scope
        )
      );
    end if;

    select
      t.eligibility_state,
      t.decision_origin,
      t.decision_basis
    into
      v_trusted_eligibility,
      v_trusted_eligibility_origin,
      v_trusted_eligibility_basis
    from private.listing_trusted_eligibility_constraints as t
    where t.listing_id = new.id;

    v_default_eligibility := private.default_listing_eligibility_for_scope(v_effective_scope);

    if v_trusted_eligibility is null then
      v_effective_eligibility := v_default_eligibility;
      v_effective_eligibility_origin := 'system';
      v_effective_eligibility_basis := 'Deterministic policy scope after seller-editable metadata reassessment';
    else
      v_effective_eligibility := private.resolve_listing_eligibility_precedence(
        v_default_eligibility,
        v_trusted_eligibility
      );

      if v_effective_eligibility = v_trusted_eligibility then
        v_effective_eligibility_origin := v_trusted_eligibility_origin;
        v_effective_eligibility_basis := v_trusted_eligibility_basis;
      else
        v_effective_eligibility_origin := 'system';
        v_effective_eligibility_basis := 'Deterministic policy scope is stricter than the persisted trusted eligibility constraint';
      end if;
    end if;

    update private.listing_publication_controls
    set
      eligibility_state = v_effective_eligibility,
      eligibility_origin = v_effective_eligibility_origin,
      eligibility_basis = v_effective_eligibility_basis,
      policy_version = 'architecture-freeze-v1-astra',
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
      and (
        contact_state_reason is null
        or contact_state_reason = 'system_missing_publication_contact'
      );
  end if;

  return new;
end;
$$;

revoke all on function private.sync_listing_architecture_freeze()
  from public, anon, authenticated;
grant execute on function private.sync_listing_architecture_freeze() to service_role;

create or replace function public.record_synthetic_regulated_listing_eligibility(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope text;
  v_policy_origin text;
  v_eligibility text;
  v_eligibility_origin text;
  v_has_trusted_eligibility boolean;
  v_basis constant text := 'SYNTHETIC TEST BYPASS: loopback-only Stage-1 regulated publication test authorization; NOT production EIDS/provider verification';
begin
  select c.eligibility_state, c.eligibility_origin
  into v_eligibility, v_eligibility_origin
  from private.listing_publication_controls as c
  where c.listing_id = p_listing_id
  for update;

  if not found then
    raise exception 'listing publication controls are missing';
  end if;

  select d.policy_scope, d.decision_origin
  into v_scope, v_policy_origin
  from private.listing_policy_decisions as d
  where d.listing_id = p_listing_id
    and d.superseded_at is null;

  select exists (
    select 1
    from private.listing_trusted_eligibility_constraints as t
    where t.listing_id = p_listing_id
  ) into v_has_trusted_eligibility;

  if v_scope not in ('eids_vehicle', 'eids_real_estate') then
    raise exception 'synthetic regulated eligibility transition requires current EIDS policy scope';
  end if;

  if v_eligibility = 'eligible' and v_eligibility_origin = 'synthetic_test' then
    return true;
  end if;

  if v_has_trusted_eligibility
    or v_policy_origin <> 'system'
    or v_eligibility <> 'regulated_verification_required'
    or v_eligibility_origin <> 'system'
  then
    raise exception 'synthetic regulated eligibility transition cannot override trusted policy or eligibility';
  end if;

  insert into private.listing_eligibility_transitions (
    listing_id,
    from_eligibility_state,
    to_eligibility_state,
    transition_basis,
    transition_origin,
    evidence_provenance,
    evidence,
    policy_version
  ) values (
    p_listing_id,
    v_eligibility,
    'eligible',
    v_basis,
    'synthetic_test',
    'stage1_local_triple_gate',
    jsonb_build_object(
      'synthetic_test_mode', 'enabled',
      'request_host_requirement', 'loopback',
      'backend_host_requirement', 'loopback',
      'production_provider_verification', false
    ),
    'architecture-freeze-v1-synthetic-eids-test'
  );

  update private.listing_publication_controls
  set
    eligibility_state = 'eligible',
    eligibility_origin = 'synthetic_test',
    eligibility_basis = v_basis,
    policy_version = 'architecture-freeze-v1-synthetic-eids-test',
    updated_at = now()
  where listing_id = p_listing_id;

  return true;
end;
$$;

comment on function public.record_synthetic_regulated_listing_eligibility(uuid) is
  'Service-role-only audit transition for the existing loopback triple-gated Stage-1 synthetic EIDS path. It never represents production/provider verification and never overrides an operator/legal trusted eligibility constraint.';

revoke all on function public.record_synthetic_regulated_listing_eligibility(uuid)
  from public, anon, authenticated;
grant execute on function public.record_synthetic_regulated_listing_eligibility(uuid)
  to service_role;

create or replace function private.recompute_listing_enforcement(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_remove boolean;
  v_has_hold boolean;
  v_has_suppress boolean;
  v_contact_ready boolean;
begin
  -- One controls row is the serialization point for every enforcement recomputation
  -- of this listing. The lock is intentionally acquired before any active-case read,
  -- so a waiter cannot later write a stale aggregate computed before another commit.
  perform 1
  from private.listing_publication_controls as c
  where c.listing_id = p_listing_id
  for update;

  if not found then
    return;
  end if;

  select
    coalesce(bool_or(c.decision_action = 'remove'), false),
    coalesce(bool_or(c.decision_action = 'hold'), false),
    coalesce(bool_or(c.decision_action = 'suppress_contact'), false)
  into v_has_remove, v_has_hold, v_has_suppress
  from private.listing_enforcement_cases as c
  where c.listing_id = p_listing_id
    and c.decision_action in ('remove', 'hold', 'suppress_contact')
    and c.restored_at is null
    and c.appeal_state <> 'restored';

  select exists (
    select 1
    from public.listings as l
    where l.id = p_listing_id
      and l.contact_channel is not null
      and l.contact_e164 is not null
      and l.publication_instruction_at is not null
  ) into v_contact_ready;

  if v_has_remove or v_has_hold or v_has_suppress then
    update private.listing_publication_controls as c
    set
      enforcement_state = case
        when v_has_remove then 'removed'
        when v_has_hold then 'held'
        else 'clear'
      end,
      contact_state = 'suppressed',
      contact_state_reason = case
        when c.contact_state = 'suppressed'
          and c.contact_state_reason is not null
          and c.contact_state_reason <> 'enforcement_active_cases'
          and c.contact_state_reason not like 'enforcement_case:%'
          then c.contact_state_reason
        else 'enforcement_active_cases'
      end,
      updated_at = now()
    where c.listing_id = p_listing_id;
  else
    update private.listing_publication_controls as c
    set
      enforcement_state = 'clear',
      contact_state = case
        when c.contact_state_reason = 'enforcement_active_cases'
          or c.contact_state_reason like 'enforcement_case:%'
          then case when v_contact_ready then 'available' else 'suppressed' end
        else c.contact_state
      end,
      contact_state_reason = case
        when c.contact_state_reason = 'enforcement_active_cases'
          or c.contact_state_reason like 'enforcement_case:%'
          then case when v_contact_ready then null else 'system_missing_publication_contact' end
        else c.contact_state_reason
      end,
      updated_at = now()
    where c.listing_id = p_listing_id;
  end if;
end;
$$;

revoke all on function private.recompute_listing_enforcement(uuid)
  from public, anon, authenticated;
grant execute on function private.recompute_listing_enforcement(uuid) to service_role;

create function private.prevent_listing_enforcement_case_retargeting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.listing_id is distinct from old.listing_id then
    raise exception 'listing_enforcement_cases.listing_id is immutable';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_listing_enforcement_case_retargeting()
  from public, anon, authenticated;
grant execute on function private.prevent_listing_enforcement_case_retargeting() to service_role;

create trigger listing_enforcement_case_listing_id_immutable
before update of listing_id
on private.listing_enforcement_cases
for each row
execute function private.prevent_listing_enforcement_case_retargeting();

create or replace function private.propagate_listing_enforcement_case()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.recompute_listing_enforcement(old.listing_id);
    return old;
  end if;

  perform private.recompute_listing_enforcement(new.listing_id);
  return new;
end;
$$;

revoke all on function private.propagate_listing_enforcement_case()
  from public, anon, authenticated;
grant execute on function private.propagate_listing_enforcement_case() to service_role;
