# Arar Buluruz — Current State

_Last updated: 2026-08-11, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; default branch: `main`.
- Canonical `main` entering the Activation Readiness Pack gate: `3bb4d793a3a959c3fa8f74914dea6bd3df6731ba`.
- PR #57, **Prepare trusted real-pilot photo pipeline**, is **MERGED / CLOSED**.
- PR #58, **Prepare simplified public seller contact contract**, is **MERGED / CLOSED**.
- PR #58 merge commit is `3bb4d793a3a959c3fa8f74914dea6bd3df6731ba`.
- PR #58 post-merge CI `31422393794` and V0 minimal PWA `31422393780` succeeded. The Real pilot backend prep workflow was not automatically triggered on the merge push; its exact-head pre-merge validation was green.
- Issue #59, **Deferred hardening: strengthen restore verification for contact lifecycle invariants**, is **OPEN / P2 / DEFERRED / NON-BLOCKING**.
- Issue #59 does not represent a current security/privacy/lifecycle leak and is not authorized for standalone implementation in the current gate.

## Current phase

**Phase 1.75 — Technical Preparation Complete / Real-Pilot Activation Readiness Open**

Broad technical preparation is sufficiently mature for the next work to be operational/legal/provider readiness rather than speculative feature expansion.

The current objective is to prepare the founder-operated first real Çorlu listing safely with minimum complexity, minimum recurring cost and minimum operational burden.

## Current authorized gate

**Activation Readiness Pack**

Authorized scope:

- synchronize canonical current-state documentation after PR #58 merge;
- create one canonical activation checklist;
- define minimum founder intake/moderation/contact/photo/expiry/incident SOPs;
- define publication preview requirements;
- define data-minimization inventory;
- create a provider-neutral data-flow map;
- prepare legal/privacy decision questions without manufacturing legal conclusions;
- define conceptual kill-switch/rollback operations;
- run synthetic/tabletop happy-path and failure-path operational rehearsals;
- define explicit founder activation gates.

Hard boundaries remain:

- no production activation;
- no provider purchase;
- no real seller/contact/photo/listing data;
- no paid infrastructure;
- no deployment/Lovable publication;
- no advertising activation;
- real-data collection remains closed.

## Critical state distinction: repository != deployed public runtime

This distinction remains mandatory in every review.

### Repository `main`

Repository `main` contains the public V0 application plus **inactive technical preparation** for a future founder-controlled real Çorlu pilot.

Current inactive preparation includes:

- extended listing lifecycle and hard Çorlu pilot location constraints;
- fail-closed anonymous RLS/grant boundaries;
- intentionally public active seller-contact fields with internal verification/publication audit metadata;
- contact identity-change/withdrawal fail-closed behavior;
- private trusted-photo Storage/metadata contract while committed product Storage remains disabled;
- service-role-only `SECURITY INVOKER` trusted-photo RPCs with empty `search_path`;
- trusted JPEG/PNG/WebP -> canonical WebP photo sanitization preparation;
- short-lived lifecycle-gated private-photo delivery helpers;
- provider-neutral external-sales review/security preparation, still inactive for the first pilot;
- self-hosted production, backup, restore and rollback preparation.

These capabilities are repository preparation. They do not prove a production backend exists, is connected or is authorized to process real data.

### Public V0 publication state

Arar Buluruz already has a separately accepted public Lovable V0 history. Repository merges/documentation syncs are not treated as a new production activation or publication authorization by themselves.

The accepted V0 product boundary remains mock/synthetic and non-collecting unless a separate founder Publish/Update/production gate explicitly changes it:

- synthetic/mock listings;
- zero-data demo listing form;
- no authorized real backend connection;
- no authorized real personal data;
- no authorized production Storage;
- no Auth;
- no public external-sales CTA;
- no authorized real seller-contact pilot activation;
- no public Shopier integration or Arar payment processing.

Do not describe inactive repository preparation as live real-pilot functionality.

## Current product evidence

Current evidence supports only these narrow conclusions:

- the public application is understandable to users;
- core search/discovery and listing-detail experience passed the current V0 usability/smoke boundary;
- initial seller/supply intent exists because real users explicitly offered their listings for future publication.

This does **not** establish:

- a functioning real marketplace;
- successful real listing intake/publishing operations;
- sustainable moderation;
- seller-contact performance in real operation;
- account ownership/management;
- public external-sales safety in real use;
- a functioning supply-demand loop;
- production backend reliability;
- legally approved real-data processing.

## Controlled real-pilot target

The staged target, only after all later gates are separately passed, is:

1. **1 real Çorlu listing**;
2. expand to **3** only after review;
3. expand to **5–10** only after another explicit review.

Operating model:

- founder-operated moderation/publication;
- no seller Auth/accounts by default;
- no public self-service database writes;
- no payment custody by Arar Buluruz;
- WhatsApp default seller contact; phone optional;
- exactly one public contact channel;
- trusted sanitized photos;
- no Shopier in first pilot;
- no ads;
- no broad SEO/indexing expansion initially.

Real personal-data collection is still blocked.

## Seller-contact state

D-024 and PR #58 establish the initial pilot contact model:

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

Verification proves present control only. It does not prove legal identity, item ownership or permanent number ownership.

No real phone number is authorized by the current state.

## Trusted-photo state

PR #57 prepares, but does not activate, the trusted photo path:

- accepted untrusted input MIME: JPEG, PNG or WebP;
- maximum input size: 8 MiB;
- signature + decode + decoded-format validation;
- existing 50,000,000 decoded-pixel ceiling;
- auto-orientation and re-encode to canonical WebP;
- private controlled object path/metadata;
- compensating delete on metadata persistence failure;
- explicit orphan path on cleanup failure;
- lifecycle-gated service-role-only photo delivery metadata;
- signed URL TTL 1–300 seconds, default 60 seconds.

Committed `storage.enabled` remains false. The current public listings adapter does not yet carry real photo URLs; final buyer-visible photo delivery is a provider-specific production acceptance item, not a reason to open a speculative code gate now.

## External-sales / Shopier state

The canonical architecture remains provider-neutral **External Sales Link / Haricî Satış Bağlantısı**.

For the first real Çorlu pilot, external sales/Shopier is explicitly **out of scope**:

- no Shopier API/OAuth;
- no credentials;
- no scraping;
- no iframe;
- no partnership/verification claim;
- no public external-sales CTA;
- no Arar payment custody.

Existing repository preparation stays inactive and may be reconsidered only after pilot signal and a separate gate.

## Financial boundary

Arar Buluruz currently authorizes **0 TL recurring production cost**.

Accordingly, no paid VPS, hosted backend, backup, monitoring, SMS/OTP or other recurring production infrastructure may be purchased/activated without explicit founder provider/monthly-cost approval.

Provider research/shortlisting is allowed during readiness. Shortlisting is not purchase authorization.

## Privacy / legal boundary

No real seller listing/contact/photo data is authorized today.

Before any real personal-data collection, the separate legal/privacy gate must resolve at minimum:

- exact data-controller identity and controller request/contact channel;
- Article 5 legal basis for seller-contact collection/storage;
- legal basis for intentional public disclosure;
- collection-time aydınlatma;
- recipient/alıcı groups;
- WhatsApp/provider data flow;
- hosting/CDN/log/backup/operator-device flows;
- Article 9 implications where applicable;
- retention/deletion and backup deletion propagation;
- data-subject request procedure;
- wrong-person number complaint handling;
- current VERBİS applicability;
- legal characterization of `publication_instruction_at` versus any explicit-consent requirement.

Repository technical preparation and `publication_instruction_at` alone are not a legal-basis or explicit-consent conclusion.

## Provider / production acceptance boundary

No production provider is selected by the current gate.

After provider selection, Gate 5 must prove the actual production facts, including:

- hosting/location/sub-processors/data path;
- TLS and public/admin/network exposure;
- secrets/configuration;
- clean migration application;
- RLS/grant behavior;
- private Storage/photo path and buyer-visible trusted delivery;
- backup outside the primary failure domain;
- empty-environment restore;
- Storage backup/consistency if real photos are used;
- log/retention configuration;
- rollback/kill-switch commands;
- provider-specific legal/cross-border inputs.

Restore failure remains production NO-GO.

## Founder activation gate sequence

Passing one gate never authorizes the next:

1. **GATE 1 — Activation Readiness Pack Complete**
2. **GATE 2 — Legal / Privacy Sign-Off**
3. **GATE 3 — First Seller Set Ready**
4. **GATE 4 — Provider / Monthly Cost Approval**
5. **GATE 5 — Provider-Specific Production Acceptance**
6. **GATE 6 — Real Data Collection Authorization**
7. **GATE 7 — First Real Listing Publication Authorization**
8. **GATE 8 — Expand 1 -> 3**
9. **GATE 9 — Expand 3 -> 5–10**

The canonical detailed checklist/SOP/rehearsal package is `docs/REAL_PILOT_ACTIVATION_READINESS_PACK.md`.

## Historical evidence preservation

Older dated publication, recovery, Workstream B/C, V0 quality-completion, backend preparation and seller-contact preparation documents remain historically valid for the state they recorded.

Do not rewrite dated historical records to pretend they were created after later PRs/gates. Where old status wording is superseded, use this current-state file and the activation-readiness pack as the current authority.

## Do not do now

Do not implement or activate:

- Auth;
- seller accounts/dashboard;
- contact resolver;
- CAPTCHA;
- in-app messaging;
- SMS OTP;
- contact-click analytics;
- Shopier/external-sales CTA;
- AdSense/advertising;
- broad SEO expansion;
- public self-service writes;
- automated/AI moderation;
- native app;
- advanced monitoring/WAF/bot platform;
- Issue #59 standalone hardening;
- production backend/Storage/Auth;
- real data;
- paid infrastructure;
- deployment/Lovable publication.

**REAL DATA COLLECTION remains CLOSED until a later explicit Gate 6 authorization.**
