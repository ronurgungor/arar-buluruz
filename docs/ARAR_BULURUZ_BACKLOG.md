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

## Current work

The application remains a frontend-only mock prototype. No Supabase project, backend, migration, RLS, environment connection, real data or pilot launch exists yet.

The pilot architecture debate is closed. The selected direction is D-016:

- first capability: listing persistence;
- Çorlu scope;
- 5–10 controlled real listings for technical validation;
- only a `listings` table;
- public read-only access;
- founder-only temporary Dashboard row operations;
- seller phone outside Supabase and communication on the controlled central line;
- no public buyer/seller/moderator auth, custom admin panel, photos, Storage, seller-contact table, public writes or automatic expiration cron.

The remaining work is divided into two separate packages and five approval gates. Package B is a candidate only; it is not implemented or automatically approved.

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

## Package B — Technical implementation candidate

**Status: pending explicit Gate 1 approval. Nothing in this package has been implemented.**

### Candidate database work

- [ ] Prepare one migration creating only the `listings` table.
- [ ] Add the approved fields:
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
- [ ] Restrict initial `status` values to `draft`, `published` and `unpublished`.
- [ ] Add proportionate not-null, length, price, date-order and status constraints.
- [ ] Add only indexes justified by public visibility and search/order behavior.
- [ ] Do not add `is_mock`; mock listings never enter the production database.
- [ ] Enable RLS and grant anonymous/public read access only to rows satisfying:

```sql
status = 'published'
and published_at <= now()
and expires_at > now()
```

- [ ] Prohibit anonymous/public INSERT, UPDATE and DELETE.
- [ ] Keep schema, RLS, grants, constraints, indexes, triggers and extensions migration-canonical in GitHub.
- [ ] Do not add automatic expiration cron; expiration is enforced by the read policy and founder row operations.

### Candidate application work

- [ ] Add the Supabase client integration without embedding privileged secrets.
- [ ] Keep the client disconnected until the environment-connection gate is approved.
- [ ] Separate production real-data behavior from development/test mock fixtures.
- [ ] Remove mock listings from the production pilot data path rather than mixing them with real rows.
- [ ] Update `/ara` to read only public-visible database listings while preserving search-first behavior.
- [ ] Update `/ilan/$id` to show only publicly visible listings and return a safe not-found result for hidden/expired rows.
- [ ] Keep phone/WhatsApp contact on the controlled central line; include listing ID in the prepared message.
- [ ] Change `/ilan-ver` into a controlled WhatsApp application message; do not create a public database insert.
- [ ] Change `/sikayet/$id` into an ID-bearing controlled WhatsApp complaint message; do not create a public database insert.
- [ ] Make `/giris` clearly state that buyer/seller login is unavailable in the pilot; do not create auth.
- [ ] Remove or isolate production mock-distance, mock-photo and mock-advertising behavior touched by the real listing path.
- [ ] Do not add analytics/event infrastructure solely to measure the first slice.

### Candidate validation

- [ ] Run local migration/reset validation in an isolated environment.
- [ ] Verify public read RLS for valid published/unexpired rows.
- [ ] Verify draft, unpublished, future-published and expired rows are not publicly readable.
- [ ] Verify anonymous INSERT, UPDATE and DELETE are denied.
- [ ] Verify public responses contain no seller phone or privileged fields.
- [ ] Verify invalid status, negative price, invalid date order and required-field constraints fail safely.
- [ ] Run `bun install --frozen-lockfile`, `bun run lint` and `bun run build`.
- [ ] Run focused mobile/desktop E2E for `/ara`, `/ilan/$id`, `/ilan-ver`, `/sikayet/$id` and `/giris`.
- [ ] Verify production does not display or query mock listings.
- [ ] Produce starting/final SHA, diff, commands, results, risks, rollback and explicit mutation/deployment report.

### Tests deliberately not required for this slice

- Nationwide or million-row load testing.
- Buyer/seller account, OTP or recovery tests.
- Storage/photo tests.
- Payment, chat, shipping or advertising tests.
- Broad analytics/event-pipeline tests.
- Exhaustive browser/device matrix.
- Repeating the entire historical mock-prototype regression when untouched behavior remains covered.

## Approval gates for the implementation candidate

Each gate requires separate founder approval. Completion or approval of one gate never authorizes the next.

### Gate 1 — Local and isolated implementation preparation

- Candidate owner: Codex, with the main assistant coordinating scope and GitHub review.
- May prepare code, migration, local tests, diff and rollback evidence in an isolated reviewable branch.
- Must not create a remote Supabase project, set real environment values, enter real data or deploy.

### Gate 2 — Supabase organization/project creation

- Requires Package A ownership, MFA, recovery, region and KVKK preparation to be resolved.
- Founder creates or explicitly authorizes creation of the founder-owned organization/project.
- Does not authorize application environment connection or real data.

### Gate 3 — Secret/environment connection

- Connect only the approved public client configuration after project/schema/RLS review.
- Privileged/service credentials never enter frontend or Lovable.
- Does not authorize real data or pilot launch.

### Gate 4 — Real-data entry

- Requires explicit founder approval after KVKK notice/legal-basis/retention/transfer checks.
- Begins with 5–10 controlled listings.
- Does not authorize public pilot launch beyond the approved controlled validation.

### Gate 5 — Pilot publish/launch

- Requires focused validation, operational readiness and explicit founder launch approval.
- Publish/launch is separate from merge and from real-data entry.

## Canonical first-slice boundaries

### Temporary Dashboard model

- Founder is the only Dashboard user.
- MFA is required and the account is not shared.
- Dashboard is used only to create, edit, publish and remove `listings` rows.
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

## Pilot stages

1. **5–10 listings:** validate persistence, RLS, publication, removal and expiration.
2. **10–20 listings:** validate application intake, moderation and central relay operations.
3. **30+ listings:** test search density only if sufficient real demand clusters form.

Thirty listings are not a mandatory success gate.

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
- Use Codex when executable analysis, local terminal work, debugging, migration/RLS validation or a larger implementation is genuinely needed and unavailable/inefficient in the main assistant environment.
- A quick founder or nearby-user smoke check may be used when wording or navigation is uncertain.
- Formal moderated multi-person testing is optional for the mock prototype and becomes justified before a broader public pilot, conflicting user feedback or higher-risk capabilities.
- Existing automated evidence remains valid until a change touches the covered behavior.

## Task routing

- **Main assistant:** default executor and coordinator when current tools and approval scope are sufficient.
- **Work:** optional independent analysis only when a new consequential uncertainty justifies it; the first-pilot architecture debate is closed.
- **Codex:** candidate implementation specialist for Gate 1 because local repository, terminal, migration/RLS tests, browser automation and rollback evidence are required.
- **Lovable:** bounded frontend/UX work only when credits and a safe isolated/reviewable workflow exist; never backend owner.
- **Founder:** every consequential approval gate, Supabase ownership, real data, secrets/environment connection and pilot launch.
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
- [ ] Add targeted automated tests when real behavior begins to justify them; avoid broad scaffolding for placeholder-only flows.

## Decision rules

- Low-risk, reversible tasks already listed here may be completed under standing approval.
- Stop for founder input at every explicit pilot gate and whenever a task affects backend ownership, security, KVKK, real data, public-pilot readiness, cost commitments or other expensive-to-reverse choices.
- Work/Codex review supports decisions but does not replace founder approval.
- Testing depth must follow risk, not habit.
- GitHub `main` remains canonical.
- A teammate's nominal capability may be accepted from its own inventory; current-session access and mutation authority must still be checked before action.
