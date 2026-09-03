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
- Pre-final-documentation branch checkpoint: `64124531296857b2a67ada154da72c2fe265f488`.
- At that checkpoint: 27 ahead / 0 behind `main`; open PRs: none.
- This documentation commit advances the branch; live GitHub controls the exact current head.

No new branch. No rebase/amend/squash/force-push. Tarladan untouched.

## Current founder/Advisor product truth — D-030

- Ordinary-goods SMS OTP is no longer a product requirement.
- Seller ownership identity is a pseudonymous UUID.
- Listings bind ownership through `seller_id → listings.owner_user_id`.
- Seller access uses a server-side revocable opaque HttpOnly cookie session.
- Seller recovery uses a rotating high-entropy recovery code; only selector/digest are persisted.
- Public phone is contact data, not verified identity or authorization.
- Equal phones do not imply the same seller; phone change does not transfer ownership.
- Manual line/WhatsApp verification is risk-triggered only.
- No general e-Devlet login.
- Passkey/email/OAuth/password are deferred.
- Vasıta **and Emlak** require EİDS before real production publication.

## Security evidence already implemented

- Session and recovery plaintext are not stored in DB.
- Browser E2E rejects seller-phone localStorage fallback.
- Recovery atomically rotates, revokes old sessions and rejects replay.
- Logout revokes the server-side session.
- Owner UUID is immutable.
- Historical rows are not ownership-backfilled from contact equality.
- Anon cannot inspect private seller/session state or execute session/recovery RPCs.
- Normal self-service and exceptional founder publication fail closed for production Vasıta/Emlak without EİDS.
- RLS, private Storage, trusted-photo/signed-photo, idempotency, atomic publication and takedown controls remain in their canonical tests/workflows.

## Stale-reference sweep

Current/shipping paths have been corrected for ordinary-goods OTP, verified-phone identity/authorization, phone-equality ownership and phone-bound session assumptions.

Historical dated evidence and superseded decision records intentionally retain their original terminology, but D-030 and the current canonical documents mark those semantics as historical.

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
