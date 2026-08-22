# Arar Buluruz — Current State

_Last updated: 2026-08-22, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; canonical branch: `main`.
- Canonical `main` entering PR #64: `dd0d22dfd25f34bed20fcce802425fe9e1f63c93` (PR #63 merge).
- PR #57 — trusted real-pilot photo pipeline: **MERGED / CLOSED**.
- PR #58 — simplified intentionally-public seller-contact contract: **MERGED / CLOSED**.
- PR #60 — Activation Readiness Pack / gate synchronization: **MERGED / CLOSED**.
- PR #61 — restore-verification hardening: **MERGED / CLOSED**; Issue #59 is **CLOSED / COMPLETED**.
- PR #62 — portable logical DB backup/clean restore/application verification: **MERGED / CLOSED**.
- PR #63 — canonical execution-strategy/current-state synchronization: **MERGED / CLOSED**.
- PR #64 — photo delivery + DB/Storage portability + pinned self-host migration/rollback readiness: **release candidate under review until merged**.
- PR #64 technical release-candidate head before this documentation sync: `331a91ec03ee0fc66fded9d68f0a10efbbb53ae4`.
- That exact technical head passed all four required workflows:
  - CI / Gate 1 — run `32573921779` — **SUCCESS**;
  - V0 minimal PWA — run `32573921795` — **SUCCESS**;
  - Real pilot backend prep — run `32573921802` — **SUCCESS**;
  - Self-host migration rehearsal — run `32573921809` — **SUCCESS**.
- GitHub `main` is not branch-protected; checks are therefore evidence rather than server-enforced merge requirements. Normal PR/merge discipline remains mandatory.

This document describes PR #64 release-candidate behavior until the PR is merged. After merge, `main` must be fetched and its merge SHA recorded as the canonical checkpoint.

## Current phase

**Development execution / pre-production migration-readiness preparation.**

The current strategy authority remains `docs/EXECUTION_STRATEGY_2026-08-21.md`.

Hard boundaries remain unchanged:

- mock/synthetic data only;
- no real seller/listing/contact/photo/personal data;
- no real users;
- production backend OFF;
- production deployment OFF;
- AWS OFF;
- paid infrastructure OFF;
- Supabase Free only when the dedicated hosted development project exists;
- no paid plan/add-on/payment method;
- no Auth/account/payment/chat/advertising/monetization scope expansion.

**REAL DATA COLLECTION remains CLOSED.**

## Dedicated hosted Supabase checkpoint

The approved hosted-development isolation target is:

- organization: `Arar Buluruz`;
- project: `arar-buluruz-synthetic-dev`;
- plan: Supabase Free only;
- data: synthetic/mock only.

The existing `tarladan` Supabase organization is explicitly out of scope and must remain untouched. Arar Buluruz must not be created under it.

The connected Supabase tool currently exposes project creation only inside an existing organization and does not expose organization creation. No secure raw Management API authentication context is exposed to the execution environment, and no new PAT/secret is authorized merely to bypass that limitation. Therefore:

- no Arar Buluruz hosted project has been created yet;
- no `tarladan` resource was modified;
- dedicated managed-Supabase → self-host rehearsal remains an **open external checkpoint**, not a global execution blocker;
- all release-readiness work that does not require that hosted project proceeds independently.

## Architecture

Application stack:

- React 19;
- TanStack Start / Router / Query;
- TypeScript;
- Tailwind CSS;
- Bun `1.3.14` with canonical `bun.lock`;
- Vite/Nitro;
- PostgreSQL/Supabase-compatible backend contracts.

Public listing access deliberately does not depend on `@supabase/supabase-js`. `src/lib/public-listings.ts` uses a small REST/fetch adapter and supports:

- `mock`;
- `supabase`;
- `disabled`.

Fail-closed runtime behavior remains:

- mock may be used for development;
- an unconfigured production build does not silently connect to a backend;
- Supabase source requires explicit URL/public key configuration;
- non-local Supabase URLs require HTTPS;
- server/service-role secrets are not exposed to the public listing adapter.

## Supabase repository state

`supabase/config.toml` remains fail-closed in Git:

- PostgreSQL major `17`;
- Auth disabled by default;
- Storage disabled by default;
- Studio disabled;
- Realtime/Edge/Analytics disabled;
- private `listing_photos` bucket contract exists for explicitly enabled controlled test/rehearsal paths.

Current migration chain:

1. `20260730162000_create_listings.sql`
2. `20260808211500_prepare_real_corlu_pilot_backend.sql`
3. `20260809220000_prepare_trusted_photo_pipeline.sql`
4. `20260810210000_prepare_public_seller_contact_contract.sql`
5. `20260822113000_enable_public_signed_photo_delivery.sql`

The migration-canonical contract includes:

- founder-controlled listing lifecycle;
- initial Çorlu pilot location constraints;
- fail-closed anonymous RLS;
- no anonymous/public writes;
- exactly one intentionally public active seller contact;
- internal contact verification/publication audit fields;
- fail-closed contact-change trigger behavior;
- private trusted-photo object/metadata contract;
- lifecycle-gated public signed-photo delivery;
- no public bucket and no anonymous direct private-object read path.

## Database/RLS verification state

PR #64 brings the database/security contract to **125 pgTAP tests** across the existing suites plus public-photo delivery coverage.

CI additionally verifies:

- clean migration replay;
- migration history;
- role/RLS negative probes;
- restore-time lifecycle/security semantics;
- REST/RLS integration;
- desktop/mobile Chromium E2E;
- private Storage behavior;
- public signed-photo behavior;
- logical backup/clean restore;
- application-level post-restore reads.

The restore verifier checks actual semantics, not merely object names, including RLS, grants, contact lifecycle predicates, the fail-closed contact-change trigger and restored photo-delivery policy requirements.

## Public signed-photo state

Buyer-visible photo delivery is now wired into the Supabase public listings adapter in the PR #64 release candidate.

The contract is deliberately narrow:

- source objects remain in private `listing_photos` Storage;
- anonymous direct object reads are not the delivery mechanism;
- only lifecycle-eligible published listing photos can obtain signed delivery;
- the adapter accepts only expected same-Supabase-origin Storage signed URLs;
- signed URLs are short-lived; canonical default is **60 seconds** and the security contract caps accepted TTL at five minutes;
- no service-role secret is sent to the browser;
- anonymous bucket listing is tested for **absence of private object disclosure**, rather than incorrectly assuming the Storage list endpoint must return HTTP 403.

The prior `photos: []` caveat is obsolete for the PR #64 release candidate. A zero-photo pilot is still a product choice, but no longer the technical workaround required by the repository.

## Portable DB backup and restore

Database and Storage portability are intentionally separated.

Application DB backup contains:

- roles/settings export;
- application-owned `public,private` schema;
- application data from `public,private` only;
- the application-owned cross-schema Storage policy as a separate `storage-policy.sql` artifact;
- SHA-256 checksum manifest.

Supabase-managed Storage tables/metadata are **not** copied as generic DB application data. This is deliberate: an earlier unscoped data dump correctly failed by colliding with existing `storage.buckets` metadata. The final contract avoids provider-internal row copying.

Clean restore verification proves:

1. backup checksum integrity;
2. application schema/data restore;
3. replay/verification of the application-owned Storage policy;
4. independent restore-security verifier success;
5. real application adapter reads after restore;
6. active synthetic listing/contact visibility;
7. non-active/draft invisibility.

## Storage object backup/migration/restore

Storage object bytes have now been independently rehearsed rather than inferred from DB restore.

The synthetic PR #64 rehearsal uses S3-compatible Storage transfer via `rclone`, with object/hash/size verification.

Verified fixture:

- object: `listings/93000000-0000-4000-8000-000000000001/94000000-0000-4000-8000-000000000001.webp`;
- object count: `1`;
- byte size: `72`;
- SHA-256: `fd89cface8e12174fb1c6e78c0a8b0b26be925820eed38713ff1d921d5f969df`.

The successful pinned-target rehearsal reported:

- checksum-verified local Storage backup;
- target restore with `0 differences found` and `1 matching files`;
- target Storage size `1 object / 72 bytes`;
- signed private-Storage application verification with the same SHA-256;
- the same SHA-256 again after rollback to the preserved source.

Therefore DB portability proof and Storage-object portability proof are now separate, explicit tests.

## Pinned self-host compatibility state

A separate pinned Docker target has now been exercised successfully with synthetic data.

Pinned upstream contract:

- self-host release: `self-hosted/v0.8.0`;
- upstream commit: `241bb11c0627f2981746d37033f57dbfa81d29b0`;
- PostgreSQL: `supabase/postgres:17.6.1.136`;
- Storage API: `supabase/storage-api:v1.60.4`;
- PostgREST: `postgrest/postgrest:v14.12`;
- API gateway: `envoyproxy/envoy:v1.39.0`;
- upstream compose/config/key-generator files are hash-pinned in `ops/self-hosted/upstream.lock`.

The separate-target rehearsal proves:

1. isolated synthetic source preparation;
2. DB and Storage backup;
3. source preservation as rollback point;
4. exact upstream/tag/file/image pin validation;
5. fresh self-host target startup;
6. migration replay into PostgreSQL 17;
7. application data restore;
8. target private bucket creation through Storage itself;
9. Storage object restore and byte/hash verification;
10. independent DB restore verifier;
11. application adapter + signed-photo verification on target;
12. target destruction;
13. source restart from preserved state;
14. application adapter + signed-photo verification after rollback.

The final workflow ended with: `Pinned self-host DB + Storage migration and source rollback rehearsal passed.`

### Important evidence boundary

This is **local Supabase CLI source → separate pinned self-host Docker target** portability evidence. It is deliberately strong enough to remove the previous separate-target/self-host/Storage/rollback blockers, but it is **not yet** the final hosted-managed Supabase Free → self-host rehearsal.

That provider-specific rehearsal remains open until the dedicated `Arar Buluruz` organization/project exists.

## Security / secrets / network rehearsal evidence

PR #64 adds explicit CI assertions for the synthetic self-host target:

- target DB is bound only to `127.0.0.1:15432`;
- target API gateway is bound only to `127.0.0.1:18000`;
- Auth, Realtime, Edge Functions and Supavisor are not started for the target path;
- Studio/meta are only present where required by the pinned upstream gateway dependency and are not separately host-published;
- ephemeral self-host secrets are generated for the rehearsal and masked in Actions;
- known insecure upstream example secrets cause failure if left in the generated target configuration;
- repository secret-pattern scan runs before rehearsal;
- telemetry opt-outs are set in the CI environment;
- `PGSSLMODE=disable` is restricted to the loopback-only ephemeral CI target because that target Postgres listener is plaintext; it is **not** authorization for managed or production DB connections.

These are release-readiness checks, not a claim that future AWS production networking/TLS is already configured.

Actual production infrastructure will still require a separate deployment-day verification of, at minimum:

- TLS termination/certificates;
- firewall/VPC/security-group exposure;
- admin/Studio/meta exposure policy;
- credential rotation/storage;
- backup destination and residency;
- operational logging/monitoring minimums;
- restore from the actual production backup path.

Those checks cannot be truthfully completed while AWS/prod remain OFF.

## Public runtime vs repository

Repository preparation and the already-published public V0 remain separate states.

The known public V0 remains synthetic/mock and non-collecting unless a separate deployment gate changes it:

- no authorized real backend connection;
- no real personal data;
- no real production Storage;
- no Auth;
- no payment/advertising/monetization activation.

Merging PR #64 does not authorize Lovable Publish/Update, production deployment or real-data collection.

## Minimal pilot product scope

After all later activation gates pass, the controlled rollout remains:

1. **1 real Çorlu listing**;
2. review;
3. **3 listings**;
4. review;
5. **5–10 listings**.

Operating model remains founder-operated, with no seller Auth/accounts/dashboard, no public self-service writes, no chat, no payment custody/commission and no advertising/paid listings/subscriptions during validation.

## Seller-contact state

The intentionally public seller-contact contract remains unchanged:

- one authoritative `contact_e164`;
- one `contact_channel` (`whatsapp` or `phone`) when publishable;
- active published contact anonymously readable with the listing;
- internal readiness/audit fields not anonymously readable;
- contact identity/value changes fail closed by removing publication readiness.

No real phone number is authorized in the current phase.

## Infrastructure sequence

### Development now

- repository/local CI;
- dedicated Supabase Free project when its separate organization exists;
- synthetic/mock only;
- AWS OFF;
- paid infrastructure OFF;
- production OFF.

### Remaining pre-AWS technical checkpoint

The principal external technical checkpoint that cannot currently be executed is:

- create the separate `Arar Buluruz` Supabase organization manually or through a future safe organization-creation tool;
- create `arar-buluruz-synthetic-dev` on Free only;
- apply the canonical migrations with synthetic fixtures;
- export from that real managed Free project;
- restore DB + Storage into the already pinned/rehearsed self-host target;
- rerun the same application/RLS/hash/rollback verification.

This checkpoint must not use or mutate `tarladan`.

### Real pilot later

The current future production candidate remains minimal self-hosted Supabase on AWS Istanbul Local Zone `eu-central-1-ist-1a`, with EC2/EBS/Docker and eligible credits only after release readiness and a separate activation decision.

AWS account creation, provisioning, pricing/credit decisions, Local Zone availability, EBS snapshot residency/configuration and production network design remain intentionally deferred. AWS is still **OFF**.

## Privacy/legal real-data gate

Technical release readiness is not legal authorization for real data. Before the first real listing, the separate privacy/legal/operational gate must still resolve and verify at least:

- KVKK transparency/aydınlatma;
- controller identity/contact channel;
- collection/storage/public-disclosure legal basis;
- retention/deletion and backup-deletion propagation;
- data-subject request procedure;
- wrong-person/incorrect-phone rapid takedown;
- recipient/data-flow mapping;
- content/category moderation rules;
- actual production provider/data-residency configuration;
- production TLS/network/admin hardening;
- production secrets/least privilege;
- minimum operational logs;
- unpublish/kill switch;
- actual production backup + successful restore.

## Current incomplete items / shortest safe path

After PR #64 technical validation, the narrow remaining path is:

1. keep product scope frozen and real data OFF;
2. merge PR #64 only after its documentation-sync head also passes all required CI;
3. manually create the dedicated `Arar Buluruz` Supabase Free organization/project when the account UI/tool allows it, without touching `tarladan`;
4. run the final **managed hosted Free → pinned self-host** synthetic rehearsal using the already proven DB/Storage/hash/rollback harness;
5. keep AWS unopened until that checkpoint and the remaining privacy/legal release gate are satisfied;
6. at the later production gate, re-verify AWS Istanbul availability/cost/credits/residency plus production TLS/network/secrets/backups;
7. only after explicit real-data authorization begin the 1 → 3 → 5–10 canary.

Do **not** add Auth, accounts, payments, chat, ads, seller dashboards, complex analytics, recommendation engines, microservices, Kubernetes or speculative observability to satisfy this path.

## Historical-document rule

Older project-memory, backlog, provider and readiness documents remain historical evidence. Where their current-status wording conflicts with this file or `docs/EXECUTION_STRATEGY_2026-08-21.md`, this current-state file and the strategy authority control. GitHub `main` and the exact PR/commit under review remain authoritative for implementation facts.
