# Arar Buluruz — Current State

_Last updated: 2026-07-31, Europe/Istanbul_

## Canonical repository state

- Repository: `ronurgungor/arar-buluruz`; default branch: `main`.
- GitHub `main` is canonical. Read its exact SHA at task start rather than trusting a copied “current SHA.”
- V0 minimal-PWA implementation merged through PR #28 with normal merge commit `16da297ddac5461d3cba6fa8fc76bbc095bbb2c3`.
- V0 KVKK-min cleanup merged through PR #30 with normal merge commit `399489b3a452a22664136bc43115cc796cf71fc6`.
- An unintended Lovable bot mutation changed `package.json`, `bun.lock` and generated route typing after publish. PR #33 restored those three files to the accepted PR #30 content and merged as `edabc518643bc9ae102df1149817ecb3d96f003c`.
- Comparing `399489b3…` with `edabc518…` produces no file difference; only the incident and reversible rollback history remain.
- Package boundary remains Bun `1.3.14` and `bun.lock`.
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

Pre-publish evidence on head `71b026e0162be224655bd6477a4d44a487bcfe5c`:

- standard CI run `30635858048` — success;
- V0 PWA run `30635858083` — success;
- screenshot artifact `8795292588`;
- artifact SHA-256 `c6f8914c0fe51523c0076a5896988ec69bd58f46f62fe1cfa21e5347aa79deb1`.

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

The founder completed `Project Settings → Unpublish` on 2026-07-31. Post-action verification through Lovable project metadata confirmed:

- the project reports `is_published: false`;
- the project is returned by the `not_published` filter;
- the accepted repository source remained `07adb6caa8709f86b735078b76da2686d6152dc0` before this documentation-only write-back;
- no Lovable agent message or code edit occurred after the repository-recovery merge.

Result:

- the failed/disconnected deployment is no longer an active public release;
- GitHub’s accepted V0 code remains preserved;
- public V0 is currently **not published**;
- unpublish resolves the failed deployment exposure only and must not be recorded as a successful V0 publication.

PR #32, which assumed a successful publish, was closed without merge as superseded by PR #34 and the failed publish incident.

## Lovable mutation and cost incident

A Lovable agent was explicitly instructed not to edit code/settings and to perform only a deployment rollback if supported. It reported that it made no mutation, but it nevertheless:

- consumed `1.3` Lovable credits, violating the zero-cost boundary;
- pushed one dependency/lock/generated-route mutation commit and one empty follow-up commit to GitHub `main`.

PR #33 reverted the file mutation without force-push or history rewrite. Full validation passed before merge:

- CI run `30638080247` — success;
- V0 PWA run `30638082278` — success;
- frozen install, Bun-only boundary, lint, unit/build, 22/22 pgTAP, REST/RLS, Gate 1 desktop/mobile regression, privacy/PWA/service-worker/offline checks all passed.

Do not send another Lovable agent message for rollback or diagnosis. The failed public deployment has now been unpublished. No further Lovable publish/deploy, environment change or listing-source repair is authorized until the founder opens a new bounded gate.

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

The manual Lovable rollback/unpublish gate is complete.

No new publish, environment, listing-source or implementation gate is active. The next possible bounded gate is **“Zero-cost Lovable V0 production-source diagnosis.”** It requires separate explicit founder approval and must begin read-only by comparing the local/CI synthetic build with Lovable production behavior, `VITE_LISTINGS_SOURCE`, the Lovable build-time environment model, and whether a correct synthetic V0 publish is possible without code changes.

Until that gate is explicitly opened, backend, auth, storage, secrets, real data, advertising, analytics, TWA, Play Store, paid services and Lovable republish remain closed.
