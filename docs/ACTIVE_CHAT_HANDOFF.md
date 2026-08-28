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

The current task is the final PR #78 closure pass. Do not open a new product batch. Final closure requires all seven canonical workflows SUCCESS on one exact SHA.

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

1. fix only bounded repository-controlled regressions/stale acceptance contracts;
2. synchronize canonical docs and Issue #75;
3. run all seven canonical workflows on one exact SHA;
4. keep PR #78 DRAFT / UNMERGED;
5. stop for independent Advisor/founder review.

If a genuinely difficult architecture/security/concurrency defect appears, preserve Git state and route to Advisor/Codex instead of improvising a redesign.
