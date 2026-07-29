# Arar Buluruz — Current State

_Last updated: 2026-07-29, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- Current `main` SHA: `2341c6a5eab34b3418580a93259858a030d4d128`
- Canonical package lock: `bun.lock`

## Latest completed milestone

PR #1, **Route prototype contacts to controlled test line**, merged into `main`.

Implemented:

- One central `PROTOTYPE_CONTACT` configuration
- Controlled test number: `+905321739111`
- Call target: `tel:+905321739111`
- WhatsApp target: `https://wa.me/905321739111`
- `Listing.phone` removed
- Twelve old mock phone numbers removed
- Blocking prototype contact notice/state removed
- Short non-blocking test explanation added to listing detail
- Number is not printed in visible listing copy

## Lovable

- Project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Public URL: `https://arar-buluruz.lovable.app`
- Database: Disabled
- Production deployment ID: `09ee92e0-49ec-4f44-b641-28ee52d6ee6c`
- Publish status: Completed
- Published: Yes, public visibility
- Lovable project metadata and latest screenshot reference the `2341c6a5…` main version.
- Visible project display name still reports `Find It Fast`; cleanup remains a separate task.

## Current product state

The app is a frontend-only, mobile-first classified-listing prototype with mock data. Current core flows include:

- Search and listing results
- Listing detail
- Controlled prototype call and WhatsApp actions
- Complaint flow
- Listing creation placeholder flow
- Profile/login placeholder flow
- Advertising placeholders only

## Active work

- Branch: `docs/project-memory`
- Task: Add the shared project memory files
- Files:
  - `AGENTS.md`
  - `docs/ARAR_BULURUZ_CURRENT_STATE.md`
  - `docs/ARAR_BULURUZ_BACKLOG.md`
- Next gate: Review and separate merge approval

## Known gaps and risks

- The repository currently has no GitHub Actions/CI check running for pull requests.
- `bun run lint` and `bun run build` were not executed for PR #1 because the earlier local environment lacked Bun and dependencies.
- PR #1 passed remote diff and static source review, but executable validation remains unproven.
- The local checkout at `C:\Projects\arar-buluruz` is behind the new `main` and contains the same contact-flow changes as uncommitted local changes. Do not begin new local work until it is safely reconciled.
- Some visible naming still says `Find It Fast`; cleanup is a separate task.
- Site-wide `noindex/nofollow` is not yet implemented.

## Hard boundaries

- No backend, Supabase, auth, SMS, secrets, real data, payments, ad network, paid service or recurring service without explicit founder approval.
- Merge and public publish remain separate approval gates.
- GitHub `main` is the canonical code source; local copies are synchronized deliberately.