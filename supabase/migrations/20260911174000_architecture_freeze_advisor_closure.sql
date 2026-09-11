-- PR #89 Advisor second-pass closure.
-- Append-only hardening: preserve the loopback-only synthetic EIDS test path, prevent seller
-- metadata from weakening trusted policy/eligibility, and aggregate every active enforcement case.

alter table private.listing_policy_decisions
  drop constraint listing_policy_origin_check;
alter table private.listing_policy_decisions
  add constraint listing_policy_origin_check
  check (decision_origin in ('system', 'operator', 'legal_notice'));

alter table private.listing_publication_controls
  add column eligibility_origin text not null default 'system',
  add column eligibility_basis text not null default 'deterministic_policy_scope';

alter table private.listing_publication_controls
  add constraint listing_control_eligibility_origin_check
    check (eligibility_origin in ('system', 'operator', 'legal_notice', 'synthetic_test')),
  add constraint listing_control_eligibility_basis_check
    check (
      eligibility_basis = btrim(eligibility_basis)
      and char_length(eligibility_basis) between 1 and 1000
    );

create table private.listing_eligibility_transitions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  from_eligibility_state text not null,
  to_eligibility_state text not null,
  transition_basis text not null,
  transition_origin text not null,
  evidence_provenance text not null,
  evidence jsonb not null default '{}'::jsonb,
  policy_version text not null,
  recorded_at timestamptz not null default now(),

  constraint listing_eligibility_transition_from_check
    check (from_eligibility_state in ('eligible', 'review_required', 'regulated_verification_required', 'blocked')),
  constraint listing_eligibility_transition_to_check
    check (to_eligibility_state in ('eligible', 'review_required', 'regulated_verification_required', 'blocked')),
  constraint listing_eligibility_transition_origin_check
    check (transition_origin in ('system', 'operator', 'legal_notice', 'synthetic_test')),
  constraint listing_eligibility_transition_basis_check
    check (transition_basis = btrim(transition_basis) and char_length(transition_basis) between 1 and 1000),
  constraint listing_eligibility_transition_provenance_check
    check (
      evidence_provenance = btrim(evidence_provenance)
      and char_length(evidence_provenance) between 1 and 200
    ),
  constraint listing_eligibility_transition_evidence_check
    check (jsonb_typeof(evidence) = 'object' and octet_length(evidence::text) <= 16384),
  constraint listing_eligibility_transition_policy_version_check
    check (policy_version = btrim(policy_version) and char_length(policy_version) between 1 and 64)
);

create index listing_eligibility_transitions_listing_idx
  on private.listing_eligibility_transitions (listing_id, recorded_at desc, id);

comment on table private.listing_eligibility_transitions is
  'Auditable eligibility transitions separate from listing ownership. synthetic_test records are test-only authorization evidence and never production EIDS/provider verification.';

alter table private.listing_eligibility_transitions enable row level security;
revoke all on table private.listing_eligibility_transitions from public, anon, authenticated;
grant select, insert, update, delete on table private.listing_eligibility_transitions to service_role;

create function private.resolve_listing_policy_scope_precedence(
  p_deterministic_scope text,
  p_trusted_scope text
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_trusted_scope is null then p_deterministic_scope
    when p_deterministic_scope = 'restricted' or p_trusted_scope = 'restricted' then 'restricted'
    when p_deterministic_scope = p_trusted_scope then p_deterministic_scope
    when p_deterministic_scope = 'review_required' or p_trusted_scope = 'review_required'
      then 'review_required'
    when p_deterministic_scope in ('eids_vehicle', 'eids_real_estate')
      and p_trusted_scope = 'ordinary' then p_deterministic_scope
    when p_trusted_scope in ('eids_vehicle', 'eids_real_estate')
      and p_deterministic_scope = 'ordinary' then p_trusted_scope
    when p_deterministic_scope in ('eids_vehicle', 'eids_real_estate')
      and p_trusted_scope in ('eids_vehicle', 'eids_real_estate')
      and p_deterministic_scope <> p_trusted_scope then 'review_required'
    when p_trusted_scope = 'ordinary' then p_deterministic_scope
    when p_deterministic_scope = 'ordinary' then p_trusted_scope
    else 'review_required'
  end
$$;

revoke all on function private.resolve_listing_policy_scope_precedence(text, text)
  from public, anon, authenticated;
grant execute on function private.resolve_listing_policy_scope_precedence(text, text) to service_role;

create function private.resolve_listing_eligibility_precedence(
  p_first text,
  p_second text
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_first = 'blocked' or p_second = 'blocked' then 'blocked'
    when p_first = 'review_required' or p_second = 'review_required' then 'review_required'
    when p_first = 'regulated_verification_required' or p_second = 'regulated_verification_required'
      then 'regulated_verification_required'
    else 'eligible'
  end
$$;

revoke all on function private.resolve_listing_eligibility_precedence(text, text)
  from public, anon, authenticated;
grant execute on function private.resolve_listing_eligibility_precedence(text, text) to service_role;

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
  v_current_eligibility text;
  v_current_eligibility_origin text;
  v_current_eligibility_basis text;
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
        'architecture-freeze-v1-advisor2',
        'system',
        'public.listings.category+product_type;latest_trusted_policy_if_any',
        jsonb_build_object(
          'deterministic_scope', v_deterministic_scope,
          'trusted_scope', v_trusted_scope,
          'effective_scope', v_effective_scope
        )
      );
    end if;

    select c.eligibility_state, c.eligibility_origin, c.eligibility_basis
    into v_current_eligibility, v_current_eligibility_origin, v_current_eligibility_basis
    from private.listing_publication_controls as c
    where c.listing_id = new.id;

    v_default_eligibility := private.default_listing_eligibility_for_scope(v_effective_scope);
    if v_current_eligibility_origin in ('operator', 'legal_notice') then
      v_effective_eligibility := private.resolve_listing_eligibility_precedence(
        v_current_eligibility,
        v_default_eligibility
      );
      if v_effective_eligibility = v_current_eligibility then
        v_effective_eligibility_origin := v_current_eligibility_origin;
        v_effective_eligibility_basis := v_current_eligibility_basis;
      else
        v_effective_eligibility_origin := 'system';
        v_effective_eligibility_basis := 'Deterministic policy scope is stricter than stored trusted eligibility';
      end if;
    else
      v_effective_eligibility := v_default_eligibility;
      v_effective_eligibility_origin := 'system';
      v_effective_eligibility_basis := 'Deterministic policy scope after seller-editable metadata reassessment';
    end if;

    update private.listing_publication_controls
    set
      eligibility_state = v_effective_eligibility,
      eligibility_origin = v_effective_eligibility_origin,
      eligibility_basis = v_effective_eligibility_basis,
      policy_version = 'architecture-freeze-v1-advisor2',
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

create function public.record_synthetic_regulated_listing_eligibility(p_listing_id uuid)
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

  if v_scope not in ('eids_vehicle', 'eids_real_estate') then
    raise exception 'synthetic regulated eligibility transition requires current EIDS policy scope';
  end if;

  if v_eligibility = 'eligible' and v_eligibility_origin = 'synthetic_test' then
    return true;
  end if;

  if v_policy_origin <> 'system'
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
  'Service-role-only audit transition for the existing loopback triple-gated Stage-1 synthetic EIDS path. It never represents production/provider verification.';

revoke all on function public.record_synthetic_regulated_listing_eligibility(uuid)
  from public, anon, authenticated;
grant execute on function public.record_synthetic_regulated_listing_eligibility(uuid)
  to service_role;

create function private.recompute_listing_enforcement(p_listing_id uuid)
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

create or replace function private.propagate_listing_enforcement_case()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.listing_id is distinct from new.listing_id then
    perform private.recompute_listing_enforcement(old.listing_id);
  end if;

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

drop trigger if exists listing_enforcement_case_propagation
  on private.listing_enforcement_cases;
create trigger listing_enforcement_case_propagation
after insert or update or delete
on private.listing_enforcement_cases
for each row
execute function private.propagate_listing_enforcement_case();

-- Recompute any pre-existing cases using aggregate semantics.
do $$
declare
  v_listing_id uuid;
begin
  for v_listing_id in
    select distinct listing_id from private.listing_enforcement_cases
  loop
    perform private.recompute_listing_enforcement(v_listing_id);
  end loop;
end;
$$;
