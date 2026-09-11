from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if text.count(old) != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {text.count(old)}")
    write(path, text.replace(old, new, 1))


# -----------------------------------------------------------------------------
# Stage-1 application: keep the exact existing triple gate, but return an explicit
# authorization result and persist the synthetic regulated eligibility only after
# a pending row exists. Production/non-loopback requests still fail before writes.
# -----------------------------------------------------------------------------
server = "src/lib/stage1-self-service-server.ts"
replace_once(
    server,
    '''function assertEidsPublicationAllowed(
  category: Stage1Category,
  productType: ProductType | null,
  request: Request,
  config: BackendConfig,
): void {
  if (resolveProductComplianceScope({ category, productType }) === "ordinary") return;
  if (
    process.env.PILOT_SYNTHETIC_TEST_MODE === "enabled" &&
    isLoopbackHost(new URL(request.url).hostname) &&
    isLoopbackHost(new URL(config.baseUrl).hostname)
  ) {
    return;
  }
  throw new Stage1SubmissionError(
    "NOT_ENABLED",
    "Vasıta ve emlak ilanları için gerekli EİDS yetkilendirmesi production ortamında henüz etkin değil.",
    503,
  );
}
''',
    '''type EidsPublicationDecision = "ordinary" | "synthetic_regulated_bypass";

function assertEidsPublicationAllowed(
  category: Stage1Category,
  productType: ProductType | null,
  request: Request,
  config: BackendConfig,
): EidsPublicationDecision {
  if (resolveProductComplianceScope({ category, productType }) === "ordinary") return "ordinary";
  if (
    process.env.PILOT_SYNTHETIC_TEST_MODE === "enabled" &&
    isLoopbackHost(new URL(request.url).hostname) &&
    isLoopbackHost(new URL(config.baseUrl).hostname)
  ) {
    return "synthetic_regulated_bypass";
  }
  throw new Stage1SubmissionError(
    "NOT_ENABLED",
    "Vasıta ve emlak ilanları için gerekli EİDS yetkilendirmesi production ortamında henüz etkin değil.",
    503,
  );
}

async function recordSyntheticRegulatedListingEligibility(
  config: BackendConfig,
  listingId: string,
): Promise<void> {
  const response = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/rpc/record_synthetic_regulated_listing_eligibility`, {
      method: "POST",
      headers: serviceHeaders(config),
      body: JSON.stringify({ p_listing_id: listingId }),
    }),
    "synthetic regulated listing eligibility transition",
  );
  const recorded = (await response.json()) as boolean;
  if (recorded !== true) {
    throw new Error("Synthetic regulated eligibility transition was not acknowledged.");
  }
}
''',
)
replace_once(
    server,
    '''  const config = readBackendConfig();
  assertEidsPublicationAllowed(category, product.productType, request, config);
  const sellerSession = await resolveSellerSession(config, request);
''',
    '''  const config = readBackendConfig();
  const eidsPublicationDecision = assertEidsPublicationAllowed(
    category,
    product.productType,
    request,
    config,
  );
  const sellerSession = await resolveSellerSession(config, request);
''',
)
replace_once(
    server,
    '''  let claim: SubmissionClaim;
  try {
    claim = await claimSubmission(config, keyHash, listingId);
''',
    '''  let claim: SubmissionClaim;
  try {
    if (eidsPublicationDecision === "synthetic_regulated_bypass") {
      await recordSyntheticRegulatedListingEligibility(config, listingId);
    }
    claim = await claimSubmission(config, keyHash, listingId);
''',
)
replace_once(
    server,
    '''  assertEidsPublicationAllowed(category, product.productType, request, config);
  const conditionRaw = optionalString(form, "condition", 32);
''',
    '''  const eidsPublicationDecision = assertEidsPublicationAllowed(
    category,
    product.productType,
    request,
    config,
  );
  const conditionRaw = optionalString(form, "condition", 32);
''',
)
replace_once(
    server,
    '''    "seller listing update",
  );
  return jsonResponse({
''',
    '''    "seller listing update",
  );
  if (eidsPublicationDecision === "synthetic_regulated_bypass") {
    await recordSyntheticRegulatedListingEligibility(config, listingId);
  }
  return jsonResponse({
''',
)

# Unit mock: the regulated publication mock now requires the synthetic eligibility RPC
# before the publication RPC, while all existing production fail-closed tests stay intact.
test_file = "src/lib/stage1-self-service-server.test.ts"
replace_once(
    test_file,
    '''const submissionKeys = new Map<string, { listingId: string; complete: boolean }>();
const sellers = new Map<
''',
    '''const submissionKeys = new Map<string, { listingId: string; complete: boolean }>();
const syntheticRegulatedEligibilityBypasses = new Set<string>();
const sellers = new Map<
''',
)
replace_once(
    test_file,
    '''  listings.delete(listingId);
  listingBodies.delete(listingId);
''',
    '''  listings.delete(listingId);
  listingBodies.delete(listingId);
  syntheticRegulatedEligibilityBypasses.delete(listingId);
''',
)
replace_once(
    test_file,
    '''    if (url.pathname === "/rest/v1/rpc/claim_listing_submission_key" && method === "POST") {
''',
    '''    if (
      url.pathname === "/rest/v1/rpc/record_synthetic_regulated_listing_eligibility" &&
      method === "POST"
    ) {
      const body = JSON.parse(String(init?.body)) as { p_listing_id: string };
      const row = listingBodies.get(body.p_listing_id);
      if (!row || (row.category !== "vehicle" && row.category !== "real-estate")) {
        return new Response("synthetic regulated transition requires regulated listing", {
          status: 409,
        });
      }
      syntheticRegulatedEligibilityBypasses.add(body.p_listing_id);
      return json(true);
    }

    if (url.pathname === "/rest/v1/rpc/claim_listing_submission_key" && method === "POST") {
''',
)
replace_once(
    test_file,
    '''      const ready =
        row?.status === "pending" &&
        typeof row.owner_user_id === "string" &&
''',
    '''      const isRegulated = row?.category === "vehicle" || row?.category === "real-estate";
      const ready =
        row?.status === "pending" &&
        (!isRegulated || syntheticRegulatedEligibilityBypasses.has(body.p_listing_id)) &&
        typeof row.owner_user_id === "string" &&
''',
)
needle = '''  test("claim/photo failures compensate and unknown fields fail before privileged listing work", async () => {
'''
insert = '''  test("loopback synthetic EIDS publication records the regulated bypass before publication", async () => {
    const seller = await bootstrapSeller();
    const before = syntheticRegulatedEligibilityBypasses.size;

    const ordinary = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000096"), {
        cookie: seller.cookie,
      }),
    );
    expect(ordinary.status).toBe(201);
    expect(syntheticRegulatedEligibilityBypasses.size).toBe(before);

    const vehicle = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm("97000000-0000-4000-8000-000000000097", { category: "vehicle" }),
        { cookie: seller.cookie },
      ),
    );
    expect(vehicle.status).toBe(201);
    const payload = (await vehicle.json()) as { listingId: string };
    expect(syntheticRegulatedEligibilityBypasses.has(payload.listingId)).toBe(true);
    expect(listingBodies.get(payload.listingId)?.status).toBe("published");
  });

'''
replace_once(test_file, needle, insert + needle)

# Browser harness treats the new RPC as privileged if a browser ever attempts it directly.
replace_once(
    "scripts/stage1-self-service-browser-e2e-shared.ts",
    '''        url.pathname.endsWith("/rpc/complete_and_publish_listing_submission") ||
        (url.pathname.startsWith("/storage/v1/object/listing_photos") &&
''',
    '''        url.pathname.endsWith("/rpc/complete_and_publish_listing_submission") ||
        url.pathname.endsWith("/rpc/record_synthetic_regulated_listing_eligibility") ||
        (url.pathname.startsWith("/storage/v1/object/listing_photos") &&
''',
)

# -----------------------------------------------------------------------------
# Append-only DB closure: eligibility-transition audit, trusted precedence,
# aggregate enforcement recomputation.
# -----------------------------------------------------------------------------
migration = r'''-- PR #89 Advisor second-pass closure.
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
'''
write("supabase/migrations/20260911174000_architecture_freeze_advisor_closure.sql", migration)

# Focused pgTAP regression for all three Advisor blockers.
advisor_test = r'''begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

select has_table(
  'private',
  'listing_eligibility_transitions',
  'auditable listing eligibility-transition seam exists'
);
select function_privs_are(
  'public',
  'record_synthetic_regulated_listing_eligibility',
  array['uuid'],
  'anon',
  array[]::text[],
  'anon cannot satisfy regulated eligibility'
);
select function_privs_are(
  'public',
  'record_synthetic_regulated_listing_eligibility',
  array['uuid'],
  'authenticated',
  array[]::text[],
  'authenticated cannot satisfy regulated eligibility'
);
select function_privs_are(
  'public',
  'record_synthetic_regulated_listing_eligibility',
  array['uuid'],
  'service_role',
  array['EXECUTE'],
  'only the trusted service-role path may record the synthetic regulated bypass'
);

insert into public.listings (
  id, title, description, price_amount, category, product_type, province, district,
  seller_display_name, contact_channel, contact_e164, publication_instruction_at, status
) values
(
  'f3100000-0000-4000-8000-000000000001', 'Synthetic vehicle bypass', 'Advisor fixture',
  1, 'vehicle', 'automobile', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
  'phone_whatsapp', '+12025550201', now(), 'pending'
),
(
  'f3100000-0000-4000-8000-000000000002', 'Ordinary control', 'Advisor fixture',
  1, 'electronics', null, 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
  'phone_whatsapp', '+12025550202', now(), 'pending'
);

select results_eq(
  $$
    select d.policy_scope, c.eligibility_state, c.eligibility_origin
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3100000-0000-4000-8000-000000000001'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('eids_vehicle'::text, 'regulated_verification_required'::text, 'system'::text) $$,
  'regulated listing is fail-closed by default before the synthetic transition'
);

select is(
  public.record_synthetic_regulated_listing_eligibility(
    'f3100000-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'trusted synthetic test transition is acknowledged'
);
select results_eq(
  $$
    select eligibility_state, eligibility_origin
    from private.listing_publication_controls
    where listing_id = 'f3100000-0000-4000-8000-000000000001'::uuid
  $$,
  $$ values ('eligible'::text, 'synthetic_test'::text) $$,
  'synthetic regulated bypass is represented explicitly without changing policy scope'
);
select results_eq(
  $$
    select transition_origin, evidence_provenance,
           transition_basis like 'SYNTHETIC TEST BYPASS:%' as synthetic_basis,
           evidence ->> 'production_provider_verification' as provider_verified
    from private.listing_eligibility_transitions
    where listing_id = 'f3100000-0000-4000-8000-000000000001'::uuid
    order by recorded_at desc, id desc
    limit 1
  $$,
  $$ values ('synthetic_test'::text, 'stage1_local_triple_gate'::text, true, 'false'::text) $$,
  'persisted provenance explicitly identifies synthetic test bypass and denies production/provider verification'
);
select throws_ok(
  $$ select public.record_synthetic_regulated_listing_eligibility('f3100000-0000-4000-8000-000000000002'::uuid) $$,
  'P0001',
  'synthetic regulated eligibility transition requires current EIDS policy scope',
  'ordinary listings cannot use the synthetic regulated transition primitive'
);

-- Trusted restricted policy cannot be replaced by seller-editable metadata.
insert into public.listings (
  id, title, description, price_amount, category, province, district, seller_display_name, status
) values
  ('f3110000-0000-4000-8000-000000000001', 'Restricted precedence', 'Advisor fixture', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'),
  ('f3110000-0000-4000-8000-000000000002', 'Review precedence', 'Advisor fixture', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'),
  ('f3110000-0000-4000-8000-000000000003', 'Blocked eligibility precedence', 'Advisor fixture', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'),
  ('f3110000-0000-4000-8000-000000000004', 'Ordinary to vehicle', 'Advisor fixture', 1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending'),
  ('f3110000-0000-4000-8000-000000000005', 'Vehicle trusted restriction', 'Advisor fixture', 1, 'vehicle', 'Tekirdağ', 'Çorlu', 'Synthetic Seller', 'pending');

update private.listing_policy_decisions
set superseded_at = now()
where listing_id = 'f3110000-0000-4000-8000-000000000001'::uuid
  and superseded_at is null;
insert into private.listing_policy_decisions (
  listing_id, policy_scope, decision_basis, policy_version, decision_origin, evidence_provenance
) values (
  'f3110000-0000-4000-8000-000000000001', 'restricted', 'Trusted operator restriction',
  'advisor2-test', 'operator', 'synthetic_operator_fixture'
);
update private.listing_publication_controls
set eligibility_state = 'blocked', eligibility_origin = 'operator',
    eligibility_basis = 'Trusted operator restriction'
where listing_id = 'f3110000-0000-4000-8000-000000000001'::uuid;
update public.listings set category = 'home'
where id = 'f3110000-0000-4000-8000-000000000001'::uuid;
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state, c.eligibility_origin
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3110000-0000-4000-8000-000000000001'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('restricted'::text, 'blocked'::text, 'operator'::text) $$,
  'restricted operator decision survives a seller category edit'
);

update private.listing_policy_decisions
set superseded_at = now()
where listing_id = 'f3110000-0000-4000-8000-000000000002'::uuid
  and superseded_at is null;
insert into private.listing_policy_decisions (
  listing_id, policy_scope, decision_basis, policy_version, decision_origin, evidence_provenance
) values (
  'f3110000-0000-4000-8000-000000000002', 'review_required', 'Trusted operator review',
  'advisor2-test', 'operator', 'synthetic_operator_fixture'
);
update private.listing_publication_controls
set eligibility_state = 'review_required', eligibility_origin = 'operator',
    eligibility_basis = 'Trusted operator review'
where listing_id = 'f3110000-0000-4000-8000-000000000002'::uuid;
update public.listings set category = 'home'
where id = 'f3110000-0000-4000-8000-000000000002'::uuid;
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state, c.eligibility_origin
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3110000-0000-4000-8000-000000000002'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('review_required'::text, 'review_required'::text, 'operator'::text) $$,
  'trusted review-required decision survives a seller category edit'
);

update private.listing_publication_controls
set eligibility_state = 'blocked', eligibility_origin = 'operator',
    eligibility_basis = 'Trusted manual eligibility block'
where listing_id = 'f3110000-0000-4000-8000-000000000003'::uuid;
update public.listings set category = 'home'
where id = 'f3110000-0000-4000-8000-000000000003'::uuid;
select results_eq(
  $$
    select eligibility_state, eligibility_origin
    from private.listing_publication_controls
    where listing_id = 'f3110000-0000-4000-8000-000000000003'::uuid
  $$,
  $$ values ('blocked'::text, 'operator'::text) $$,
  'trusted blocked eligibility cannot become eligible from metadata edits'
);

update public.listings set category = 'vehicle'
where id = 'f3110000-0000-4000-8000-000000000004'::uuid;
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3110000-0000-4000-8000-000000000004'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('eids_vehicle'::text, 'regulated_verification_required'::text) $$,
  'ordinary to vehicle metadata edit becomes regulated and fail-closed'
);

update private.listing_policy_decisions
set superseded_at = now()
where listing_id = 'f3110000-0000-4000-8000-000000000005'::uuid
  and superseded_at is null;
insert into private.listing_policy_decisions (
  listing_id, policy_scope, decision_basis, policy_version, decision_origin, evidence_provenance
) values (
  'f3110000-0000-4000-8000-000000000005', 'restricted', 'Trusted restriction on regulated listing',
  'advisor2-test', 'legal_notice', 'synthetic_legal_fixture'
);
update private.listing_publication_controls
set eligibility_state = 'blocked', eligibility_origin = 'legal_notice',
    eligibility_basis = 'Trusted legal restriction'
where listing_id = 'f3110000-0000-4000-8000-000000000005'::uuid;
update public.listings set category = 'electronics'
where id = 'f3110000-0000-4000-8000-000000000005'::uuid;
select results_eq(
  $$
    select d.policy_scope, c.eligibility_state, c.eligibility_origin
    from private.listing_policy_decisions d
    join private.listing_publication_controls c on c.listing_id = d.listing_id
    where d.listing_id = 'f3110000-0000-4000-8000-000000000005'::uuid
      and d.superseded_at is null
  $$,
  $$ values ('restricted'::text, 'blocked'::text, 'legal_notice'::text) $$,
  'vehicle to ordinary edit cannot lift an existing trusted restriction'
);

-- Multiple active enforcement cases aggregate; restoring one cannot clear another.
insert into public.listings (
  id, title, description, price_amount, category, province, district, seller_display_name,
  owner_user_id, contact_channel, contact_e164, publication_instruction_at,
  status, published_at, expires_at
) values (
  'f3120000-0000-4000-8000-000000000001', 'Enforcement aggregation', 'Advisor fixture',
  1, 'electronics', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
  null, 'phone_whatsapp', '+12025550220', now() - interval '2 minutes',
  'published', now() - interval '1 minute', now() + interval '1 day'
);
insert into private.listing_external_sales_links (
  listing_id, canonical_url, canonical_host, provider_key, url_security_classification,
  ownership_status, listing_match_status, moderation_status, complaint_status,
  public_cta_decision
) values (
  'f3120000-0000-4000-8000-000000000001',
  'https://shopier.com/advisor2-enforcement-fixture', 'shopier.com', 'shopier',
  'KNOWN_PROVIDER_CANDIDATE', 'confirmed', 'matched', 'approved', 'clear', 'allow_public_cta'
);

insert into private.listing_enforcement_cases (
  id, listing_id, reason_type, reason_detail, decision_action, action_at, created_origin
) values
  ('f3130000-0000-4000-8000-000000000001', 'f3120000-0000-4000-8000-000000000001', 'operator_review', 'Remove A', 'remove', now(), 'operator'),
  ('f3130000-0000-4000-8000-000000000002', 'f3120000-0000-4000-8000-000000000001', 'operator_review', 'Remove B', 'remove', now(), 'operator');
update private.listing_enforcement_cases
set decision_action = 'restore', action_at = now(), appeal_state = 'restored', restored_at = now()
where id = 'f3130000-0000-4000-8000-000000000001'::uuid;
select results_eq(
  $$ select enforcement_state, contact_state from private.listing_publication_controls
     where listing_id = 'f3120000-0000-4000-8000-000000000001'::uuid $$,
  $$ values ('removed'::text, 'suppressed'::text) $$,
  'restoring remove A does not neutralize active remove B'
);
update private.listing_enforcement_cases
set decision_action = 'restore', action_at = now(), appeal_state = 'restored', restored_at = now()
where id = 'f3130000-0000-4000-8000-000000000002'::uuid;

insert into private.listing_enforcement_cases (
  id, listing_id, reason_type, reason_detail, decision_action, action_at, created_origin
) values
  ('f3130000-0000-4000-8000-000000000003', 'f3120000-0000-4000-8000-000000000001', 'operator_review', 'Hold A', 'hold', now(), 'operator'),
  ('f3130000-0000-4000-8000-000000000004', 'f3120000-0000-4000-8000-000000000001', 'operator_review', 'Suppress B', 'suppress_contact', now(), 'operator');
update private.listing_enforcement_cases
set decision_action = 'restore', action_at = now(), appeal_state = 'restored', restored_at = now()
where id = 'f3130000-0000-4000-8000-000000000003'::uuid;
select results_eq(
  $$ select enforcement_state, contact_state from private.listing_publication_controls
     where listing_id = 'f3120000-0000-4000-8000-000000000001'::uuid $$,
  $$ values ('clear'::text, 'suppressed'::text) $$,
  'restoring hold A leaves contact suppressed while suppress-contact B is active'
);
select ok(
  not public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'detail'),
  'active contact suppression still removes row-level detail exposure'
);
update private.listing_enforcement_cases
set decision_action = 'restore', action_at = now(), appeal_state = 'restored', restored_at = now()
where id = 'f3130000-0000-4000-8000-000000000004'::uuid;
select results_eq(
  $$ select enforcement_state, contact_state from private.listing_publication_controls
     where listing_id = 'f3120000-0000-4000-8000-000000000001'::uuid $$,
  $$ values ('clear'::text, 'available'::text) $$,
  'final blocking case restoration recovers ordinary contact readiness'
);
select ok(
  public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'search_index')
  and public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'detail')
  and public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'signed_photo')
  and public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'public_contact')
  and public.listing_has_public_capability('f3120000-0000-4000-8000-000000000001', 'external_cta'),
  'all public capabilities recover only after every blocking case is restored and other gates are satisfied'
);

select * from finish();
rollback;
'''
write("supabase/tests/database/architecture_freeze_advisor_closure.test.sql", advisor_test)

# -----------------------------------------------------------------------------
# Modernize restore verification: the canonical RLS policy now delegates to the
# capability function instead of inlining the historical predicate.
# -----------------------------------------------------------------------------
restore = "ops/self-hosted/restore-verification.sql"
replace_once(
    restore,
    '''  photo_manifest_oid oid;
  photo_path_helper_oid oid;
''',
    '''  photo_manifest_oid oid;
  photo_path_helper_oid oid;
  capability_oid oid;
  anonymous_policy_count integer;
''',
)
replace_once(
    restore,
    '''  if to_regclass('private.sellers') is null
     or to_regclass('private.seller_sessions') is null then
    raise exception 'private seller identity/session tables are missing';
  end if;
''',
    '''  if to_regclass('private.sellers') is null
     or to_regclass('private.seller_sessions') is null then
    raise exception 'private seller identity/session tables are missing';
  end if;

  if to_regclass('private.seller_role_assessments') is null
     or to_regclass('private.listing_policy_decisions') is null
     or to_regclass('private.listing_publication_controls') is null
     or to_regclass('private.listing_enforcement_cases') is null
     or to_regclass('private.listing_eligibility_transitions') is null then
    raise exception 'one or more architecture-freeze private tables are missing';
  end if;
''',
)
replace_once(
    restore,
    '''    from (values
      ('listing_photos'),
      ('listing_external_sales_links')
    ) as required(relname)
''',
    '''    from (values
      ('listing_photos'),
      ('listing_external_sales_links'),
      ('seller_role_assessments'),
      ('listing_policy_decisions'),
      ('listing_publication_controls'),
      ('listing_enforcement_cases'),
      ('listing_eligibility_transitions')
    ) as required(relname)
''',
)
old_policy_check = '''  -- Restore verification must validate the actual fail-closed predicate, not only
  -- the policy name. Any OR in this single canonical gate is treated as a weakened
  -- restore and therefore fails closed.
  if anonymous_policy_qual ~* '\\sOR\\s'
     or anonymous_policy_qual !~* 'status\\s*=\\s*''published''(::text)?'
     or anonymous_policy_qual !~* 'published_at\\s*<=\\s*now\\(\\)'
     or anonymous_policy_qual !~* 'expires_at\\s*>\\s*now\\(\\)'
     or anonymous_policy_qual !~* 'unpublished_at\\s+IS\\s+NULL'
     or anonymous_policy_qual !~* 'contact_channel\\s+IS\\s+NOT\\s+NULL'
     or anonymous_policy_qual !~* 'contact_e164\\s+IS\\s+NOT\\s+NULL'
     or anonymous_policy_qual !~* 'publication_instruction_at\\s+IS\\s+NOT\\s+NULL'
  then
    raise exception 'canonical anonymous listings policy does not preserve the required active-published/contact-readiness predicate: %', anonymous_policy_qual;
  end if;
'''
new_policy_check = '''  select count(*)
  into anonymous_policy_count
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'listings'
    and p.polcmd = 'r'
    and p.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'anon')];

  if anonymous_policy_count <> 1 then
    raise exception 'expected exactly one canonical anonymous listings SELECT policy, found %', anonymous_policy_count;
  end if;

  -- The policy must delegate directly to the one canonical capability decision. Any OR in
  -- this RLS predicate would create a bypass around the capability contract and fails closed.
  if anonymous_policy_qual ~* '\\sOR\\s'
     or anonymous_policy_qual !~* 'listing_has_public_capability\\s*\\('
     or anonymous_policy_qual !~* ''' + "'''detail'''" + r'''
  then
    raise exception 'canonical anonymous listings policy does not delegate exclusively to detail capability: %', anonymous_policy_qual;
  end if;

  capability_oid := to_regprocedure('public.listing_has_public_capability(uuid,text)');
  if capability_oid is null then
    raise exception 'canonical listing public-capability function is missing';
  end if;
  if not (select prosecdef from pg_catalog.pg_proc where oid = capability_oid) then
    raise exception 'canonical listing public-capability function is not SECURITY DEFINER';
  end if;
  if position('search_path=""' in coalesce(
       (select array_to_string(proconfig, ',') from pg_catalog.pg_proc where oid = capability_oid),
       ''
     )) = 0 then
    raise exception 'canonical listing public-capability function search_path is not pinned empty';
  end if;
  if not has_function_privilege('anon', capability_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', capability_oid, 'EXECUTE')
     or not has_function_privilege('service_role', capability_oid, 'EXECUTE') then
    raise exception 'canonical listing public-capability EXECUTE contract is incomplete';
  end if;

  if has_function_privilege(
       'anon',
       'public.record_synthetic_regulated_listing_eligibility(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.record_synthetic_regulated_listing_eligibility(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.record_synthetic_regulated_listing_eligibility(uuid)',
       'EXECUTE'
     ) then
    raise exception 'synthetic regulated eligibility transition privilege boundary is invalid';
  end if;
'''
replace_once(restore, old_policy_check, new_policy_check)
replace_once(
    restore,
    '''  if has_table_privilege('anon', 'private.listing_photos', 'SELECT') then
    raise exception 'anon gained direct private listing_photos SELECT privilege';
  end if;
''',
    '''  if exists (
    select 1
    from (values
      ('listing_photos'),
      ('listing_external_sales_links'),
      ('seller_role_assessments'),
      ('listing_policy_decisions'),
      ('listing_publication_controls'),
      ('listing_enforcement_cases'),
      ('listing_eligibility_transitions')
    ) as required(relname)
    where has_table_privilege('anon', 'private.' || required.relname, 'SELECT')
       or has_table_privilege('authenticated', 'private.' || required.relname, 'SELECT')
  ) then
    raise exception 'public application role gained direct SELECT on private application state';
  end if;
''',
)

# -----------------------------------------------------------------------------
# Infrastructure fixtures: explicitly ordinary; do not rely on default Other or
# widen the narrow legacy bridge.
# -----------------------------------------------------------------------------
replace_once(
    "scripts/real-pilot-backend-integration.ts",
    '''    price_amount: 2500,
    province: "Tekirdağ",
''',
    '''    price_amount: 2500,
    category: "electronics",
    province: "Tekirdağ",
''',
)
replace_once(
    "scripts/real-pilot-backend-integration.ts",
    '''    price_amount: 1,
    province: "İstanbul",
''',
    '''    price_amount: 1,
    category: "electronics",
    province: "İstanbul",
''',
)
replace_once(
    "scripts/migration-photo-fixture.ts",
    '''        price_amount: 100,
        province: "Tekirdağ",
''',
    '''        price_amount: 100,
        category: "electronics",
        province: "Tekirdağ",
''',
)

managed = "scripts/managed-supabase-migration-rehearsal.sh"
replace_once(
    managed,
    '''      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.sellers x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.seller_sessions x), '[]')
''',
    '''      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.sellers x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.seller_sessions x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.seller_role_assessments x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.listing_policy_decisions x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.listing_id)::text from private.listing_publication_controls x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.listing_enforcement_cases x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.listing_eligibility_transitions x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.external_sources x), '[]') || E'\\\\n' ||
      coalesce((select jsonb_agg(to_jsonb(x) order by x.id)::text from private.external_offers x), '[]')
''',
)
replace_once(
    managed,
    '''insert into public.listings (
  id, title, description, price_amount, province, district,
  seller_display_name, search_keywords, contact_channel, contact_e164, status
) values (
  '${listing_id}'::uuid,
  'Sentetik migration fotoğraf ilanı',
  'Managed-to-self-host DB ve Storage restore doğrulaması için sentetik ilan.',
  100,
  'Tekirdağ',
''',
    '''insert into public.listings (
  id, title, description, price_amount, category, province, district,
  seller_display_name, search_keywords, contact_channel, contact_e164, status
) values (
  '${listing_id}'::uuid,
  'Sentetik migration fotoğraf ilanı',
  'Managed-to-self-host DB ve Storage restore doğrulaması için sentetik ilan.',
  100,
  'electronics',
  'Tekirdağ',
''',
)

# -----------------------------------------------------------------------------
# Canonical docs: record only durable semantics. Live GitHub remains authoritative
# for the exact final SHA/workflow IDs, so this patch does not bake a moving SHA.
# -----------------------------------------------------------------------------
replace_once(
    "docs/PRODUCT_CONTRACT_V2.md",
    '''- Vehicle/Real Estate EİDS policy remains category-gated and fail-closed; no global e-Devlet login is introduced.
''',
    '''- Vehicle/Real Estate EİDS policy remains category-gated and fail-closed; no global e-Devlet login is introduced.
- The existing local synthetic EİDS test bypass is represented as an explicit service-role-only eligibility transition after the exact triple gate (`PILOT_SYNTHETIC_TEST_MODE=enabled` + loopback request host + loopback backend). Its provenance is `synthetic_test`; it never represents production/provider verification.
- Seller-editable category/product metadata may trigger deterministic reassessment but cannot automatically weaken the latest trusted operator/legal policy or trusted blocked/review eligibility. Deterministic EİDS/review requirements also outrank looser stored overrides.
- Enforcement state is recomputed from every active case: remove > hold > contact suppression > clear. Restoring one case cannot neutralize another unresolved blocking case.
''',
)
replace_once(
    "docs/ARAR_BULURUZ_CURRENT_STATE.md",
    '''- The architecture-freeze capability contract is fail-closed across search/detail/photo/contact/CTA without changing seller ownership.
''',
    '''- The architecture-freeze capability contract is fail-closed across search/detail/photo/contact/CTA without changing seller ownership.
- Advisor second-pass hardening preserves the existing loopback-only synthetic Vehicle/Real-Estate path through an auditable `synthetic_test` eligibility transition; production EİDS remains closed and fail-closed.
- Seller metadata reassessment now uses fail-closed trusted-policy/eligibility precedence, and enforcement is aggregated across all active cases rather than last-event-wins.
''',
)
replace_once(
    "docs/ACTIVE_CHAT_HANDOFF.md",
    '''- Do not start Phase 3.1 real-source external supply or public-launch readiness from this handoff.
''',
    '''- Do not start Phase 3.1 real-source external supply or public-launch readiness from this handoff.
- PR #89 Advisor second-pass closure additionally requires/implements: explicit loopback-only synthetic regulated eligibility evidence, trusted policy/eligibility precedence against seller metadata edits, aggregate multi-case enforcement recomputation, capability-aware restore verification, ordinary synthetic portability fixtures, and architecture/Phase-3 portability fingerprint coverage.
''',
)
replace_once(
    "docs/ARAR_BULURUZ_DECISION_LOG.md",
    '''## D-032 — Mandatory architecture freeze before external/public expansion
''',
    '''## D-033 — Architecture-freeze second-pass precedence and synthetic regulated test evidence

**Decision:** Preserve the existing Stage-1 local synthetic Vehicle/Real-Estate test path, but represent its post-triple-gate eligibility as an explicit service-role-only `synthetic_test` transition with auditable provenance and no production/provider-verification claim. Seller-editable metadata cannot lower stricter trusted policy/eligibility; deterministic EİDS/review scope cannot be lowered by looser overrides. Enforcement derives from all active cases, so restoration is aggregate rather than last-event-wins. Portability verification includes architecture-freeze and Phase-3 private state.

**Boundary:** No real EİDS provider integration, KYC, production activation, real merchant ingestion, public external offers, or ownership/auth changes.

## D-032 — Mandatory architecture freeze before external/public expansion
''',
)

print("PR #89 Advisor second-pass patch applied.")
