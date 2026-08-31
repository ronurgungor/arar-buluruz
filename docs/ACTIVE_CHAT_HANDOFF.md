# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-08-31, Europe/Istanbul_

## Purpose

Short-lived continuity layer for the current Arar Buluruz work.

Live GitHub, the exact implementation branch/PR, executable evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, `PRODUCT_CONTRACT_V2.md` and the decision log remain authoritative.

## Roles and writer state

- Founder: final consequential decision owner.
- Main Execution Chat: primary implementation/debug/CI owner and current writer for this scope.
- Advisor Chat: roadmap, materiality, independent verification and final review.
- Codex/Work/Lovable remain specialist roles under `AI_OPERATING_MODEL_V2.md`.

One-writer rule is active. No force-push/history rewrite. Tarladan remains untouched.

Active repository-writing scope:

- branch: `agent/modernize-hosted-managed-proof`;
- objective: modernize hosted managed evidence under D-029 without changing application/product behavior;
- no new secret, production activation, real data or manual managed-Supabase mutation outside the existing synthetic CI proof.

## Live repository checkpoint

Repository: `ronurgungor/arar-buluruz`.

Canonical `main` at branch start:

`7ca851e805b0d01d66b2533cad94158a4b7f6b4b`

Recently closed milestones:

- PR #78 — Stage 1 seller self-service: **MERGED / CLOSED**, merge `26ce6c66de8a03d941d90ff7fe267998ad63ba8f`;
- PR #79 — managed workflow parse/config + migration-chain drift: **MERGED / CLOSED**, merge `1207cf177469d1835abb56d914bd3d80858a0b1a`;
- PR #80 — post-PR79 state + GVK Mükerrer 20/B synchronization: **MERGED / CLOSED**, merge/current branch-start main `7ca851e805b0d01d66b2533cad94158a4b7f6b4b`.

The earlier PR #80 OPEN wording was historical and is superseded by this live checkpoint.

## Current product truth

Read `docs/PRODUCT_CONTRACT_V2.md`.

Current consumer model remains seller self-service → verified/remembered phone session → trusted photos → atomic auto-publication → public buyer flow, with founder post-moderation/takedown. The old founder-entry/preapproval journey is not current Stage 1 acceptance.

## Hosted managed-proof modernization

D-029 controls this implementation.

This branch retires the obsolete hosted founder-entry browser harness and localhost privileged shim rather than extending them.

Provider-specific evidence remains executable through the dedicated synthetic managed project and the pinned portability rehearsal:

- canonical migration-chain equality derived from `supabase/migrations/*.sql`;
- dedicated-project/Tarladan exclusions;
- managed DB/RLS/grant semantics and anon write denial;
- private `listing_photos` plus lifecycle-controlled manifest/signing;
- deterministic fixture bytes/hash;
- DB + Storage backup/restore;
- pinned self-host target verification;
- source/target application fingerprint and Storage equality;
- rollback/source consistency and explicit orphan checks;
- public pilot artifact privilege/secret boundary.

Current Stage 1 seller lifecycle behavior remains owned by the canonical Stage 1 acceptance workflow; it is not duplicated through a managed-provider shim.

Acceptance of this branch remains pending exact-head workflow evidence and Advisor review. Keep its PR OPEN / UNMERGED.

## Business/formalization state

Current planning assumption remains:

**APPLICATION COMPLETION → GVK MÜKERRER 20/B PERSONAL-DEVELOPER ROUTE (while applicable) → MARKET/REVENUE VALIDATION → COMPANY / KOSGEB ONLY WHEN REQUIRED OR ADVANTAGEOUS**

Before first taxable revenue, re-verify then-current eligibility/mechanics. This does not open any production/legal/data gate.

## Hard boundaries

Still closed unless separately authorized:

- production/public activation;
- real personal/seller/listing/photo data;
- AWS or recurring paid infrastructure;
- real SMS;
- production EİDS;
- Ads/monetization;
- payment/order/reservation/commission;
- Tarladan changes.

## Immediate next action

1. require focused static/syntax success on the implementation head;
2. require the managed hosted provider/portability job to execute and succeed, not skip;
3. verify the normal canonical workflows triggered by the diff;
4. stop on any new genuine provider/security/data-integrity defect;
5. leave the PR OPEN / UNMERGED for Advisor final review.
