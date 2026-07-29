# Arar Buluruz — Backlog

_Last updated: 2026-07-29, Europe/Istanbul_

Legend: `[x]` completed, `[-]` in progress, `[ ]` pending.

## Completed

- [x] Create the initial frontend-only classified-listing prototype.
- [x] Keep Lovable database disabled.
- [x] Add and publish the controlled test contact flow.
- [x] Add the shared project memory pool.
- [x] Preserve Lovable's Git-history warning while adding project rules.
- [x] Define standing approval for low-risk, reversible backlog work.
- [x] Define founder-owned backend guardrails and provider-exit requirements.
- [x] Add and publish site-wide `noindex/nofollow` metadata and `X-Robots-Tag` protection.
- [x] Rename the repository README heading to `Arar Buluruz`.
- [x] Show submitted listing values in an editable frontend preview card.
- [x] Add direct example searches to the home page.
- [x] Mark proximity sorting as mock data rather than real geolocation.
- [x] Complete and document the source-level internal dry-run.
- [x] Prepare the five-person moderated user-test protocol.

## In progress

- [-] Conduct the first five moderated tests on real mobile devices.
- [-] Collect task success, pauses, wrong taps, direct quotes and issue severity using `docs/MODERATED_USER_TEST_PLAN.md`.

## Next ordered work

1. [ ] Complete all five moderated sessions.
2. [ ] Calculate task success rates and repeated issue counts.
3. [ ] Select only one next product change using the documented decision rule.
4. [ ] Use Lovable for the selected mobile UX issue only when safe branch/variant isolation is available.
5. [ ] Re-run the affected user task after the fix.

## Lovable UX credit allocation

Five credits remain unspent and reserved for evidence-backed frontend/mobile UX work:

- [ ] Listing-detail mobile ergonomics if tests confirm fixed-footer overlap, safe-area or tap-target problems.
- [ ] Search-results mobile usability if tests confirm density, overflow or filter problems.
- [ ] Listing-form mobile ergonomics if tests confirm keyboard, field-order or primary-action problems.
- [ ] One credit reserved for a proven responsive regression.
- [ ] One credit reserved for the strongest repeated problem from moderated tests.

Do not spend Lovable credits on noindex, naming-only cleanup, backend, auth, metadata-only edits or speculative polish. Do not let Lovable write directly to canonical `main` without a safely isolated reviewable branch/variant.

## Administrative metadata

- [ ] Rename Lovable project-panel `display_name` and generated description from `Find It Fast` to `Arar Buluruz` when a direct no-credit metadata operation is available or during an otherwise justified safe Lovable session.

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
