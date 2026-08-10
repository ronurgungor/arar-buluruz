# Arar Buluruz — Current State

_Last updated: 2026-08-10, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; default branch: `main`.
- Canonical `main` at the start of the PR #58 seller-contact implementation gate: `46b436c957ff8defb6f6dca6e739fdb91d1e6216`.
- PR #57, **Prepare trusted real-pilot photo pipeline**, is merged/closed. Its merge commit/current canonical `main` is `46b436c957ff8defb6f6dca6e739fdb91d1e6216`.
- PR #57 post-merge CI and V0 minimal-PWA checks succeeded; the real-pilot backend-prep workflow was not triggered on the merge push, while its exact-head pre-merge validation was green.
- The trusted-photo preparation remains inactive repository capability: canonical sanitized WebP ingestion, private Storage metadata and lifecycle-gated short-lived signed delivery are prepared but not activated in production.
- Users found the current public application understandable.
- Initial supply intent is validated: real users explicitly said their actual listings may be published in Arar Buluruz.

## Critical state distinction: repository != deployed public runtime

This distinction is intentional and must be preserved in every review.

### Repository `main`

Repository `main` contains the public V0 application **plus inactive technical preparation** for a future founder-controlled real Çorlu pilot.

Current inactive preparation includes:

- extended listing lifecycle and Çorlu pilot location constraints;
- fail-closed RLS/grant boundaries;
- a private trusted-photo Storage/metadata contract while committed product Storage remains disabled;
- service-role-only `SECURITY INVOKER` trusted-photo RPCs with empty `search_path`;
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
- no real seller-contact CTA;
- no public Shopier integration or transaction processing.

Do **not** describe repository pilot preparation as live production functionality.

## Current product evidence

The current V0 evidence supports the following narrow conclusions:

- the public application is understandable to users;
- the core search/discovery and listing-detail experience has passed the current usability/smoke boundary;
- initial seller/supply intent exists because real users explicitly offered their own listings for publication.

This does **not** establish:

- a functioning real marketplace;
- successful real listing intake/publishing operations;
- sustainable moderation;
- seller-contact performance in real operation;
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

## Seller-contact state

D-024 records the founder-selected initial pilot contact model:

- one intentionally public seller contact per publishable listing;
- WhatsApp default, seller may instead select phone;
- no anonymous privileged contact resolver;
- no click-to-reveal privacy claim;
- no founder relay, in-app messaging, Auth, SMS OTP or CAPTCHA dependency;
- one authoritative E.164 value on `public.listings`;
- contact verification/publication audit fields remain internal;
- active published `contact_channel` and `contact_e164` are intentionally anonymously readable under the listing RLS lifecycle;
- raw PostgREST bulk enumeration of active contacts is an accepted public-disclosure consequence for this small pilot, not a claimed security boundary;
- contact changes/withdrawal fail closed by unpublishing and resetting readiness as applicable.

PR #58 prepares this contract with **synthetic/local/CI-only** data and remains unmerged until its validation/report gate completes.

No real phone number is authorized by this state.

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

Before any real personal-data collection, a separate founder gate must close the exact privacy/KVKK and data-flow prerequisites for the selected public-contact pilot, including controller identity, processing/disclosure legal bases, collection-time aydınlatma, recipients, provider/cross-border flows, retention/deletion, data-subject requests, wrong-person phone complaints and current VERBİS applicability.

Repository technical preparation and `publication_instruction_at` alone are not a lawful-basis or explicit-consent conclusion.

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

Older dated publication, recovery, Workstream B/C and V0 quality-completion records remain historically valid for the state they recorded. They should not be rewritten to pretend they were created after later PRs.

When an older operational document calls a completed program “active,” use this newer current-state record or an explicit `Superseded/current state` note rather than rewriting the dated historical evidence.

## Current gate

The authorized current implementation gate is **PR #58 seller contact contract preparation**.

Scope remains:

- local/CI only;
- synthetic data only;
- no production backend/Storage/Auth activation;
- no real personal data;
- no deployment/Lovable publication;
- no paid infrastructure;
- stop before merge for founder review.
