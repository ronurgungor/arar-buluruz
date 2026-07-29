# Arar Buluruz — Current State

_Last updated: 2026-07-29, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- Latest application/runtime code SHA: `13146e010949a25343de997aff4e69d83c16287e`
- Canonical package lock: `bun.lock`

## Completed milestones

- PR #1: controlled prototype contact flow merged and published.
- PR #2: shared project memory, standing approval rules and backend ownership guardrails merged.
- PR #3: site-wide `noindex/nofollow` protection merged and published.
- PR #4: repository README heading renamed to `Arar Buluruz`.
- PR #5: current state and backlog synchronized.
- PR #6: submitted listing values are shown in an editable prototype preview; published at application SHA `7dd6434d…`.
- PR #7: home-page example searches and honest mock-proximity labels added; published at application SHA `13146e01…`.
- Source-level internal dry-run completed and recorded in `docs/INTERNAL_DRY_RUN_2026-07-29.md`.
- Five-person moderated test protocol prepared in `docs/MODERATED_USER_TEST_PLAN.md`.

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

## Search-index protection

- Root metadata includes `robots` and `googlebot`: `noindex, nofollow, noarchive, nosnippet`.
- Server responses add `X-Robots-Tag` with the same directive.
- `robots.txt` remains crawlable so crawlers can read the noindex instruction.
- Lovable reports the relevant application deployments as completed and published.
- Independent live retrieval of the response header remains open because available external network checks could not reach the endpoint.

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

## Current validation stage

- Source-level dry-run is complete.
- The next evidence gate is five moderated tests on real mobile devices.
- No additional speculative product feature should be added before those observations are collected.
- Lovable credits are reserved for a repeated, task-blocking or clearly evidenced mobile UX issue.

## Known gaps and risks

- No GitHub Actions/CI check currently runs for pull requests.
- `bun run lint` and `bun run build` remain unproven in a clean executable environment.
- The local checkout at `C:\Projects\arar-buluruz` is behind canonical GitHub `main` and contains old uncommitted contact-flow changes. Do not start local/Codex work until it is safely reconciled.
- Lovable project-panel metadata still uses `Find It Fast`; runtime and repository naming use `Arar Buluruz`.
- Independent live retrieval of the `X-Robots-Tag` header remains open.

## Hard boundaries

- No backend, Supabase, auth, SMS, storage, secrets, real data, payments, ad network, paid service or recurring service without explicit founder approval and, where appropriate, Work review.
- Lovable backend capabilities must not be enabled as a convenience shortcut.
- GitHub `main` is the canonical code source; local copies are synchronized deliberately.
