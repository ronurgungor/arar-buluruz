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
- [x] Confirm the public Lovable project synchronized to the current validated GitHub SHA.
- [x] Keep the search input synchronized with URL/history changes.
- [x] Add a `Sonuçlara dön` control to listing detail.
- [x] Replace inert photo-upload buttons with honest non-interactive prototype placeholders.
- [x] Separate advertising placeholders from organic listing list items.
- [x] Require a minimum telephone value before the prototype login response.
- [x] Replace the mock-derived city selector with `Tüm Türkiye` plus all 81 provinces.
- [x] Use all five remaining Lovable credits on bounded frontend work and validation.
- [x] Restore generated `src/routeTree.gen.ts` drift and prove the final local working tree clean at `2660990f…`.

## In progress

- [-] Conduct the first five moderated tests with real people on mobile devices.
- [-] Collect task success, pauses, wrong taps, direct quotes and issue severity using `docs/MODERATED_USER_TEST_PLAN.md`.

## Next ordered work

1. [ ] Complete all five moderated human sessions.
2. [ ] Calculate task success rates and repeated issue counts.
3. [ ] Select only one next product change using the documented decision rule.
4. [ ] Implement that one change through a reviewable GitHub branch/PR.
5. [ ] Re-run the affected human task after the selected fix.
6. [ ] Decide whether the prototype has enough evidence to begin public-pilot readiness planning.

## Lovable credit record

All five credits were consumed under explicit founder instruction because the balance was expiring:

- [x] `2.0` credits: mobile flow audit and five bounded frontend corrections.
- [x] `2.1` credits: complete Türkiye province list.
- [x] `0.9` credits: Prettier correction plus final lint/build run.
- Remaining credits: `0`

Variants were unavailable, so Lovable wrote directly to `main`. The resulting diff was reviewed, the generated route-tree drift was reverted, and the final local lint/build and clean-working-tree checks passed. Future Lovable code work should use a reviewable branch/variant when available.

## Administrative metadata

- [ ] Rename Lovable project-panel `display_name` and generated description from `Find It Fast` to `Arar Buluruz` when a direct no-credit metadata operation is available.

## Product-readiness backlog

- [x] Replace the mock-listing-derived city selector with a canonical Türkiye city list before any real listing pilot.
- [ ] Decide whether district selection is required for the first real-data pilot; do not expand location scope speculatively.
- [ ] Define the minimum public-pilot readiness checklist only after moderated-test evidence is reviewed.

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
