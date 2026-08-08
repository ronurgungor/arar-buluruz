# Arar Buluruz — Real Çorlu Pilot Backend Preparation

_Date: 2026-08-09, Europe/Istanbul_

## Gate scope

This repository state prepares the controlled **5–10 real Çorlu listing** backend without activating it.

This gate creates **no** VPS, remote Supabase project, remote Storage bucket, production secret, user account, real listing, real contact datum or public backend connection. The current public V0 remains mock listings + zero-data demo form. No deployment is authorized by this work.

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

One private contact record per listing:

- `listing_id`
- `preferred_channel`: `phone` or `whatsapp`
- `contact_e164`
- timestamps

No required surname, legal name, email, address, birth date, account profile or identity document is added. `seller_display_name` remains a public display string and should not require a legal full name.

### Private photo metadata: `private.listing_photos`

Metadata only:

- opaque photo UUID
- owning listing UUID
- controlled object path
- MIME type
- byte size
- display sort order
- created timestamp

Original filenames are discarded. Real image bytes never belong in Git, repository fixtures or CI artifacts.

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

Real seller contact data remains blocked until a separate current KVKK/privacy fact-check approves, at minimum:

1. controller/contact identity and minimum notice wording,
2. purpose and lawful processing basis,
3. public-vs-private fields and recipients/data flow,
4. retention/deletion rules,
5. processor/provider and cross-border/data-location review,
6. seller consent/authorization where needed for publication/contact exposure,
7. complaint/deletion/withdrawal operational procedure.

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

Bucket contract:

- private bucket (`public = false`)
- JPEG / PNG / WebP only
- 8 MiB maximum
- object path: `listings/{listing_uuid}/{photo_uuid}.{jpg|png|webp}`
- no original filename in path
- no SVG, HTML, JavaScript or arbitrary executable MIME
- application-layer basic magic/signature check before trusted upload; Content-Type is not treated as proof of image content

Private bucket is intentional. A public bucket would bypass read access control for object delivery. In the future active-listing adapter, photo access should use short-lived signed URLs generated only by a trusted server path after confirming the listing is still public. Proposed initial signed URL TTL: at most 5 minutes, revalidated at activation.

Lifecycle:

- `draft/pending/rejected`: no public signed URL issuance
- `published + active`: trusted path may issue short-lived signed URLs
- `unpublished/expired`: stop issuing new signed URLs; existing short-lived URLs die naturally
- hard listing deletion: delete Storage objects through Storage API first, then remove metadata/listing; do **not** manually delete `storage.objects` rows
- periodic orphan reconciliation: compare Storage object listing-prefix inventory with `private.listing_photos`; quarantine/report unexpected objects before deletion

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

The ambiguous kill-switch names `enabled/disabled` are removed. The semantic state is:

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
6. runs pgTAP/RLS tests,
7. tests service-role operational writes and anonymous visibility,
8. tests Storage MIME/size/private-read/signed-read behavior using synthetic bytes,
9. destroys local data after the run.

Current existing V0/CI/PWA checks remain separate and must also be green before merge.

## Future Türkiye self-hosted production contract

The future stack must be the official Supabase Docker self-hosting distribution pinned to one tested release/commit; do not copy an unpinned `latest` stack into this repository. At activation, re-read the upstream self-hosted changelog before selecting the pin. This is especially important in August 2026 because the upstream default gateway is transitioning from Kong to Envoy, and the current self-hosted default Postgres generation is 17.

Minimum candidate service set for this no-Auth pilot:

- PostgreSQL 17 from the pinned Supabase release
- PostgREST
- Storage API
- API gateway from that same pinned release

Auth, Realtime, Edge Runtime, image transformation, Analytics/Logflare/Vector, Studio and Supavisor are not product requirements for the 5–10 listing pilot. Remove/disable only after the pinned-stack POC proves there is no dependency break; do not hand-assemble incompatible service versions.

Network contract:

- Türkiye-located Linux VPS
- Docker Engine + Compose
- DNS + HTTPS reverse proxy (Caddy or Nginx are acceptable candidates)
- only intended HTTPS application/API surface Internet-reachable
- direct PostgreSQL not Internet-reachable
- Studio not Internet-reachable; if temporarily needed, use a protected private/tunnel path
- host firewall default-deny inbound except required public ports
- secrets only in protected server secret/env storage, never frontend, Git or CI artifacts
- log rotation + disk/RAM/CPU monitoring
- OS/container security update runbook
- rate limiting at the public edge/gateway after load envelope is known

See `ops/self-hosted/production.env.contract.example` for non-secret variable classes. Exact upstream variable names must be generated/revalidated from the pinned release rather than assumed from a moving `master` branch.

## Backup and restore gate

A same-VPS copy is an operational convenience, **not** disaster recovery.

Before any real personal data, the backup bundle must contain two independently recoverable layers:

### A. PostgreSQL

- roles/schema/data dump appropriate to the pinned self-hosted release
- repository migration commit SHA and pinned Supabase release recorded in manifest
- encrypted before leaving the production trust boundary
- integrity hash recorded

### B. Storage

- complete `listing_photos` object set copied through the supported Storage/S3 interface; do not assume copying arbitrary files into the Storage volume recreates valid Storage metadata
- object inventory with path, byte size and cryptographic hash
- encrypted off-VPS copy

Proposed minimum backup retention at pilot activation: **7 daily + 4 weekly** complete recoverable backup sets, subject to the separate privacy/retention decision before real data. Failed backups alert the operator and do not silently rotate away the last known-good set.

### Mandatory two-part restore drill

Before public real data, both drills must pass on empty environments:

1. **Migration reconstruction drill** — fresh pinned stack, replay repository migrations from zero, seed bucket configuration, run pgTAP/RLS/REST/Storage synthetic checks.
2. **Disaster restore drill** — separate clean server/environment, decrypt verified backup, restore database according to the pinned release procedure, restore Storage objects through supported Storage/S3 semantics, then verify object inventory/hashes and application/RLS behavior.

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
| Seller phone leaks | private schema reachable via Data API | non-exposed `private`, no anon schema usage | block backend/public real data |
| Malicious/incorrect photo upload | MIME/signature mismatch or oversized object | allowlist + 8 MiB + opaque path + signature check | reject object; investigate trusted path |
| Old reviewed URL remains live after edit/complaint | CTA state remains allow after identity/review downgrade | reset trigger + full-state pure CTA function | force block CTA; review link |
| Service-role credential enters browser/Git | secret scan or network bundle contains key | server-only secret contract + CI scan | rotate immediately; no activation |
| VPS loss destroys DB/photos | only same-disk backup exists | encrypted off-VPS DB + object backup | real-data NO-GO until restore proven |
| Upstream self-host update breaks stack | compose/changelog changes, gateway/PG mismatch | exact release pin + POC + backup | remain on last tested pin |
| Cost creep before validation | paid service appears in architecture | no VPS/hosted DB/paid SaaS in this gate | founder approval required |

## Exact VPS purchase/activation trigger

### Purchase authorization trigger

Purchase a Türkiye VPS **only when all are true**:

1. the real-pilot backend preparation PR is merged and all CI/PWA regressions are green;
2. 5–10 specific seller-authorized Çorlu listings are ready to enter the pilot;
3. current KVKK/privacy fact-check has approved the exact personal-data flow, notice and retention/deletion process;
4. a specific Türkiye-hosted VPS provider/location, monthly price and resource envelope have founder approval;
5. an independent encrypted off-VPS backup destination is selected;
6. an operator is named for patching, backups, restore and incident response;
7. the exact Supabase self-hosted release pin and gateway/PG compatibility have been reverified against current upstream documentation.

### Public real-data activation trigger

Buying the VPS is **not** permission to publish real data. Activation requires the fresh VPS to pass HTTPS/network isolation, migrations-from-zero, RLS, Storage, backup, **clean-server restore**, object recovery/hash verification, rollback and stability checks, followed by a separate founder PUBLIC REAL LISTING activation gate.

Until then `VITE_LISTINGS_SOURCE` for the current public V0 must not be switched to the real backend.

## Recurring cost now

**0 TL recurring infrastructure cost introduced by this gate.** GitHub/local CI, migrations, synthetic fixtures, documentation and pure security/domain code only.
