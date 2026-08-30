# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-08-28, Europe/Istanbul_

## Purpose

Short-lived continuity layer for the active Arar Buluruz execution.

Live GitHub, exact workflow evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, `PRODUCT_CONTRACT_V2.md` and the decision log remain authoritative. Verify repository state before acting.

## Roles and repository discipline

- Founder: final consequential decision owner.
- Main Execution Chat: normal implementation/debug/CI/docs synchronization.
- Advisor: independent product/strategy/risk review.
- Codex: narrow specialist escalation for genuinely difficult engineering/security/concurrency defects when available.
- Lovable: optional bounded frontend accelerator only.

One-writer rule remains active. No force-push/history rewrite. Tarladan remains untouched.

## Active repository work

Repository: `ronurgungor/arar-buluruz`

PR #78: **OPEN / DRAFT / UNMERGED**

Branch: `agent/stage1-self-service-v2`

Technical exact-head acceptance is complete at `382445537668c6f810e689d26f1d9f60c20e05f0`.

All seven canonical workflows are **SUCCESS** on that exact SHA:

- Activation readiness — `33202153552`;
- V0 minimal PWA — `33202153522`;
- CI — `33202153564`;
- Real pilot backend prep — `33202153443`;
- Stage 1 Phase A code gate — `33202153438`;
- Self-host migration rehearsal — `33202153428`;
- Stage 1 self-service acceptance — `33202153469`.

The current task is documentation/PR-metadata closure only. Do not open a new product or implementation batch. Any docs-only head created after this checkpoint must itself re-pass all seven workflows before becoming the final review SHA.

## Current product truth

Read `docs/PRODUCT_CONTRACT_V2.md` first.

Current consumer model:

- Türkiye-wide İl / İlçe;
- seller self-service;
- 1–8 trusted photos;
- broad categories;
- condition optional, no default;
- description optional;
- price or Ücretsiz;
- seller display name + one verified public phone;
- **no seller contact preference**;
- buyer always derives **Ara + WhatsApp** from the same E.164 phone;
- no three declaration checkboxes;
- versioned listing-rules evidence instead of fabricated legacy declaration timestamps;
- bounded 7-day phone-bound signed **HttpOnly** seller session;
- phone/challenge/seller-specific rate limiting plus coarse trusted-IP protection;
- atomic auto-publication;
- founder post-moderation/takedown;
- lightweight `İlanlarım`;
- search normalization including `b150` ↔ `b 150`;
- Vasıta retained, but real vehicle publication fail-closed until EİDS is enabled.

Older Çorlu-only, founder-entry/pre-approval, contact-choice, checkbox-declaration and JavaScript-readable capability assumptions are historical/superseded where they conflict.

## Frozen security/backend invariants

Do not reopen without a demonstrated defect:

- RLS/grants;
- service-role outside browser;
- direct anon-write denial;
- private Storage;
- trusted image sanitization;
- signed-photo lifecycle;
- seller phone ownership isolation;
- idempotency/race handling;
- atomic publication;
- partial-failure/orphan cleanup;
- founder takedown fail-closed behavior.

## Business sequence

Settled founder sequence:

**APPLICATION COMPLETION → ŞAHIS ŞİRKETİ → KOSGEB → SUPPORT / INVESTMENT → FUNDED PRODUCTION / LEGAL / EİDS / INFRASTRUCTURE**

Production, real personal data, AWS, recurring paid services, real SMS, live Ads, production EİDS, payments and Tarladan changes remain OFF.

## Immediate closure objective

1. synchronize the remaining canonical current-state wording and PR #78 metadata only;
2. make no application/security behavior change;
3. rerun all seven canonical workflows on the resulting docs-only exact SHA;
4. keep PR #78 **OPEN / DRAFT / UNMERGED**;
5. send the final all-green SHA to independent Codex read-only review, then Advisor/founder review.

If documentation reconciliation exposes a genuine material implementation mismatch, stop and report it rather than changing architecture in this closure pass.
