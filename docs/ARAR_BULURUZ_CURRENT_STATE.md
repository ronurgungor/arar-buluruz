# Arar Buluruz — Current State

_Last updated: 2026-07-31, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; default branch: `main`.
- GitHub `main` is canonical. Read its exact SHA at task start rather than trusting a copied “current SHA.”
- V0 minimal-PWA implementation merged through PR #28 with normal merge commit `16da297ddac5461d3cba6fa8fc76bbc095bbb2c3`.
- V0 KVKK-min cleanup merged through PR #30 with normal merge commit `399489b3a452a22664136bc43115cc796cf71fc6`.
- An unintended Lovable bot mutation changed `package.json`, `bun.lock` and generated route typing after publish. PR #33 restored those three files to the accepted PR #30 content and merged as `edabc518643bc9ae102df1149817ecb3d96f003c`.
- PR #35 recorded the completed unpublish with merge commit `acb381565880e365467045c9ad0512edd6bd535a`.
- PR #36 corrected the V0 production mock-source behavior and production-mode validation with merge commit `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7`.
- Package boundary remains Bun `1.3.14` and `bun.lock`; PR #36 added no dependency or lockfile change.
- Gate 1 PostgreSQL/RLS/adapter work remains a reusable technical asset and is not an active real pilot.

## Active phase and data boundary

The only active product phase is **V0 — UX ve değer önerisi doğrulaması**.

V0 may validate only product comprehension, search/discovery, listing cards/details, mobile/desktop usability, minimal-PWA installability and general interest.

V0 must not be reported as validating real listing creation, accounts, listing ownership/management, sustainable moderation, seller-contact operations or a supply-demand loop.

GitHub `main` contains only synthetic/mock V0 behavior:

- visible site-wide V0/test notice;
- synthetic search and listing-detail experience;
- non-collecting `/ilan-ver`, `/giris` and `/sikayet/$id` demo routes;
- no real account, listing, seller phone/e-mail or form-data collection;
- no advertising or analytics;
- no optional cookie or tracker implemented by the application;
- `noindex/nofollow/noarchive/nosnippet` protection.

## KVKK-min cleanup

PR #30 added only:

- `/gizlilik` with the current V0 disclosure;
- a visible, simple home-page privacy link;
- removal of `fonts.googleapis.com` and `fonts.gstatic.com` requests;
- a system UI font stack;
- focused browser checks for privacy content, no application cookie, and no Google Fonts, analytics, ad-network, auth or backend request.

No dependency, paid service, cookie banner, backend, auth, real data, advertising, analytics, TWA or Play Store scope was added by PR #30.

## Minimal-PWA boundary

Present on GitHub `main`:

- durable manifest identity, start URL and scope;
- standard, maskable and Apple touch icons;
- secure-context service-worker registration;
- network-first navigation handling;
- cache limited to the offline page, manifest and icons;
- honest offline screen stating that dynamic listings are not stored offline.

Excluded: push, background/periodic sync, full offline listings, cache-first dynamic listings, auth, real backend, advertising, analytics, TWA and Play Store.

## Publish incident and unpublish resolution

Lovable Publish/Update was executed after PR #30 met its conditional publish gate.

- Published source merge: `399489b3a452a22664136bc43115cc796cf71fc6`.
- Lovable deployment ID: `36edff5e-7334-4d6f-b6da-60d0e35c69dd`.
- Public URL: `https://arar-buluruz.lovable.app`.
- Public verification confirmed that the V0 notice and application shell loaded.
- Public `/ara` returned HTTP 200 but showed the disconnected-state message “İlanlar henüz gösterilemiyor / Pilot ilan bağlantısı henüz etkin değil” instead of synthetic listings.
- Therefore the published runtime failed the required synthetic-listing acceptance condition and was not an accepted V0 release.
- The public verification branch/PR #31 was closed without merge.

The founder completed `Project Settings → Unpublish` on 2026-07-31. Lovable project metadata confirmed `is_published: false` and the failed deployment is no longer an active public release.

Result:

- public V0 is currently **not published**;
- unpublish resolved only the failed deployment exposure and is not a successful V0 publication;
- PR #32, which assumed a successful publish, was closed without merge;
- no Lovable agent message, environment change or republish was used during rollback.

## Production-source diagnosis and correction

Read-only diagnosis established that the Lovable production build received the intended mock source, but application logic converted explicit production `mock` to `disabled` because `import.meta.env.DEV` was false.

The prior test suite missed this because:

- the unit test explicitly expected production `mock` to become `disabled`;
- the browser/PWA runner validated through `vite dev`, where `import.meta.env.DEV` is true, rather than a production-mode output.

PR #36 made the narrow correction:

- explicit `VITE_LISTINGS_SOURCE=mock` is honored in development and production;
- unconfigured production remains safely `disabled`;
- explicit `disabled` and `supabase` behavior is preserved;
- the normal Cloudflare deploy-target build remains intact;
- a separate zero-cost `node-server` production-mode build is used only for browser validation;
- the PWA runner starts and stops the prebuilt output directly;
- service-worker control uses bounded reload attempts before the real-server-outage offline check.

No dependency, backend, remote Supabase project, secret, real data, Lovable setting or deployment was added.

Validation on PR #36 head `20bfc9562bda5661204f086783dbfd2d14ecebcb`:

- standard CI run `30655419577` — success;
- lint, unit tests and disabled-backend build — success;
- 22/22 pgTAP, local migration/RLS, REST integration and Gate 1 desktop/mobile E2E — success;
- V0 PWA run `30655419570` — success;
- Cloudflare deploy-target production build — success;
- production-mode synthetic search/detail, disabled real operations, privacy, desktop/mobile layout, service worker, cache boundary and honest offline fallback — success;
- evidence artifact `8803163231`;
- artifact SHA-256 `4543ecd8af8bd46700b7477d8fccceef871b5542b509a83a43073cb52c27d35b`.

After merge, Lovable synchronized repository SHA `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7` while remaining `is_published: false`.

## Lovable mutation and cost incident

A prior Lovable agent message unexpectedly consumed `1.3` Lovable credits and pushed a dependency/lock/generated-route mutation despite a no-mutation instruction. PR #33 reverted the file mutation without force-push or history rewrite.

Do not send another Lovable agent message for this incident or for republish. Use only the explicit founder-side Publish/Update action after a separate bounded approval.

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

The diagnosis and code-correction gate is complete. The only next consequential gate is:

**Founder decision: publish the corrected synthetic V0 from Lovable and immediately perform bounded public verification.**

This gate is not yet authorized. Until explicit founder approval:

- do not Publish/Update;
- do not change Lovable environment or listing-source settings;
- do not send a Lovable agent message;
- do not activate backend, auth, storage, secrets, real data, advertising, analytics, TWA, Play Store or paid services.

If the publish gate is approved, the release candidate source must be exactly `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7`. Acceptance requires the public shell and V0 notice, synthetic results on `/ara`, working synthetic detail routes, privacy disclosure, no disconnected-state message, no forbidden backend/tracker requests, and a reversible Unpublish rollback path.
