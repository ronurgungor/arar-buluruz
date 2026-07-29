# Arar Buluruz — Current State

_Last updated: 2026-07-29, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- Current repository milestone SHA: `4dc46a8bf2e2f470ce5320bed34ed855b17bdf6d`
- Latest confirmed published application SHA: `13146e010949a25343de997aff4e69d83c16287e`
- Canonical package lock: `bun.lock`

## Completed milestones

- PR #1: controlled prototype contact flow merged and published.
- PR #2: shared project memory, standing approval rules and backend ownership guardrails merged.
- PR #3: site-wide `noindex/nofollow` protection merged and published.
- PR #4: repository README heading renamed to `Arar Buluruz`.
- PR #5: current state and backlog synchronized.
- PR #6: submitted listing values are shown in an editable prototype preview; published at application SHA `7dd6434d…`.
- PR #7: home-page example searches and honest mock-proximity labels added; published at application SHA `13146e01…`.
- PR #8: source-level internal dry-run and five-person moderated user-test pack added.
- PR #9: pinned Bun CI and clean Prettier baseline added.
- PR #10: CI and executable-validation evidence synchronized into project memory.
- PR #11: cross-platform LF checkout policy added through `.gitattributes`.

## Current product behavior

### Search

- Search includes title, description and hidden keyword synonyms.
- Zero-result city filtering offers `Tüm Türkiye'de ara` recovery.
- Home page offers direct example searches: `traktör`, `kiralık daire`, `ikinci el masa`, `oto`.
- Mock distance ordering is labelled `Yakın (örnek)` and explicitly states that real location is not used.

### Listing detail and contact

- Controlled test number: `+905321739111`
- Call target: `tel:+905321739111`
- WhatsApp target: `https://wa.me/905321739111`
- `Listing.phone` and twelve old mock numbers are removed.
- The number is not printed in visible listing copy.

### Listing creation

- Title, price, city and description are preserved in frontend state.
- Submission shows the user's values in a listing-style preview card.
- `İlanı düzenle` returns to the populated form.
- No real record, upload, backend or storage is used.

## CI and executable validation

- GitHub Actions runs on pull requests targeting `main`, pushes to `main`, and manual dispatch.
- Workflow permissions are read-only: `contents: read`.
- `actions/checkout` and `oven-sh/setup-bun` are pinned to verified commit SHAs.
- Bun is pinned to `1.3.14`.
- Validation sequence:
  - `bun install --frozen-lockfile`
  - `bun run lint`
  - `bun run build`
- GitHub CI has passed frozen install, lint and production build on the pinned environment.
- Windows local validation also passed with Bun `1.3.14` after enforcing LF checkouts:
  - frozen install: passed
  - lint: passed with six non-blocking Fast Refresh warnings
  - production build: passed
  - five-route HTTP smoke test: passed
- `.gitattributes` enforces LF for text files across Windows, macOS and Linux; binary assets are excluded from line-ending conversion.

## Search-index protection

- Root metadata includes `robots` and `googlebot`: `noindex, nofollow, noarchive, nosnippet`.
- Server responses add `X-Robots-Tag` with the same directive.
- `robots.txt` remains crawlable so crawlers can read the noindex instruction.
- Local runtime smoke tests confirmed the expected `X-Robots-Tag` header on `/`, `/ara`, `/ilan/1`, `/ilan-ver` and `/giris`.
- Independent retrieval from the public Lovable endpoint remains open because available external checks could not reach the endpoint.

## Lovable

- Project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Public URL: `https://arar-buluruz.lovable.app`
- Database: Disabled
- Latest confirmed published application SHA: `13146e010949a25343de997aff4e69d83c16287e`
- Latest deployment ID: `1490c7c7-0875-4b33-a2e1-8a0519ca249a`
- Project metadata still reports display name `Find It Fast` and an old generated description. The connector exposes no direct rename operation.
- Five Lovable credits remain unspent. Variant isolation was unavailable, so credits were not risked on direct main-branch writing or metadata-only cleanup.

## Backend ownership position

- Lovable remains a frontend writer/hosting surface, not the backend owner.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- Future backend will use a separate founder-owned Supabase project.
- Founder controls the Supabase account, organization, billing and administrator access.
- Schema and every migration will be canonical in GitHub from day one.
- Before real data, Work review and founder approval are required for region, backups, export/restore, RLS, auth, KVKK/retention and provider exit planning.

## Local checkout

- Local repository: `C:\Projects\arar-buluruz`
- Local `main` and `origin/main` are synchronized at `4dc46a8bf2e2f470ce5320bed34ed855b17bdf6d`.
- Working tree is clean.
- Repository-local Git settings are `core.autocrlf=false` and `core.eol=lf`.
- The pre-sync backup branch and stash are still retained temporarily even though their functional changes are fully present in `main`.

## Current validation stage

- Source-level dry-run is complete.
- Local executable validation and route smoke tests are complete.
- The next evidence gate is five moderated tests on real mobile devices using `docs/MODERATED_USER_TEST_PLAN.md`.
- No additional speculative product feature should be added before those observations are collected.
- Lovable credits are reserved for a repeated, task-blocking or clearly evidenced mobile UX issue.

## Known gaps and risks

- Lovable project-panel metadata still uses `Find It Fast`; runtime and repository naming use `Arar Buluruz`.
- Independent public-endpoint retrieval of the `X-Robots-Tag` header remains open.
- Six non-blocking Fast Refresh warnings exist in shared shadcn UI files.
- `bun run preview` currently expects an incompatible output path for the Lovable/Nitro Cloudflare build; local smoke validation uses the dev server. Do not change the preview script without verifying the hosting adapter's supported command.
- The redundant local pre-sync backup branch and stash should be removed only after retaining the external patch files and one final identity check.

## Hard boundaries

- No backend, Supabase, auth, SMS, storage, secrets, real data, payments, ad network, paid service or recurring service without explicit founder approval and, where appropriate, Work review.
- Lovable backend capabilities must not be enabled as a convenience shortcut.
- GitHub `main` is the canonical code source; local copies are synchronized deliberately.
