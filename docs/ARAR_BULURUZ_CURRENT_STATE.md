# Arar Buluruz — Current State

_Last updated: 2026-08-21, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; canonical branch: `main`.
- Latest implementation checkpoint before this documentation-only sync: `8d1fdee22307eacad13a471e0a9c524438e03eef`.
- PR #57 — trusted real-pilot photo pipeline: **MERGED / CLOSED**.
- PR #58 — simplified intentionally-public seller-contact contract: **MERGED / CLOSED**.
- PR #60 — Activation Readiness Pack / gate synchronization: **MERGED / CLOSED**.
- PR #61 — restore-verification hardening for the contact lifecycle: **MERGED / CLOSED**; Issue #59 is **CLOSED / COMPLETED**.
- PR #62 — portable logical database backup/clean restore/application-level verification: **MERGED / CLOSED**.
- PR #62 exact-head validation passed all three current workflows: standard CI/Gate 1, V0 minimal PWA and Real pilot backend prep.
- GitHub `main` is currently not branch-protected; status checks are therefore evidence, not server-enforced merge requirements.
- No open GitHub issues were present at this checkpoint.

## Current phase

**Development execution / pre-production migration-readiness preparation.**

The approved strategy is recorded in `docs/EXECUTION_STRATEGY_2026-08-21.md` and supersedes conflicting provider/budget/pilot sequencing language in older documents.

Current hard boundaries:

- mock/synthetic data only;
- no real seller/listing/contact/photo/personal data;
- no real users;
- no production backend activation;
- no production deployment change;
- no AWS account creation yet;
- no paid infrastructure;
- target recurring development infrastructure cost: **0 TL**;
- no advertising, monetization, payment integration or company-dependent activation work.

**REAL DATA COLLECTION remains CLOSED.**

## Architecture

Application stack:

- React 19;
- TanStack Start / Router / Query;
- TypeScript;
- Tailwind CSS;
- Bun `1.3.14` with canonical `bun.lock`;
- Vite/Nitro;
- PostgreSQL/Supabase-compatible backend contracts.

Public listing access deliberately does not depend on `@supabase/supabase-js`. `src/lib/public-listings.ts` uses a small REST/fetch adapter against PostgREST and supports three sources:

- `mock`;
- `supabase`;
- `disabled`.

Fail-closed runtime behavior:

- development may use mock data;
- an unconfigured production build does not silently connect to a backend;
- the Supabase source requires explicit URL/public key configuration;
- non-local Supabase URLs must use HTTPS.

## Supabase repository state

`supabase/config.toml` remains fail-closed in Git:

- PostgreSQL major version `17`;
- Auth disabled;
- Storage disabled;
- Studio disabled;
- Realtime/Edge/Analytics disabled;
- private `listing_photos` bucket contract prepared for controlled tests only.

Current migration chain:

1. `20260730162000_create_listings.sql`
2. `20260808211500_prepare_real_corlu_pilot_backend.sql`
3. `20260809220000_prepare_trusted_photo_pipeline.sql`
4. `20260810210000_prepare_public_seller_contact_contract.sql`

The schema is migration-canonical and currently includes:

- founder-controlled `public.listings` lifecycle;
- hard initial Çorlu pilot location constraints;
- fail-closed anonymous RLS;
- no anonymous/public writes;
- exactly one intentionally public active seller-contact value on the listing;
- internal contact verification/publication audit fields;
- fail-closed contact-change trigger behavior;
- private trusted-photo metadata/RPC preparation;
- provider-neutral external-sales preparation that remains inactive.

## Database/RLS test state

Four pgTAP suites currently provide 105 database/security contract tests:

- listings RLS;
- public seller contact;
- real-pilot backend contract;
- trusted-photo pipeline.

Additional CI exercises:

- clean migration replay;
- local migration-history check;
- isolated trusted-photo database-role probes;
- REST/RLS integration;
- desktop/mobile browser E2E;
- synthetic Storage integration;
- restore-time schema/lifecycle verification.

## Logical backup and restore state

PR #61 made restore verification independent and fail-closed by checking the actual restored security/lifecycle contract rather than only object names. It verifies, among other things:

- required application tables and schemas;
- RLS state;
- anonymous/private-schema boundaries;
- public/internal contact column privileges;
- the enabled `listings_fail_closed_contact_change` trigger and expected function;
- the canonical anonymous active-published/contact-readiness predicate;
- absence of incomplete published-contact rows.

PR #62 adds a synthetic logical restore drill that:

1. creates deterministic synthetic published and draft rows;
2. dumps roles separately;
3. dumps only application-owned `public,private` schema/data;
4. removes only the application schemas on the target;
5. restores roles + schema + data with fail-fast single-transaction behavior;
6. reruns independent restore verification;
7. restarts local PostgREST;
8. verifies the restored database through the actual `public-listings` application adapter;
9. proves the active synthetic listing/contact is readable while the draft remains anonymously invisible;
10. then reruns the existing synthetic REST + Storage integration.

The first implementation of this drill correctly failed because an unscoped data dump also contained existing `storage.buckets` metadata and collided on `listing_photos`. The final implementation explicitly scopes database backup to `public,private` and treats Storage metadata/objects as a separate migration/restore contract.

This is strong local/synthetic portability evidence. It is **not yet** a managed-Supabase-to-separate-self-hosted-server rehearsal and does **not** prove Storage object migration.

## Public runtime vs repository

Repository preparation and the already-published public V0 are separate facts.

The known public V0 remains a synthetic/mock, non-collecting runtime unless a separate deployment gate changes it:

- synthetic/mock listings;
- zero-data demo listing flow;
- no authorized real backend connection;
- no real personal data;
- no real production Storage;
- no Auth;
- no public external-sales CTA;
- no advertising/payment/monetization activation.

Repository merges alone do not authorize a Lovable Publish/Update or another production deployment.

## Minimal pilot product scope

The controlled real-pilot rollout, only after later gates pass, is:

1. **1 real Çorlu listing**;
2. review;
3. **3 listings**;
4. review;
5. **5–10 listings**.

Operating model:

- founder-operated intake/moderation/publication;
- no seller Auth/accounts by default;
- no seller dashboard;
- no public self-service writes;
- no chat;
- no payment custody or commission;
- no advertising/paid listing/subscription during validation;
- WhatsApp default seller contact, phone optional;
- exactly one intentionally public seller-contact channel;
- external sales/Shopier out of the first pilot;
- aggregate/minimal validation evidence rather than invasive account tracking.

## Seller-contact state

The current contract is deliberately simple:

- one authoritative `contact_e164` value on `public.listings`;
- one `contact_channel` (`whatsapp` or `phone`) when publishable;
- active published contact is intentionally anonymously readable with the listing;
- internal readiness/audit fields are not anonymously readable;
- contact identity/value change fails closed by removing live publication readiness;
- no anonymous privileged contact resolver;
- no click-to-reveal privacy claim;
- no founder relay, in-app messaging, SMS OTP, CAPTCHA or Auth dependency.

No real phone number is authorized in the current phase.

## Photo/media state

Trusted photo ingestion/delivery primitives are prepared and synthetic backend/Storage integration passes:

- JPEG/PNG/WebP input validation;
- 8 MiB input ceiling;
- decoded-pixel ceiling;
- sanitization/re-encode to canonical WebP;
- private controlled object paths/metadata;
- compensating cleanup behavior;
- lifecycle-gated delivery metadata;
- short-lived signed-URL contract.

However, buyer-visible real photo delivery is **not wired into the public listings adapter**; the current Supabase mapping returns `photos: []`.

Therefore:

- a **zero-photo first real listing** can remain inside the smallest pilot slice if the founder chooses media out of scope;
- if the first real listing must include photos, buyer-visible signed delivery plus Storage object backup/migration/restore verification becomes a material pre-production blocker before real activation.

Do not claim database restore proof covers Storage objects.

## Self-host compatibility state

The application is intentionally portable toward managed Supabase → self-hosted Supabase:

- PostgreSQL-native schema/migrations;
- portable RLS/grants/functions/RPCs;
- small REST adapter rather than a managed-only domain dependency;
- local clean-init and logical restore evidence;
- current PostgreSQL 17 direction matches current Supabase defaults.

Still required before real production:

- select and pin the exact self-hosted Supabase Docker release used for production rehearsal;
- run the migration/restore against a separate self-hosted Docker target rather than the same local CLI stack;
- perform managed-Supabase → self-host export/import using synthetic data;
- test rollback on that target;
- separately prove Storage object backup/restore if photos are in scope;
- finalize network/TLS/secrets/admin exposure/logging/backup configuration.

Current planning envelope: approximately 2 vCPU minimum, preferably 8 GB RAM and 40–80+ GB SSD. Do not provision infrastructure merely because these values are recorded.

## Infrastructure sequence

Current authority: `docs/EXECUTION_STRATEGY_2026-08-21.md`.

### Development now

- personal Supabase Free may be used for synthetic development only;
- no AWS yet;
- no paid infrastructure;
- production remains off.

### Pre-production

- complete managed → self-host synthetic migration rehearsal;
- pin tested self-host release;
- prove backup/restore/application verification/rollback;
- complete security/privacy gates.

### Real pilot later

Current preferred production candidate is AWS Istanbul Local Zone `eu-central-1-ist-1a`, using a minimal EC2/EBS/Docker/self-hosted-Supabase design and eligible new-customer credits after release readiness.

This is not permission to open the AWS account now. Exact Local Zone instance availability, pricing, credit eligibility and burn rate must be re-checked on activation day. Default EBS snapshot behavior must not be assumed Türkiye-local; the production gate must explicitly configure/verify the intended local snapshot path.

## Privacy/legal real-data gate

Before first real listing, resolve and verify at minimum:

- KVKK aydınlatma/transparency;
- exact data-controller identity/contact channel;
- collection/storage/public-disclosure legal basis;
- retention/deletion policy and backup deletion propagation;
- data-subject request procedure;
- wrong-person/incorrect-phone rapid takedown;
- recipient/data-flow mapping;
- allowed listing categories/content moderation;
- production provider/data residency configuration;
- local backup + successful restore;
- TLS/network/admin hardening;
- secrets and least privilege;
- RLS/grants negative tests;
- minimum logs;
- unpublish/kill switch;
- Storage backup/restore when media is used.

Technical preparation alone is not a legal authorization.

## Current incomplete items / shortest safe path

The shortest remaining path is deliberately narrow:

1. keep product scope frozen;
2. synchronize canonical documents with the 2026-08-21 execution decision;
3. create/use a dedicated Arar Buluruz Supabase Free development project only through the separate remote-account gate and only with synthetic data;
4. rehearse managed Supabase → pinned self-hosted Supabase Docker using synthetic data;
5. prove separate-target backup/restore/rollback and application reads;
6. decide whether first real listing is zero-photo; if photos are required, complete buyer-visible signed-photo delivery + Storage migration/restore proof;
7. perform security/secrets/network review;
8. keep AWS unopened until the application is genuinely release-ready;
9. run the separate legal/privacy/real-data gate;
10. only then open/configure the real-pilot infrastructure and start the 1 → 3 → 5–10 canary.

Do **not** add Auth, accounts, payments, chat, ads, seller dashboards, complex analytics, recommendation engines, microservices, Kubernetes or speculative observability to satisfy this path.

## Historical-document rule

Older project-memory, backlog, provider and readiness documents remain historical evidence. Where their current-status wording conflicts with this file or `docs/EXECUTION_STRATEGY_2026-08-21.md`, these two 2026-08-21 documents are the current authority.
