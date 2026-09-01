# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-09-01, Europe/Istanbul_

## Purpose

Short-lived continuity layer for the current Arar Buluruz work.

Live GitHub, executable evidence, `docs/ARAR_BULURUZ_CURRENT_STATE.md`, `docs/PRODUCT_CONTRACT_V2.md`, the backlog and the decision log remain authoritative.

## Roles and writer state

- Founder: final consequential decision owner.
- Main Execution Chat: primary implementation/debug/CI owner.
- Advisor Chat: roadmap, materiality, independent verification and final review.
- Codex/Work/Lovable remain specialist roles under `AI_OPERATING_MODEL_V2.md`.

One-writer rule remains active. No force-push/history rewrite. Tarladan remains untouched.

PR #83 is a temporary documentation-only synchronization scope. Live GitHub determines whether PR #83 is still open or has already merged.

While PR #83 remains open:

- branch: `agent/post-pr81-pr82-state-sync`;
- no application implementation work is permitted;
- no workflow, migration, backend, secret, production or external-service changes are permitted;
- keep PR #83 unmerged until final Advisor confirmation.

After PR #83 merges normally:

- repository writer state returns to **idle / no active implementation scope**;
- do not continue implementation from the docs-sync branch;
- the next permitted objective is the read-only **Activation Gate Review**.

## Live repository checkpoint

Repository: `ronurgungor/arar-buluruz`.

Pre-PR83 / docs-sync branch-base `main` checkpoint:

`27dc75c96ef687e1c585e27fac6521b172e04f31`

Live GitHub controls the exact current `main` SHA and PR #83 state.

Open PRs at branch start: **none**.

Latest completed milestones:

- PR #81 — hosted managed provider-proof modernization under D-029: **MERGED / CLOSED**;
  - approved head: `8ab785fefa80ee4122fc559298859b8281d4094d`;
  - merge commit: `8bfe6d7a89bbda6ef710aaf313bf24e312ec18eb`;
  - provider-specific managed proof is complete;
  - obsolete founder-entry hosted browser harness, localhost privileged shim and stale product-level artifact E2E are retired;
  - actual managed anonymous Storage direct-write denial is executable evidence.
- PR #82 — Stage 1 listing UX polish ported from the isolated Lovable UX lab: **MERGED / CLOSED**;
  - approved head: `abdcb3621575e870648519cf7adf6e57020bc33c`;
  - merge/current main: `27dc75c96ef687e1c585e27fac6521b172e04f31`;
  - public-phone disclosure appears exactly once;
  - photo remove target is 44×44;
  - sticky mobile action bar includes bottom safe-area handling.

Post-merge evidence on current main:

- CI run `33489222953`, attempt 3: **SUCCESS**;
  - lint/unit/build: **SUCCESS**;
  - Gate 1 local migration/RLS/REST/browser E2E: **SUCCESS**.
- V0 minimal PWA run `33489222873`: **SUCCESS**.

## Current product truth

Read `docs/PRODUCT_CONTRACT_V2.md`.

Current consumer model remains seller self-service → verified/remembered phone session → trusted photos → atomic auto-publication → public buyer flow, with founder post-moderation/takedown.

PR #82 changed presentation/UX only; it did not change backend, security, session, OTP, rate-limit, idempotency, migration or publication semantics.

## D-029 provider-proof state

D-029 modernization is **completed** through PR #81.

Retained provider-specific evidence covers:

- canonical managed migration-chain equality;
- dedicated synthetic-project/Tarladan hard exclusions;
- managed DB/RLS/grants and anon listing-write denial;
- actual managed anonymous `listing_photos` Storage API write rejection;
- private Storage plus lifecycle-controlled manifest/signing behavior;
- deterministic fixture byte/hash validation;
- DB + Storage backup/restore to the pinned self-host target;
- source/target application and Storage equality;
- rollback/source consistency and orphan checks;
- public artifact privilege/secret-residue boundary.

The thin actual-managed-provider current Stage 1 canary remains deliberately deferred to a later explicit gate.

## Deferred production/recovery items

These remain deferred by design:

- stale `in_progress` / pending-state recovery and orphan-reconciliation architecture;
- shared/distributed abuse state;
- explicit seller logout/shared-device hygiene;
- production proxy/TLS/host/client-IP semantics;
- cross-service delete reconciliation.

## Business/formalization state

Current planning assumption remains:

**APPLICATION COMPLETION → GVK MÜKERRER 20/B PERSONAL-DEVELOPER ROUTE (while applicable) → MARKET/REVENUE VALIDATION → COMPANY / KOSGEB ONLY WHEN REQUIRED OR ADVANTAGEOUS**

Before first taxable revenue, then-current eligibility/mechanics must be re-verified. This does not open any production/legal/data gate.

## Hard boundaries

Still closed unless separately authorized:

- real personal/seller/listing/contact/photo data;
- production/public activation;
- AWS;
- recurring paid infrastructure/services;
- real SMS;
- production EİDS;
- Ads/monetization;
- payment/order/reservation/commission/in-app chat;
- Tarladan changes.

**REAL DATA COLLECTION remains CLOSED.**

## Immediate next objective

**Activation Gate Review — determine exactly what remains before the first real listing / real pilot can legally and technically open.**

This next step is a review/decision package only. Do not implement activation work, provision infrastructure, connect production services or collect real data during that review.
