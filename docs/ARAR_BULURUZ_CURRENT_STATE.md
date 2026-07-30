# Arar Buluruz — Current State

_Last updated: 2026-07-30, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- GitHub `main` is canonical; read its exact current SHA directly at the start of every task rather than trusting a copied value in documentation.
- Latest founder-local synchronization evidence before this memory update: `7a817dfa9726d9f845248863bb1558cec51c1f37` with a clean working tree.
- Latest validated and published runtime SHA: `2660990f699724e63b1d007b39952461d1d05cdb`.
- Canonical package lock: `bun.lock`.

## Shared knowledge system

The repository now separates project knowledge by purpose:

- `AGENTS.md`: operating contract and source priority
- `docs/ARAR_BULURUZ_PROJECT_MEMORY.md`: durable project thesis, identifiers, architecture and ownership boundaries
- `docs/ARAR_BULURUZ_CURRENT_STATE.md`: current behavior, verification and known risks
- `docs/ARAR_BULURUZ_DECISION_LOG.md`: consequential decisions and rationale
- `docs/AI_TEAM_CAPABILITIES.md`: verified AI/tool access and limitations
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
- Structured shared memory, decision-log and capability-registry documents were added for cross-chat and cross-tool continuity.

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

- Title, price, city and description are preserved in frontend state.
- Submission shows the user's values in a listing-style preview card.
- `İlanı düzenle` returns to the populated form.
- The city selector contains `Tüm Türkiye` plus all 81 provinces.
- Photo slots clearly state that upload is disabled in the prototype.
- The prototype login form requires a minimum telephone value before showing its disabled-login message.
- No real record, upload, backend, authentication or storage is used.

## CI and executable validation

- GitHub Actions runs on pull requests targeting `main`, pushes to `main` and manual dispatch.
- Workflow permissions are read-only: `contents: read`.
- `actions/checkout`, `oven-sh/setup-bun` and Bun `1.3.14` are pinned.
- Validation sequence:
  - `bun install --frozen-lockfile`
  - `bun run lint`
  - `bun run build`
- Independent Codex mobile regression validation passed for the core search, detail, city-recovery, listing-preview and complaint flows.
- Final runtime local validation at `2660990f…` passed with `0` lint errors, six existing non-blocking Fast Refresh warnings and a successful production build.
- Generated `src/routeTree.gen.ts` drift was restored and the working tree was clean.
- Documentation PRs #16 and #17 passed CI before merge.

## Search-index protection

- Root metadata includes `robots` and `googlebot`: `noindex, nofollow, noarchive, nosnippet`.
- Server responses add the equivalent `X-Robots-Tag` directive.
- `robots.txt` remains crawlable so crawlers can read the instruction.
- Local and public verification confirmed the expected header on tested routes.

## Lovable

- Project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Workspace ID: `AERDgNbVzztF411nAuzp`
- Public URL: `https://arar-buluruz.lovable.app`
- Database: Disabled
- Project status: Completed
- Published: Yes, public
- Latest confirmed published runtime SHA: `2660990f699724e63b1d007b39952461d1d05cdb`
- Remaining Lovable credits: `0`
- Project metadata still reports display name `Find It Fast`; runtime and repository naming use `Arar Buluruz`.
- Variants were unavailable during the expiring-credit sprint. Future Lovable code work should use a reviewable branch or variant when available.

## Team capability status

- Main-assistant GitHub/Lovable connector operations are verified in the current connected environment.
- Codex repository, local terminal, lint/build and mobile E2E capability has been demonstrated in project work.
- Lovable frontend writing and preview/build behavior has been demonstrated; current credits are zero and its plan mode was not safely non-writing in the observed run.
- Work's actual GitHub, browser, terminal and mutation capabilities remain unverified. Its next task begins with a read-only capability inventory.
- Capability claims and session-dependent limits are recorded in `docs/AI_TEAM_CAPABILITIES.md`.

## Operating and validation policy

- Continue directly when the path is clear and the work is low-risk, reversible and within approved scope.
- Use Work for independent product strategy, architecture, security, KVKK, public-pilot readiness, cost or expensive-to-reverse decisions.
- Use Codex when repository analysis must be combined with terminal execution, tests, debugging, CI investigation or substantial code changes.
- Stop for explicit founder approval before backend, real data, authentication, secrets, payments, paid services or public-pilot launch.
- Only one code writer operates at a time.
- Testing depth follows risk rather than a fixed ritual.
- Existing evidence remains valid until a change touches the covered behavior.
- Formal multi-person testing is not a blocking requirement for this mock prototype.

## Backend ownership position

- Lovable remains a frontend writer and hosting surface, not the backend owner.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- Any future backend will use a separate founder-owned Supabase project.
- The founder controls the Supabase account, organization, billing and administrator access.
- Schema and every migration will be canonical in GitHub from day one.
- Before real data, Work review and founder approval are required for region, backups, export/restore, RLS, auth, KVKK/retention and provider-exit planning.

## Current stage

- The frontend-only mock prototype is technically validated and published.
- Repeating the same tests is not the next task.
- The next consequential decision is the minimum first-real-pilot scope and the first real capability.
- Before relying on Work for that decision, Work's actual capabilities and GitHub access must be inventoried and recorded.
- After capability verification, Work should perform a read-only pilot/product/architecture assessment from current GitHub sources.

## Known gaps and risks

- Work capability inventory is pending.
- First-real-pilot scope, district need and first backend capability remain undecided.
- Lovable project-panel metadata still uses `Find It Fast`.
- Six non-blocking Fast Refresh warnings remain in shared shadcn UI files.
- `bun run preview` expects an incompatible path for the Lovable/Nitro Cloudflare build; do not change it without adapter verification.
- Lovable's direct-to-main credit sprint produced many small commits; no force-push or history rewrite was performed.

## Hard boundaries

- No backend, Supabase, auth, SMS, storage, secrets, real data, payments, ad network, paid service or recurring service without explicit founder approval and, where appropriate, Work review.
- Lovable backend capabilities must not be enabled as a convenience shortcut.
- GitHub `main` is the canonical code and documentation source.
