# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-08-31, Europe/Istanbul_

## Purpose

Short-lived continuity layer for the current Arar Buluruz work.

Live GitHub, the exact branch/PR under review, executable evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, `PRODUCT_CONTRACT_V2.md` and the decision log remain authoritative. Verify live repository state before acting.

## Roles and writer state

- Founder: final consequential decision owner.
- Main Execution Chat: primary implementation/debug/CI owner.
- Advisor Chat: roadmap, materiality, independent verification and specialist routing.
- Codex: budgeted specialist engineer for unusually difficult engineering/security/debugging.
- Work: budgeted independent research/review for consequential or difficult-to-reverse decisions.
- Lovable: credit-budgeted frontend/UX implementation specialist.

One-writer rule remains active. No force-push/history rewrite. Tarladan remains untouched.

This documentation synchronization is the only active repository-writing scope at this checkpoint. No application/security implementation is being changed here.

## Live repository checkpoint

Repository: `ronurgungor/arar-buluruz`

Canonical `main` at the start of this documentation sync:

`1207cf177469d1835abb56d914bd3d80858a0b1a`

Recently closed milestones:

- PR #78 — Stage 1 seller self-service: **MERGED / CLOSED**
  - approved pre-merge head: `834ad8d5e96117bc8793e1de6f6d5054c54eac55`
  - merge commit: `26ce6c66de8a03d941d90ff7fe267998ad63ba8f`
- PR #79 — managed rehearsal workflow parse + migration-chain drift: **MERGED / CLOSED**
  - approved pre-merge head: `83dcaa6c3331af00789576f3e88e86fe7f2e4d89`
  - merge commit/current main checkpoint: `1207cf177469d1835abb56d914bd3d80858a0b1a`
  - post-merge CI run `33401751662`: **SUCCESS**
  - post-merge V0 PWA run `33401751621`: **SUCCESS**

PR #79 also restored the intended managed-rehearsal trigger behavior: `pull_request` + `workflow_dispatch`; no synthetic push-only false failure is expected on `main`.

## Current product truth

Read `docs/PRODUCT_CONTRACT_V2.md`.

Current consumer model remains Türkiye-wide seller self-service with trusted private photos, verified public phone, Ara + WhatsApp, atomic auto-publication, lightweight `İlanlarım`, and founder post-moderation/takedown.

Production, real data, real SMS, production EİDS, Ads/monetization, payments, recurring paid infrastructure and Tarladan changes remain separately gated.

## Business/formalization update

The founder has replaced the automatic “company first” sequence.

Current planning assumption:

**APPLICATION COMPLETION → GVK MÜKERRER 20/B PERSONAL-DEVELOPER ROUTE (while applicable) → MARKET/REVENUE VALIDATION → COMPANY / KOSGEB ONLY WHEN REQUIRED OR ADVANTAGEOUS**

Before the first taxable receipt, current statutory eligibility and operational conditions for GVK Mükerrer 20/B must be re-verified. This tax/formalization route does not waive KVKK, EİDS, platform, real-data or production-activation obligations.

## Hosted managed-proof strategy

PR #79 fixed the workflow parser/config problem and canonical migration-chain drift.

The remaining old hosted browser failure is **not treated as a current application regression**. The legacy hosted proof still encodes the superseded founder-entry/preapproval product and relies on a localhost shim that does not implement the current moderation photo-signing route.

Accepted strategy:

- **now:** provider-specific managed proof only — canonical migrations, DB/RLS/grants, private Storage/signing, backup/restore/rollback/fingerprint and artifact privilege boundary;
- **do not:** add a shim signing route merely to make the old journey green;
- **do not:** rebuild the full current seller lifecycle through the shim;
- **later:** add one thin actual-managed-provider Stage 1 canary only when a deliberate server-only service-role secret/gate is justified.

The old full founder-entry hosted journey is historical evidence, not current Stage 1 product acceptance.

## Immediate next action after this docs sync

1. close this documentation synchronization cleanly;
2. Main Execution Chat opens a separate hosted-proof modernization branch/PR;
3. keep that modernization bounded to the accepted provider-specific proof strategy and do not add new secrets;
4. after the hosted-proof cleanup, actively route a high-value user-visible frontend/UX polish batch to Lovable when free/expiring credits are available.

Do not open production, real-data, AWS, paid recurring services, real SMS, production EİDS, Ads or Tarladan changes as part of these steps.
