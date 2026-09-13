#!/usr/bin/env bash
set -euo pipefail

db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -n 1)"
if [[ -z "$db_container" ]]; then
  echo "Local Supabase Postgres container was not found." >&2
  exit 1
fi

listing_id="f3160000-0000-4000-8000-000000000001"
case_a="f3160000-0000-4000-8000-000000000101"
case_b="f3160000-0000-4000-8000-000000000102"
log_dir="${RUNNER_TEMP:-/tmp}/architecture-freeze-concurrency"
mkdir -p "$log_dir"

psql_exec() {
  docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

cleanup() {
  set +e
  psql_exec -c "delete from public.listings where id = '${listing_id}'::uuid;" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

psql_exec <<SQL
insert into public.listings (
  id, title, description, price_amount, category, province, district,
  seller_display_name, contact_channel, contact_e164, publication_instruction_at,
  listing_rules_version, listing_rules_accepted_at,
  status, published_at, expires_at
) values (
  '${listing_id}'::uuid,
  'Astra enforcement concurrency fixture',
  'Synthetic local-only two-session serialization regression.',
  1,
  'electronics',
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  'phone_whatsapp',
  '+12025550316',
  now() - interval '2 minutes',
  'architecture-freeze-v1',
  now() - interval '90 seconds',
  'published',
  now() - interval '1 minute',
  now() + interval '1 day'
);

insert into private.listing_external_sales_links (
  listing_id, canonical_url, canonical_host, provider_key, url_security_classification,
  ownership_status, listing_match_status, moderation_status, complaint_status,
  public_cta_decision
) values (
  '${listing_id}'::uuid,
  'https://shopier.com/astra-enforcement-concurrency-fixture',
  'shopier.com',
  'shopier',
  'KNOWN_PROVIDER_CANDIDATE',
  'confirmed',
  'matched',
  'approved',
  'clear',
  'allow_public_cta'
);

insert into private.listing_enforcement_cases (
  id, listing_id, reason_type, reason_detail, decision_action, action_at, created_origin
) values (
  '${case_a}'::uuid,
  '${listing_id}'::uuid,
  'operator_review',
  'Astra existing remove A',
  'remove',
  now(),
  'operator'
);
SQL

initial_state="$(psql_exec -At -F '|' -c "
  select enforcement_state, contact_state
  from private.listing_publication_controls
  where listing_id = '${listing_id}'::uuid;
")"
if [[ "$initial_state" != "removed|suppressed" ]]; then
  echo "Unexpected initial enforcement state: $initial_state" >&2
  exit 1
fi

# Session A inserts a second unresolved remove case. Its AFTER trigger recomputes and
# acquires the listing controls row lock, then this transaction deliberately stays open.
psql_exec -c "
  begin;
  insert into private.listing_enforcement_cases (
    id, listing_id, reason_type, reason_detail, decision_action, action_at, created_origin
  ) values (
    '${case_b}'::uuid,
    '${listing_id}'::uuid,
    'operator_review',
    'Astra concurrent unresolved remove B',
    'remove',
    now(),
    'operator'
  );
  select pg_sleep(5);
  commit;
" >"$log_dir/session-a.log" 2>&1 &
session_a_pid=$!

# Give session A enough time to finish the INSERT trigger and enter pg_sleep while
# retaining the controls-row lock. Session B then restores A in an independent DB session.
sleep 1
psql_exec -c "
  begin;
  update private.listing_enforcement_cases
  set appeal_state = 'restored', restored_at = now(), updated_at = now()
  where id = '${case_a}'::uuid;
  commit;
" >"$log_dir/session-b.log" 2>&1 &
session_b_pid=$!

if ! wait "$session_a_pid"; then
  cat "$log_dir/session-a.log" >&2
  exit 1
fi
if ! wait "$session_b_pid"; then
  cat "$log_dir/session-b.log" >&2
  exit 1
fi

final_state="$(psql_exec -At -F '|' -c "
  select
    c.enforcement_state,
    c.contact_state,
    exists (
      select 1
      from private.listing_enforcement_cases e
      where e.id = '${case_b}'::uuid
        and e.decision_action = 'remove'
        and e.restored_at is null
        and e.appeal_state <> 'restored'
    ) as unresolved_b,
    public.listing_has_public_capability('${listing_id}'::uuid, 'search_index'),
    public.listing_has_public_capability('${listing_id}'::uuid, 'detail'),
    public.listing_has_public_capability('${listing_id}'::uuid, 'signed_photo'),
    public.listing_has_public_capability('${listing_id}'::uuid, 'public_contact'),
    public.listing_has_public_capability('${listing_id}'::uuid, 'external_cta')
  from private.listing_publication_controls c
  where c.listing_id = '${listing_id}'::uuid;
")"

expected="removed|suppressed|t|f|f|f|f|f"
if [[ "$final_state" != "$expected" ]]; then
  echo "Concurrent enforcement serialization regression failed." >&2
  echo "Expected: $expected" >&2
  echo "Actual:   $final_state" >&2
  echo "Session A:" >&2
  cat "$log_dir/session-a.log" >&2 || true
  echo "Session B:" >&2
  cat "$log_dir/session-b.log" >&2 || true
  exit 1
fi

echo "Concurrent enforcement regression passed: session B waited behind the per-listing controls lock, then recomputed from committed active cases; unresolved remove B remained authoritative and every public capability stayed false."
