# Arar Buluruz — Current State

_Last updated: 2026-09-03, Europe/Istanbul_

## Canonical repository checkpoint

- Repository: `ronurgungor/arar-buluruz`.
- Canonical branch: `main`.
- Live `main` at this synchronization: `47956ef9f4e91cd6dd033d988c9c115bb1f128b7`.
- Active branch: `agent/smsless-seller-ownership-phase1`.
- Pre-final-documentation branch checkpoint: `64124531296857b2a67ada154da72c2fe265f488`.
- At that checkpoint the branch is 27 commits ahead / 0 behind `main`; open PRs: none.
- This documentation commit necessarily advances the feature SHA; live GitHub is authoritative for the exact final head.

One-writer discipline remains active. No rebase/amend/squash/force-push of pushed history.

## Current phase

**SMSless seller ownership Phase 1 is implementation-complete pending final exact-head workflow proof and PR review. Production and real data remain closed.**

The current product authority is `docs/PRODUCT_CONTRACT_V2.md`.

## 2026-09-03 founder/Advisor decision

Current seller identity/authorization truth:

- ordinary-goods SMS OTP is removed as a product requirement;
- seller identity is a pseudonymous UUID;
- `listings.owner_user_id` is the listing ownership link;
- the browser receives a server-backed opaque HttpOnly session cookie;
- only token digests are persisted;
- seller recovery uses a rotating high-entropy recovery code with digest-only persistence;
- public phone is contact data, not verified identity or authorization;
- phone equality does not establish ownership and phone edits do not transfer ownership;
- manual line/WhatsApp verification is risk-triggered only;
- no general e-Devlet login;
- passkey/email/OAuth/password are deferred;
- Vasıta **and Emlak** real production publication fail closed without production EİDS integration.

## Security semantics reconfirmed on the feature implementation

Current implementation/tests establish:

- seller A/B isolation resolves session `seller_id` and requires `owner_user_id = seller_id`;
- `owner_user_id` is immutable after listing creation;
- phone/contact changes do not modify owner ownership;
- historical rows are deliberately not backfilled from `contact_e164`;
- recovery rotation/revocation/replacement occurs in one database function transaction;
- consumed recovery credentials cannot be replayed;
- successful recovery revokes every pre-existing session for that seller;
- logout revokes the current server-side session and then clears the cookie;
- database rows store recovery/session digests, not plaintext tokens;
- browser acceptance rejects phone/localStorage fallback and proves stale copied sessions fail;
- anonymous role cannot inspect private seller/session state or execute seller-session/recovery RPCs;
- current self-service and exceptional founder publication both fail closed for real-production Vasıta and Emlak without EİDS;
- established RLS, private Storage, trusted-photo, signed-photo, idempotency, atomic-publication and takedown controls remain in the canonical validation paths.

## Migration state

The canonical migration chain now contains ten migrations. The new Phase 1 migration is:

`supabase/migrations/20260903130000_prepare_smsless_seller_ownership.sql`

It adds private pseudonymous seller identities, revocable server-side seller sessions, rotating recovery digests and nullable `public.listings.owner_user_id`. It explicitly forbids deriving historical ownership from public-phone equality and keeps legacy phone-verification columns only as historical/risk-control evidence.

No production migration has been applied by this repository work. The managed provider rehearsal remains synthetic-only and must run through its approved PR workflow gate.

## Exact-head workflow state

Before the final stale-reference/documentation changes, exact head `c83fff4b261d7ba9e2ed1f5e14ac70af387c62d7` had SUCCESS evidence for:

- CI;
- Stage 1 self-service acceptance;
- Activation readiness;
- V0 minimal PWA;
- Real pilot backend prep;
- Self-host migration rehearsal.

Those runs are historical evidence for `c83fff4...`, not acceptance for the final branch head. After the final documentation/stale-reference commit, all canonical workflows must be obtained on the **same exact final SHA**. Managed Supabase migration rehearsal is required on the PR head through its allowed trigger/gate.

## Public runtime versus repository

The existing public V0 and repository capability remain separate facts.

Closed unless explicitly authorized:

- production/public activation;
- real personal/seller/listing/contact/photo data;
- AWS / production infrastructure;
- secrets or environment mutation;
- paid recurring services;
- real SMS;
- production EİDS calls;
- Ads/monetization;
- payments/orders/reservations/commission;
- Publish/Update;
- Tarladan changes.

**REAL DATA COLLECTION remains CLOSED.**

## Immediate next action

1. Commit the canonical documentation synchronization.
2. Obtain all required canonical workflow results on that exact SHA.
3. Only if the branch remains clean and required checks are green, open a PR to `main` without merging it.
4. Obtain the Managed Supabase migration rehearsal and all other canonical workflows on that same exact PR head.
5. Stop for the independent Codex security review and Advisor/founder merge decision.

No production or external-service activation is part of these steps.


## Historical 2026-09-01 state snapshot — retained for audit

> This appendix preserves the previous snapshot as historical evidence. Any verified-phone, OTP, phone-bound ownership/session, founder-entry, or vehicle-only EİDS wording below is **not current product authority** after D-030.

### Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; canonical branch: `main`.
- Pre-PR83 / docs-sync branch-base `main` checkpoint: `27dc75c96ef687e1c585e27fac6521b172e04f31`. Live GitHub controls the exact current `main` SHA.
- Open PRs at this documentation-sync branch start: **none**.
- PR #78 — Stage 1 seller self-service: **MERGED / CLOSED**, merge `26ce6c66de8a03d941d90ff7fe267998ad63ba8f`.
- PR #79 — managed workflow parse/config + migration-chain drift: **MERGED / CLOSED**, merge `1207cf177469d1835abb56d914bd3d80858a0b1a`.
- PR #80 — post-PR79 state + GVK Mükerrer 20/B synchronization: **MERGED / CLOSED**, merge `7ca851e805b0d01d66b2533cad94158a4b7f6b4b`.
- PR #81 — hosted managed provider-proof modernization: **MERGED / CLOSED**.
  - approved head: `8ab785fefa80ee4122fc559298859b8281d4094d`;
  - merge commit: `8bfe6d7a89bbda6ef710aaf313bf24e312ec18eb`;
  - D-029 provider-specific modernization completed.
- PR #82 — Stage 1 listing UX polish: **MERGED / CLOSED**.
  - approved head: `abdcb3621575e870648519cf7adf6e57020bc33c`;
  - merge commit / pre-PR83 docs-sync branch-base checkpoint: `27dc75c96ef687e1c585e27fac6521b172e04f31`.
- Post-PR82 merge CI run `33489222953`, attempt 3: **SUCCESS**.
  - lint/unit/build: **SUCCESS**;
  - Gate 1 local migration/RLS/REST/browser E2E: **SUCCESS**.
- Post-PR82 merge V0 minimal PWA run `33489222873`: **SUCCESS**.
- PR #79 restored the intended managed-rehearsal trigger contract: `pull_request` + `workflow_dispatch`; no `push` trigger.
- GitHub `main` is not branch-protected; successful checks are evidence rather than server-enforced merge requirements. Exact-head verification and normal PR/merge discipline remain mandatory.

### Current phase

**Stage 1 technical implementation is merged; production and real data remain closed.**

Current product authority: `docs/PRODUCT_CONTRACT_V2.md`.

Latest completed work:

- PR #81 completed D-029 provider-specific hosted managed-proof modernization.
- PR #82 completed the approved Stage 1 listing UX polish port from the isolated Lovable UX lab without changing product/backend/security semantics.

The PR #78 remediation closed the two merge-blocking review items:

- ambiguous publication commit/response is reconciled before destructive compensation;
- browser E2E no longer globally suppresses generic 403/404 failures.

Deferred production/recovery items remain open by design:

- stale `in_progress` claim plus pending/private-state reconciliation after process termination;
- orphan Storage cleanup tied to that deliberate recovery model;
- process-local abuse/rate-limit state;
- seller-device logout/localStorage hygiene;
- production proxy-derived HTTPS/host/client-IP semantics;
- cross-service hard-delete retry/reconciliation.

Current consumer product facts:

- Türkiye-wide İl / İlçe seller self-service;
- 1–8 trusted photos;
- broad category + title;
- condition optional with no silent default;
- description optional with no filler text;
- price or explicit **Ücretsiz**;
- seller display name + one verified public phone;
- no seller contact-preference selector;
- buyers receive both **Ara** (`tel:`) and **WhatsApp** (`https://wa.me/`) from that same phone;
- no three consumer declaration checkboxes;
- versioned listing-rules evidence;
- bounded 7-day phone-bound signed HttpOnly seller session;
- atomic auto-publication;
- founder post-moderation/takedown;
- lightweight `İlanlarım`;
- Vasıta retained for the product/synthetic path;
- real production vehicle publication fail-closed until EİDS integration is enabled.

### Current business/formalization state

The prior automatic company-first sequence is superseded.

Current founder plan:

**APPLICATION COMPLETION → GVK MÜKERRER 20/B PERSONAL-DEVELOPER ROUTE WHILE APPLICABLE → MARKET / REVENUE VALIDATION → COMPANY / KOSGEB WHEN REQUIRED OR ADVANTAGEOUS**

Before first taxable revenue, current GVK Mükerrer 20/B eligibility and mechanics must be re-verified. This does not authorize production, real data or waive KVKK/EİDS/platform obligations.

### Hosted managed-proof state

D-029 provider-specific modernization is **completed** through PR #81.

PR #79 first fixed workflow parsing and canonical migration-chain drift. PR #81 then retired the superseded founder-entry/preapproval hosted browser journey, localhost privileged transport shim, stale product-level pilot artifact E2E and historical PR #74-only hosted job from the current evidence path.

The retained provider-specific managed proof is executable and substantive:

- canonical migration-chain equality derived from `supabase/migrations/*.sql`;
- dedicated synthetic-project and Tarladan hard exclusions;
- managed DB/RLS/grants and anon listing-write denial;
- actual managed anonymous direct `listing_photos` Storage API write rejection, with probe absence verified afterward;
- private Storage plus lifecycle-controlled manifest/signing behavior through actual managed provider APIs;
- deterministic fixture byte/hash verification;
- DB + Storage backup, pinned self-host restore and source/target fingerprint/Storage equality;
- rollback/source consistency and explicit orphan metadata/object checks;
- public pilot artifact privilege/secret-residue boundary.

Current Stage 1 seller lifecycle behavior remains covered by the canonical Stage 1 acceptance workflow rather than duplicated through a provider shim.

No new service-role secret was introduced. A thin actual-managed-provider current Stage 1 canary remains intentionally deferred to a later explicit gate.

PR #81 is **MERGED / CLOSED**; there is no active hosted-proof modernization branch or merge-readiness work remaining.

### Hard boundaries

- synthetic/mock data only;
- no real seller/listing/contact/photo/personal data;
- production backend/deployment OFF;
- AWS OFF;
- recurring paid infrastructure/services OFF;
- real SMS OFF;
- production EİDS OFF;
- Ads/monetization OFF;
- no payment/order/reservation/commission/in-app chat;
- Tarladan untouched.

**REAL DATA COLLECTION remains CLOSED.**

### Dedicated hosted Supabase state

The approved isolated hosted-development environment is:

- organization: `Arar Buluruz`;
- project: `arar-buluruz-synthetic-dev`;
- project ref: `rzosrvenlvhijeckmwyc`;
- region: `eu-central-1` / Frankfurt;
- plan: Supabase Free;
- data: synthetic/mock only.

The hosted proof hard-rejects both known Tarladan project refs before any live mutation. The dedicated project is not production and its successful use does not authorize real data or production activation.

### Issue #66 portability state

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

### Historical Issue #72 hosted RC evidence — superseded as current product proof

Final recovery-free exact head:

`e63ac55a99dcb62fb7e3d55c0ed077aa7213eb20`

All required workflows on that same head completed **SUCCESS**:

- CI — run `32758521813`;
- V0 minimal PWA — run `32758521843`;
- Self-host migration rehearsal — run `32758521808`;
- Real pilot backend prep — run `32758522016`;
  - hosted exact-head RC job `97531617395` — **SUCCESS**;
  - local synthetic migration/RLS/Storage/operational validation job `97531617660` — **SUCCESS**.

The following was valid historical evidence for the then-current founder-entry product. It is retained for audit history but is superseded as current Stage 1 product acceptance:

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

### Final DB / Storage cleanup consistency

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

### Pilot release-candidate artifact proof

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

#### Real offline navigation evidence

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

### Artifact and privilege boundary

PR #81 removed the localhost privileged transport shim from the current managed-provider proof rather than extending it.

Current verified constraints include:

- dedicated Arar Buluruz synthetic project only, with known Tarladan project refs hard-rejected;
- privileged DB/S3 credentials remain CI/server-side and are not supplied to browser runtime;
- public pilot artifact contains no privileged endpoint/credential material;
- retired hosted-shim residue is rejected by the artifact boundary scanner;
- no V0/mock/test presentation residue in pilot-RC;
- no service-role credential or supplied secret leakage;
- repository remains clean after proof.

The current boundary scanner reports:

`pilot-rc artifact privilege boundary passed: no retired hosted shim, V0/mock/test presentation residue, founder-intake path, privileged marker, or supplied secret leakage.`

### Supabase repository state

`supabase/config.toml` remains fail-closed in Git. Auth and Storage are enabled only in controlled test/rehearsal paths; production activation is not implied.

Current canonical migration chain is exactly nine migrations:

1. `20260730162000_create_listings.sql`
2. `20260808211500_prepare_real_corlu_pilot_backend.sql`
3. `20260809220000_prepare_trusted_photo_pipeline.sql`
4. `20260810210000_prepare_public_seller_contact_contract.sql`
5. `20260822113000_enable_public_signed_photo_delivery.sql`
6. `20260823150000_add_operator_photo_inventory.sql`
7. `20260826181500_prepare_stage1_self_service.sql`
8. `20260827120000_prepare_near_final_classifieds.sql`
9. `20260828205000_finalize_product_simplification.sql`

Canonical database/RLS test suites, REST integration, browser E2E, private Storage, signed-photo, backup/restore and application-level verification all pass in the final required workflows.

### Public runtime vs repository

Repository readiness and the already-published public V0 remain separate states.

The known public V0 remains synthetic/mock and non-collecting unless a separate publication/deployment gate changes it:

- no authorized real production backend connection;
- no real personal data;
- no real production Storage;
- no Auth;
- no payment/advertising/monetization activation.

PR #74 and Issue #72 completion do **not** authorize Lovable Publish/Update, AWS provisioning, production deployment or real-data collection.

### Current consumer product scope

The old controlled Çorlu-only intake model and the later seller-contact-choice/declaration-checkbox presentation are superseded as the current product contract.

The current product is Türkiye-wide and seller self-service:

- seller creates the listing directly;
- 1–8 trusted photos;
- broad category + required title;
- optional condition with no silent default;
- price or explicit **Ücretsiz**;
- optional description;
- İl / İlçe;
- seller display name + one verified public phone;
- no seller contact-preference selector;
- buyer receives both **Ara** (`tel:`) and **WhatsApp’tan yaz** (`https://wa.me/`) derived from that same public E.164 phone;
- no three consumer declaration checkboxes;
- versioned publication evidence through `listing_rules_version` + `listing_rules_accepted_at`;
- `publication_instruction_at`, verified-phone state and trusted-photo readiness remain publication prerequisites;
- bounded 7-day signed, phone-bound HttpOnly remembered-seller session;
- atomic auto-publication;
- founder post-moderation/takedown;
- lightweight phone-verified `İlanlarım` management;
- buyer search/detail/signed-photo/direct-contact flow;
- Vasıta retained, while real production vehicle publication remains fail-closed until EİDS is integrated;
- no classic Auth/password, in-app chat, payment, order, reservation, commission or shipping.

Search continues to normalize compact/spaced queries such as `b150` and `b 150`.

Free listings display **Ücretsiz**, never `₺0`.

The consumer UI must not present itself as a pilot, Stage 1 test harness, founder intake process or compliance tool.

### Remaining activation gates

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

### Immediate next objective — Activation Gate Review

**Activation Gate Review — determine exactly what remains before the first real listing / real pilot can legally and technically open.**

This is a review/decision gate only. It does not authorize activation implementation.

The review should:

1. keep production, real data, AWS, paid recurring services, real SMS, production EİDS and Ads/monetization OFF;
2. inventory the remaining privacy/legal/operational/production prerequisites against current canonical evidence;
3. distinguish already-proved technical controls from unresolved prerequisites;
4. identify the exact BLOCKER / IMPORTANT / CAN WAIT items for the first real listing / real pilot;
5. produce explicit founder/Advisor go/no-go criteria;
6. make no production, infrastructure, secret, external-service or real-data mutation during the review.

Do not add classic Auth/accounts, in-app chat, payments, orders, reservations, commission, ads, recommendation engines, microservices, Kubernetes or speculative observability merely to satisfy this review.

### Historical-document rule

Older project-memory, backlog, provider and readiness documents remain historical evidence. Where their current-status wording conflicts with this file or a later canonical GitHub change, this current-state file and GitHub `main` control. The exact PR/commit under review remains authoritative for implementation facts.
