# Arar Buluruz — Backlog

_Last updated: 2026-07-30, Europe/Istanbul_

Legend: `[x]` completed, `[-]` in progress, `[ ]` pending.

## Completed

- [x] Create the initial frontend-only classified-listing prototype.
- [x] Keep Lovable database disabled.
- [x] Add and publish the controlled test contact flow.
- [x] Add shared project memory, standing approval rules and backend ownership guardrails.
- [x] Add site-wide `noindex/nofollow` metadata and `X-Robots-Tag` protection.
- [x] Show submitted listing values in an editable frontend preview card.
- [x] Add direct example searches and honest mock-proximity labels.
- [x] Add pinned Bun `1.3.14` CI with frozen install, lint and build.
- [x] Establish LF checkout policy and prove the Windows checkout clean.
- [x] Run automated mobile E2E and fix multi-word search and fixed-footer overlap.
- [x] Confirm the public Lovable project synchronized to the validated runtime SHA.
- [x] Keep the search input synchronized with URL/history changes.
- [x] Add a `Sonuçlara dön` control to listing detail.
- [x] Replace inert photo-upload buttons with honest prototype placeholders.
- [x] Separate advertising placeholders from organic listing items.
- [x] Require a minimum telephone value before the prototype login response.
- [x] Replace the mock-derived city selector with `Tüm Türkiye` plus all 81 provinces.
- [x] Use all five remaining Lovable credits on bounded frontend work and validation.
- [x] Restore generated `src/routeTree.gen.ts` drift and leave the local working tree clean.
- [x] Replace the mandatory five-person-test gate with risk-based validation.
- [x] Define main-assistant/Work/Codex/Lovable task routing.
- [x] Make the main assistant the default executor when its tools are sufficient.
- [x] Add a durable shared project-memory document.
- [x] Add an append-oriented decision log with rationale and review triggers.
- [x] Add an AI/team capability registry.
- [x] Record detailed Work and Codex role charters.
- [x] Complete and record the first restricted Work session's nominal capability inventory while keeping session availability and project authority separate.
- [x] Record project-observed Codex capabilities and session-dependent limits.
- [x] Add one mandatory new-chat bootstrap covering application, tasks, team roles/capabilities and governance.
- [x] Connect `README.md` and `AGENTS.md` to the shared knowledge system.
- [x] Stop storing a copied “current main SHA” as if it could remain current after documentation merges.
- [x] Independently compare the broad and reduced first-pilot options using the main assistant as decision synthesizer.
- [x] Select reduced Option B: a founder-operated, listings-only persistence direction for Çorlu.
- [x] Record that Work's pilot analysis was advisory input rather than an automatic project decision.
- [x] Complete Gate 1 local/isolated migration, RLS, REST and application implementation.
- [x] Validate Gate 1 with frozen Bun install, lint, unit/build, clean local reset, 22/22 pgTAP, REST/RLS integration and desktop/mobile E2E.
- [x] Merge PR #25 with a normal merge commit after explicit founder approval.
- [x] Confirm the Lovable editor/preview synchronized after merge without performing Publish/Update.

## Current work

Gate 1 is completed and merged. The public Lovable site remains the previously published frontend-only mock snapshot because no Publish/Update occurred.

No founder-owned Supabase project, remote migration, environment connection, secret, real data or pilot launch exists yet.

The pilot architecture debate remains closed. The selected direction is D-016:

- first capability: listing persistence;
- Çorlu scope;
- controlled staged validation rather than a mandatory listing-count hard gate;
- only a `listings` table;
- public read-only access;
- founder-only temporary Dashboard row operations after the relevant later gates;
- seller phone outside Supabase and communication on the controlled central line;
- no public buyer/seller/moderator auth, custom admin panel, photos, Storage, seller-contact table, public writes or automatic expiration cron.

The next real approval gate is Gate 2. Gates 2–5 remain closed.

## Package A — Founder/KVKK/Supabase preparation

Complete these founder-owned decisions and checks before Supabase activation or real data:

- [ ] Confirm the founder-owned Supabase organization/account model.
- [ ] Confirm project ownership, billing ownership and administrator recovery path.
- [ ] Enable and verify MFA for the founder account; do not share the account.
- [ ] Select the intended Supabase region and document the basis for that choice.
- [ ] Confirm the owner and authorized operator of the controlled phone/WhatsApp line.
- [ ] Identify the legal data controller for the pilot.
- [ ] Prepare the seller-facing privacy notice/aydınlatma approach.
- [ ] Confirm the legal basis for handling seller phone and WhatsApp messages.
- [ ] Define the minimum retention and deletion approach for WhatsApp and any operational records.
- [ ] Assess possible international-transfer implications for Supabase and connected services.
- [ ] Confirm the Dashboard operating rule: founder-only listing-row operations; no schema/security changes.
- [ ] Confirm prohibited pilot categories, including vehicle and real-estate listings.
- [ ] Obtain explicit founder approval before creating the Supabase project.
- [ ] Obtain a separate explicit founder approval before any real seller/listing data is entered.

WhatsApp remaining outside Supabase does not remove KVKK obligations. Legal/KVKK conclusions must not be inferred solely from the technical architecture.

## Package B — Technical implementation

**Status: completed locally/isolated and merged through PR #25. No remote Supabase or production activation was performed.**

### Database work

- [x] Prepare one migration creating only the `listings` table.
- [x] Add the approved fields:
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
- [x] Restrict initial `status` values to `draft`, `published` and `unpublished`.
- [x] Add proportionate not-null, length, price, date-order and status constraints.
- [x] Add only indexes justified by public visibility and search/order behavior.
- [x] Do not add `is_mock`; mock listings never enter the production database.
- [x] Enable RLS and grant anonymous/public read access only to rows satisfying:

```sql
status = 'published'
and published_at <= now()
and expires_at > now()
```

- [x] Prohibit anonymous/public INSERT, UPDATE and DELETE.
- [x] Keep schema, RLS, grants, constraints, indexes, triggers and extensions migration-canonical in GitHub.
- [x] Do not add automatic expiration cron; expiration is enforced by the read policy and founder row operations.

### Application work

- [x] Add the Supabase REST client integration without embedding privileged secrets.
- [x] Keep the client disconnected until the environment-connection gate is approved.
- [x] Separate production real-data behavior from development/test mock fixtures.
- [x] Remove mock listings from the production pilot data path rather than mixing them with real rows.
- [x] Update `/ara` to read only public-visible database listings while preserving search-first behavior.
- [x] Update `/ilan/$id` to show only publicly visible listings and return a safe not-found result for hidden/expired rows.
- [x] Keep phone/WhatsApp contact on the controlled central line; include listing ID in the prepared message.
- [x] Change `/ilan-ver` into a controlled WhatsApp application message; do not create a public database insert.
- [x] Change `/sikayet/$id` into an ID-bearing controlled WhatsApp complaint message; do not create a public database insert.
- [x] Make `/giris` clearly state that buyer/seller login is unavailable in the pilot; do not create auth.
- [x] Remove or isolate production mock-distance, mock-photo and mock-advertising behavior touched by the real listing path.
- [x] Do not add analytics/event infrastructure solely to measure the first slice.

### Validation

- [x] Run local migration/reset validation in an isolated environment.
- [x] Verify public read RLS for valid published/unexpired rows.
- [x] Verify draft, unpublished, future-published and expired rows are not publicly readable.
- [x] Verify anonymous INSERT, UPDATE and DELETE are denied.
- [x] Verify public responses contain no seller phone or privileged fields.
- [x] Verify invalid status, negative price, invalid date order and required-field constraints fail safely.
- [x] Run `bun install --frozen-lockfile`, `bun run lint`, unit tests and `bun run build`.
- [x] Run focused mobile/desktop E2E for `/ara`, `/ilan/$id`, `/ilan-ver`, `/sikayet/$id` and `/giris`.
- [x] Verify production does not display or query mock listings.
- [x] Verify visible-listing, application and complaint WhatsApp payloads through interception without sending a real message.
- [x] Verify direct draft/expired detail routes return safe HTTP 404 behavior.
- [x] Produce starting/final SHA, diff, commands, results, risks, rollback and explicit mutation/deployment report.

### Tests deliberately not required for this slice

- Nationwide or million-row load testing.
- Buyer/seller account, OTP or recovery tests.
- Storage/photo tests.
- Payment, chat, shipping or advertising tests.
- Broad analytics/event-pipeline tests.
- Exhaustive browser/device matrix.
- Repeating the entire historical mock-prototype regression when untouched behavior remains covered.

## Approval gates

Each gate requires separate founder approval. Completion or approval of one gate never authorizes the next.

### Gate 1 — Local and isolated implementation preparation

- **Status:** Completed and merged through PR #25.
- Main assistant was the primary implementer and coordinator; no simultaneous code writer operated.
- Evidence head: `1d9d0f6112464e5078d90df510488f7a786cddef`.
- Normal merge commit: `994b8b1705d52434be0c000093a052fa0e519542`.
- No remote Supabase project, real environment values, real data or production deploy was created.

### Gate 2 — Supabase organization/project creation

- **Status:** Closed.
- Requires Package A ownership, MFA, recovery, region and KVKK preparation to be resolved.
- Founder creates or explicitly authorizes creation of the founder-owned organization/project.
- Does not authorize remote migration application, environment connection or real data unless separately stated.

### Gate 3 — Secret/environment connection

- **Status:** Closed.
- Connect only the approved public client configuration after project/schema/RLS review.
- Privileged/service credentials never enter frontend or Lovable.
- Does not authorize real data or pilot launch.

### Gate 4 — Real-data entry

- **Status:** Closed.
- Requires explicit founder approval after KVKK notice/legal-basis/retention/transfer checks.
- Begins with a controlled listing set; listing counts are evidence inputs rather than automatic hard gates.
- Does not authorize broader public pilot launch.

### Gate 5 — Pilot publish/launch

- **Status:** Closed.
- Requires focused validation, operational readiness and explicit founder launch approval.
- Publish/launch is separate from merge, remote migration, environment connection and real-data entry.

## Separate minimal-PWA package

This package follows Gate 1 and precedes pilot publication, but it does not open Gates 2–5.

- [ ] Add a manifest.
- [ ] Establish durable application identity.
- [ ] Add correct icons.
- [ ] Verify installability.
- [ ] Add a safe, honest offline/error screen.

Push notifications, full offline listing functionality, background sync, cache-first dynamic listings, TWA, Android and Play Store files remain out of scope for this package.

## Canonical first-slice boundaries

### Temporary Dashboard model

- Founder is the only Dashboard user.
- MFA is required and the account is not shared.
- Dashboard is used only to create, edit, publish and remove `listings` rows after the relevant later gates.
- No Dashboard changes to tables, columns, RLS, grants, constraints, indexes, triggers or extensions.
- Founder-operated Dashboard work is temporary and not a permanent admin architecture.

### Dashboard exit triggers

Plan a replacement admin/auth workflow when any of the following occurs:

- a second operator or role separation is needed;
- seller self-service or private seller contact enters scope;
- repeated Dashboard errors require approval/audit workflow;
- pending operations or turnaround become unsustainable for the founder;
- the pilot expands beyond the controlled Çorlu model;
- the Dashboard prevents reliable enforcement of the approved operating process.

## Pilot stages and evidence

Listing counts are not mandatory hard gates. They may still be useful operational reference points:

1. **5–10 listings:** persistence, RLS, publication, removal and expiration.
2. **10–20 listings:** application intake, moderation and central relay operations.
3. **30+ listings:** search-density testing only if sufficient real demand clusters form.

Progression depends on qualitative use and operating signals, not automatic count thresholds.

## Pilot success measures

Use controlled sessions and manual counting where sufficient; do not build event infrastructure solely for these measures.

- incoming listing applications;
- published and rejected applications;
- application-to-publication time;
- edited and removed listings;
- expired listings;
- complaint count;
- real contact count;
- contacts that become mutual conversations;
- controlled queries that produce and do not produce results;
- weekly founder operating time;
- pending operation count.

## Explicitly deferred

- [ ] Buyer authentication.
- [ ] Seller authentication.
- [ ] In-app moderator authentication.
- [ ] `app_roles`.
- [ ] `moderation_events`.
- [ ] Seller-contact/private-phone table.
- [ ] Custom admin panel.
- [ ] Public database insert.
- [ ] Seller self-service editing/deletion.
- [ ] Photo upload and Storage.
- [ ] SMS/OTP.
- [ ] Automatic expiration cron.
- [ ] Broad analytics/event infrastructure.
- [ ] Direct seller phone.
- [ ] Nationwide real pilot.
- [ ] Vehicle and real-estate listings.
- [ ] Payments.
- [ ] Live chat.
- [ ] Shipping/order flows.
- [ ] Advertising-network integration.
- [ ] Paid or recurring services.
- [ ] Play Store publication without its separate value gate.
- [ ] Capacitor/native Android without measured device-integration need.

## Shared knowledge maintenance

After every meaningful milestone:

- update current behavior and verified state in `ARAR_BULURUZ_CURRENT_STATE.md`;
- update pending work here;
- append consequential decisions and rationale to `ARAR_BULURUZ_DECISION_LOG.md`;
- update stable identifiers, principles or ownership rules in `ARAR_BULURUZ_PROJECT_MEMORY.md`;
- update `AI_TEAM_CAPABILITIES.md` and `WORK_CODEX_CAPABILITY_PROFILE.md` when roles, nominal capabilities, demonstrated access or material limits change;
- update `AI_CHAT_BOOTSTRAP.md` when the common onboarding model changes;
- keep long raw logs in dated evidence documents rather than copying them into shared memory.

No password, token, secret or unnecessary personal data belongs in these documents.

## Validation policy

- Do not repeat the same full regression after documentation-only, generated-file cleanup or obviously isolated low-risk changes.
- For bounded frontend changes, lint/build plus one focused behavior check is normally sufficient.
- Use Codex only when executable analysis, terminal work, debugging, migration/RLS validation or a larger implementation is genuinely unavailable or inefficient through the main assistant.
- A quick founder or nearby-user smoke check may be used when wording or navigation is uncertain.
- Formal moderated multi-person testing is optional for the mock prototype and becomes justified before a broader public pilot, conflicting user feedback or higher-risk capabilities.
- Existing automated evidence remains valid until a change touches the covered behavior.

## Task routing

- **Main assistant:** active default executor and coordinator for routine, reversible work within current tools and approved scope.
- **Work:** optional independent analysis only for consequential uncertainty or explicit founder request.
- **Codex:** optional narrow specialist when a required terminal/database/E2E task is unavailable or inefficient through the main assistant.
- **Lovable:** bounded frontend/UX work only when credits and a safe isolated/reviewable workflow exist; never backend owner.
- **Founder:** every consequential approval gate, Supabase ownership, remote migration, real data, secrets/environment connection and production publication.
- Only one code writer operates at a time.

## Lovable credit record

All five credits were consumed under explicit founder instruction because the balance was expiring:

- [x] `2.0` credits: mobile-flow audit and five bounded frontend corrections.
- [x] `2.1` credits: complete Türkiye province list.
- [x] `0.9` credits: Prettier correction plus final lint/build run.
- Remaining credits: `0`.

Variants were unavailable, so Lovable wrote directly to `main`. The diff was reviewed, generated route-tree drift was reverted and final local lint/build checks passed. Future Lovable code work should use a reviewable branch or variant when available.

## Administrative metadata

- [ ] Rename Lovable project-panel `display_name` and generated description from `Find It Fast` to `Arar Buluruz` when a direct no-credit metadata operation is available.

## Technical quality backlog

- [ ] Verify the supported production-preview command for the Lovable/Nitro Cloudflare adapter before changing the incompatible `bun run preview` path.
- [ ] Revisit the six non-blocking shadcn Fast Refresh warnings only if they create real maintenance or development friction.
- [ ] Extend targeted automated tests only when changed real behavior justifies them; avoid broad scaffolding.

## Decision rules

- Low-risk, reversible tasks already listed here may be completed under standing approval.
- Stop for founder input for new product/architecture direction, scope expansion, new security/KVKK risk, remote Supabase project/migration, secret/environment change, real data, production deployment, paid service, advertising/analytics/external SDK, expensive-to-reverse action or unresolved canonical conflict.
- Independent advisor review is optional for routine work and used for important uncertainty or explicit founder request.
- Testing depth must follow risk, not habit.
- GitHub `main` remains canonical.
- A teammate's nominal capability may be accepted from its own inventory; current-session access and mutation authority must still be checked before action.
