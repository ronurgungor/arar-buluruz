# Arar Buluruz — Current State

_Last updated: 2026-07-30, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- Current GitHub `main` milestone SHA: `25f014f6106d433507f96b409ba2456f8af191c2`
- Last locally validated PR branch SHA: `d8538631803faa289befa02694b3bb0806ce0174`
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
- PR #12: successful Windows synchronization and local executable-validation evidence recorded.
- PR #13: redundant pre-sync branch/stash cleanup recorded after external recovery verification.
- PR #14: automated mobile E2E findings fixed; multi-word search and fixed-footer overlap corrections merged after local regression validation.

## Current product behavior

### Search

- Search includes title, description and hidden keyword synonyms.
- Multi-word searches are tokenized; every token must appear somewhere in the combined searchable text.
- `ikinci el masa` and `masa ikinci el` both resolve to the matching office-desk listing.
- Zero-result city filtering offers `Tüm Türkiye'de ara` recovery.
- Home page offers direct example searches: `traktör`, `kiralık daire`, `ikinci el masa`, `oto`.
- Mock distance ordering is labelled `Yakın (örnek)` and explicitly states that real location is not used.

### Listing detail and contact

- Controlled test number: `+905321739111`
- Call target: `tel:+905321739111`
- WhatsApp target: `https://wa.me/905321739111`
- `Listing.phone` and twelve old mock numbers are removed.
- The number is not printed in visible listing copy.
- At a `390 × 844` viewport, the fixed contact bar leaves the `Şikâyet Et` link fully visible with `0 px` overlap.

### Listing creation

- Title, price, city and description are preserved in frontend state.
- Submission shows the user's values in a listing-style preview card.
- `İlanı düzenle` returns to the populated form.
- No real record, upload, backend or storage is used.
- The current prototype city selector is intentionally limited to mock-listing cities; a canonical full-city list remains a pre-pilot requirement.

## CI and executable validation

- GitHub Actions runs on pull requests targeting `main`, pushes to `main`, and manual dispatch.
- Workflow permissions are read-only: `contents: read`.
- `actions/checkout` and `oven-sh/setup-bun` are pinned to verified commit SHAs.
- Bun is pinned to `1.3.14`.
- Validation sequence:
  - `bun install --frozen-lockfile`
  - `bun run lint`
  - `bun run build`
- PR #14 CI run `30489176018` passed frozen install, lint and production build.
- Codex independently validated PR #14 at `390 × 844`:
  - multi-word search: passed
  - reversed word order: passed
  - fixed-footer overlap: `0 px`
  - city-filter recovery: passed
  - listing-preview persistence: passed
  - complaint flow: passed
  - console errors, page errors, 404/500 responses and horizontal overflow: none
- Six existing Fast Refresh warnings remain non-blocking.
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
- Latest confirmed published application SHA: `13146e010949a25343de997aff4e69d83c16287e`
- Latest deployment ID: `1490c7c7-0875-4b33-a2e1-8a0519ca249a`
- Project metadata still reports display name `Find It Fast` and an old generated description. The connector exposes no direct rename operation.
- Five Lovable credits remain unspent.

## Backend ownership position

- Lovable remains a frontend writer/hosting surface, not the backend owner.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- Future backend will use a separate founder-owned Supabase project.
- Founder controls the Supabase account, organization, billing and administrator access.
- Schema and every migration will be canonical in GitHub from day one.
- Before real data, Work review and founder approval are required for region, backups, export/restore, RLS, auth, KVKK/retention and provider exit planning.

## Local checkout

- Local repository: `C:\Projects\arar-buluruz`
- Before PR #14 merged, local `main` and `origin/main` were clean and equal at `8b68a389e46380f824740bf3b4fa01184cc17236`.
- The PR #14 branch was locally validated clean at `d8538631803faa289befa02694b3bb0806ce0174`.
- Local `main` must be fast-forwarded to GitHub `main` `25f014f6106d433507f96b409ba2456f8af191c2` before the next local task.
- Repository-local Git settings are `core.autocrlf=false` and `core.eol=lf`.
- External recovery records remain outside the repository.

## Current validation stage

- Source-level dry-run is complete.
- Local executable validation, route smoke tests and automated mobile E2E validation are complete.
- The next evidence gate remains five moderated tests with real people on mobile devices using `docs/MODERATED_USER_TEST_PLAN.md`.
- Automated browser runs do not replace human usability evidence.
- No additional speculative product feature should be added before those observations are collected.

## Known gaps and risks

- Lovable project-panel metadata still uses `Find It Fast`; runtime and repository naming use `Arar Buluruz`.
- Six non-blocking Fast Refresh warnings exist in shared shadcn UI files.
- `bun run preview` currently expects an incompatible output path for the Lovable/Nitro Cloudflare build; local smoke validation uses the dev server. Do not change the preview script without verifying the hosting adapter's supported command.
- The current city selector is mock-data-driven and does not yet contain a canonical full Türkiye city list.
- The public Lovable deployment is not yet confirmed to include PR #14; publishing status must be verified separately before treating the public URL as updated.

## Hard boundaries

- No backend, Supabase, auth, SMS, storage, secrets, real data, payments, ad network, paid service or recurring service without explicit founder approval and, where appropriate, Work review.
- Lovable backend capabilities must not be enabled as a convenience shortcut.
- GitHub `main` is the canonical code source; local copies are synchronized deliberately.
