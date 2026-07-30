# Arar Buluruz — Current State

_Last updated: 2026-07-30, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- Current GitHub `main` SHA: `7a817dfa9726d9f845248863bb1558cec51c1f37`
- Latest locally synchronized SHA: `7a817dfa9726d9f845248863bb1558cec51c1f37`
- Latest validated and published runtime SHA: `2660990f699724e63b1d007b39952461d1d05cdb`
- Canonical package lock: `bun.lock`

## Completed milestones

- Controlled frontend-only classified-listing prototype created and published.
- Shared project memory, standing approval rules and backend ownership guardrails added.
- Site-wide `noindex/nofollow` metadata and `X-Robots-Tag` protection added and verified.
- Editable frontend listing preview, example searches and honest mock-proximity labels added.
- Read-only CI pinned to Bun `1.3.14`; frozen install, lint and production build proved.
- Cross-platform LF checkout policy and clean Windows synchronization proved.
- Automated mobile E2E found and fixed multi-word search and fixed-footer overlap defects.
- Lovable credit sprint used all five expiring credits on bounded frontend work.
- PR #16 synchronized the final credit-sprint evidence into project memory.

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
- Generated `src/routeTree.gen.ts` drift was restored; the working tree was clean.
- PR #16 was documentation-only and passed CI before merge.

## Search-index protection

- Root metadata includes `robots` and `googlebot`: `noindex, nofollow, noarchive, nosnippet`.
- Server responses add the equivalent `X-Robots-Tag` directive.
- `robots.txt` remains crawlable so crawlers can read the instruction.
- Local and public verification confirmed the expected header on tested routes.

## Lovable

- Project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Public URL: `https://arar-buluruz.lovable.app`
- Database: Disabled
- Project status: Completed
- Published: Yes, public
- Latest confirmed published runtime SHA: `2660990f699724e63b1d007b39952461d1d05cdb`
- Remaining Lovable credits: `0`
- Project metadata still reports display name `Find It Fast`; runtime and repository naming use `Arar Buluruz`.
- Variants were unavailable during the expiring-credit sprint. Future Lovable code work should use a reviewable branch or variant when available.

## Operating policy

- The assistant continues directly when the path is clear and the work is low-risk, reversible and within approved scope.
- Use a Work prompt for independent product strategy, UX direction, architecture, security, KVKK, public-pilot readiness, cost commitments or expensive-to-reverse decisions.
- Use a Codex prompt when repository analysis must be combined with terminal execution, tests, debugging, CI investigation or substantial code changes.
- Stop for explicit founder approval before backend, real data, authentication, secrets, payments, paid services or public-pilot launch.
- Only one code writer operates at a time.

## Validation policy

- Testing depth follows risk rather than a fixed ritual.
- Do not repeat the same complete regression after documentation-only or clearly isolated low-risk changes.
- For bounded frontend changes, lint/build and one focused behavior check are normally sufficient.
- Existing automated evidence remains valid until a later change touches the covered behavior.
- A quick founder or nearby-user smoke check is optional when wording or navigation is uncertain.
- Formal multi-person moderated testing is not a blocking requirement for this mock prototype. It becomes useful before a public pilot, real user data, authentication, payments or when user feedback conflicts.

## Backend ownership position

- Lovable remains a frontend writer and hosting surface, not the backend owner.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- Any future backend will use a separate founder-owned Supabase project.
- The founder controls the Supabase account, organization, billing and administrator access.
- Schema and every migration will be canonical in GitHub from day one.
- Before real data, Work review and founder approval are required for region, backups, export/restore, RLS, auth, KVKK/retention and provider-exit planning.

## Local checkout

- Local repository: `C:\Projects\arar-buluruz`
- Local `main` and `origin/main` were confirmed clean and equal at `7a817dfa9726d9f845248863bb1558cec51c1f37`.
- Repository-local Git settings are `core.autocrlf=false` and `core.eol=lf`.
- External recovery records remain outside the repository.

## Current stage

- The frontend-only mock prototype is technically validated and published.
- Repeating the same tests is not the next task.
- The next consequential step is to define the minimum first-real-pilot scope and choose the first real capability.
- That decision requires product analysis and touches future backend scope, so it should be routed to Work before implementation.

## Known gaps and risks

- Lovable project-panel metadata still uses `Find It Fast`.
- Six non-blocking Fast Refresh warnings remain in shared shadcn UI files.
- `bun run preview` expects an incompatible path for the Lovable/Nitro Cloudflare build; do not change it without adapter verification.
- District requirements for the first real-data pilot remain undecided.
- Lovable's direct-to-main credit sprint produced many small commits; no force-push or history rewrite was performed.

## Hard boundaries

- No backend, Supabase, auth, SMS, storage, secrets, real data, payments, ad network, paid service or recurring service without explicit founder approval and, where appropriate, Work review.
- Lovable backend capabilities must not be enabled as a convenience shortcut.
- GitHub `main` is the canonical code source; local copies are synchronized deliberately.
