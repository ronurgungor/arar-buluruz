# Arar Buluruz — Current State

_Last updated: 2026-07-30, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- GitHub `main` is canonical; read its exact current SHA directly at the start of every task rather than trusting a copied value in documentation.
- Latest founder-local synchronization evidence before this memory update: `7a817dfa9726d9f845248863bb1558cec51c1f37` with a clean working tree.
- Latest validated and published runtime SHA: `2660990f699724e63b1d007b39952461d1d05cdb`.
- Gate 1 implementation was merged through PR #25 with normal merge commit `994b8b1705d52434be0c000093a052fa0e519542`.
- Canonical package lock: `bun.lock`.

## Shared knowledge system

The repository separates project knowledge by purpose:

- `AGENTS.md`: operating contract and source priority
- `docs/AI_CHAT_BOOTSTRAP.md`: common new-chat entry point for application, work, team and governance
- `docs/ARAR_BULURUZ_PROJECT_MEMORY.md`: durable project thesis, identifiers, architecture and ownership boundaries
- `docs/ARAR_BULURUZ_CURRENT_STATE.md`: current behavior, verification and known risks
- `docs/ARAR_BULURUZ_DECISION_LOG.md`: consequential decisions and rationale
- `docs/AI_TEAM_CAPABILITIES.md`: verified/self-reported AI and tool access, limits and routing
- `docs/WORK_CODEX_CAPABILITY_PROFILE.md`: detailed Work and Codex capability profiles and handoff standards
- `docs/ARAR_BULURUZ_BACKLOG.md`: pending and ordered work
- dated documents: historical test and audit evidence

An AI without repository access must say so and request the minimum missing files. No chat memory overrides GitHub `main`.

## Completed milestones

- Controlled frontend-only classified-listing prototype created and published.
- Shared project memory, standing approval rules and backend ownership guardrails added.
- Site-wide `noindex/nofollow` metadata and `X-Robots-Tag` protection added and verified.
- Editable frontend listing preview, example searches and honest mock-proximity labels added.
- Read-only CI pinned to Bun `1.3.14`; frozen install, lint and production build proved.
- Cross-platform LF checkout policy and clean Windows synchronization proved.
- Automated mobile E2E found and fixed multi-word search and fixed-footer overlap defects.
- Lovable credit sprint used all five expiring credits on bounded frontend work.
- PR #16 synchronized the final credit-sprint evidence.
- PR #17 adopted risk-based validation and explicit Work/Codex/main-assistant routing.
- Structured shared memory, decision-log, capability-registry, Work/Codex profile and new-chat bootstrap documents were added for cross-chat and cross-tool continuity.
- The first Work capability inventory was completed and recorded with nominal capabilities, observed limits and session-dependent authority separated.
- Broad and reduced first-pilot options were independently compared by the main assistant rather than treating Work's recommendation as binding.
- The founder selected the reduced founder-operated persistence direction recorded in D-016.
- Gate 1 local migration/RLS/application/test implementation was completed and merged through PR #25.

## Current product behavior

### Search

- Search includes title, description and hidden keyword synonyms.
- Multi-word searches are tokenized; every token must appear somewhere in the combined searchable text.
- `ikinci el masa` and `masa ikinci el` both resolve to the matching office-desk listing.
- The search input stays synchronized with URL/history changes.
- Zero-result city filtering offers `Tüm Türkiye'de ara` recovery.
- Home page offers direct example searches: `traktör`, `kiralık daire`, `ikinci el masa`, `oto`.
- Mock distance ordering is labelled `Yakın (örnek)` and states that real location is not used.
- Advertising placeholders are separate list items rather than being nested inside organic listings.

### Listing detail and contact

- Controlled test number: `+905321739111`
- Call target: `tel:+905321739111`
- WhatsApp target: `https://wa.me/905321739111`
- The controlled number is not printed in visible listing copy.
- At `390 × 844`, the fixed contact bar leaves the `Şikâyet Et` link visible with `0 px` overlap.
- Listing detail includes a `Sonuçlara dön` history control.

### Listing creation and login

- Title, price, city and description are preserved in frontend state in the published mock snapshot.
- Submission shows the user's values in a listing-style preview card in the published mock snapshot.
- `İlanı düzenle` returns to the populated form in the published mock snapshot.
- The city selector contains `Tüm Türkiye` plus all 81 provinces.
- Photo slots clearly state that upload is disabled in the prototype.
- The published mock snapshot still contains the prototype login behavior.
- No real record, upload, authentication or storage is active in production.

### Gate 1 code path now on GitHub `main`

- A native-fetch public Supabase REST reader is present without privileged secrets.
- Production defaults to a disconnected state until Gate 3 explicitly supplies approved public configuration.
- Development/test mock fixtures are isolated from the real listing path.
- `/ara` and `/ilan/$id` support public-visible database listings when explicitly configured.
- Draft, unpublished, future-published, expired and unknown rows return a safe not-found result.
- `/ilan-ver` prepares a structured WhatsApp application and performs no public database insert.
- `/sikayet/$id` prepares an ID-bearing WhatsApp complaint and performs no public database insert.
- `/giris` states that login is unavailable in the pilot; no product auth client exists.
- Visible listing WhatsApp messages include the listing ID.
- Real-data mode does not expose mock distance, mock advertising or mock photos.

## CI and executable validation

- GitHub Actions runs on pull requests targeting `main`, pushes to `main` and manual dispatch.
- Workflow permissions are read-only: `contents: read`.
- `actions/checkout`, `oven-sh/setup-bun`, Bun `1.3.14`, Supabase CLI `2.101.0` and Playwright `1.55.0` are pinned as applicable.
- Canonical quality validation:
  - `bun install --frozen-lockfile`
  - Bun-only package/lockfile boundary
  - `bun run lint`
  - 7 unit tests
  - production build with `VITE_LISTINGS_SOURCE=disabled`
- Gate 1 isolated validation:
  - no linked remote Supabase project or remote credentials;
  - GoTrue enabled only in the disposable CI runner copy;
  - `supabase db reset --local --no-seed`;
  - 22/22 pgTAP schema, grant, constraint and RLS tests;
  - application REST adapter → local Kong/PostgREST → RLS integration;
  - focused desktop/mobile browser E2E;
  - external WhatsApp navigation intercepted without sending a real message;
  - local stack/data removed with `supabase stop --no-backup`.
- Gate 1 pre-merge CI run `30560604524` passed fully on approved head `1d9d0f6112464e5078d90df510488f7a786cddef`.
- Independent Codex mobile regression validation passed for the historical mock-prototype search, detail, city-recovery, listing-preview and complaint flows.
- Generated `src/routeTree.gen.ts` drift was restored and the working tree was clean.

## Search-index protection

- Root metadata includes `robots` and `googlebot`: `noindex, nofollow, noarchive, nosnippet`.
- Server responses add the equivalent `X-Robots-Tag` directive.
- `robots.txt` remains crawlable so crawlers can read the instruction.
- Local and public verification confirmed the expected header on tested routes.

## Lovable

- Project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Workspace ID: `AERDgNbVzztF411nAuzp`
- Public URL: `https://arar-buluruz.lovable.app`
- Preview URL: `https://id-preview--dca896f8-bb48-4a67-ae49-0493610ca6ad.lovable.app`
- Database: Disabled
- Project status: Completed
- Published: Yes, public
- Latest confirmed published runtime SHA: `2660990f699724e63b1d007b39952461d1d05cdb`
- The editor/preview synchronized to Gate 1 merge commit `994b8b17…` after the GitHub merge.
- No Lovable Publish/Update was performed for Gate 1; the public URL remains the earlier published snapshot.
- Remaining Lovable credits: `0`
- Project metadata still reports display name `Find It Fast`; runtime and repository naming use `Arar Buluruz`.
- Variants were unavailable during the expiring-credit sprint. Future Lovable code work should use a reviewable branch or variant when available.

## Team capability status

- Main-assistant GitHub/Lovable connector operations are verified in the current connected environment.
- The main assistant is the active default implementer and coordinator for routine, reversible work within canonical scope.
- Codex repository, local terminal, lint/build and mobile E2E capability has been demonstrated in project work and remains optional when its additional execution environment is materially useful.
- Lovable frontend writing and preview/build behavior has been demonstrated; current credits are zero and its plan mode was not safely non-writing in the observed run.
- Work capability inventory is complete; Work is optional for consequential independent analysis or explicit founder request rather than routine implementation.
- Capability claims and session-dependent limits are recorded in `docs/AI_TEAM_CAPABILITIES.md` and `docs/WORK_CODEX_CAPABILITY_PROFILE.md`.

## Approved first-pilot direction — Gate 1 implemented locally and merged

The founder selected the reduced Option B direction recorded in D-016:

- first real capability: listing persistence;
- initial geography: Çorlu;
- controlled staged validation rather than a mandatory listing-count hard gate;
- only one application table: `listings`;
- public application: read-only;
- no buyer auth, seller auth, in-app moderator auth or custom admin panel;
- no seller-contact/private-phone table;
- no `app_roles` or `moderation_events`;
- no photo upload or Storage;
- no public/anonymous database insert;
- no automatic expiration cron;
- seller phone remains outside Supabase and communication stays on the controlled central phone/WhatsApp line;
- the founder may temporarily manage approved listing rows in the Supabase Dashboard after a separately approved founder-owned project exists;
- Dashboard access is founder-only, MFA-protected and not shared;
- all schema, RLS, grant, constraint, index, trigger and extension changes remain GitHub-migration canonical.

Implemented `listings` fields:

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

Initial status values: `draft`, `published`, `unpublished`.

Mock listings do not enter the production database and no `is_mock` field exists.

Public visibility is enforced in database/RLS:

```sql
status = 'published'
and published_at <= now()
and expires_at > now()
```

## Operating and validation policy

- Continue directly when the path is clear and the work is low-risk, reversible and within approved scope.
- The main assistant handles routine technical details, small implementation choices, test maintenance, debugging and reversible repository operations without mandatory advisor handoff.
- Use Work or another specialist only for consequential uncertainty, material independent challenge or explicit founder request.
- Stop for founder approval before new product/architecture direction, scope expansion, new security/KVKK risk, remote Supabase project/migration, secret/environment change, real data, production publish/deploy, paid service, advertising/analytics/external SDK, expensive-to-reverse action or unresolved canonical conflict.
- Only one code writer operates at a time.
- Testing depth follows risk rather than a fixed ritual.
- Existing evidence remains valid until a change touches the covered behavior.

## Backend ownership position

- Lovable remains a frontend writer and hosting surface, not the backend owner.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- Any future remote backend will use a separate founder-owned Supabase project.
- The founder controls the Supabase account, organization, billing, MFA, recovery and administrator access.
- Schema and every migration are canonical in GitHub.
- The approved pilot allows temporary founder Dashboard row operations only; it does not authorize Dashboard schema/security changes or establish a permanent admin architecture.
- Before real data, the founder/KVKK/Supabase preparation package and explicit real-data approval must be completed.

## Current stage

- Gate 1 technical implementation is completed and merged to GitHub `main`.
- The repository now contains the local migration, RLS policy, REST connection code and automated test package.
- No Supabase organization or project has been created for Arar Buluruz.
- No remote migration has been applied.
- No project ref, secret/environment variable or real-data flow has been connected.
- No real data has been entered.
- The real pilot has not started and has not been launched.
- No Lovable Publish/Update or other production deploy was performed for Gate 1.
- Gates 2–5 remain closed.
- The public Lovable URL remains the earlier published frontend-only mock snapshot.
- The next real gate is founder-owned Supabase organization/project preparation and approval.

## Known gaps and risks

- Package A remains unresolved: Supabase ownership/recovery/MFA, region, controlled WhatsApp-line ownership, data-controller identity, notice/legal basis, retention/deletion and possible international transfer.
- Supabase project creation, remote migration, environment connection, real-data entry and pilot launch remain separate founder gates.
- WhatsApp handling of seller phone and messages remains personal-data processing even though those data are not stored in Supabase.
- Founder-only Dashboard operation is intentionally temporary and must be replaced when its exit triggers occur.
- Lovable project-panel metadata still uses `Find It Fast`.
- Six non-blocking Fast Refresh warnings remain in shared shadcn UI files.
- Browser E2E runs against local Vite SSR plus an ephemeral local Supabase stack; the Lovable/Cloudflare production runtime is build-verified but not deployed for Gate 1.
- `bun run preview` expects an incompatible path for the Lovable/Nitro Cloudflare build; do not change it without adapter verification.
- Lovable's direct-to-main credit sprint produced many small commits; no force-push or history rewrite was performed.

## Hard boundaries

- Gate 1 completion does not authorize Gate 2–5.
- No remote Supabase project/migration, auth, Storage, secrets/environment changes, real data, Lovable Publish/Update, other production deployment or pilot launch without the appropriate explicit founder gate.
- No backend activation, SMS, payments, ad network, analytics/external SDK, paid service or recurring service without explicit approval.
- Lovable backend capabilities must not be enabled as a convenience shortcut.
- GitHub `main` is the canonical code and documentation source.
