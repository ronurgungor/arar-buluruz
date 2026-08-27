# Arar Buluruz — Current State

_Last updated: 2026-08-27, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; canonical branch: `main`.
- PR #74 — **Prove hosted synthetic pilot release candidate**: **MERGED / CLOSED**.
- PR #74 verified exact head: `e63ac55a99dcb62fb7e3d55c0ed077aa7213eb20`.
- PR #74 merge commit: `7242a87559a5091c24b0779219506d3b55ff4c91`.
- Issue #66 — dedicated managed Supabase Free → pinned self-host migration rehearsal: **CLOSED / COMPLETED**.
- Issue #72 — pre-AWS pilot release-candidate execution: technical acceptance evidence is complete; this document records that final verified state for closure.
- GitHub `main` is not branch-protected; successful checks are evidence rather than server-enforced merge requirements. Exact-head verification and normal PR/merge discipline remain mandatory.

## Current phase

**Near-final consumer self-service product implementation is GREEN in PR #78; production and real data remain closed.**

Current product authority is `docs/PRODUCT_CONTRACT_V2.md`.

Frontend exact-head checkpoint:

`41691652070cbc117a943578a49056d49d51e6f0`

PR #78 is **OPEN / DRAFT / UNMERGED**.

All seven canonical workflows are GREEN on that exact head:

- Activation readiness — `33091191102`;
- V0 minimal PWA — `33091191295`;
- CI — `33091191358`;
- Real pilot backend prep — `33091191160`;
- Stage 1 Phase A code gate — `33091191189`;
- Self-host migration rehearsal — `33091191164`;
- Stage 1 self-service acceptance — `33091191129`, successful rerun job `98587435492`.

The first Stage 1 acceptance attempt failed before browser execution because local Supabase could not bind host port `54322`. The same job reran successfully on the same SHA without application-code changes.

Current consumer product facts:

- Türkiye-wide İl / İlçe;
- seller self-service;
- phone verification;
- atomic auto-publication after trusted-photo and required evidence readiness;
- founder post-moderation/takedown rather than routine pre-approval;
- Telefon / WhatsApp / Telefon + WhatsApp;
- lightweight `İlanlarım` seller ownership;
- no classic username/password account;
- broad categories and search normalization;
- near-final responsive consumer UX.

Older Çorlu-only, seller-calls-founder, founder-entry, phone-only, WhatsApp-OFF and no-self-service product assumptions are **superseded** as current product truth. They remain historical evidence where retained in dated documents.

Hard boundaries remain:

- synthetic/mock data only;
- no real seller/listing/contact/photo/personal data;
- no real users;
- production backend/deployment OFF;
- AWS OFF;
- paid infrastructure/services OFF;
- Ads/monetization OFF;
- no payment/order/reservation/commission/in-app chat;
- Tarladan untouched.

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

## Current consumer product scope

The old controlled Çorlu-only intake model is superseded as the current product contract.

The current product is Türkiye-wide and seller self-service:

- seller creates the listing directly;
- 1–8 trusted photos;
- broad category + title + condition;
- priced or Ücretsiz;
- description + İl + İlçe;
- seller display name + verified phone;
- Telefon / WhatsApp / Telefon + WhatsApp;
- short required publication/declaration evidence;
- atomic auto-publication;
- founder post-moderation/takedown;
- lightweight phone-verified `İlanlarım` management;
- buyer search/detail/signed-photo/direct-contact flow;
- no classic Auth/password, in-app chat, payment, order, reservation, commission or shipping.

Search continues to normalize compact/spaced queries such as `b150` and `b 150`.

Free listings display **Ücretsiz**, never `₺0`.

The consumer UI must not present itself as a pilot, Stage 1 test harness, founder intake process or compliance tool.

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

1. keep production, real data, AWS and recurring spend OFF;
2. preserve the GREEN self-service/backend/security contracts already proved in PR #78;
3. keep canonical documentation synchronized with `PRODUCT_CONTRACT_V2.md`;
4. complete the narrow security REDTEAM and fix only material repository-controlled findings;
5. after any material code fix, require all seven canonical workflows to pass on one exact SHA;
6. keep PR #78 draft/unmerged until founder/advisor hands-on product review;
7. separately resolve the applicable real-data/legal/production gates before any real seller data or production activation.

Do not add classic Auth/accounts, in-app chat, payments, orders, reservations, commission, ads, recommendation engines, microservices, Kubernetes or speculative observability merely to satisfy this path.

## Historical-document rule

Older project-memory, backlog, provider and readiness documents remain historical evidence. Where their current-status wording conflicts with this file or a later canonical GitHub change, this current-state file and GitHub `main` control. The exact PR/commit under review remains authoritative for implementation facts.
