# Arar Buluruz — Backlog

_Last updated: 2026-07-29, Europe/Istanbul_

Legend: `[x]` completed, `[-]` in progress, `[ ]` pending.

## Completed

- [x] Create the initial frontend-only classified-listing prototype.
- [x] Keep Lovable database disabled.
- [x] Create `fix/test-contact-flow` from the verified `main` baseline.
- [x] Add one central prototype contact configuration.
- [x] Remove `Listing.phone` and twelve old mock phone numbers.
- [x] Route all mock listing call/WhatsApp actions to the approved controlled test line.
- [x] Remove the blocking contact notice/state.
- [x] Merge PR #1 into `main` at `2341c6a5eab34b3418580a93259858a030d4d128`.
- [x] Request a Lovable production deployment for the merged contact flow.

## In progress

- [-] Add the three-file shared project memory pool on `docs/project-memory`:
  - `AGENTS.md`
  - `docs/ARAR_BULURUZ_CURRENT_STATE.md`
  - `docs/ARAR_BULURUZ_BACKLOG.md`
- [-] Verify that deployment `09ee92e0-49ec-4f44-b641-28ee52d6ee6c` is live on `https://arar-buluruz.lovable.app`.

## Next ordered work

1. [ ] Review and merge the shared project memory PR with separate founder approval.
2. [ ] Add site-wide `noindex/nofollow` in a separate feature branch.
3. [ ] Clean all remaining `Find It Fast` naming to `Arar Buluruz` in a separate feature branch.
4. [ ] Run an internal end-to-end dry run of the main user flows.
5. [ ] Conduct the first five moderated user tests.
6. [ ] Identify and fix the strongest repeatedly observed user problem.

## Lovable UX work allocation

Use Lovable credits only for bounded, high-value frontend/mobile UX work. Planned candidates:

- [ ] Listing-detail mobile ergonomics: fixed contact area, safe-area behavior, content overlap and tap targets.
- [ ] Search-results mobile usability: card density, title/price overflow, image ratio, filters and touch areas.
- [ ] Listing-form mobile ergonomics: field order, keyboard behavior, image area and primary action accessibility.
- [ ] Reserve one credit for a proven responsive regression.
- [ ] Reserve one credit for the strongest issue found during the internal dry run or moderated tests.

Do not spend Lovable credits on noindex, naming-only cleanup, backend, auth or speculative visual polish.

## Technical quality backlog

- [ ] Establish a repeatable lint/build validation path using `bun run lint` and `bun run build` without creating a second lockfile.
- [ ] Decide whether to add a minimal GitHub Actions CI workflow after the package/tooling baseline is verified.
- [ ] Reconcile the local checkout safely with canonical GitHub `main` before any future local/Codex work.
- [ ] Add targeted automated tests when real behavior begins to justify them; avoid test scaffolding for placeholder-only flows.

## Deferred until explicit founder approval

- [ ] Founder-controlled Supabase backend with migrations tracked in GitHub from day one.
- [ ] Authentication or SMS.
- [ ] Real user or seller data.
- [ ] Secrets or environment changes.
- [ ] Payments.
- [ ] Advertising network integration.
- [ ] Paid or recurring services.

## Decision rules

- Main merge and public publish are separate gates.
- Work is used for architecture, backend, security, KVKK, real-data stages, public-pilot readiness and other expensive-to-reverse decisions.
- Codex is used for local terminal requirements, long debugging, large automated refactors or local-only test failures.
- Only one code writer operates at a time.