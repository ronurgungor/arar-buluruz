# Arar Buluruz — Backlog

_Last updated: 2026-07-29, Europe/Istanbul_

Legend: `[x]` completed, `[-]` in progress, `[ ]` pending.

## Completed

- [x] Create the initial frontend-only classified-listing prototype.
- [x] Keep Lovable database disabled.
- [x] Add the controlled test contact flow and remove old mock phone numbers.
- [x] Merge and publish the controlled contact flow.
- [x] Add the three-file shared project memory pool.
- [x] Preserve Lovable's Git-history warning while adding project rules.
- [x] Define standing approval for low-risk, reversible backlog work.
- [x] Define founder-owned backend guardrails and provider-exit requirements.
- [x] Add site-wide `robots`/`googlebot` noindex metadata.
- [x] Add site-wide `X-Robots-Tag` response protection.
- [x] Publish the noindex-protected application SHA `c563ab50…`.
- [x] Rename the repository README heading to `Arar Buluruz`.

## In progress

- [-] Run an internal end-to-end dry run of the main user flows.
- [-] Identify the highest-value UX work for today's Lovable credits using observed evidence rather than speculative polish.

## Next ordered work

1. [ ] Complete the internal dry run and record concrete failures/friction.
2. [ ] Use Lovable for listing-detail mobile ergonomics if the dry run confirms overlap, safe-area or tap-target issues.
3. [ ] Use Lovable for search-results mobile usability if the dry run confirms density, overflow or filter issues.
4. [ ] Use Lovable for listing-form mobile ergonomics if the dry run confirms keyboard, field-order or primary-action issues.
5. [ ] Conduct the first five moderated user tests.
6. [ ] Fix the strongest repeatedly observed user problem.

## Lovable UX work allocation

Use Lovable credits only for bounded, high-value frontend/mobile UX work:

- [ ] Listing-detail mobile ergonomics: fixed contact area, safe-area behavior, content overlap and tap targets.
- [ ] Search-results mobile usability: card density, title/price overflow, image ratio, filters and touch areas.
- [ ] Listing-form mobile ergonomics: field order, keyboard behavior, image area and primary action accessibility.
- [ ] Reserve one credit for a proven responsive regression.
- [ ] Reserve one credit for the strongest issue found during the internal dry run or moderated tests.

Do not spend Lovable credits on noindex, naming-only cleanup, backend, auth or speculative visual polish.

## Administrative metadata

- [ ] Rename Lovable project-panel `display_name` and generated description from `Find It Fast` to `Arar Buluruz` when a direct no-credit metadata operation is available or during a justified Lovable session.

## Technical quality backlog

- [ ] Independently retrieve the live `X-Robots-Tag` header when network access permits.
- [ ] Establish a repeatable lint/build validation path using `bun run lint` and `bun run build` without creating a second lockfile.
- [ ] Decide whether to add a minimal GitHub Actions CI workflow after the package/tooling baseline is verified.
- [ ] Reconcile the local checkout safely with canonical GitHub `main` before future local/Codex work.
- [ ] Add targeted automated tests when real behavior begins to justify them; avoid test scaffolding for placeholder-only flows.

## Backend readiness gate — deferred

Before any backend is enabled:

- [ ] Obtain Work's independent architecture/security/KVKK review.
- [ ] Create a founder-owned Supabase organization/project; do not enable Lovable database.
- [ ] Decide region and document data residency implications.
- [ ] Define RLS, auth boundaries and service-role handling.
- [ ] Define backup, export/restore and tested provider-exit procedures.
- [ ] Store schema and every migration in GitHub from day one.
- [ ] Define secret/environment ownership outside Lovable.
- [ ] Obtain explicit founder approval before connecting real data.

## Deferred until explicit founder approval

- [ ] Authentication or SMS.
- [ ] Real user or seller data.
- [ ] Secrets or environment changes.
- [ ] Payments.
- [ ] Advertising network integration.
- [ ] Paid or recurring services.

## Decision rules

- Low-risk, reversible tasks already listed in this backlog may be completed under the founder's standing approval.
- Stop for founder/Work input when a task affects backend ownership, security, KVKK, real data, public-pilot readiness, cost commitments or other expensive-to-reverse choices.
- Codex is used for local terminal requirements, long debugging, large automated refactors or local-only test failures.
- Only one code writer operates at a time.
