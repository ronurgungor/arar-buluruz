# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-09-04, Europe/Istanbul_

## Purpose

Short-lived continuity layer for the final PR #84 closure. Live GitHub and executable exact-head evidence remain authoritative.

## Writer and repository state

- Founder: final consequential decision owner.
- Main Execution Chat: repository writer for this bounded documentation-only closure.
- Advisor Chat: roadmap/materiality/final review.
- Repository: `ronurgungor/arar-buluruz`.
- Canonical `main`: `47956ef9f4e91cd6dd033d988c9c115bb1f128b7`.
- Active branch: `agent/smsless-seller-ownership-phase1`.
- Advisor-reviewed security implementation head immediately before this docs-only sync: `e841cf688b8cafb97d0508d0c1afec9e96446670`.
- At that checkpoint: 52 commits ahead / 0 behind `main`.
- PR #84: **OPEN / UNMERGED**.
- The commit containing this handoff is the final docs-only synchronization head. A Git commit cannot embed its own SHA without changing that SHA; resolve the exact current/final head from the live PR/GitHub and bind all post-sync workflow evidence to that one SHA.

No new branch. No rebase/amend/squash/force-push. No security/application/database/workflow/dependency/runtime behavior changes in this sync. Tarladan untouched.

## Current founder/Advisor product truth — D-030

- Ordinary-goods SMS OTP is no longer a product requirement.
- Seller ownership identity is a pseudonymous UUID.
- Listings bind ownership through `seller_id → listings.owner_user_id`.
- Seller access uses a server-side revocable opaque HttpOnly cookie session.
- Seller recovery uses a rotating one-time high-entropy recovery credential; only selector/digest state is persisted.
- Public phone is contact data, not verified identity or authorization.
- Equal phones do not imply the same seller; phone change does not transfer ownership.
- Manual line/WhatsApp verification is risk-triggered only.
- No general e-Devlet login.
- Passkey/email/OAuth/password are deferred.
- Vasıta **and Emlak** require EİDS before real production publication.

## Final recovery-security semantics

The second Codex exact-head review identified a BLOCKER in the then-current non-rotating recovery reconciliation path. Advisor accepted the finding. The second remediation closes it without adding a persistent pending-recovery state machine.

Ambiguous recovery now works as follows:

1. normal recovery attempts atomic `A → B` through `recover_seller_identity(...)`;
2. if the browser cannot determine the response outcome, it generates and displays replacement candidate **C before any reconciliation mutation**;
3. reconciliation attempts `B → C` through the same atomic `recover_seller_identity(...)` primitive;
4. if `A → B` committed, `B → C` succeeds, B is consumed, C becomes current, pre-existing seller sessions are revoked and a fresh browser session is created;
5. if `A → B` did not commit, `B → C` fails; the application does **not** claim that A is definitely still valid because concurrent rotation cannot be excluded;
6. a successfully used/reconciled B cannot be replayed.

Plaintext recovery/session credentials are not persisted. The browser possesses/displays replacement C before irreversible reconciliation rotation.

## Migration and privilege state

The canonical migration chain contains **12 migrations**.

Relevant Phase 1 migrations:

- `20260903130000_prepare_smsless_seller_ownership.sql` — pseudonymous seller identity, opaque seller sessions and rotating recovery digest foundation;
- `20260903193000_reconcile_seller_recovery.sql` — historical append-only migration that introduced the first reconciliation RPC;
- `20260904070000_retire_nonrotating_recovery_reconciliation.sql` — append-only remediation that revokes/drops the unsafe non-rotating `reconcile_seller_recovery(...)` RPC from the final schema and preserves explicit recovery privilege boundaries.

Final schema truth:

- obsolete `reconcile_seller_recovery(...)` is absent;
- `recover_seller_identity(...)` remains privileged/service-role-only;
- `public`, `anon` and `authenticated` cannot execute privileged seller recovery RPCs.

No existing migration history was rewritten.

## Rate-limit closure

The second Codex review also identified process-memory recovery rate-limit growth as IMPORTANT. Advisor accepted it and the second remediation closed it with bounded local hardening only:

- trusted-IP limiting runs before attacker-controlled recovery selector bucket allocation;
- expired process-local buckets are swept periodically;
- the in-process bucket map has a fixed upper bound and fails closed rather than growing indefinitely;
- no Redis, distributed limiter dependency or broad production architecture was introduced.

Shared/distributed abuse state remains a separate deferred production concern.

## Exact-head evidence before this docs-only sync

Advisor-reviewed security head:

`e841cf688b8cafb97d0508d0c1afec9e96446670`

Focused/canonical Stage 1 security run:

- Stage 1 self-service acceptance — `33848314033` — **SUCCESS**; includes lint/unit, 12-migration rebuild, pgTAP/RLS/trusted-photo probes and the rotating-recovery browser regression.

All seven canonical workflows on that same `e841cf6...` head were **SUCCESS**:

- CI — `33848313993` — SUCCESS;
- Stage 1 self-service acceptance — `33848314033` — SUCCESS;
- Activation readiness — `33848313967` — SUCCESS;
- V0 minimal PWA — `33848313970` — SUCCESS;
- Real pilot backend prep — `33848313977` — SUCCESS;
- Self-host migration rehearsal — `33848313963` — SUCCESS;
- Managed Supabase migration rehearsal — `33848313976` — SUCCESS.

This 7/7 set is immutable evidence for `e841cf6...`; because the present docs-only commit advances the branch, the same seven canonical workflows must also be GREEN on the new exact docs-only head before the next review.

## Review state

- First security remediation: closed before the second Codex review.
- Second Codex exact-head review: completed; it found the non-rotating reconciliation BLOCKER and process-memory rate-limit IMPORTANT.
- Advisor disposition: both findings accepted.
- Second remediation: both findings closed on `e841cf6...`; Advisor independently inspected that exact head and found no new blocker in the 8-file remediation.
- Remaining pre-merge security gate: **one final narrow Codex exact-head recovery-security closure review after this docs-only sync is 7/7 GREEN**.
- PR #84 must remain OPEN / UNMERGED until that review and the later Advisor/founder merge decision.

## Immediate next action

1. Verify this synchronization changed documentation files only relative to `e841cf6...`.
2. Resolve the new exact PR head and verify `main` remains unchanged.
3. Require all seven canonical workflows SUCCESS on that same new exact head.
4. Keep PR #84 OPEN / UNMERGED.
5. Stop for the final narrow Codex exact-head recovery-security closure review.

No security implementation, migration, runtime, production, real-data or external-service activation work belongs in this step.

## Hard boundaries

Remain closed:

- production/public activation;
- real personal/seller/listing/contact/photo data;
- AWS/production infrastructure;
- secrets/env mutation;
- paid services;
- real SMS;
- production EİDS calls;
- Ads/monetization;
- payments/orders/reservations/commission;
- Publish/Update;
- Tarladan changes;
- history rewrite.
