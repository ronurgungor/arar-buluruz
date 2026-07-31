# Arar Buluruz — Backlog

_Last updated: 2026-07-31, Europe/Istanbul_

Legend: `[x]` completed, `[-]` active gate, `[ ]` frozen/deferred.

## Completed foundations

- [x] Create and publish the original frontend-only mock prototype.
- [x] Keep Lovable database, auth, storage, secrets and edge functions disabled.
- [x] Establish GitHub `main` as canonical and add shared memory, decision log, capability records and new-chat bootstrap.
- [x] Pin Bun `1.3.14`, preserve `bun.lock` and add frozen-install CI.
- [x] Fix confirmed search and mobile-layout defects with focused browser evidence.
- [x] Complete Gate 1 PostgreSQL migration, RLS, adapter and test preparation through PR #25 without remote backend activation.
- [x] Preserve Gate 1 as a reusable technical asset rather than treating it as an active real pilot.
- [x] Canonicalize D-019: **V0 — UX ve değer önerisi doğrulaması**.
- [x] Freeze backend/provider switching until a measured D-019 trigger exists.
- [x] Preserve provider-independent/no-rebuild boundaries.

## V0 and KVKK-min package

- [x] Default V0 to synthetic/mock listings.
- [x] Add the visible V0 test notice.
- [x] Disable real listing, account and complaint data entry.
- [x] Add the narrow manifest, icons, service worker and honest offline screen.
- [x] Add `/gizlilik` and a visible home-page privacy link.
- [x] Remove Google Fonts requests and use system UI fonts.
- [x] Verify no application cookie, Google Fonts, analytics, advertising-network, auth or backend request in the synthetic test build.
- [x] Merge the KVKK-min package through PR #30 as `399489b3a452a22664136bc43115cc796cf71fc6`.

## Publish incident and repository recovery

- [x] Execute the conditionally approved Lovable Publish/Update.
- [x] Verify the public V0 notice and shell.
- [x] Detect that public `/ara` does not show synthetic listings and instead renders the disconnected-state message.
- [x] Reject that deployment as an accepted V0 release.
- [x] Close the temporary public-verification PR #31 without merge.
- [x] Record the unexpected `1.3` Lovable credit consumption and unintended repository mutation.
- [x] Revert the dependency/lock/generated-route mutation through PR #33 without force-push.
- [x] Restore repository file content to the accepted PR #30 state.
- [x] Complete founder-side `Project Settings → Unpublish`.
- [x] Verify Lovable reports `is_published: false`.
- [x] Confirm public V0 is not published and unpublish is not a successful release.
- [x] Close superseded PR #32 without merge.
- [x] Record the unpublish through PR #35 as `acb381565880e365467045c9ad0512edd6bd535a`.

## Production-source diagnosis and correction

- [x] Diagnose the public disconnected state without Lovable agent messages or environment mutation.
- [x] Confirm explicit production `mock` was incorrectly converted to `disabled`.
- [x] Confirm prior browser validation used `vite dev` and did not exercise production mode.
- [x] Make explicit `VITE_LISTINGS_SOURCE=mock` valid in production while keeping unconfigured production disabled.
- [x] Update unit coverage for explicit production mock, unconfigured production, disabled and Supabase sources.
- [x] Preserve the normal Cloudflare deploy-target build.
- [x] Add a separate zero-cost `node-server` production-mode output only for browser validation.
- [x] Run synthetic search/detail, privacy, disabled real operations, desktop/mobile, service-worker/cache and real-outage offline checks against production-mode output.
- [x] Stabilize service-worker control with bounded reload attempts.
- [x] Pass standard CI run `30655419577`.
- [x] Pass V0 PWA run `30655419570` and evidence artifact `8803163231`.
- [x] Merge PR #36 as `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7`.
- [x] Verify Lovable synchronized the merge SHA while remaining `is_published: false`.

## Active gate

- [-] **Founder decision: publish the corrected synthetic V0 from Lovable.**

This gate is a decision gate only; Publish/Update is not authorized until the founder explicitly approves it.

Release-candidate source:

- `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7`

If approved, perform only:

1. Lovable founder UI → Publish/Update the current synchronized project.
2. Verify the public V0 notice and shell.
3. Verify `/ara` shows synthetic listing results rather than the disconnected-state message.
4. Verify a synthetic listing-detail route.
5. Verify `/gizlilik` and the no-real-operations boundary.
6. Verify no forbidden backend, auth, analytics, advertising or Google Fonts request.
7. Reject and Unpublish immediately if any required condition fails.

No Lovable agent message, environment change or backend activation belongs to this gate.

## Frozen until explicit publish approval

- [ ] Do not Publish/Update.
- [ ] Do not change the Lovable environment or listing-source setting.
- [ ] Do not send another Lovable agent message for this incident.
- [ ] Do not create a remote Supabase project or apply a remote migration.
- [ ] Do not connect secrets or environment values.
- [ ] Do not enter real listings or personal data.
- [ ] Do not add auth, Storage, Realtime or Edge Functions.
- [ ] Do not add advertising or analytics.
- [ ] Do not add TWA, Android or Play Store packaging.
- [ ] Do not buy paid or recurring infrastructure.

## D-019 backend reopening triggers

The backend decision may reopen only when at least one of these is real and measured:

- [ ] external user accounts;
- [ ] real personal data;
- [ ] an unworkable KVKK transfer model;
- [ ] measured free-tier or uptime failure;
- [ ] confirmed photo/storage need;
- [ ] measured cost or technical necessity.

Without a trigger, do not recommend Supabase ↔ Türkiye self-managed switching. Supabase Free remains development/technical-validation only.

## V0 evaluation boundary

V0 may evaluate only product comprehension, search/discovery, listing cards/details, mobile/desktop usability, PWA installation and general interest.

Do not report V0 as proving real listing supply, accounts, listing management, moderation sustainability, seller-contact operations or supply-demand loop formation.

## Operating rules

- Main assistant remains the default routine executor under D-018.
- Only one code writer operates at a time.
- Git history is never force-pushed or rewritten.
- Lovable Publish/Update and production deployment require an explicit bounded gate.
- No secret, credential, real user record or unnecessary personal data belongs in repository documentation.
