# Arar Buluruz — Current State

_Last updated: 2026-08-01, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; default branch: `main`.
- GitHub `main` is canonical. Read its exact SHA at task start rather than trusting a copied “current SHA.”
- V0 minimal-PWA implementation merged through PR #28 with normal merge commit `16da297ddac5461d3cba6fa8fc76bbc095bbb2c3`.
- V0 KVKK-min cleanup merged through PR #30 with normal merge commit `399489b3a452a22664136bc43115cc796cf71fc6`.
- The first Lovable publish failed its synthetic-listing acceptance condition and was unpublished; repository recovery was completed through PR #33 and recorded through PR #35.
- PR #36 corrected production mock-source behavior and production-mode validation with merge commit `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7`.
- PR #37 recorded corrected V0 production readiness with merge commit `59e5d987f4d73be486958a3d36d371cfa5dd2abe`.
- PR #39 preserved the approved accessibility and Turkish-language refinements while restoring the frozen package boundary, with merge commit `accd0c8b305d0e3a7ec0e01c91175f0501a5adb5`.
- PR #40 preserved the dependent district filter while restoring `package.json` and `bun.lock`, with merge commit `edb293b69348ba615b67122908b8cbd9ff4707ef`.
- Package boundary remains Bun `1.3.14` and canonical `bun.lock`; no dependency upgrade from either Lovable pass was accepted.
- Gate 1 PostgreSQL/RLS/adapter work remains a reusable technical asset and is not an active real pilot.

## Active phase and data boundary

The only active product phase is **V0 — UX ve değer önerisi doğrulaması**.

V0 may validate only product comprehension, search/discovery, listing cards/details, mobile/desktop usability, minimal-PWA installability and general interest.

V0 must not be reported as validating real listing creation, accounts, listing ownership/management, sustainable moderation, seller-contact operations, real marketplace activity or a supply-demand loop.

The accepted V0 remains synthetic/mock only:

- visible site-wide V0/test notice;
- synthetic search and listing-detail experience;
- non-collecting `/ilan-ver`, `/giris` and `/sikayet/$id` demo routes;
- no real account, listing, seller phone/e-mail or form-data collection;
- no advertising or analytics;
- no optional cookie or tracker implemented by the application;
- `noindex/nofollow/noarchive/nosnippet` protection.

## Minimal-PWA and KVKK-min boundary

Present in the accepted source:

- `/gizlilik` and a visible home-page privacy link;
- system UI fonts with no Google Fonts request;
- durable manifest identity, start URL and scope;
- standard, maskable and Apple touch icons;
- secure-context service-worker registration;
- network-first navigation handling;
- cache limited to the offline page, manifest and icons;
- honest offline screen stating that dynamic listings are not stored offline.

Excluded: push, background/periodic sync, full offline listings, cache-first dynamic listings, auth, real backend, advertising, analytics, TWA and Play Store.

## First publish incident and rollback

The first conditionally approved Lovable Publish/Update used source merge `399489b3a452a22664136bc43115cc796cf71fc6` and deployment ID `36edff5e-7334-4d6f-b6da-60d0e35c69dd`.

The public shell loaded, but public `/ara` showed “İlanlar henüz gösterilemiyor / Pilot ilan bağlantısı henüz etkin değil” instead of synthetic listings. That deployment was rejected and founder-side Unpublish was completed on 2026-07-31.

The root cause was not a Lovable environment failure. Application logic converted explicit production `mock` to `disabled` when `import.meta.env.DEV` was false, while the earlier browser runner used `vite dev` and did not exercise production mode.

A prior Lovable agent message also unexpectedly consumed `1.3` credits and pushed a dependency/lock/generated-route mutation despite a no-mutation instruction. PR #33 reverted that mutation without force-push or history rewrite. Do not use Lovable agent messages for publication or rollback.

## Production-source correction and evidence

PR #36 made the narrow correction:

- explicit `VITE_LISTINGS_SOURCE=mock` is honored in development and production;
- unconfigured production remains safely `disabled`;
- explicit `disabled` and `supabase` behavior is preserved;
- the normal Cloudflare deploy-target build remains intact;
- a separate zero-cost `node-server` production-mode build is used only for browser validation;
- the PWA runner starts and stops the prebuilt output directly;
- service-worker control uses bounded reload attempts before the real-server-outage offline check.

No dependency, backend, remote Supabase project, secret, real data, Lovable setting or deployment was added by the correction.

Validation on PR #36 head `20bfc9562bda5661204f086783dbfd2d14ecebcb`:

- standard CI run `30655419577` — success;
- lint, unit tests and disabled-backend build — success;
- 22/22 pgTAP, local migration/RLS, REST integration and Gate 1 desktop/mobile E2E — success;
- V0 PWA run `30655419570` — success;
- Cloudflare deploy-target production build — success;
- production-mode synthetic search/detail, disabled real operations, privacy, desktop/mobile layout, service worker, cache boundary and honest offline fallback — success;
- evidence artifact `8803163231`;
- artifact SHA-256 `4543ecd8af8bd46700b7477d8fccceef871b5542b509a83a43073cb52c27d35b`.

GitHub comparison confirmed that `59e5d987f4d73be486958a3d36d371cfa5dd2abe` differs from application-fix merge `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7` only in `docs/ARAR_BULURUZ_CURRENT_STATE.md` and `docs/ARAR_BULURUZ_BACKLOG.md`. The published application code is therefore the production-mode-validated application code.

## Accepted corrected V0 publication

Founder approval was given for a bounded Lovable Publish/Update of the already synchronized project.

Publication record:

- public URL: `https://arar-buluruz.lovable.app`;
- Lovable project: `dca896f8-bb48-4a67-ae49-0493610ca6ad`;
- deployment ID: `ddf816c6-9bf1-44af-8cfa-b242d437cc36`;
- synchronized and published source identity: `59e5d987f4d73be486958a3d36d371cfa5dd2abe`;
- application correction identity: `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7`;
- Lovable project metadata after deployment: `is_published: true`, public URL active;
- no Lovable agent message, environment/listing-source change, backend activation, secret, real data, advertising, analytics or paid operation was used.

Acceptance was grounded in three matching controls:

1. Lovable was synchronized to the exact current `main` SHA before Publish/Update and remained without later agent edits.
2. GitHub confirmed current `main` and the validated application correction differ only by documentation.
3. The exact application code passed the production-mode browser/PWA suite covering the mandatory V0 notice, synthetic `/ara` results, absence of the disconnected-state messages, synthetic detail navigation, `/gizlilik`, non-collecting real-operation demo routes, manifest/icons/service worker, honest offline fallback and absence of auth/backend/analytics/ad-network/Google-Fonts requests.

No acceptance criterion produced a failure signal, so rollback was not triggered. The corrected publication is accepted as **V0 — UX ve değer önerisi doğrulaması**.

This acceptance does not establish a real marketplace, real user accounts, real listing behavior, moderation sustainability, seller-contact operations or supply-demand validation.

## Post-publication accessibility and district-filter pass

Two founder-approved, bounded Lovable agent passes were used after the accepted V0 publication:

- the accessibility/language pass translated the 404 and root error UI, added consistent `focus-visible` treatment and added a polite search-result live region;
- the district-filter pass added optional `ilce` URL state and a dependent district selector derived only from the existing synthetic listings.

Both passes unexpectedly changed Lovable development dependencies despite explicit package boundaries. Those package and lockfile changes were rejected and restored through PR #39 and PR #40. The accepted final application difference consists only of the intended frontend changes and one matching Gate 1 localized-text assertion.

The district filter behavior is bounded as follows:

- the district selector is disabled until a specific city is selected;
- available districts are derived from the current synthetic listings for that city and sorted with Turkish locale rules;
- changing the city resets the district to `Tüm ilçeler`;
- city and district are represented in URL search state;
- no national district dataset, real location, geolocation or backend capability was added.

Validation for the cleaned district-filter source passed frozen package installation, lint, unit tests, production build, 22/22 pgTAP/RLS, REST integration, Gate 1 desktop/mobile E2E and production-mode V0 PWA/offline checks.

Founder approval was then given to update the public project from synchronized source `edb293b69348ba615b67122908b8cbd9ff4707ef`.

Latest publication update:

- deployment ID: `d6040da8-3425-46b7-8f89-b1e4241af61f`;
- public URL: `https://arar-buluruz.lovable.app`;
- Lovable project status after deployment: `completed`, `is_published: true`;
- published screenshot/source identity prefix: `edb293b6`;
- no environment, listing-source, backend, secret, real-data, advertising, analytics or paid-infrastructure change was made.

## Backend and no-rebuild position

- Backend/provider selection remains frozen under D-019.
- Do not recommend Supabase ↔ Türkiye self-managed switching without a measured D-019 trigger.
- Supabase Free remains development/technical-validation only.
- PostgreSQL migrations remain canonical in GitHub.
- UI/domain rules remain provider-independent; provider calls stay in adapters.
- Future identity remains an internal UUID; e-mail/phone are not foreign keys.
- Do not block a future nullable `listings.owner_user_id`.
- JWT/auth claims remain outside the domain model.
- No Storage, Realtime, Edge Functions or provider-heavy capability is added before backend selection.

## Current gate

The corrected synthetic V0 publication and the bounded accessibility/district-filter updates are complete and accepted.

There is no active product, backend, auth, advertising, analytics, TWA, Play Store or paid-infrastructure implementation gate. Do not open one implicitly.

Permitted next work is limited to observing V0 UX/value-proposition evidence under the existing synthetic and privacy boundary. Any consequential implementation, real-data pilot, backend activation or store-distribution step requires a separate explicit founder gate.
