# Arar Buluruz — Current State

_Last updated: 2026-07-30, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- Current GitHub `main` SHA: `2660990f699724e63b1d007b39952461d1d05cdb`
- Last locally validated SHA: `2660990f699724e63b1d007b39952461d1d05cdb`
- Latest confirmed published Lovable SHA: `2660990f699724e63b1d007b39952461d1d05cdb`
- Canonical package lock: `bun.lock`

## Completed milestones

- PR #1: controlled prototype contact flow merged and published.
- PR #2: shared project memory, standing approval rules and backend ownership guardrails merged.
- PR #3: site-wide `noindex/nofollow` protection merged and published.
- PR #4: repository README heading renamed to `Arar Buluruz`.
- PR #5: current state and backlog synchronized.
- PR #6: submitted listing values are shown in an editable prototype preview.
- PR #7: home-page example searches and honest mock-proximity labels added.
- PR #8: source-level internal dry-run and five-person moderated user-test pack added.
- PR #9: pinned Bun CI and clean Prettier baseline added.
- PR #10: CI and executable-validation evidence synchronized into project memory.
- PR #11: cross-platform LF checkout policy added through `.gitattributes`.
- PR #12: successful Windows synchronization and local executable-validation evidence recorded.
- PR #13: redundant pre-sync branch/stash cleanup recorded after external recovery verification.
- PR #14: automated mobile E2E findings fixed; multi-word search and fixed-footer overlap corrections merged after regression validation.
- PR #15: PR #14 validation, public-header evidence and the next human-test gate synchronized.
- Lovable credit sprint: all five remaining credits were used on bounded frontend work, followed by GitHub diff review, local lint/build validation and generated-file cleanup.

## Current product behavior

### Search

- Search includes title, description and hidden keyword synonyms.
- Multi-word searches are tokenized; every token must appear somewhere in the combined searchable text.
- `ikinci el masa` and `masa ikinci el` both resolve to the matching office-desk listing.
- The search input now stays synchronized with the URL query when browser history or in-app navigation changes the search.
- Zero-result city filtering offers `Tüm Türkiye'de ara` recovery.
- Home page offers direct example searches: `traktör`, `kiralık daire`, `ikinci el masa`, `oto`.
- Mock distance ordering is labelled `Yakın (örnek)` and explicitly states that real location is not used.
- Advertising placeholders are separate list items rather than being semantically nested inside an organic listing item.

### Listing detail and contact

- Controlled test number: `+905321739111`
- Call target: `tel:+905321739111`
- WhatsApp target: `https://wa.me/905321739111`
- `Listing.phone` and twelve old mock numbers are removed.
- The number is not printed in visible listing copy.
- At a `390 × 844` viewport, the fixed contact bar leaves the `Şikâyet Et` link fully visible with `0 px` overlap.
- Listing detail includes a `Sonuçlara dön` control that returns through router history.

### Listing creation and login

- Title, price, city and description are preserved in frontend state.
- Submission shows the user's values in a listing-style preview card.
- `İlanı düzenle` returns to the populated form.
- No real record, upload, backend or storage is used.
- The city selector contains `Tüm Türkiye` plus all 81 provinces with Turkish characters.
- Photo slots are honest non-interactive prototype placeholders and explicitly state that photo upload is disabled.
- The prototype login form requires a telephone value with a minimum length of 10 before showing the disabled-login message.

## CI and executable validation

- GitHub Actions runs on pull requests targeting `main`, pushes to `main`, and manual dispatch.
- Workflow permissions are read-only: `contents: read`.
- `actions/checkout` and `oven-sh/setup-bun` are pinned to verified commit SHAs.
- Bun is pinned to `1.3.14`.
- Validation sequence:
  - `bun install --frozen-lockfile`
  - `bun run lint`
  - `bun run build`
- PR #14 CI and independent Codex mobile regression validation passed.
- The final local checkout at `2660990f…` passed:
  - Bun `1.3.14`
  - lint: `0` errors and six existing non-blocking Fast Refresh warnings
  - production build: passed
  - generated `src/routeTree.gen.ts` drift restored to the canonical HEAD version
  - final working tree: clean
- `.gitattributes` enforces LF for text files across Windows, macOS and Linux; binary assets are excluded from line-ending conversion.

## Search-index protection

- Root metadata includes `robots` and `googlebot`: `noindex, nofollow, noarchive, nosnippet`.
- Server responses add `X-Robots-Tag` with the same directive.
- `robots.txt` remains crawlable so crawlers can read the noindex instruction.
- Local and public browser verification confirmed the expected `X-Robots-Tag` header on the tested routes.

## Lovable

- Project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Public URL: `https://arar-buluruz.lovable.app`
- Database: Disabled
- Project status: Completed
- Published: Yes, public
- Latest confirmed published SHA: `2660990f699724e63b1d007b39952461d1d05cdb`
- The Lovable project screenshot reference also carries the `2660990f` commit prefix.
- Project metadata still reports display name `Find It Fast` and an old generated description. The connector exposes no direct rename operation.
- Remaining Lovable credits: `0`
- Variants were unavailable. Under the founder's explicit instruction to use the expiring credits, tightly scoped Lovable work was allowed on `main`, then independently reviewed and validated. Future Lovable code work should return to a reviewable branch/variant workflow when available.

## Backend ownership position

- Lovable remains a frontend writer/hosting surface, not the backend owner.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- Future backend will use a separate founder-owned Supabase project.
- Founder controls the Supabase account, organization, billing and administrator access.
- Schema and every migration will be canonical in GitHub from day one.
- Before real data, Work review and founder approval are required for region, backups, export/restore, RLS, auth, KVKK/retention and provider exit planning.

## Local checkout

- Local repository: `C:\Projects\arar-buluruz`
- Local `main` and `origin/main` are clean and equal at `2660990f699724e63b1d007b39952461d1d05cdb`.
- Repository-local Git settings are `core.autocrlf=false` and `core.eol=lf`.
- External recovery records remain outside the repository.

## Current validation stage

- Source-level dry-run is complete.
- Local executable validation, route smoke tests and automated mobile E2E validation are complete.
- Public Lovable synchronization to the current validated SHA is confirmed.
- The next evidence gate is five moderated tests with real people on mobile devices using `docs/MODERATED_USER_TEST_PLAN.md`.
- Automated browser runs do not replace human usability evidence.
- No additional speculative product feature should be added before those observations are collected.

## Known gaps and risks

- Lovable project-panel metadata still uses `Find It Fast`; runtime and repository naming use `Arar Buluruz`.
- Six non-blocking Fast Refresh warnings exist in shared shadcn UI files.
- `bun run preview` currently expects an incompatible output path for the Lovable/Nitro Cloudflare build; local smoke validation uses the dev server. Do not change the preview script without verifying the hosting adapter's supported command.
- District selection requirements for the first real-data pilot remain undecided.
- Lovable's direct-to-main credit sprint produced many small commits; no history rewrite or force-push was performed.

## Hard boundaries

- No backend, Supabase, auth, SMS, storage, secrets, real data, payments, ad network, paid service or recurring service without explicit founder approval and, where appropriate, Work review.
- Lovable backend capabilities must not be enabled as a convenience shortcut.
- GitHub `main` is the canonical code source; local copies are synchronized deliberately.
