# Arar Buluruz — Current State

_Last updated: 2026-08-09, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; default branch: `main`.
- Canonical `main` before this documentation-sync gate: `9376ba60dfc049a4df27ce25255fa5923b2a154e`.
- PR #52, **Complete V0 location and demo listing usability**, merged successfully. Its merge advanced `main` to `714298af58049b3c2ee2b5b345b36c63b6e7f865`.
- PR #52's V0 usability release was subsequently published to the public Lovable V0.
- Public smoke testing passed after that publication.
- Users found the application understandable.
- Initial supply intent is now validated: real users explicitly said their actual listings may be published in Arar Buluruz.
- PR #53, **Prepare real Çorlu pilot backend with fail-closed data boundaries**, merged successfully with normal merge commit/current `main` `9376ba60dfc049a4df27ce25255fa5923b2a154e`.
- Post-merge CI run `31280761870` — **SUCCESS**.
- Post-merge V0 minimal PWA run `31280761873` — **SUCCESS**.

## Critical state distinction: repository != deployed public runtime

This distinction is intentional and must be preserved in every review.

### Repository `main`

Repository `main` now contains the public V0 application **plus inactive technical preparation** for a future founder-controlled real Çorlu pilot.

PR #53 added, among other preparation:

- extended listing lifecycle and Çorlu pilot location constraints;
- a non-exposed `private` schema for minimum contact, photo metadata and external-sales review state;
- fail-closed RLS/grant boundaries;
- a private Storage contract and synthetic Storage validation assets while committed product Storage remains disabled;
- full-state provider-neutral external-sales CTA review logic;
- self-hosted production, backup, restore and rollback contracts.

These capabilities are repository preparation, not proof that a production backend exists or is connected.

### Currently deployed public V0

The live public V0 remains:

- synthetic/mock listings;
- a zero-data demo listing form;
- no real backend connection;
- no real personal data;
- no real Storage;
- no Auth;
- no public external-sales CTA;
- no public Shopier integration or transaction processing.

Do **not** describe PR #53 preparation as live production functionality.

## Current product evidence

The current V0 evidence supports the following narrow conclusions:

- the public application is understandable to users;
- the core search/discovery and listing-detail experience has passed the current usability/smoke boundary;
- initial seller/supply intent exists because real users explicitly offered their own listings for publication.

This does **not** establish:

- a functioning real marketplace;
- successful real listing intake/publishing operations;
- sustainable moderation;
- the future seller-contact operating model;
- account ownership/management;
- public external-sales safety in real use;
- a functioning supply-demand loop;
- production backend reliability.

## Future controlled real pilot target

The next real-data target, when separately authorized, remains:

- **5–10 founder-controlled real Çorlu listings**;
- manual/founder moderation;
- no public self-service database writes;
- no seller dashboard or account requirement by default;
- no payment processing by Arar Buluruz.

Real personal-data collection is still blocked.

## External-sales / Shopier state

The canonical product decision is provider-neutral **Satış bağlantısı / External Sales Link**.

Shopier is treated only as an independent third-party provider candidate:

- no API integration;
- no OAuth;
- no Shopier credential access;
- no scraping;
- no iframe;
- no partnership/verification claim;
- a seller may later provide their own public sales URL;
- Arar Buluruz does not process or hold payment funds.

Repository `main` contains inactive review/security preparation for this model. The public V0 exposes no external-sales field or CTA.

No VPS provider, backup vendor or future seller-contact model is selected merely because a research report recommended one.

## Hard founder financial boundary

Arar Buluruz currently earns **no revenue**.

Accordingly:

- no paid VPS now;
- no paid hosted backend now;
- no paid backup now;
- no recurring paid production infrastructure now.

Any paid recurring infrastructure requires a separate explicit **FOUNDER BUDGET / REVENUE GATE**.

Existing D-021/self-hosting documents may define technical prerequisites and production acceptance tests. Passing those prerequisites does **not** authorize spending while the budget/revenue gate is closed.

## Privacy/data boundary

No real seller listing/contact/photo data is authorized today.

Before any real personal-data collection, a separate founder gate must approve the exact privacy/KVKK and data-flow prerequisites, including the operational notice/request/deletion/security/provider boundaries required for the actual chosen pilot design.

Repository technical preparation alone is not a lawful-basis or activation decision.

## Backend/self-hosting state

D-021 remains the future technical target architecture: a founder-controlled, Türkiye-located self-hosted Supabase-compatible data plane on Linux VPS when justified and separately approved.

Current state remains **inactive preparation only**:

- no VPS purchased;
- no hosted production database;
- no remote production Storage;
- no production secrets/environment activation;
- no real data;
- no public backend connection.

A future VPS purchase additionally requires the separate FOUNDER BUDGET / REVENUE GATE; technical readiness alone is insufficient.

## Historical evidence preservation

Older dated publication, recovery, Workstream B/C and V0 quality-completion records remain historically valid for the state they recorded. They should not be rewritten to pretend they were created after PR #52 or PR #53.

When an older operational document calls a completed program “active,” use the newer current-state/backlog record or an explicit `Superseded/current state` note rather than rewriting the dated historical evidence.

## Current gate

The documentation-sync gate is documentation-only and exists solely to align repository context before an independent full-repository review.

After this documentation merge, the **next activity is the Claude full-repository review**.

That review is independent and advisory only. Its findings do not authorize code changes, architecture changes, paid infrastructure, real-data activation or publication. Any implementation resulting from the review requires a separate founder gate.

There is currently **no authorized implementation, paid-infrastructure, real-data or public real-listing activation gate**.
