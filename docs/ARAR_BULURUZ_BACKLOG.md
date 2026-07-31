# Arar Buluruz — Backlog

_Last updated: 2026-07-31, Europe/Istanbul_

Legend: `[x]` completed, `[-]` active gate, `[ ]` frozen/deferred.

## Completed foundations

- [x] Create and publish the original frontend-only mock prototype.
- [x] Keep Lovable database, auth, storage, secrets and edge functions disabled.
- [x] Establish GitHub `main` as canonical and add shared memory, decision log, capability records and new-chat bootstrap.
- [x] Pin Bun `1.3.14`, preserve `bun.lock` and add frozen-install CI.
- [x] Fix confirmed search and mobile-layout defects with focused browser evidence.
- [x] Complete Gate 1 PostgreSQL migration, RLS, adapter and test preparation through PR #25 without remote backend activation.
- [x] Preserve Gate 1 as a reusable technical asset rather than treating it as an active real pilot.
- [x] Canonicalize D-019: **V0 — UX ve değer önerisi doğrulaması**.
- [x] Freeze backend/provider switching until a measured D-019 trigger exists.
- [x] Canonicalize provider-independent/no-rebuild boundaries: migration-canonical PostgreSQL, adapter-isolated Supabase calls, future internal UUID identity, nullable future `owner_user_id`, and no JWT/provider-specific domain coupling.

## V0 minimal-PWA package

- [x] Default the V0 listing source to synthetic/mock.
- [x] Add a visible and honest V0 test-version notice.
- [x] Disable real listing application, account and complaint data entry in V0.
- [x] Preserve historical Gate 1 operational-flow tests only inside an explicit ephemeral CI flag.
- [x] Add the manifest with durable app identity, scope and start URL.
- [x] Add standard, maskable and Apple touch icons.
- [x] Register a narrow navigation service worker.
- [x] Cache only the offline page, manifest and icons.
- [x] Add a safe Turkish offline screen that does not present stale dynamic listings.
- [x] Add focused V0 PWA CI and desktop/mobile/offline screenshots.
- [x] Pass standard CI: lint, 7/7 unit tests, build, 22/22 pgTAP, REST/RLS and focused desktop/mobile regression.
- [x] Pass V0 PWA CI: zero-cost boundary, manifest/icons, service-worker control, shell-only caching, disabled real operations and real-server-outage fallback.
- [x] Merge PR #28 with normal merge commit `16da297ddac5461d3cba6fa8fc76bbc095bbb2c3`.

## Active gate

- [-] **Founder Lovable Publish/Update decision for the merged V0 minimal-PWA package.**

No other implementation package is active while this gate is pending.

## Publish package evidence

- Approved PR head: `2cf223df4aea91b045de91dc20e6ed79e8120124`.
- Standard CI run: `30631497989` — success.
- V0 PWA run: `30631497756` — success.
- Screenshot artifact ID: `8793525311`.
- Artifact SHA-256: `3b5c61c2fe6b5dbb3f274da31fbae405ab8063af1a9986a28780ed3b6dc6eeb8`.
- Rollback before publish: revert PR #28 merge commit.
- Rollback after publish: revert code and restore/publish the last accepted Lovable revision.

## Frozen until a D-019 trigger exists

The backend decision may reopen only when at least one of these is real and measured:

- [ ] external user accounts;
- [ ] real personal data;
- [ ] an unworkable KVKK transfer model;
- [ ] measured free-tier or uptime failure;
- [ ] confirmed photo/storage need;
- [ ] measured cost or technical necessity.

Without a trigger:

- [ ] do not recommend Supabase ↔ Türkiye self-managed switching;
- [ ] do not create a remote Supabase project or apply a remote migration;
- [ ] do not connect secrets or environment values;
- [ ] do not enter real listings or seller/customer data;
- [ ] do not add auth, Storage, Realtime or Edge Functions;
- [ ] do not add advertising or analytics;
- [ ] do not add TWA, Android or Play Store packaging;
- [ ] do not buy paid or recurring infrastructure.

Supabase Free remains a development/technical-validation possibility only; it is not presumed to be reliable production infrastructure for a real external-user pilot.

## V0 evaluation boundary

V0 may be evaluated through manual/qualitative observation of:

- whether users understand the product;
- search and listing discovery;
- listing cards and detail pages;
- mobile and desktop usability;
- PWA installation;
- general interest.

Do not report V0 as proving:

- real listing supply;
- account creation;
- listing management;
- sustainable moderation;
- seller-contact operations;
- supply-demand loop formation.

No analytics/event infrastructure is added solely to measure V0.

## Deferred product capabilities

- [ ] Real user registration, profile and account recovery.
- [ ] Seller self-service listing creation/editing/deletion.
- [ ] Real seller contact information and communication rules.
- [ ] Moderation/admin workflows.
- [ ] Photo upload or object storage.
- [ ] SMS/OTP.
- [ ] Payments, shipping or orders.
- [ ] In-app chat.
- [ ] Advertising network integration.
- [ ] Push notifications or background sync.
- [ ] Full offline or cache-first dynamic listings.
- [ ] TWA, Play Store or native Android.

Each deferred item requires measured need, scope definition and the applicable founder gate.

## Operating rules

- Main assistant remains the default routine executor under D-018.
- Only one code writer operates at a time.
- Lovable Publish/Update and other production deployments require explicit founder approval.
- Git history is never force-pushed or rewritten.
- Validation depth follows touched risk; existing evidence remains valid until covered behavior changes.
- Important milestones are written back to current state, decision log and project memory.
- No secret, credential, real user record or unnecessary personal data belongs in repository documentation.
