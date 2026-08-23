# Arar Buluruz — Current State

_Last updated: 2026-08-23, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; canonical branch: `main`.
- Canonical implementation checkpoint before this documentation-only synchronization: `2f86ec41cb2b6dd3f51d2ac3999a0739ffd32469` (PR #70 merge).
- PR #57 — trusted real-pilot photo pipeline: **MERGED / CLOSED**.
- PR #58 — simplified intentionally-public seller-contact contract: **MERGED / CLOSED**.
- PR #60 — Activation Readiness Pack / gate synchronization: **MERGED / CLOSED**.
- PR #61 — restore-verification hardening: **MERGED / CLOSED**; Issue #59 is **CLOSED / COMPLETED**.
- PR #62 — portable logical DB backup/clean restore/application verification: **MERGED / CLOSED**.
- PR #63 — canonical execution-strategy/current-state synchronization: **MERGED / CLOSED**.
- PR #64 — photo delivery + DB/Storage portability + pinned self-host migration/rollback readiness: **MERGED / CLOSED**.
- PR #67 — dedicated managed Supabase migration-rehearsal harness: **MERGED / CLOSED**.
- PR #68 — reverted unintended Lovable inspection commits without changing the PR #67 implementation tree: **MERGED / CLOSED**.
- PR #69 — corrected deterministic application-fingerprint ordering for `private.listing_external_sales_links`: **MERGED / CLOSED**.
- PR #70 — made hosted role backup portable without introducing out-of-scope Realtime/Auth services: **MERGED / CLOSED**.
- Issue #66 — dedicated managed Supabase Free → pinned self-host migration rehearsal: **CLOSED / COMPLETED**.
- GitHub `main` is not branch-protected; checks are evidence rather than server-enforced merge requirements. Normal PR/merge discipline remains mandatory.

## Current phase

**Development execution / pre-production release-readiness preparation.**

The provider-specific hosted-managed portability checkpoint is now complete. The next real-pilot blockers are the separate privacy/legal/operational gate and, later, actual production infrastructure verification.

The current strategy authority remains `docs/EXECUTION_STRATEGY_2026-08-21.md` except where this newer current-state file records subsequently completed evidence.

Hard boundaries remain unchanged:

- mock/synthetic data only;
- no real seller/listing/contact/photo/personal data;
- no real users;
- production backend OFF;
- production deployment OFF;
- AWS OFF;
- paid infrastructure OFF;
- dedicated Supabase development environment remains Free only;
- no Auth/account/payment/chat/advertising/monetization scope expansion.

**REAL DATA COLLECTION remains CLOSED.**

## Dedicated hosted Supabase state

The approved isolated hosted-development environment now exists:

- organization: `Arar Buluruz`;
- project: `arar-buluruz-synthetic-dev`;
- project ref: `rzosrvenlvhijeckmwyc`;
- region: `eu-central-1` / Frankfurt;
- plan: Supabase Free;
- data: synthetic/mock only.

The existing `tarladan` Supabase organization/projects remain explicitly out of scope. The managed-rehearsal workflow hard-rejects both known Tarladan project refs before performing any live mutation.

The dedicated project is not production. Its successful use does not authorize real data or production activation.

## Issue #66 live managed migration evidence

The final hosted managed Free → pinned self-host rehearsal passed on 2026-08-23.

Exact evidence:

- workflow: `Managed Supabase migration rehearsal`;
- run: `32638398176` / run #8 — **SUCCESS**;
- exact source commit: `2f86ec41cb2b6dd3f51d2ac3999a0739ffd32469`;
- static boundary job: `97191503317` — **SUCCESS**;
- live managed rehearsal job: `97191522632` — **SUCCESS**;
- managed project ref: `rzosrvenlvhijeckmwyc`;
- S3 region: `eu-central-1`.

The live harness proved all of the following in one successful run:

1. synthetic-only fail-closed source preconditions;
2. exact canonical migration history on managed Supabase;
3. private `listing_photos` bucket contract;
4. deterministic sanitized photo materialization;
5. service-role database grants used without introducing a browser/server service-role secret;
6. pending listing/photo invisibility and failed anonymous signing before publication;
7. managed-source RLS/grant/restore-verifier success;
8. real public application adapter + signed private-Storage verification after publication;
9. portable logical DB backup and checksum verification;
10. independent Storage object backup;
11. exact pinned self-host target startup and service/image/network assertions;
12. DB + Storage restore into that target;
13. target restore-verifier and application/signed-photo verification;
14. source/target application DB fingerprint equality;
15. source/target Storage equality;
16. candidate target destruction;
17. managed-source application/hash/fingerprint verification after rollback;
18. final synthetic-only guard with no Auth users, no unexpected listing rows and no unexpected Storage objects.

Final workflow message:

`Managed Supabase Free → pinned self-host DB + Storage migration and source rollback rehearsal passed.`

Issue #66 is therefore complete.

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

The canonical migration contract includes:

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

Canonical implementation carries **125 pgTAP tests** across the existing suites plus public-photo delivery coverage.

CI and rehearsal additionally verify:

- clean migration replay and migration history;
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

Buyer-visible photo delivery is wired into the Supabase public listings adapter.

The contract remains deliberately narrow:

- source objects remain in private `listing_photos` Storage;
- anonymous direct object reads are not the delivery mechanism;
- only lifecycle-eligible published listing photos can obtain signed delivery;
- the adapter accepts only expected same-Supabase-origin Storage signed URLs;
- signed URLs are short-lived; canonical default is **60 seconds** and the security contract caps accepted TTL at five minutes;
- no service-role secret is sent to the browser;
- anonymous bucket listing is tested for absence of private object disclosure.

A zero-photo pilot is a product choice, not a technical workaround requirement.

## Portable DB backup and restore

Database and Storage portability are intentionally separate.

The managed application DB backup now contains:

- checksum-protected hosted source-role inventory evidence (`source-roles.sql`);
- a portable runtime-role contract (`roles.sql`) that verifies the target-provisioned `anon`, `authenticated`, `service_role` and `authenticator` roles without replaying hosted provider-internal role mutations;
- application-owned `public,private` schema;
- application data from `public,private` only;
- the application-owned cross-schema Storage policy as `storage-policy.sql`;
- SHA-256 checksum manifest.

Supabase-managed `auth`/`storage` table rows are not copied as generic application data. Hosted provider-internal role attributes such as Realtime-specific roles are retained as evidence but are not treated as application-portable state.

The live run checksum-verified every DB backup artifact before restore.

## Storage object backup/migration/restore

Storage object bytes are backed up and verified separately through S3-compatible `rclone` transfer.

Canonical deterministic fixture:

- listing ID: `93000000-0000-4000-8000-000000000001`;
- photo ID: `94000000-0000-4000-8000-000000000001`;
- object: `listings/93000000-0000-4000-8000-000000000001/94000000-0000-4000-8000-000000000001.webp`;
- object count: `1`;
- byte size: `72`;
- SHA-256: `fd89cface8e12174fb1c6e78c0a8b0b26be925820eed38713ff1d921d5f969df`.

Live run #8 proved:

- managed-source application/signed-photo verification with the expected SHA-256;
- local backup exactly `1 object / 72 bytes`;
- target restore `0 differences found` / `1 matching files`;
- target Storage exactly `1 object / 72 bytes`;
- target application/signed-photo verification with the same SHA-256;
- managed source after target destruction again `0 differences found` / `1 matching files` and exactly `1 object / 72 bytes`;
- the same SHA-256 again after rollback.

Therefore DB portability and Storage-object portability are separate, explicit, successful tests from both local and real hosted-managed source paths.

## Pinned self-host compatibility state

The tested target remains pinned to:

- self-host release: `self-hosted/v0.8.0`;
- upstream commit: `241bb11c0627f2981746d37033f57dbfa81d29b0`;
- PostgreSQL: `supabase/postgres:17.6.1.136`;
- Storage API: `supabase/storage-api:v1.60.4`;
- PostgREST: `postgrest/postgrest:v14.12`;
- API gateway: `envoyproxy/envoy:v1.39.0`;
- upstream compose/config/key-generator files hash-pinned in `ops/self-hosted/upstream.lock`.

Both portability paths have now passed:

- local Supabase CLI synthetic source → pinned self-host target → target destruction → source rollback;
- dedicated hosted managed Supabase Free synthetic source → the same pinned self-host target → target destruction → managed-source rollback verification.

The provider-specific portability evidence boundary that previously remained open is now closed.

## Security / secrets / network rehearsal evidence

The synthetic self-host target remains intentionally narrow:

- target DB bound only to `127.0.0.1:15432`;
- target API gateway bound only to `127.0.0.1:18000`;
- Auth, Realtime, Edge Functions and Supavisor are not started for the target path;
- Studio/meta are only present where required by the pinned upstream gateway dependency and are not separately host-published;
- ephemeral self-host secrets are generated for the rehearsal and masked in Actions;
- known insecure upstream example secrets cause failure;
- repository secret-pattern scan runs before rehearsal;
- managed credentials are held in GitHub Actions secrets and masked;
- `SUPABASE_ACCESS_TOKEN` and linked project state are forbidden in this workflow;
- managed source uses `PGSSLMODE=require`;
- `PGSSLMODE=disable` is restricted to the loopback-only ephemeral self-host target.

These are release-readiness checks, not a claim that future AWS production networking/TLS is already configured.

Actual production infrastructure will still require deployment-day verification of at least:

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

- no authorized real production backend connection;
- no real personal data;
- no real production Storage;
- no Auth;
- no payment/advertising/monetization activation.

Repository merges and the managed synthetic rehearsal do **not** authorize Lovable Publish/Update, production deployment or real-data collection.

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
- isolated `Arar Buluruz / arar-buluruz-synthetic-dev` Supabase Free project for synthetic/mock development and portability evidence only;
- existing `tarladan` resources remain out of scope;
- AWS OFF;
- paid infrastructure OFF;
- production OFF;
- real data OFF.

### Pre-AWS technical state

The dedicated managed Supabase Free → pinned self-host provider portability checkpoint is **complete** through Issue #66 and run `32638398176`.

There is no remaining need to create or modify infrastructure merely to repeat that proof. AWS must remain unopened until a later explicit activation decision.

### Real pilot later

The current future production candidate remains minimal self-hosted Supabase on AWS Istanbul Local Zone `eu-central-1-ist-1a`, with EC2/EBS/Docker and eligible credits only after release readiness and a separate activation decision.

AWS account/provisioning decisions, pricing/credit eligibility, Istanbul Local Zone availability, EBS snapshot residency/configuration and production network design remain intentionally deferred and must be re-checked at the actual production gate. AWS is still **OFF**.

## Privacy/legal real-data gate

Technical portability readiness is not legal authorization for real data. Before the first real listing, the separate privacy/legal/operational gate must still resolve and verify at least:

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

After Issue #66 completion, the narrow remaining path is:

1. keep product scope frozen and real data OFF;
2. keep the dedicated Supabase Free environment synthetic-only and `tarladan` untouched;
3. complete the separate privacy/legal/operational real-data gate;
4. do not open AWS merely for further rehearsal — wait for an explicit production activation decision;
5. at that later production gate, re-verify Istanbul availability/cost/credits/residency plus production TLS/network/secrets/backups and perform an actual production backup/restore verification;
6. only after explicit real-data authorization begin the **1 → 3 → 5–10** Çorlu canary.

Do **not** add Auth, accounts, payments, chat, ads, seller dashboards, complex analytics, recommendation engines, microservices, Kubernetes or speculative observability to satisfy this path.

## Historical-document rule

Older project-memory, backlog, provider and readiness documents remain historical evidence. Where their current-status wording conflicts with this file or a later canonical GitHub change, this current-state file and GitHub `main` control. The exact PR/commit under review remains authoritative for implementation facts.