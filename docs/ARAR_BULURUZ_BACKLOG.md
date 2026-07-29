# Arar Buluruz — Backlog

_Last updated: 2026-07-30, Europe/Istanbul_

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
- [x] Add read-only GitHub Actions CI for PRs, `main` pushes and manual runs.
- [x] Pin checkout, setup-bun and Bun `1.3.14` to verified versions.
- [x] Establish a clean Prettier baseline without weakening lint rules.
- [x] Prove `bun install --frozen-lockfile`, `bun run lint` and `bun run build` in a clean GitHub runner.
- [x] Reconcile the Windows local checkout with canonical GitHub `main`.
- [x] Add `.gitattributes` and enforce LF working-tree files across platforms.
- [x] Prove frozen install, lint, build and five-route HTTP smoke tests on the Windows local checkout.
- [x] Confirm the expected `X-Robots-Tag` header on local and public tested routes.
- [x] Verify and remove the redundant pre-sync backup branch and stash while retaining external recovery files.
- [x] Run the five technical user-flow scenarios at a `390 × 844` mobile viewport.
- [x] Fix multi-word search so `ikinci el masa` and reversed word order resolve correctly.
- [x] Fix the listing-detail fixed-footer overlap and prove `0 px` overlap at the tested viewport.
- [x] Re-run search, city-filter, listing-preview and complaint-flow regressions after the fixes.

## In progress

- [-] Conduct the first five moderated tests with real people on mobile devices.
- [-] Collect task success, pauses, wrong taps, direct quotes and issue severity using `docs/MODERATED_USER_TEST_PLAN.md`.
- [-] Confirm that the public Lovable deployment has advanced to include GitHub PR #14 before using it for moderated sessions.

## Next ordered work

1. [ ] Fast-forward the local `main` checkout to the latest GitHub `main` before the next Codex task.
2. [ ] Verify the public Lovable deployment contains the PR #14 search and fixed-footer corrections.
3. [ ] Complete all five moderated human sessions.
4. [ ] Calculate task success rates and repeated issue counts.
5. [ ] Select only one next product change using the documented decision rule.
6. [ ] Re-run the affected human task after any selected fix.

## Evidence-backed frontend/mobile work

Five Lovable credits remain unspent:

- [x] Listing-detail fixed-footer overlap was confirmed and fixed through GitHub code; no Lovable credit spent.
- [x] Search-results multi-word matching failure was confirmed and fixed through GitHub code; no Lovable credit spent.
- [ ] Listing-form mobile ergonomics if human tests confirm keyboard, field-order or primary-action problems.
- [ ] One credit reserved for a proven responsive regression.
- [ ] One credit reserved for the strongest repeated human-test problem.

Do not spend Lovable credits on noindex, naming-only cleanup, backend, auth, metadata-only edits or speculative polish. Do not let Lovable write directly to canonical `main` without a safely isolated reviewable branch/variant.

## Administrative metadata

- [ ] Rename Lovable project-panel `display_name` and generated description from `Find It Fast` to `Arar Buluruz` when a direct no-credit metadata operation is available or during an otherwise justified safe Lovable session.

## Product-readiness backlog

- [ ] Replace the mock-listing-derived city selector with a canonical Türkiye city list before any real listing pilot.
- [ ] Decide whether district selection is required for the first real-data pilot; do not expand location scope speculatively.

## Technical quality backlog

- [ ] Verify the supported production-preview command for the Lovable/Nitro Cloudflare adapter before changing the currently incompatible `bun run preview` path.
- [ ] Decide whether the six non-blocking shadcn Fast Refresh warnings justify a separate component-export cleanup; do not refactor them without value.
- [ ] Add targeted automated tests when real behavior begins to justify them; avoid broad test scaffolding for placeholder-only flows.

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
- Automated browser tests establish technical behavior but do not replace moderated human usability evidence.
- Codex is used for local terminal requirements, long debugging, large automated refactors or local-only test failures.
- Only one code writer operates at a time.
