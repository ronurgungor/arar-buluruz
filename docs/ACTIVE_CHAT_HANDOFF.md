# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-09-03, Europe/Istanbul_

## Purpose

Short-lived continuity layer for the active SMSless seller ownership Phase 1 closure. Live GitHub and executable evidence remain authoritative.

## Writer and repository state

- Founder: final consequential decision owner.
- Main Execution Chat: active repository writer for this bounded Phase 1 closure.
- Advisor Chat: roadmap/materiality/final review.
- Repository: `ronurgungor/arar-buluruz`.
- Canonical `main` at startup: `47956ef9f4e91cd6dd033d988c9c115bb1f128b7`.
- Active branch: `agent/smsless-seller-ownership-phase1`.
- Latest implementation checkpoint immediately before this final documentation refresh: `966387b4e4244e960a644b2f4f03a55283199f86`.
- At that checkpoint: 30 ahead / 0 behind `main`; open PRs: none.
- This final documentation commit advances the branch; live GitHub controls the exact current head.

No new branch. No rebase/amend/squash/force-push. Tarladan untouched.

## Current founder/Advisor product truth — D-030

- Ordinary-goods SMS OTP is no longer a product requirement.
- Seller ownership identity is a pseudonymous UUID.
- Listings bind ownership through `seller_id → listings.owner_user_id`.
- Seller access uses a server-side revocable opaque HttpOnly cookie session.
- Seller recovery uses a rotating high-entropy recovery code; only selector/digest are persisted. Replacement candidates are browser-generated and displayed before irreversible rotation.
- Public phone is contact data, not verified identity or authorization.
- Equal phones do not imply the same seller; phone change does not transfer ownership.
- Manual line/WhatsApp verification is risk-triggered only.
- No general e-Devlet login.
- Passkey/email/OAuth/password are deferred.
- Vasıta **and Emlak** require EİDS before real production publication.

## Security evidence already implemented

- Session and recovery plaintext are not stored in DB.
- Browser E2E rejects seller-phone localStorage fallback.
- Recovery atomically installs the browser's pre-generated candidate, revokes old sessions and rejects consumed-old replay; ambiguous response loss can be reconciled with the saved candidate, while no-commit leaves the old credential usable.
- Every logout attempt clears the browser cookie; an unconfirmed backend revoke returns partial failure rather than claiming server logout completed.
- Owner UUID is immutable.
- Historical rows are not ownership-backfilled from contact equality.
- Anon cannot inspect private seller/session state or execute session/recovery/reconciliation RPCs.
- Normal self-service and exceptional founder publication fail closed for production Vasıta/Emlak without EİDS; synthetic bypass additionally requires explicit default-off `PILOT_SYNTHETIC_TEST_MODE=enabled` plus applicable loopback request/backend conditions.
- RLS, private Storage, trusted-photo/signed-photo, idempotency, atomic publication and takedown controls remain in their canonical tests/workflows.

## Stale-reference sweep

Current/shipping paths have been corrected for ordinary-goods OTP, verified-phone identity/authorization, phone-equality ownership and phone-bound session assumptions.

Historical dated evidence and superseded decision records intentionally retain their original terminology, but D-030 and the current canonical documents mark those semantics as historical.

## PR #84 security-remediation checkpoint

- Accepted Codex/Advisor findings only were remediated; the deferred transactional in-flight mutation/revocation redesign remains out of scope.
- Focused Stage 1 run `33798081542` on implementation head `4705144b08f7d58b06d204e436cc42821418f521` is **SUCCESS** across lint/unit, DB/RLS/trusted-photo and canonical browser regression coverage.
- Current/shipping UI sweep found no remaining verified-phone ownership/authorization claims after the `ilan-kurallari.tsx` correction. Historical and negative-regression terminology remains intentionally preserved.
- Final seven canonical workflows must be GREEN on the exact head created by this documentation refresh.
- PR #84 must remain unmerged pending the second Codex exact-head security review.

## Workflow checkpoint

Exact head `c83fff4b261d7ba9e2ed1f5e14ac70af387c62d7` previously had SUCCESS for:

- CI;
- Stage 1 self-service acceptance;
- Activation readiness;
- V0 minimal PWA;
- Real pilot backend prep;
- Self-host migration rehearsal.

Those are not sufficient for the final Phase 1 head after stale-reference/docs changes.

## Immediate next action

1. Verify the new exact branch SHA and clean/ahead-behind/PR state.
2. Obtain all required canonical workflows on that **same exact SHA**.
3. Only with required checks GREEN, open one PR to `main`; **do not merge**.
4. Allow/trigger Managed Supabase migration rehearsal as its PR gate requires.
5. Require every canonical workflow GREEN on that same exact PR head.
6. Stop and report exact SHA, PR number, changed files, security/migration summary, stale-sweep result, workflow IDs/results and remaining materiality.
7. Independent Codex exact-head security review happens after this stop and before Advisor merge decision.

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
