# Arar Buluruz — Current State

_Last updated: 2026-07-29, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- Latest application/runtime code SHA: `c563ab50cfa20689284d62c96c997b79501b7562`
- Latest repository milestone before this status sync: `ede5d90fff3e6c14addc9c9a0cd206ccab410534`
- Canonical package lock: `bun.lock`

## Completed milestones

- PR #1: controlled prototype contact flow merged and published.
- PR #2: shared project memory, standing approval rules and backend ownership guardrails merged.
- PR #3: site-wide `noindex/nofollow` protection merged and published.
- PR #4: repository README heading renamed from `Find It Fast` to `Arar Buluruz`.

## Current contact behavior

- Central `PROTOTYPE_CONTACT` configuration
- Controlled test number: `+905321739111`
- Call target: `tel:+905321739111`
- WhatsApp target: `https://wa.me/905321739111`
- `Listing.phone` and twelve old mock numbers removed
- Number is not printed in visible listing copy

## Search-index protection

- Root HTML metadata includes `robots` and `googlebot` directives:
  - `noindex, nofollow, noarchive, nosnippet`
- Server responses add:
  - `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- `robots.txt` remains crawlable so crawlers can read the noindex directive.
- Lovable reports deployment of application SHA `c563ab50…` as completed and published.
- Direct external fetch of the live header was unavailable from the available network environments; source and deployment linkage are verified, but independent runtime header retrieval remains open.

## Lovable

- Project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Public URL: `https://arar-buluruz.lovable.app`
- Database: Disabled
- Latest production deployment ID: `79c79651-4e08-4ba6-b6d4-aaa33f0fb151`
- Publish status: Completed
- Published: Yes, public visibility
- Project metadata still reports display name `Find It Fast` and an old generated description. The connector exposes no direct rename operation; no Lovable credit was spent on metadata-only cleanup.

## Backend ownership position

- Lovable remains a frontend writer/hosting surface, not the backend owner.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- Future backend will use a separate founder-owned Supabase project.
- Founder controls the Supabase account, organization, billing and administrator access.
- Database schema and migrations will be canonical in GitHub from day one.
- Before real data, Work review and founder approval are required for region, backups, export/restore, RLS, auth, KVKK/retention and provider exit planning.

## Current product state

The app is a frontend-only, mobile-first classified-listing prototype with mock data. Current core flows include:

- Search and listing results
- Listing detail
- Controlled prototype call and WhatsApp actions
- Complaint flow
- Listing creation placeholder flow
- Profile/login placeholder flow
- Advertising placeholders only

## Next planned work

- Run an internal end-to-end dry run of the main user flows.
- Use Lovable credits only for bounded UX work supported by observed problems.
- Prepare the first five moderated user tests.

## Known gaps and risks

- No GitHub Actions/CI check currently runs for pull requests.
- `bun run lint` and `bun run build` remain unproven in a clean executable environment.
- The local checkout at `C:\Projects\arar-buluruz` is behind canonical GitHub `main` and contains old uncommitted contact-flow changes. Do not start local/Codex work until it is safely reconciled.
- Lovable project-panel metadata still uses `Find It Fast`; runtime and repository naming use `Arar Buluruz`.
- Independent live retrieval of the `X-Robots-Tag` header remains to be completed when network access permits.

## Hard boundaries

- No backend, Supabase, auth, SMS, storage, secrets, real data, payments, ad network, paid service or recurring service without explicit founder approval and, where appropriate, Work review.
- Lovable backend capabilities must not be enabled as a convenience shortcut.
- GitHub `main` is the canonical code source; local copies are synchronized deliberately.
