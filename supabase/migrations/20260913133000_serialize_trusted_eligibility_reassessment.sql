-- PR #89 final trusted-eligibility concurrency closure.
-- Append-only replacement only: seller metadata reassessment now acquires the same
-- per-listing publication-controls row lock used by trusted and synthetic eligibility mutations
-- before reading any policy/trusted eligibility inputs.

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
    -- listing_publication_controls is the serialization point for every eligibility mutation
    -- path. Acquire it before deterministic/policy/trusted reads so a concurrent trusted
    -- reassessment cannot commit behind a stale seller-metadata-derived effective result.
    perform 1
    from private.listing_publication_controls as c
    where c.listing_id = new.id
    for update;

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
