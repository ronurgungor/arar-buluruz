# Arar Buluruz — Backlog

_Last updated: 2026-08-07, Europe/Istanbul_

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

## First publish incident and recovery

- [x] Execute the first conditionally approved Lovable Publish/Update.
- [x] Detect that public `/ara` showed the disconnected-state message instead of synthetic listings.
- [x] Reject the first deployment as an accepted V0 release.
- [x] Close the temporary public-verification PR #31 without merge.
- [x] Record the unexpected `1.3` Lovable credit consumption and unintended repository mutation.
- [x] Revert the dependency/lock/generated-route mutation through PR #33 without force-push.
- [x] Complete founder-side Unpublish and verify `is_published: false`.
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
- [x] Record corrected production readiness through PR #37 as `59e5d987f4d73be486958a3d36d371cfa5dd2abe`.

## Corrected V0 publication

- [x] Receive explicit founder approval for bounded Publish/Update.
- [x] Confirm GitHub `main` is exactly `59e5d987f4d73be486958a3d36d371cfa5dd2abe` before publication.
- [x] Confirm Lovable is synchronized to the same source identity and has no later agent edit.
- [x] Confirm current `main` differs from application-fix merge `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7` only by the two canonical documentation files.
- [x] Publish the existing synchronized project without a Lovable agent message or environment change.
- [x] Record deployment ID `ddf816c6-9bf1-44af-8cfa-b242d437cc36` and public URL `https://arar-buluruz.lovable.app`.
- [x] Verify Lovable reports `is_published: true` under the published-project filter.
- [x] Bind acceptance to the production-mode evidence covering the V0 notice, synthetic `/ara`, no disconnected-state message, synthetic detail routes, privacy, non-collecting demo routes, PWA assets/offline behavior and no forbidden external requests.
- [x] Accept the publication as **V0 — UX ve değer önerisi doğrulaması**.
- [x] Preserve the explicit limitation that this is not real marketplace, account, listing, moderation or supply-demand validation.

## Post-publication V0 refinements

- [x] Use one bounded Lovable pass to translate the 404/root-error UI, add consistent keyboard focus visibility and add a polite search-result live region.
- [x] Reject and restore the unintended accessibility-pass dependency and lockfile mutation through PR #39.
- [x] Merge the cleaned accessibility changes as `accd0c8b305d0e3a7ec0e01c91175f0501a5adb5`.
- [x] Publish the cleaned accessibility version without backend, environment or data changes.
- [x] Use the final `1.4` Lovable credits for a single dependent district-filter improvement.
- [x] Add optional `ilce` URL state, `Tüm ilçeler`, city-dependent district choices and city-plus-district filtering.
- [x] Derive district options only from existing synthetic listings; add no national district dataset or location service.
- [x] Keep the district selector disabled until a specific city is selected and reset it when city changes.
- [x] Reject and restore the unintended district-pass dependency and lockfile mutation through PR #40.
- [x] Pass frozen package, lint, unit, production build, 22/22 RLS, REST, Gate 1 desktop/mobile and production-PWA/offline validation.
- [x] Merge the cleaned district-filter source as `edb293b69348ba615b67122908b8cbd9ff4707ef`.
- [x] Publish/Update synchronized source `edb293b69348ba615b67122908b8cbd9ff4707ef`.
- [x] Record deployment ID `d6040da8-3425-46b7-8f89-b1e4241af61f` and verify the public project remains `completed` and `is_published: true`.

## V0 hardening and accepted publication record

- [x] Merge PR #43 phase/privacy hardening as `55692d651ade414185ce70b077bc1e0670e20a67`.
- [x] Merge PR #44 bare public-V0 release-path alignment as `f33856d7417e449ad3e9bfec1f501eb61989de45`.
- [x] Publish accepted hardening source `f33856d7417e449ad3e9bfec1f501eb61989de45` as deployment `9b7c3685-7611-40a4-9486-ccf6c0b7b454`.
- [x] Record the accepted publication through documentation-only PR #45 as `991f7533967ac964bfe01fcb55627ee4d65a6681`.
- [x] Preserve exact runtime signature `public-v0|listings=mock|gate1=off` and all frozen backend/data/dependency boundaries.

## V0 Quality Completion Program

The program was completed under single ownership. Workstream B and Workstream C were not published separately; one combined founder-approved Publish/Update was executed only after both workstreams were complete and release readiness was documented.

### Workstream B — Search and URL correctness

- [x] Add shared Turkish-character-tolerant normalization without a dependency.
- [x] Replace uncontrolled inside-word substring matching with all-token word-prefix matching.
- [x] Clamp invalid city/district URL state with replace navigation while preserving valid combinations.
- [x] Add unit and production-mode browser regressions for accentless search, false substring rejection and URL canonicalization.
- [x] Preserve empty-query, city/district dependency, privacy, PWA/offline and Gate 1 behavior.
- [x] Merge PR #46 with normal merge commit `1ba1e6dfdfc7908e16497f6aeca3880c718fcfcb`.
- [x] Keep Workstream B unpublished until Workstream C and publish it only through the combined release gate.

### Workstream C — Narrow UX and mobile coverage completion

- [x] Add synthetic public V0 mobile core-flow coverage around a 390×844 viewport.
- [x] Validate mobile home, search, city, district, result, detail and lower contact/footer areas without overlap or horizontal overflow.
- [x] Make listing-detail return safe for both in-app history and direct/deep-link entry.
- [x] Add a Turkish, non-technical static SSR 500 page with safe retry/home navigation.
- [x] Hide the public V0 `Reklam` placeholder without adding advertising or leaving layout gaps.
- [x] Rename automated installability evidence to `Chromium manifest/service-worker readiness` without weakening manifest, icon, service-worker or offline checks.
- [x] Add focused regressions for the mobile flow, both detail-return paths, static 500, absent ad placeholder and existing privacy/PWA/offline controls.
- [x] Run the complete frozen Bun, build-signature, production browser/PWA, privacy, 22/22 pgTAP/RLS, REST and Gate 1 desktop/mobile validation set.
- [x] Pass V0 PWA run `30714186574` and standard CI run `30714186578`.
- [x] Merge Workstream C through PR #48 with normal merge commit `df74dfd5a81be237da2d5471301279e5c657a2af` after all mandatory checks were green.
- [x] Confirm the green PR merge ref `cbb22b8cf7184dc9b94feb5e421e96b953295f32` and published `main` differ by zero files.
- [x] Publish the synchronized project as deployment `b45fe46d-7824-428b-9925-2806eb8b6f72` without an agent message or environment mutation.
- [x] Preserve exact runtime signature `public-v0|listings=mock|gate1=off`.
- [x] Record the accepted combined publication in `docs/V0_QUALITY_COMPLETION_PUBLICATION.md`.
- [x] Complete the V0 Quality Completion Program.

## Founder external-sales + fraud + TR-backend preparation gate

- [x] Canonicalize D-020: provider-neutral **External Sales Link / Haricî Satış Bağlantısı**; Shopier is only an independent third-party example/provider candidate, not an integration or partnership.
- [x] Freeze the future single-field UX copy without rendering it in public V0.
- [x] Add a dependency-free HTTPS URL validator with exact-host provider registry, canonical representation and three-state result model.
- [x] Add fail-closed/manual-review handling for userinfo, encoded authority, IP literals, internal hosts, custom ports, IDNA/punycode ambiguity, overlong/malformed URLs and known shorteners.
- [x] Keep URL syntax/security, provider identity, ownership, product match, moderation, complaint state and kill-switch as separate fraud dimensions.
- [x] Keep new/changed links pending and prevent public CTA generation before explicit moderation approval.
- [x] Add red-team unit coverage for the founder attack matrix.
- [x] Preserve the public V0 boundary: no external-sales field, CTA, real URL, real transaction or personal-data collection.
- [x] Canonicalize D-021: future real-data target is hybrid + Türkiye-located self-hosted Supabase on Linux VPS.
- [x] Inspect and preserve the existing migration/RLS/REST assets without adding a remote migration or production database.
- [x] Document the future environment contract, off-VPS backup/empty-server restore requirement and minimum production runbook.
- [x] Keep VPS purchase, paid services, Auth, Storage, SMTP, secrets, remote Supabase and real data closed.
- [ ] Merge this gate only after frozen install, lint, unit/red-team tests, bare public V0 build/signature, production-mode V0 privacy/PWA and full existing Gate 1 CI are green.

## Current gate status

The active implementation gate is **Founder external-sales + fraud + TR-backend preparation**, limited to the repository-only scope above.

No public activation is authorized. After the implementation PR is fully green and normally merged, this gate closes and the public V0 remains on its already accepted synthetic/mock deployment unless a separate Publish/Update gate is explicitly opened.

The next permitted non-code phase remains **anonymous, non-directive V0 user-observation preparation**. A real external-sales pilot or real backend/data phase requires a new founder gate.

## Frozen until a separate explicit gate

- [ ] Do not change the Lovable environment or listing-source setting.
- [ ] Do not send a Lovable agent message for publication, rollback or diagnosis.
- [ ] Do not create a remote Supabase project or apply a remote migration.
- [ ] Do not connect secrets or environment values.
- [ ] Do not enter real listings, external sales links or personal data.
- [ ] Do not add/activate real auth, Storage, Realtime or Edge Functions.
- [ ] Do not add advertising or analytics.
- [ ] Do not add TWA, Android or Play Store packaging.
- [ ] Do not buy a VPS, paid fraud/reputation service, SMS/KYC, monitoring SaaS or other recurring infrastructure.
- [ ] Do not Publish/Update this repository implementation without a separate explicit founder gate.

## D-021 next production/backend gate triggers

A future Türkiye self-hosted production POC gate may open when a real backend/personal-data pilot is close enough to justify infrastructure selection and cost. That gate must provide at minimum:

- [ ] proposed Türkiye VPS provider/location and recurring price;
- [ ] current pinned self-hosted Supabase version/resource requirements;
- [ ] expected data/storage/load envelope;
- [ ] minimum KVKK/privacy/data-flow map;
- [ ] public/private network exposure plan;
- [ ] off-VPS backup target and empty-server restore plan;
- [ ] Auth/SMTP/Storage scope, if any;
- [ ] rollback plan, 72-hour stability plan and operational owner.

Restore onto a completely empty environment is mandatory. Restore failure means production NO-GO.

## V0 evaluation boundary

V0 may evaluate only product comprehension, search/discovery, listing cards/details, mobile/desktop usability, PWA installation and general interest.

Do not report V0 as proving real listing supply, accounts, listing management, moderation sustainability, seller-contact operations, external-sales safety or supply-demand loop formation.

## Operating rules

- D-018 remains the routine-execution authority inside an explicitly opened founder gate.
- Only one code writer operates at a time; no parallel Lovable agent or assistant mutation is permitted.
- Git history is never force-pushed or rewritten.
- The accepted public V0 publication remains identity-bound to `df74dfd5a81be237da2d5471301279e5c657a2af` and deployment `b45fe46d-7824-428b-9925-2806eb8b6f72` until separately republished.
- External-sales security preparation must remain feature-disabled in public V0.
- No secret, credential, real user record or unnecessary personal data belongs in repository documentation.
