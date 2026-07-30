# Arar Buluruz — Work and Codex Capability Profiles

_Last reviewed: 2026-07-30, Europe/Istanbul_

## Purpose

This document gives every new project chat a practical understanding of the two specialist environments used by Arar Buluruz. It distinguishes:

- **nominal capability:** what the environment says it can do;
- **project-observed capability:** what has already been demonstrated in Arar Buluruz;
- **session availability:** which connectors, credentials, runtimes and permissions are actually available in the current session;
- **project authority:** which actions the founder has authorized for the current task.

A restricted reasoning-depth setting may reduce the depth or quality of an analysis, but it does not mean the environment cannot accurately describe its own available tools and nominal capabilities. Conversely, a nominal capability does not by itself authorize a repository, backend, production or real-data mutation.

## Work / Work Mode

### Primary role

Work is an independent analysis, decision-review and risk-review environment. It is most useful when a consequential choice benefits from a separate perspective rather than immediate implementation.

Typical subjects:

- product and pilot scope;
- architecture and backend ownership;
- security, authentication, authorization and RLS boundaries;
- KVKK, data minimization, retention and data residency;
- moderation, abuse and operating burden;
- provider lock-in, paid services and expensive-to-reverse commitments;
- challenging an existing proposal and reducing it to founder decision gates.

### Capability inventory reported by the first Work session

The first Work response was produced at restricted reasoning depth. Its strategic recommendations were advisory candidate analysis, but its own tool/capability inventory is accepted as a useful profile of that session.

Reported capabilities:

- access to private GitHub repositories explicitly authorized through the connected GitHub integration;
- direct read access to `ronurgungor/arar-buluruz`;
- reading branches, commits, pull requests, issues, workflow/CI information and file contents;
- repository file and symbol search, with the caution that connector code search may be incomplete or unreliable;
- diff and architecture inspection;
- GitHub mutation capabilities such as branch, file, commit, pull request, issue, comment and merge operations when permissions and explicit project authorization allow them;
- a local shell environment for commands and file/script work;
- interactive cloud-browser access to the live application;
- screenshots and browser-console inspection;
- partial network inspection, but not necessarily a full HAR/DevTools network workflow;
- partial responsive inspection, with deterministic mobile viewport work better handled by Playwright or a suitable local browser environment;
- current web research;
- Lovable read access;
- availability of Supabase-related tools, while no Arar Buluruz Supabase project or mutation permission was established;
- product, architecture, security and KVKK analysis.

### Limits observed in that Work session

- The shell did not receive credentials needed to clone the private repository.
- The working directory was not a repository checkout.
- Bun and `gh` were unavailable, so local lint/build/test execution was not possible.
- GitHub write capabilities were not exercised.
- Network and responsive-browser inspection were less complete than a local Playwright/DevTools workflow.
- The session was restricted-depth. Its pilot recommendation was not automatically adopted; the founder later selected a reduced founder-operated persistence pilot through independent synthesis and recorded it separately in the decision log.

### Required Work output

For consequential reviews, Work should report:

1. reasoning depth and connected tools;
2. repository branch/SHA and sources read;
3. verified facts separately from assumptions and recommendations;
4. alternatives and comparison criteria;
5. one bounded recommendation;
6. risks and unresolved questions;
7. deliberately deferred work;
8. no more than five founder decisions;
9. recommended owner of the next action.

## Codex

### Primary role

Codex is the execution-focused engineering specialist. It is used when correct work depends on repository inspection combined with terminal execution, testing, debugging, browser automation or precise implementation.

Typical subjects:

- local repository and Git state inspection;
- branch, commit, diff and generated-file analysis;
- shell commands and scripts;
- Bun installation/validation workflows;
- lint, build and targeted tests;
- runtime reproduction and debugging;
- browser/E2E and responsive-layout checks;
- logs, stack traces, console and network evidence;
- narrow code fixes, refactors and migration candidates;
- rollback and recovery packages.

### Project-observed Codex capabilities

Codex has already demonstrated in Arar Buluruz:

- local repository inspection;
- Git branch/SHA/diff and working-tree analysis;
- Bun `1.3.14` execution;
- `bun install --frozen-lockfile` compatible validation workflows;
- `bun run lint` and `bun run build`;
- browser/mobile E2E at `390 × 844`;
- reproduction of the multi-word search failure;
- reproduction of the fixed-footer overlap defect;
- scoped debugging and code correction;
- generated-file drift detection and cleanup evidence;
- precise handoff evidence later recorded in GitHub.

### Session-dependent Codex capabilities

The following must be checked for each Codex session because they depend on environment, credentials and prompt authority:

- internet/network access;
- private GitHub authentication;
- commit, push and pull-request creation;
- GitHub Actions log access;
- deployment and hosting access;
- secrets and environment variables;
- Supabase or other external-service access;
- backend and real-data mutation authority.

### Required Codex output

Every substantial Codex task should report:

1. repository, starting branch and starting SHA;
2. exact scope and assumptions;
3. files inspected and changed;
4. commands/tests executed;
5. pass/fail results and warnings;
6. remaining risks and skipped checks;
7. rollback/restore procedure;
8. final branch, SHA and working-tree status;
9. whether anything was committed, pushed, opened as a PR or deployed.

## Relationship to the main assistant

- The main assistant is the default executor when its connected tools are sufficient.
- Work and Codex are specialists, not mandatory command layers.
- Work is normally selected for consequential independent analysis.
- Codex is normally selected for terminal/test/debugging capabilities unavailable or inefficient in the main assistant's current environment.
- A specialist response is evidence and advice, not an automatic project decision.
- Only one code writer operates at a time.
- Founder approval remains mandatory for backend, real data, auth, storage, secrets, payments, paid services, public pilot and other consequential commitments.

## Update rule

Update this profile when a new Work or Codex session demonstrates a materially different capability or limitation. Preserve the distinction between nominal capability, observed capability, current-session availability and project authorization.
