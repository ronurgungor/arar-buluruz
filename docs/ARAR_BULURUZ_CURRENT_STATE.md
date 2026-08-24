# Arar Buluruz — Current State

_Last updated: 2026-08-24, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; canonical branch: `main`.
- PR #74 — **Prove hosted synthetic pilot release candidate**: **MERGED / CLOSED**.
- PR #74 verified exact head: `e63ac55a99dcb62fb7e3d55c0ed077aa7213eb20`.
- PR #74 merge commit: `7242a87559a5091c24b0779219506d3b55ff4c91`.
- Issue #66 — dedicated managed Supabase Free → pinned self-host migration rehearsal: **CLOSED / COMPLETED**.
- Issue #72 — pre-AWS pilot release-candidate execution: technical acceptance evidence is complete; this document records that final verified state for closure.
- GitHub `main` is not branch-protected; successful checks are evidence rather than server-enforced merge requirements. Exact-head verification and normal PR/merge discipline remain mandatory.

## Current phase

**Pre-AWS pilot release-candidate technical execution is complete. Production activation remains closed.**

Issue #66 proved provider portability. Issue #72 subsequently proved the application-level hosted synthetic pilot release candidate against the dedicated Arar Buluruz development environment without activating AWS, production or real data.

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
- no Auth/account/payment/chat/advertising/monetization scope expansion;
- existing `tarladan` resources remain untouched and out of scope.

**REAL DATA COLLECTION remains CLOSED.**

## Dedicated hosted Supabase state

The approved isolated hosted-development environment is:

- organization: `Arar Buluruz`;
- project: `arar-buluruz-synthetic-dev`;
- project ref: `rzosrvenlvhijeckmwyc`;
- region: `eu-central-1` / Frankfurt;
- plan: Supabase Free;
- data: synthetic/mock only.

The hosted proof hard-rejects both known Tarladan project refs before any live mutation. The dedicated project is not production and its successful use does not authorize real data or production activation.

## Issue #66 portability state

The managed Supabase Free → pinned self-host DB + Storage migration and rollback rehearsal is complete.

Verified portability includes:

- canonical migrations and application schema/data;
- private Storage object backup/restore;
- RLS/grants and restore verification;
- signed private-photo delivery;
- application-level verification on source and target;
- source/target DB fingerprint equality;
- source/target Storage equality;
- rollback to the preserved managed source;
- exact photo byte/hash verification;
- final synthetic-only cleanup guard.

The tested target remains pinned to `self-hosted/v0.8.0` / upstream commit `241bb11c0627f2981746d37033f57dbfa81d29b0`, PostgreSQL 17, Storage API `v1.60.4`, PostgREST `v14.12` and Envoy `v1.39.0`.

Portability is therefore **PASS** and is not an open Issue #72 blocker.

## Issue #72 recovery-free exact-head evidence

Final recovery-free exact head:

`e63ac55a99dcb62fb7e3d55c0ed077aa7213eb20`

All required workflows on that same head completed **SUCCESS**:

- CI — run `32758521813`;
- V0 minimal PWA — run `32758521843`;
- Self-host migration rehearsal — run `32758521808`;
- Real pilot backend prep — run `32758522016`;
  - hosted exact-head RC job `97531617395` — **SUCCESS**;
  - local synthetic migration/RLS/Storage/operational validation job `97531617660` — **SUCCESS**.

The hosted exact-head proof established the following application lifecycle in the dedicated synthetic project:

1. founder create;
2. server-side image sanitization;
3. private Storage upload and private photo metadata registration;
4. pending state;
5. publish;
6. public collection and detail through the real Supabase adapter;
7. signed private-photo delivery in the buyer UI;
8. lifecycle-controlled seller contact;
9. unpublish;
10. hard delete;
11. separate pending → reject → hard-delete path.

The browser proof explicitly reported:

`Hosted founder create/photo/publish/public/contact/unpublish/delete + reject/delete browser journey passed.`

## Final DB / Storage cleanup consistency

The hosted RC proof returned the dedicated environment to its canonical fixture state after the founder journeys.

Verified final conditions include:

- Auth users = `0`;
- no listing rows beyond the canonical fixture;
- no orphan private photo metadata;
- no orphan Storage object;
- application DB fingerprint before/after equality;
- Storage before/after object and byte consistency;
- canonical Storage state exactly `1 object / 72 bytes`.

The workflow reported:

`Hosted RC Storage before/after consistency verified: 1 object(s), 72 byte(s).`

No recovery script or recovery workflow hook is present in the final recovery-free exact head.

## Pilot release-candidate artifact proof

The real `pilot-rc` production artifact was built and browser-tested, rather than treating a source fixture or directly opened fallback file as release evidence.

Verified artifact/browser behavior includes:

- desktop and mobile flows;
- Chromium PWA/installability checks;
- service-worker registration and active control;
- manifest disk/HTTP byte identity;
- back-navigation/search-state preservation;
- honest loading, validation, empty and backend-outage fail-closed states;
- public `/giris` unavailable in pilot-RC;
- public `/kurucu` GET/POST unavailable in pilot-RC;
- accountless pilot intake/privacy behavior;
- real Supabase public listing collection/detail;
- signed private-photo browser decode;
- seller-contact contract;
- fail-closed offline navigation.

Final pilot manifest evidence:

- bytes: `784`;
- SHA-256: `80c19fb20d9512fe6454cb12ed699b4badd91083b67d8c94d1d45b18eca2a562`;
- served bytes were identical to the finalized disk artifact.

The signed private photo decoded successfully in Chromium (`complete=true`, non-zero natural dimensions, no decode error).

### Real offline navigation evidence

The offline proof verified an installed and controlling service worker before navigation:

- secure context: true;
- one service-worker registration for the application scope;
- `installing = null`;
- `waiting = null`;
- active `/sw.js` state: `activated`;
- `navigator.serviceWorker.controller`: `/sw.js`, state `activated`;
- `/offline.html` present in Cache Storage with HTTP 200.

The production server was then made unavailable and the browser performed a real offline navigation to:

`/ara?q=offline-proof`

The navigation result was:

- HTTP `200`;
- `fromServiceWorker = true`;
- `navigator.onLine = false`;
- visible heading: `Bağlantı yok`;
- no stale dynamic listing data;
- request failures: none;
- console errors: none;
- page errors: none.

The workflow reported:

`pilot-rc production artifact desktop/mobile/PWA/offline/navigation/fail-closed proof passed.`

## Artifact and privilege boundary

The final hosted proof keeps privileged transport and credentials outside the public artifact/browser boundary.

Verified constraints include:

- workflow-only transport shim bound to localhost and dedicated Arar Buluruz synthetic project only;
- known Tarladan project refs hard-rejected;
- privileged DB/S3 credentials not supplied to browser runtime;
- public pilot artifact contains no privileged endpoint/credential material;
- no CI shim marker/port in runtime source;
- no V0/mock/test presentation residue in pilot-RC;
- no service-role credential or supplied secret leakage;
- repository remained clean after proof (`git diff --check` and `git diff --exit-code`).

The final boundary scanner reported:

`pilot-rc artifact boundary passed: no CI shim, V0/mock/test presentation residue, privileged marker, or supplied secret leakage.`

## Supabase repository state

`supabase/config.toml` remains fail-closed in Git. Auth and Storage are enabled only in controlled test/rehearsal paths; production activation is not implied.

Current canonical migration chain is exactly six migrations:

1. `20260730162000_create_listings.sql`
2. `20260808211500_prepare_real_corlu_pilot_backend.sql`
3. `20260809220000_prepare_trusted_photo_pipeline.sql`
4. `20260810210000_prepare_public_seller_contact_contract.sql`
5. `20260822113000_enable_public_signed_photo_delivery.sql`
6. `20260823150000_add_operator_photo_inventory.sql`

Canonical database/RLS test suites, REST integration, browser E2E, private Storage, signed-photo, backup/restore and application-level verification all pass in the final required workflows.

## Public runtime vs repository

Repository readiness and the already-published public V0 remain separate states.

The known public V0 remains synthetic/mock and non-collecting unless a separate publication/deployment gate changes it:

- no authorized real production backend connection;
- no real personal data;
- no real production Storage;
- no Auth;
- no payment/advertising/monetization activation.

PR #74 and Issue #72 completion do **not** authorize Lovable Publish/Update, AWS provisioning, production deployment or real-data collection.

## Minimal pilot product scope

After all later activation gates pass, the controlled rollout remains:

1. **1 real Çorlu listing**;
2. review;
3. **3 listings**;
4. review;
5. **5–10 listings**.

Operating model remains founder-operated, with no seller Auth/accounts/dashboard, no public self-service writes, no chat, no payment custody/commission and no advertising/paid listings/subscriptions during validation.

## Remaining activation gates

The technical pre-AWS release-candidate proof is complete, but it is not legal or operational authorization for real data.

Before the first real listing, the separate privacy/legal/operational and production-activation gates must still resolve and verify, as applicable:

- KVKK transparency/aydınlatma and controller contact;
- collection/storage/public-disclosure legal basis;
- retention/deletion and data-subject request procedures;
- wrong-person/incorrect-phone rapid takedown;
- recipient/data-flow mapping and moderation rules;
- actual production provider/data-residency configuration;
- production TLS/network/admin hardening;
- production secrets/least privilege;
- minimum operational logs;
- unpublish/kill switch;
- actual production backup and successful restore.

AWS account/provisioning, pricing/credit eligibility, Istanbul availability/residency and production network design remain intentionally deferred until an explicit production activation decision. **AWS remains OFF.**

## Shortest safe path from this checkpoint

After Issues #66 and #72 technical completion:

1. keep product scope frozen and real data OFF;
2. keep the dedicated Supabase Free environment synthetic-only and Tarladan untouched;
3. complete the separate privacy/legal/operational real-data gate;
4. do not open AWS merely to repeat already-passed release-candidate/portability proofs;
5. at a later explicit production gate, verify actual infrastructure, residency, TLS/network/secrets/backups and perform the required production backup/restore check;
6. only after explicit real-data authorization begin the **1 → 3 → 5–10** Çorlu canary.

Do **not** add Auth, accounts, payments, chat, ads, seller dashboards, complex analytics, recommendation engines, microservices, Kubernetes or speculative observability merely to satisfy this path.

## Historical-document rule

Older project-memory, backlog, provider and readiness documents remain historical evidence. Where their current-status wording conflicts with this file or a later canonical GitHub change, this current-state file and GitHub `main` control. The exact PR/commit under review remains authoritative for implementation facts.
