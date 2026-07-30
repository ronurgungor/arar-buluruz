# Arar Buluruz — Backlog

_Last updated: 2026-07-30, Europe/Istanbul_

Legend: `[x]` completed, `[-]` in progress, `[ ]` pending.

## Completed

- [x] Create and publish the controlled frontend-only classified-listing prototype.
- [x] Keep Lovable database/backend disabled.
- [x] Add controlled telephone/WhatsApp contact behavior.
- [x] Add shared project memory, standing approval rules and backend ownership guardrails.
- [x] Add site-wide `noindex/nofollow` metadata and `X-Robots-Tag` protection.
- [x] Add editable listing preview, direct example searches, honest mock proximity and all 81 provinces.
- [x] Fix verified multi-word-search and mobile fixed-footer defects.
- [x] Establish Bun `1.3.14`, `bun.lock`, frozen install, lint and production build discipline.
- [x] Establish risk-based validation and main-assistant/Work/Codex/Lovable routing.
- [x] Create repository-backed current-state, memory, decision, backlog, capability and bootstrap documents.
- [x] Select the reduced founder-operated, listings-only Çorlu pilot direction in D-016.
- [x] Record the responsive-web → Gate 1 → minimal-PWA → pilot → Play Store value-gate sequence in D-017.
- [x] Approve Gate 1 local/isolated implementation.
- [x] Prepare one migration-canonical `listings` table and approved field set.
- [x] Restrict statuses to `draft`, `published`, `unpublished`.
- [x] Add proportionate required-field, length, price, lifecycle and date-order constraints.
- [x] Add only the focused public-visibility index and `updated_at` trigger.
- [x] Keep mock listings out of the production database model; no `is_mock`.
- [x] Enable RLS and expose only published, already-published and unexpired rows.
- [x] Deny anonymous/public INSERT, UPDATE and DELETE.
- [x] Keep schema, RLS, grants, constraints, indexes and triggers migration-canonical in GitHub.
- [x] Avoid automatic expiration cron.
- [x] Add a native-fetch Supabase REST reader without privileged secrets.
- [x] Keep production disconnected until a later environment-connection gate.
- [x] Separate development/test mocks from the real-data path.
- [x] Connect `/ara` and `/ilan/$id` to the public-visible listing source.
- [x] Return safe not-found behavior for hidden, expired and unknown listings.
- [x] Keep the controlled central line and include listing IDs in prepared WhatsApp messages.
- [x] Convert `/ilan-ver` to a structured WhatsApp application with no public database insert.
- [x] Convert `/sikayet/$id` to an ID-bearing structured WhatsApp complaint with no public database insert.
- [x] Make `/giris` state that pilot login is unavailable; no auth added.
- [x] Remove/isolate mock distance, photo and advertising behavior from the real listing path.
- [x] Avoid analytics/event infrastructure for the first slice.
- [x] Run clean local migration/reset in an isolated GitHub Actions Ubuntu runner.
- [x] Verify RLS visibility and negative access behavior.
- [x] Verify anonymous write denial and invalid-value constraints.
- [x] Verify public responses expose no seller phone or privileged fields.
- [x] Run frozen Bun install, lint, 7 unit tests and disconnected production build.
- [x] Run application REST adapter → local Kong/PostgREST → RLS integration.
- [x] Run focused desktop/mobile E2E for `/ara`, `/ilan/$id`, `/ilan-ver`, `/sikayet/$id` and `/giris`.
- [x] Verify visible-listing, application and complaint WhatsApp payloads without sending external messages.
- [x] Verify direct draft/expired detail URLs return safe HTTP 404 behavior.
- [x] Use exact-pinned `playwright@1.55.0` through Bun only; no second lockfile/npm install.
- [x] Produce exact SHA, diff, test, risk and rollback evidence.
- [x] Merge PR #25 with a normal merge commit after explicit founder approval.
- [x] Confirm merge commit `994b8b1705d52434be0c000093a052fa0e519542` synchronized the Lovable editor/preview without performing Publish/Update.

## Current work

Gate 1 is complete and merged. No remote Supabase project, remote migration, environment connection, secret, real data or pilot publication exists.

The next consequential work is blocked at the next explicit founder gate rather than by an implementation defect.

## Package A — Founder/KVKK/Supabase preparation

Complete before remote project creation or real data:

- [ ] Confirm founder-owned Supabase organization/account model.
- [ ] Confirm project/billing ownership and administrator recovery path.
- [ ] Enable and verify founder MFA; do not share the account.
- [ ] Select the intended Supabase region and document the basis.
- [ ] Confirm owner and authorized operator of the controlled phone/WhatsApp line.
- [ ] Identify the legal data controller for the pilot.
- [ ] Prepare the seller-facing privacy notice/aydınlatma approach.
- [ ] Confirm legal basis for seller phone and WhatsApp-message handling.
- [ ] Define minimum retention/deletion for WhatsApp and operational records.
- [ ] Assess possible international-transfer implications for Supabase and connected services.
- [ ] Confirm founder-only Dashboard row-operation rule; no schema/security changes.
- [ ] Confirm prohibited pilot categories, including vehicle and real-estate listings.
- [ ] Obtain explicit founder approval before creating the Supabase project.
- [ ] Obtain separate explicit founder approval before entering real seller/listing data.

WhatsApp remaining outside Supabase does not remove KVKK obligations.

## Approval gates

Completion of one gate never authorizes the next.

### Gate 1 — Local and isolated implementation preparation

- **Status:** Completed and merged through PR #25.
- **Evidence:** approved head `1d9d0f6112464e5078d90df510488f7a786cddef`; merge commit `994b8b1705d52434be0c000093a052fa0e519542`; frozen Bun/lint/unit/build, clean reset, 22/22 pgTAP, REST/RLS and desktop/mobile E2E passed.
- **Remote effects:** none.

### Gate 2 — Supabase organization/project creation

- **Status:** Closed; founder approval required.
- Requires Package A ownership, MFA/recovery, region and KVKK preparation.
- Founder creates or explicitly authorizes the founder-owned organization/project.
- Does not authorize environment connection, migration application or real data unless separately stated.

### Gate 3 — Secret/environment connection

- **Status:** Closed; founder approval required.
- Connect only approved public client configuration after project/schema/RLS review.
- Privileged/service credentials never enter frontend or Lovable.
- Does not authorize real data or pilot launch.

### Gate 4 — Real-data entry

- **Status:** Closed; founder approval required.
- Requires completed KVKK notice/legal-basis/retention/transfer preparation.
- Begins with a controlled data set; listing counts are evidence inputs, not automatic hard gates.
- Does not authorize broader public launch.

### Gate 5 — Pilot publish/launch

- **Status:** Closed; founder approval required.
- Requires focused validation, operational readiness and explicit founder launch approval.
- Publish/launch is separate from merge, remote migration, environment connection and real-data entry.

## Separate minimal-PWA package

This package follows Gate 1 but remains separate from backend gates and pilot publication.

- [ ] Add a manifest.
- [ ] Establish durable application identity.
- [ ] Add correct icons.
- [ ] Verify installability.
- [ ] Add a safe, honest offline/error screen.

Out of scope: push notifications, full offline listing operation, background sync, cache-first dynamic listings, TWA/Android/Play Store files.

Starting this package is routine only after its exact bounded implementation task is selected; it must not silently open pilot publication or mobile-store scope.

## Canonical first-slice boundaries

### Temporary Dashboard model

- Founder is the only Dashboard user.
- MFA is required and the account is not shared.
- Dashboard may be used only for approved `listings` row operations after Gate 2–4 approvals.
- No Dashboard changes to tables, columns, RLS, grants, constraints, indexes, triggers or extensions.
- This is temporary, not a permanent admin architecture.

### Dashboard exit triggers

Plan replacement when:

- a second operator or role separation is needed;
- seller self-service/private contact enters scope;
- repeated errors require approval/audit workflow;
- pending operations or turnaround become unsustainable;
- the pilot expands beyond the controlled Çorlu model;
- Dashboard operation prevents reliable process enforcement.

## Pilot evidence and success measures

Listing counts are not mandatory hard gates. Use qualitative demand and operating evidence:

- incoming, published and rejected applications;
- application-to-publication time;
- edited, removed and expired listings;
- complaints and real contacts;
- contacts becoming mutual conversations;
- useful and empty controlled queries;
- weekly founder operating time;
- pending operation count;
- reliability of intake, moderation, relay, correction, removal and expiry.

Do not build broad analytics infrastructure solely for these measures.

## Explicitly deferred

- [ ] Buyer authentication.
- [ ] Seller authentication.
- [ ] In-app moderator authentication.
- [ ] `app_roles` or `moderation_events`.
- [ ] Seller-contact/private-phone table.
- [ ] Custom admin panel.
- [ ] Public database insert or seller self-service.
- [ ] Photo upload and Storage.
- [ ] SMS/OTP.
- [ ] Automatic expiration cron.
- [ ] Broad analytics/event infrastructure.
- [ ] Direct seller phone.
- [ ] Nationwide real pilot.
- [ ] Vehicle and real-estate listings.
- [ ] Payments, live chat, shipping/order flows.
- [ ] Advertising-network integration.
- [ ] Paid or recurring services.
- [ ] Play Store publication without the separate value gate.
- [ ] Capacitor/native Android without measured device-integration need.

## Technical quality backlog

- [ ] Verify the supported production-preview command for the Lovable/Nitro Cloudflare adapter before changing the incompatible `bun run preview` path.
- [ ] Revisit the six non-blocking shadcn Fast Refresh warnings only if they create real friction.
- [ ] Extend targeted tests only when changed real behavior justifies them.

## Administrative metadata

- [ ] Rename Lovable project-panel `display_name` and generated description from `Find It Fast` to `Arar Buluruz` when a direct no-credit metadata operation is available and safe.

## Task routing and decision rules

- **Main assistant:** active default implementer and coordinator for routine, reversible work within canonical scope.
- **Work:** optional independent analysis only for consequential uncertainty or explicit founder request.
- **Codex:** narrow specialist when terminal/database/E2E work is genuinely unavailable or inefficient through the main assistant.
- **Lovable:** bounded frontend/UX work only under safe review conditions; never backend owner.
- **Founder:** every consequential gate, remote Supabase, real data, secrets/environment and production publication.
- Only one code writer operates at a time.
- Stop for founder input on new product/architecture direction, scope expansion, new security/KVKK risk, remote project/migration, secret/environment, real data, production deploy, paid service, advertising/analytics/external SDK, expensive-to-reverse action or unresolved canonical conflict.
- Testing depth follows risk; existing evidence remains valid until touched behavior changes.
- GitHub `main` remains canonical.
