# Arar Buluruz — Sohbet 4 operasyonel devir ve V0 Quality Completion Program

> **Superseded/current state — 2026-08-09:** This is a dated operational handoff and remains historically accurate for 2026-08-01. The V0 Quality Completion Program described below is complete. PR #52 was later merged and publicly published; its public smoke test passed, users found the application understandable, and initial real seller/supply intent was observed. PR #53 was later merged as `9376ba60dfc049a4df27ce25255fa5923b2a154e`, adding **inactive** real-Çorlu-pilot backend/security preparation while the deployed public V0 remains mock/zero-data with no real backend, personal data, Storage, Auth or external-sales CTA. Current gate/order lives in `ARAR_BULURUZ_CURRENT_STATE.md` and `ARAR_BULURUZ_BACKLOG.md`. Paid infrastructure is deferred under the separate FOUNDER BUDGET / REVENUE gate. The next activity after documentation sync is independent Claude review; review findings are advisory only.

_Date: 2026-08-01, Europe/Istanbul_

## Purpose

This record reconciles the accepted V0 hardening/publication history with the operational transfer to Sohbet 4 and establishes the bounded **V0 Quality Completion Program** as the active routine implementation program.

GitHub `main` remains canonical. The exact SHA must be read at the start of every task; when copied instructions and the repository disagree, the repository wins.

## Canonical identities at reconciliation

- Repository: `ronurgungor/arar-buluruz`
- Transfer-instruction baseline: `991f7533967ac964bfe01fcb55627ee4d65a6681`
- Exact canonical `main` observed for this reconciliation: `1ba1e6dfdfc7908e16497f6aeca3880c718fcfcb`
- Accepted public runtime application source: `f33856d7417e449ad3e9bfec1f501eb61989de45`
- Public URL: `https://arar-buluruz.lovable.app`
- Accepted runtime signature: `public-v0|listings=mock|gate1=off`

At transfer baseline `991f7533967ac964bfe01fcb55627ee4d65a6681`, the difference from public runtime source `f33856d7417e449ad3e9bfec1f501eb61989de45` was documentation-only: PR #45 added the publication evidence record without changing application code.

The repository subsequently advanced through Workstream B. Current `main` `1ba1e6dfdfc7908e16497f6aeca3880c718fcfcb` therefore contains the PR #45 documentation-only record plus the unpublished PR #46 search/URL application changes. It must not be described as identical to the currently published runtime.

## Recorded hardening and publication sequence

- PR #43, **Harden public V0 phase and privacy boundaries**, merged as `55692d651ade414185ce70b077bc1e0670e20a67`. It added fail-closed public V0 build invariants, same-origin privacy validation and public error-forwarding no-op behavior while preserving the frozen backend/data/dependency boundary.
- PR #44, **Align bare Lovable build with public V0**, merged as `f33856d7417e449ad3e9bfec1f501eb61989de45`. It made bare `bun run build` the canonical public V0 release path and required the exact signature `public-v0|listings=mock|gate1=off`.
- PR #45, **Record accepted V0 hardening publication**, merged as `991f7533967ac964bfe01fcb55627ee4d65a6681`. It recorded founder-approved deployment `9b7c3685-7611-40a4-9486-ccf6c0b7b454` as documentation only.
- PR #46, **Improve Turkish search and canonicalize location URLs**, merged as `1ba1e6dfdfc7908e16497f6aeca3880c718fcfcb`. It completed Workstream B but has not been published.

## Routine ownership reconciliation

D-018's phrase “main assistant remains the default routine executor” describes the operational role rather than a second concurrent writer. Under this transfer, Sohbet 4 is the single active routine coordinator and executor for the approved program:

- one active routine coordinator;
- one active code writer;
- canonical backlog manager;
- application and CI quality owner;
- release-candidate preparer.

The single-writer rule remains mandatory. No parallel assistant or Lovable agent may mutate the repository during this program.

## V0 Quality Completion Program

### Workstream B — Search and URL correctness

Status: **completed and merged, not published**.

PR #46 added shared Turkish-character-tolerant normalization, controlled word-prefix matching, canonical city/district URL clamping, unit regressions and production-mode browser evidence. Its merge advanced `main` to `1ba1e6dfdfc7908e16497f6aeca3880c718fcfcb`.

### Workstream C — Narrow UX and mobile coverage completion

Status: **active routine implementation program**.

The approved scope is limited to:

- synthetic public V0 mobile core-flow coverage;
- safe listing-detail return behavior;
- Turkish static SSR 500 output;
- hiding the public V0 advertisement placeholder without adding advertising;
- correcting automated installability evidence language to `Chromium manifest/service-worker readiness`;
- preserving privacy, PWA, offline, Gate 1 and frozen-package regression coverage.

No additional founder approval is required between Workstream B and Workstream C. Sohbet 4 proceeds automatically through implementation, CI repair within scope, PR and normal merge commit when all required checks are green.

## Publication gate

No Lovable Publish/Update occurs while either workstream is incomplete. PR B and PR C do not receive separate publication requests.

After Workstream C is merged and the full evidence set is green, one combined release-readiness package must:

1. verify exact GitHub `main`;
2. summarize the exact application diff from public runtime source `f33856d7417e449ad3e9bfec1f501eb61989de45`;
3. confirm the runtime signature and all mandatory CI/browser/privacy/PWA/Gate 1 controls;
4. record a narrow documentation-only release-readiness update;
5. request one explicit founder Publish/Update decision.

Publish/Update, Unpublish, rollback and any Lovable agent or environment mutation remain outside routine autonomy.

## Closed boundaries

The program does not open or add:

- backend or remote Supabase activation;
- remote migrations;
- auth, Storage, Realtime or Edge Functions;
- secrets or credentials;
- real listings or personal data;
- analytics or advertising integration;
- paid or recurring infrastructure;
- TWA, Android or Play Store work;
- dependency or lockfile-boundary changes;
- force-push, rebase, history rewrite or destructive Git operations.

Bun `1.3.14`, canonical `bun.lock`, zero-cost execution, KISS, no-rebuild, fail-closed behavior and normal merge commits remain mandatory.
