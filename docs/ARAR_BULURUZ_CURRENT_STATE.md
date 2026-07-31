# Arar Buluruz — Current State

_Last updated: 2026-07-31, Europe/Istanbul_

## Canonical runtime and repository state

- Repository: `ronurgungor/arar-buluruz`; default branch: `main`.
- GitHub `main` is canonical. Read its exact SHA at task start rather than trusting a copied “current SHA.”
- V0 minimal-PWA implementation merged through PR #28 with normal merge commit `16da297ddac5461d3cba6fa8fc76bbc095bbb2c3`.
- Gate 1 PostgreSQL/RLS/adapter preparation remains in `main` as a reusable technical asset; PR #25 merge commit: `994b8b1705d52434be0c000093a052fa0e519542`.
- Package boundary remains Bun `1.3.14` and `bun.lock`; PR #28 added no package or lockfile change.

## Active phase

The only active product phase is **V0 — UX ve değer önerisi doğrulaması**.

V0 may validate only:

- product comprehension;
- search and listing discovery;
- listing cards and detail pages;
- mobile and desktop usability;
- minimal-PWA installability;
- general user interest.

V0 must not be reported as validating:

- real listing creation;
- account creation;
- listing ownership or management;
- sustainable moderation;
- the seller-contact operating model;
- a functioning supply-demand loop.

## Current V0 behavior on GitHub `main`

- The default listing source is synthetic/mock.
- A visible site-wide notice identifies the product as V0 and states that listings are examples and no real account, listing submission or seller operation occurs.
- `/ara` and `/ilan/$id` preserve the existing search/discovery and detail experience with mock listings.
- `/ilan-ver` is a non-collecting demo screen; no form, WhatsApp application, listing write or personal-data input is active in V0.
- `/giris` contains no account form and collects no e-mail, phone or password.
- `/sikayet/$id` is a non-collecting demo screen; no real complaint or moderation operation occurs.
- Historical Gate 1 application/complaint behavior remains available only inside the explicit ephemeral CI test flag; it is not part of the V0 publish path.
- Search indexing remains blocked through `noindex/nofollow/noarchive/nosnippet` metadata and the existing server header.

## Minimal PWA implementation

The merged package contains only the D-017 boundary:

- `public/manifest.webmanifest` with durable app ID `/`, scope/start URL `/` and standalone display;
- standard 192×192 and 512×512 PNG icons;
- a 512×512 maskable icon and 180×180 Apple touch icon;
- service-worker registration on secure supported contexts;
- a network-first navigation worker that caches only the offline page, manifest and icons;
- a safe, honest Turkish offline screen that explicitly says dynamic listings are not stored offline.

Not present:

- push notifications;
- background or periodic sync;
- full offline listings;
- cache-first dynamic listing pages;
- auth or real backend activation;
- advertising or analytics;
- TWA, Android or Play Store packaging.

## Validation evidence

Exact approved PR head: `2cf223df4aea91b045de91dc20e6ed79e8120124`.

Standard CI run `30631497989` passed:

- frozen Bun install and Bun-only lock boundary;
- lint;
- 7/7 unit tests;
- build with backend connection disabled;
- disposable local Supabase stack;
- migration rebuild and 22/22 pgTAP database/RLS tests;
- REST adapter → PostgREST/RLS integration;
- focused desktop/mobile Gate 1 regression;
- cleanup without retaining local database data.

V0 PWA run `30631497756` passed:

- zero-cost/narrow-scope static checks;
- lint, 7/7 unit tests and synthetic V0 build;
- manifest identity and all required icons;
- active controlling service worker;
- shell-only cache boundary with no `/ara` or `/ilan/` caching;
- desktop/mobile no-horizontal-overflow checks;
- disabled real account/listing operations;
- no Supabase/auth REST request in V0;
- honest offline fallback after the test server was deliberately stopped.

Screenshot artifact:

- artifact ID `8793525311`;
- SHA-256 `3b5c61c2fe6b5dbb3f274da31fbae405ab8063af1a9986a28780ed3b6dc6eeb8`;
- desktop home, mobile home and mobile offline evidence were visually reviewed.

Six pre-existing non-blocking Fast Refresh warnings remain in shared shadcn UI files; there are no lint errors.

## Public Lovable state

- Public URL: `https://arar-buluruz.lovable.app`.
- Lovable project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`.
- Workspace ID: `AERDgNbVzztF411nAuzp`.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- PR #28 was merged to GitHub only.
- **No Lovable Publish/Update has been performed for V0.** The public URL therefore remains the earlier published mock snapshot until the founder opens the single publish gate.

## Backend and no-rebuild position

- Backend/provider selection is frozen under D-019.
- Do not recommend Supabase ↔ Türkiye self-managed switching without at least one trigger: external accounts, real personal data, unworkable KVKK transfer model, measured free-tier/uptime failure, confirmed photo/storage need, or measured cost/technical necessity.
- Supabase Free is development/technical-validation only and is not assumed to be production infrastructure for a real external-user pilot.
- PostgreSQL migrations remain canonical in GitHub.
- UI/domain rules remain provider-independent; Supabase calls remain in adapters.
- Future user identity is an internal UUID; e-mail/phone are not foreign keys.
- No decision may block a future nullable `listings.owner_user_id`.
- JWT/auth claims stay outside the domain model.
- No Storage, Realtime, Edge Functions or provider-heavy capability is added before backend selection.

## Current gate and next action

Repository implementation and validation are complete. The only active consequential action is:

> Founder decision on Lovable Publish/Update for the merged V0 minimal-PWA package.

Until that approval:

- do not publish or deploy;
- do not open backend, auth, storage, secrets or real-data work;
- do not add analytics, advertising, TWA or Play Store scope;
- do not claim V0 validates marketplace operations.

## Rollback

Before publish, rollback is a normal Git revert of PR #28’s merge commit. If V0 is later published, rollback additionally requires restoring/publishing the last accepted Lovable revision. No remote backend, secret, personal data or paid resource was created by this package.
