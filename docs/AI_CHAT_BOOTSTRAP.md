# Arar Buluruz — New Chat Bootstrap

_Last reviewed: 2026-08-27, Europe/Istanbul_

## Purpose

This is the common entry point for a new Arar Buluruz chat.

A new chat must reconstruct both:

- **what the project currently is**, and
- **what role this chat has in the team**.

Do not assume room numbers are permanent identities. `Sohbet N` and `Sohbet Danışman N` are rolling rooms; the Main Execution and Advisor roles persist across them.

## Mandatory reading order

1. [`../AGENTS.md`](../AGENTS.md)
2. [`AI_OPERATING_MODEL_V2.md`](AI_OPERATING_MODEL_V2.md)
3. [`ACTIVE_CHAT_HANDOFF.md`](ACTIVE_CHAT_HANDOFF.md)
4. [`ARAR_BULURUZ_CURRENT_STATE.md`](ARAR_BULURUZ_CURRENT_STATE.md)
5. [`PRODUCT_CONTRACT_V2.md`](PRODUCT_CONTRACT_V2.md)
6. exact active branch/PR/issue and executable evidence
7. [`ARAR_BULURUZ_PROJECT_MEMORY.md`](ARAR_BULURUZ_PROJECT_MEMORY.md)
8. [`ARAR_BULURUZ_DECISION_LOG.md`](ARAR_BULURUZ_DECISION_LOG.md)
9. [`ARAR_BULURUZ_BACKLOG.md`](ARAR_BULURUZ_BACKLOG.md) as needed
10. relevant technical contracts / dated evidence
11. [`AI_TEAM_CAPABILITIES.md`](AI_TEAM_CAPABILITIES.md) and [`WORK_CODEX_CAPABILITY_PROFILE.md`](WORK_CODEX_CAPABILITY_PROFILE.md) only as historical capability evidence where useful

GitHub `main`, exact active branch/PR and executable evidence override summaries and chat memory.

`AI_OPERATING_MODEL_V2.md` overrides older capability documents on **current role ownership, routing and handoff protocol** unless a later explicit founder decision supersedes it.

## First action in every new room

Before giving a material project answer:

1. verify live repository `main` SHA;
2. verify active PR/issue state relevant to the task;
3. identify whether this room is the **Main Execution Chat**, **Advisor Chat** or a specialist/reviewer;
4. identify the current active writer before any repository mutation;
5. compare the dated `ACTIVE_CHAT_HANDOFF.md` snapshot with live GitHub and correct stale facts mentally before proceeding.

Do not ask the founder to repeat project history that can be recovered from these sources.

## Project identity

- Product: **Arar Buluruz**
- Repository: `ronurgungor/arar-buluruz`
- Canonical branch: `main`
- Founder-local checkout: `C:\Projects\arar-buluruz`
- Public Lovable URL: `https://arar-buluruz.lovable.app`
- Independent from Tarladan; no shared code/data/integrations/brand assets.

## Product thesis

Arar Buluruz is a simple, mobile-first, search-first classifieds concept for Türkiye.

Core principles:

- users type what they need rather than being forced through a category tree;
- listings should be fast to scan and easy to act on;
- product complexity stays low until real evidence justifies it;
- initial marketplace interaction happens outside the platform;
- monetization comes after product/liquidity evidence, not before it.

The business objective is not to build an impressive prototype. It is to learn whether the product can obtain **real demand, repeatable marketplace value and eventually sustainable profit**.

## Truth-first standard

The founder explicitly prioritizes facts over reassurance.

Do not protect sunk cost. Do not inflate theoretical risks into blockers. Do not minimize real risks to sound optimistic.

Prefer:

1. verified facts;
2. official/current sources;
3. real product evidence;
4. clearly labelled inference/interpretation;
5. recommendation.

For reviews classify findings as:

- `BLOCKER`
- `IMPORTANT`
- `CAN WAIT`
- `FALSE POSITIVE / OVERENGINEERING`

Every proposed blocker must answer:

> Why exactly does this stop the specific next bounded experiment?

## Current technical evidence boundary

Exact details and SHAs belong in `ARAR_BULURUZ_CURRENT_STATE.md` and live GitHub.

At this bootstrap revision, canonical evidence already supports:

- Development PASS;
- portability PASS;
- hosted synthetic pilot release-candidate technical proof PASS;
- founder-controlled synthetic create/photo/publish/public-contact/unpublish/delete lifecycle proof;
- private Storage + signed-photo delivery proof;
- migration/backup/restore/rollback portability proof;
- PWA/offline/fail-closed production-artifact proof;
- privileged/service-role material outside the public browser artifact.

Do not casually rebuild already-proven architecture without a material new reason.

Repository readiness is not the same as live production activation.

## Current product direction

Use `PRODUCT_CONTRACT_V2.md` and `ACTIVE_CHAT_HANDOFF.md` for current product truth.

The current product is a Türkiye-wide consumer classifieds experience with:

- seller self-service listing creation;
- 1–8 trusted photos;
- broad categories;
- condition selection;
- priced or Ücretsiz listings;
- İl / İlçe location;
- seller display name + phone;
- Telefon / WhatsApp / Telefon + WhatsApp;
- provider-neutral phone verification;
- atomic auto-publication after all required evidence/trusted-photo state is ready;
- founder post-moderation/takedown;
- lightweight phone-verified `İlanlarım` ownership;
- search normalization such as `b150` ↔ `b 150`;
- near-final consumer UX across mobile/tablet/desktop.

No classic username/password account is required.

The following are historical/superseded as current product assumptions:

- Çorlu-only product;
- seller calls founder;
- founder routinely enters listings;
- founder pre-approval before ordinary publication;
- phone-only seller contact;
- WhatsApp OFF;
- no public self-service;
- no seller management surface.

Do not reintroduce those assumptions from older readiness/pilot documents unless the founder explicitly changes the product contract again.

## Current hard boundaries

Unless the founder explicitly changes them:

- AWS OFF;
- production activation OFF;
- real personal data OFF until the explicit real-data/public-activation gate;
- paid recurring production infrastructure OFF;
- monetization/ads OFF during initial validation;
- Tarladan untouched;
- no production secret/environment mutation;
- no Auth/payment/chat/seller-dashboard scope creep.

A free pilot does not mean “no law applies”; equally, legal uncertainty is not automatically a prior-permission blocker. Materiality and exact applicability must be assessed.

## Team model

### Main Execution Chat

Rolling `Sohbet N` room. Primary implementer and ordinary technical owner.

### Advisor Chat

Rolling `Sohbet Danışman N` room. Roadmap, prioritization, REDTEAM, independent verification, blocker classification and specialist routing owner.

### Codex

Budgeted specialist engineer and strongest escalation path for unusually difficult engineering, debugging, migration, security/server code, deep tests or code-level root cause. May implement directly where its comparative advantage justifies usage.

### Work

Budgeted deep-research / analysis / independent-review specialist. Use when another reasoning/research pass materially reduces consequential decision risk.

### Lovable

Credit-budgeted high-throughput frontend/UX specialist. Use for long, repetitive or visual frontend work where it saves meaningful effort. Do not hand it backend/security/production ownership.

### Founder

Final consequential decision owner, not routine technical debugger.

See `AI_OPERATING_MODEL_V2.md` for the full routing contract.

## One-writer rule

Only one writer owns the same active implementation scope at a time.

Before switching writers preserve:

- exact branch/SHA;
- working-tree state;
- files/changes;
- tests/results;
- remaining work;
- rollback notes;
- forbidden scope.

Read-only independent review may happen in parallel.

## Chat rollover rule

When a room fills, the next room must continue the **role**, not restart the project.

Before rollover update `ACTIVE_CHAT_HANDOFF.md` with:

- exact current `main`;
- active PR/branch/head;
- active phase;
- immediate next action;
- recent founder decisions not yet reflected elsewhere;
- unresolved material risks;
- specialist availability/budget if relevant;
- active writer and safe-switch status.

The new room then re-verifies live GitHub before acting.

## Scope-creep guard

Do not add now without measured need and explicit scope:

- Auth/accounts;
- seller dashboards;
- chat;
- payments;
- recommendation engines;
- category-tree navigation;
- social features;
- Kubernetes/EKS;
- microservices;
- sophisticated analytics;
- speculative observability/HA.

Before suggesting a feature ask whether it materially improves:

- listing supply;
- discovery/search;
- listing comprehension;
- seller-contact conversion;
- pilot safety/compliance;
- operational simplicity;
- or later measurable revenue readiness.

If not, do not add it.

## Knowledge write-back

- durable principle → project memory / operating model;
- current implementation/runtime → current state;
- rolling room context → active chat handoff;
- pending work → backlog;
- consequential founder choice → decision log;
- test/publication result → dated evidence where appropriate.

Do not store secrets, credentials, private user records or unnecessary personal data in these files.
