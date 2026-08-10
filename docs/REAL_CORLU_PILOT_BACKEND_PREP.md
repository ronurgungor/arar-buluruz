# Arar Buluruz — Real Çorlu Pilot Backend Preparation

_Date: 2026-08-09, Europe/Istanbul_

## Gate scope

This repository state prepares the controlled **5–10 real Çorlu listing** backend without activating it.

This gate creates **no** VPS, remote Supabase project, remote Storage bucket, production secret, user account, real listing, real contact datum or public backend connection. The current public V0 remains mock listings + zero-data demo form. No deployment is authorized by this work.

## Current repository baseline for this gate

The canonical starting `main` for the trusted-photo implementation gate is `7482bf0b0619606b13d3843c0b14f738380a0cd7`, after PR #56. The earlier real-pilot backend foundation from PR #53 remains inactive repository preparation.

This means the preparation described here is present in the repository, **not** that it is live in production. The deployed public V0 still uses mock/synthetic listings and has no real backend connection, real personal data, real Storage, Auth or public external-sales CTA.

## Hard founder budget/revenue override

Arar Buluruz currently earns no revenue.

Therefore the technical purchase/readiness conditions in this document are **necessary future prerequisites only**. They are not sufficient spending authorization.

Until a separate explicit **FOUNDER BUDGET / REVENUE GATE** is opened and approved:

- no paid VPS;
- no paid hosted backend;
- no paid backup;
- no recurring paid production infrastructure.

A provider shortlist, a successful technical review, a complete runbook, or even satisfaction of all technical purchase prerequisites below does **not** authorize a purchase while that founder financial gate remains closed.

No particular VPS provider, backup vendor or seller-contact model is selected by this document. Research recommendations remain non-binding unless separately recorded as founder decisions.

## Minimum pilot data model

### Public listing projection: `public.listings`

The existing listing table remains the public-domain source of truth and keeps its current columns:

- `id`
- `title`
- `description`
- `price_amount`
- `province`
- `district`
- `seller_display_name`
- `search_keywords`
- `status`
- `created_at`
- `updated_at`
- `published_at`
- `expires_at`
- `unpublished_at`

No category field is introduced.

Stored lifecycle states are deliberately small:

- `draft`
- `pending`
- `published`
- `unpublished`
- `rejected`

`expired` is an **effective state**, not another stored state: a row with `status = 'published'` and `expires_at <= now()` is inaccessible to anonymous readers through RLS.

The real pilot is database-locked to canonical `Tekirdağ / Çorlu`. A compatibility trigger normalizes only the previous synthetic spellings `Tekirdag / Corlu`; any other location is rejected. Geographic expansion requires a separate founder-approved migration.

### Private contact: `private.listing_contacts`

One private contact record per listing can be represented by the prepared schema:

- `listing_id`
- `preferred_channel`: `phone` or `whatsapp`
- `contact_e164`
- timestamps

No required surname, legal name, email, address, birth date, account profile or identity document is added. `seller_display_name` remains a public display string and should not require a legal full name.

**Preparation is not collection authorization.** The exact real-pilot contact model remains a separate founder/privacy decision. The presence of this table does not require or authorize inserting real phone/WhatsApp data.

### Private photo metadata: `private.listing_photos`

Metadata only:

- opaque photo UUID
- owning listing UUID
- controlled object path
- MIME type
- byte size
- display sort order
- created timestamp

The trusted ingestion boundary persists canonical sanitized metadata as `image/webp` with a controlled `listings/{listing_uuid}/{photo_uuid}.webp` path. Original filenames are discarded. Real image bytes never belong in Git, repository fixtures or CI artifacts.

### Private external-sales review state: `private.listing_external_sales_links`

One optional provider-neutral link record per listing:

- canonical URL + canonical host
- optional provider key (`shopier` is recognized by application logic, not baked into the listing table)
- deterministic URL-security classification
- ownership state
- listing/product-match state
- moderation state
- complaint/restriction state
- explicit public CTA decision
- timestamps

The canonical URL is indexed but **not globally unique**. Two listings may legitimately use the same seller storefront; duplicate identity is therefore a review signal, not an automatic database rejection.

## Public/private personal-data boundary

`public` contains only data intended to be shown in a listing. Contact details, photo operational metadata and external-link review dimensions are in the non-exposed `private` schema.

`anon` and `authenticated` receive no `USAGE` on `private`. The API exposes `public` (plus Supabase's unavoidable Storage API schema), not `private`. The public browser never receives a service-role key.

Real seller personal data remains blocked until a separate current privacy/KVKK/data-flow gate approves the exact pilot model. At minimum that later gate must resolve:

1. controller/contact identity and notice wording,
2. purpose and lawful processing basis,
3. public-vs-private fields and recipients/data flow,
4. retention/deletion rules,
5. processor/provider and cross-border/data-location review,
6. publication/contact authorization where actually needed,
7. complaint/deletion/request operational procedure.

This document is a technical privacy boundary, not a legal conclusion.

## Manual moderation lifecycle

Founder/admin operation is trusted-only. There is no anonymous insert/update/delete and no self-service seller dashboard.

Normal flow:

`draft -> pending -> published -> unpublished`

Alternative flow:

`draft/pending -> rejected`

Automatic effective expiry:

`published + expires_at <= now() -> hidden by RLS`

Only rows satisfying **all** of the following are anonymously readable:

- `status = 'published'`
- `published_at <= now()`
- `expires_at > now()`

Admin publication can initially use a direct protected database path or a server-side path holding the service-role credential. Studio/Postgres must not become public Internet admin surfaces. No public admin panel is required for 5–10 founder-operated listings.

## Photo Storage model

Bucket name: `listing_photos`.

The committed repository setting remains `storage.enabled = false`. CI temporarily enables Storage only in the ephemeral runner copy and seeds the configured bucket after database reset.

### Untrusted input boundary

The trusted operator/server path accepts image bytes only after all current application checks pass:

- declared input MIME is JPEG, PNG or WebP;
- input byte size is between 1 byte and 8 MiB;
- basic content signature matches the declared MIME;
- `Bun.Image` successfully decodes the image with the existing 50,000,000 decoded-pixel ceiling;
- decoded format matches the declared MIME.

Content-Type is never treated as proof of image content.

### Canonical sanitization and ingestion

Before Storage is touched, `sanitizeListingPhoto()` performs trusted decode and re-encode. The accepted output is canonical WebP only.

The reusable trusted ingestion invariant is:

`untrusted JPEG/PNG/WebP bytes -> decode/re-encode sanitizer -> canonical WebP -> private Storage -> private metadata`

Rules:

- original untrusted bytes are never passed to the Storage uploader;
- original filename is not accepted by the trusted ingestion helper and is not persisted;
- output object path is exactly `listings/{listing_uuid}/{photo_uuid}.webp`;
- the configured private bucket accepts only `image/webp` objects;
- persisted trusted metadata records the same listing UUID, photo UUID, object path, `image/webp` MIME, sanitized byte size and sort order;
- metadata registration is exposed only through a service-role-only RPC bridge because the `private` schema remains outside the Data API;
- if Storage upload succeeds but metadata registration fails, the trusted helper performs a compensating Storage delete;
- if that compensating delete also fails, the helper fails closed and reports the exact orphan object path for operator reconciliation rather than pretending ingestion succeeded.

No public seller upload, browser service-role operation, admin panel, production drag/drop uploader or remote Storage is introduced by this preparation.

### Active-listing signed delivery gate

Photo delivery remains private-by-default. A trusted server/operator helper may request a signed URL only after a service-role-only database gate returns matching metadata.

The database gate returns a photo only when **all** are true:

- listing exists;
- `status = 'published'`;
- `published_at <= now()`;
- `expires_at > now()`;
- `unpublished_at is null`;
- requested photo belongs to the requested listing;
- object path exactly matches `listings/{listing_uuid}/{photo_uuid}.webp`;
- stored MIME is `image/webp`;
- stored byte size remains inside the trusted boundary.

`anon` and `authenticated` have no execute privilege on the metadata-registration or delivery-gate RPCs and no `USAGE` on the private schema. Both RPCs are `SECURITY DEFINER` with an explicitly empty `search_path`; only `service_role` receives execute privilege.

The application helper revalidates the returned listing/photo IDs, path, MIME and byte-size contract before asking Storage for a signed URL. Signed URL TTL is configurable from 1 to 300 seconds; the current default is 60 seconds and the existing five-minute maximum remains the hard conservative ceiling.

Lifecycle:

- `draft/pending/rejected`: no new signed URL issuance;
- `published + active`: trusted path may issue a short-lived signed URL;
- `unpublished/expired`: no new signed URL issuance; an already-issued URL expires naturally after its short TTL;
- hard listing deletion: delete Storage objects through Storage API first, then remove metadata/listing; do **not** manually delete `storage.objects` rows;
- periodic orphan reconciliation: compare Storage object listing-prefix inventory with `private.listing_photos`; quarantine/report unexpected objects before deletion.

### Pixel / memory boundary review

**Decision: KEEP FOR NOW.** The existing 50,000,000 decoded-pixel ceiling is unchanged in this gate.

A worst-case 50,000,000-pixel RGBA raster requires `50,000,000 × 4 = 200,000,000` bytes, approximately **190.7 MiB**, for one decoded pixel buffer alone. Actual peak process memory can be higher because input bytes, codec state, orientation/re-encode working buffers and encoded output may coexist temporarily.

The current intended pilot model is founder-operated and sequential: one trusted photo is processed at a time, with no concurrent public upload handling in this PR. There is therefore no measured evidence yet that justifies replacing the 50M limit with a different arbitrary number. Before any production activation, the exact target server memory envelope and representative photo workload must be measured; if the sequential pipeline does not fit safely alongside the chosen backend services, lower the ceiling based on those measurements before real data is enabled.

## External-sales / Shopier model

There is no Shopier API, OAuth, credential sharing, scraping or iframe.

A seller-provided public sales URL is validated by the existing provider-neutral deterministic URL-security core. Recognized exact Shopier hosts remain `shopier.com` / `www.shopier.com`, canonicalized to `shopier.com`.

A link identity change resets ownership, product-match, moderation and public-CTA decision to fail-closed. Complaint/review downgrades automatically force `block_public_cta` in the database as defense in depth.

### Exact CTA eligibility rule

A public external-sales CTA may be produced **only if all conditions are true**:

1. current URL re-validates and is not `INVALID`;
2. stored canonical URL equals the current canonical URL;
3. stored URL-security classification equals the current validation classification;
4. stored provider identification matches current provider classification;
5. ownership status is `confirmed`;
6. listing/product-match status is `matched`;
7. moderation status is `approved`;
8. complaint status is `clear`;
9. explicit public decision is `allow_public_cta`.

Anything else returns no CTA.

The semantic operator state is:

- `block_public_cta`
- `allow_public_cta`

Recognized Shopier copy:

- `Satıcının Shopier sayfasına git`
- `Haricî site: shopier.com`

Generic approved seller page:

- `Satıcının satış sayfasına git`
- `Haricî site: {canonical host}`

No Shopier logo, badge, partnership claim or safety guarantee is introduced.

## Zero-cost CI proof

`Real pilot backend prep` runs only local Docker/Supabase infrastructure inside GitHub Actions with synthetic fixtures. It:

1. proves no linked remote Supabase project/credential is present,
2. enables local Auth + Storage only in the ephemeral runner copy,
3. starts only the local services required for API/database/Storage validation,
4. rebuilds the database from zero migrations,
5. seeds the private bucket from `config.toml`,
6. runs pgTAP/RLS tests, including service-role-only RPC privilege/search-path and lifecycle negatives,
7. generates only synthetic image data and proves a real decodable JPEG carrying synthetic EXIF/GPS/XMP is re-encoded to metadata-free canonical WebP,
8. runs the trusted ingestion helper so only sanitized WebP reaches the private Storage object path,
9. persists matching private metadata and proves path/MIME/byte-size consistency,
10. proves pending/rejected/unpublished/expired listings cannot receive new signed URLs while an active published listing can read the sanitized object through a short-lived signed URL,
11. proves anonymous users cannot upload or directly read the private bucket and cannot call the private metadata RPCs,
12. proves the original unsanitized JPEG object path does not exist,
13. keeps existing Storage MIME/size negative checks,
14. destroys local data after the run.

Current existing V0/CI/PWA checks remain separate and must stay green. The public V0 remains mock/synthetic, globally noindex and disconnected from Storage/backend activation.

## Future Türkiye self-hosted production contract

The future stack must be the official Supabase Docker self-hosting distribution pinned to one tested release/commit; do not copy an unpinned `latest` stack into this repository. At activation, re-read the upstream self-hosted changelog before selecting the pin.

Minimum candidate service set for this no-Auth pilot:

- PostgreSQL from the pinned Supabase release
- PostgREST
- Storage API if the separately approved pilot requires it
- API gateway from that same pinned release

Auth, Realtime, Edge Runtime, image transformation, Analytics/Logflare/Vector, Studio and Supavisor are not product requirements for the 5–10 listing pilot. Remove/disable only after the pinned-stack POC proves there is no dependency break; do not hand-assemble incompatible service versions.

Network contract:

- Türkiye-located Linux VPS
- Docker Engine + Compose
- DNS + HTTPS reverse proxy
- only intended HTTPS application/API surface Internet-reachable
- direct PostgreSQL not Internet-reachable
- Studio not Internet-reachable; if temporarily needed, use a protected private/tunnel path
- host firewall default-deny inbound except required public ports
- secrets only in protected server secret/env storage, never frontend, Git or CI artifacts
- log rotation + disk/RAM/CPU monitoring
- OS/container security update runbook
- rate limiting at the public edge/gateway after load envelope is known

See `ops/self-hosted/production.env.contract.example` for non-secret variable classes. Exact upstream variable names must be generated/revalidated from the pinned release rather than assumed from a moving branch.

## Backup and restore gate

A same-VPS copy is an operational convenience, **not** disaster recovery.

Before any real personal data, the backup bundle must contain two independently recoverable layers:

### A. PostgreSQL

- roles/schema/data dump appropriate to the pinned self-hosted release
- repository migration commit SHA and pinned Supabase release recorded in manifest
- encrypted before leaving the production trust boundary
- integrity hash recorded

### B. Storage

If real listing photos are in the approved pilot scope:

- complete `listing_photos` object set copied through the supported Storage/S3 interface;
- object inventory with path, byte size and cryptographic hash;
- encrypted off-VPS copy.

Retention duration is a separate privacy/operations decision before real data; a prior proposed `7 daily + 4 weekly` pattern is a non-binding technical proposal, not a founder-approved retention rule.

### Mandatory two-part restore drill

Before public real data, both drills must pass on empty environments:

1. **Migration reconstruction drill** — fresh pinned stack, replay repository migrations from zero, seed required bucket configuration, run pgTAP/RLS/REST/Storage synthetic checks.
2. **Disaster restore drill** — separate clean server/environment, decrypt verified backup, restore database according to the pinned release procedure, restore Storage objects through supported semantics if applicable, then verify object inventory/hashes and application/RLS behavior.

`ops/self-hosted/restore-verification.sql` provides invariant checks that do not depend on real row values.

Restore failure, hash mismatch, missing object, missing RLS policy, unexpected anonymous write, or inability to reproduce the pinned stack is an automatic **PUBLIC REAL DATA NO-GO**.

## Rollback

Before any production migration/update:

1. take and verify a fresh off-VPS backup set,
2. record current application SHA + Supabase release pin,
3. apply migration/update during a controlled window,
4. run public and private smoke checks,
5. on failure stop writes/public real-data mode and restore the last known-good stack/data into a clean or verified rollback target.

Do not attempt an in-place Postgres-major downgrade. Restore into a compatible pinned stack.

## Pre-mortem

| Failure | Early signal | Preventive control | Activation response |
| --- | --- | --- | --- |
| Pending/rejected listing leaks | anon test sees non-active UUID | RLS + column grants + negative REST tests | real-data NO-GO |
| Seller contact leaks | private schema reachable via Data API | non-exposed `private`, no anon schema usage | block backend/public real data |
| Malicious/incorrect photo upload | decode/signature/size failure or raw object appears | trusted decode/re-encode, canonical WebP-only Storage path, 8 MiB + 50M-pixel guards | reject object; investigate trusted path |
| Photo metadata write fails after upload | sanitized object exists without metadata | compensating delete + explicit orphan path on cleanup failure | reconcile before continuing |
| Old reviewed URL remains live after edit/complaint | CTA state remains allow after identity/review downgrade | reset trigger + full-state pure CTA function | force block CTA; review link |
| Service-role credential enters browser/Git | secret scan or network bundle contains key | server-only secret contract + CI scan | rotate immediately; no activation |
| VPS loss destroys DB/photos | only same-disk backup exists | encrypted off-VPS DB + object backup | real-data NO-GO until restore proven |
| Upstream self-host update breaks stack | compose/changelog changes, gateway/PG mismatch | exact release pin + POC + backup | remain on last tested pin |
| Cost creep before validation | paid service appears in architecture | D-022 FOUNDER BUDGET / REVENUE gate | do not purchase |

## Exact VPS technical-readiness and purchase trigger

### Technical-readiness conditions

A future Türkiye VPS is technically ready for founder purchase consideration only when all are true:

1. the real-pilot backend preparation is merged and relevant CI/PWA regressions are green;
2. the exact real-pilot scope and seller-authorized listing set are ready;
3. current privacy/KVKK review has approved the exact personal-data flow, notice and retention/deletion process;
4. a specific Türkiye-hosted VPS provider/location, monthly price and resource envelope have been reviewed;
5. an independent encrypted off-VPS backup destination has been reviewed;
6. an operator is named for patching, backups, restore and incident response;
7. the exact self-hosted Supabase release pin and compatibility have been reverified.

### Separate spending authorization

**Even if every technical-readiness condition above passes, purchase remains NO-GO while D-022 is closed.**

A purchase requires a separate explicit **FOUNDER BUDGET / REVENUE GATE** approving the recurring cost and exit implications.

### Public real-data activation trigger

Buying the VPS, if ever separately approved, is **not** permission to publish real data. Activation requires the fresh environment to pass HTTPS/network isolation, migrations-from-zero, RLS, approved Storage scope, backup, **clean-server restore**, object recovery/hash verification where applicable, rollback and stability checks, followed by a separate founder PUBLIC REAL LISTING activation gate.

Until then the current public V0 must not be switched to the real backend.

## Recurring cost now

**0 TL recurring production infrastructure is authorized by this preparation.** GitHub/local CI, migrations, synthetic fixtures, documentation and pure security/domain preparation only.
