# Arar Buluruz — AI and Team Capability Registry

_Last verified: 2026-07-30, Europe/Istanbul_

## Purpose

This file records capabilities that have been **actually observed or explicitly verified** in this project. Product names, role labels and self-descriptions are not proof of access.

Capabilities may vary by chat, account, connector state, subscription, permissions and time. Re-verify before consequential work.

Status legend:

- **Verified:** demonstrated in this project with current or recent evidence
- **Partially verified:** some access demonstrated; important limits remain unknown
- **Unverified:** assumed role only; do not route consequential work solely on this assumption
- **Unavailable:** known not to be accessible in the relevant environment

## Capability matrix

| Team member / tool | Verification status | Proven read capabilities | Proven write/execute capabilities | Known limits and cautions | Best current use |
|---|---|---|---|---|---|
| **Founder** | Verified | Reviews product behavior, GitHub state, terminal output and decisions | Gives approval; runs local PowerShell commands; performs human smoke checks | Not expected to absorb repetitive technical detail; consequential commitments remain explicit decisions | Product intent, approval gates, real-world judgment and final decisions |
| **Arar Buluruz main assistant** | Verified in the current connected environment | Reads private GitHub files, commits, PRs, CI summaries and Lovable project metadata; maintains project context | Creates GitHub branches/files/PRs, merges approved low-risk work, queries Lovable and coordinates documentation/state | Does not have the founder's local Windows shell by default; connector access is session-dependent; must not imply local execution without evidence | Project coordination, source-of-truth maintenance, task routing, GitHub operations and decision synthesis |
| **Codex** | Verified through project executions | Inspects the local repository, diffs, generated files and runtime behavior | Runs local terminal commands, Bun lint/build, browser/E2E checks, debugging and code changes in an isolated working context | Exact permissions and network access depend on the Codex session; code/push/deploy scope must be stated; avoid duplicate writer overlap | Repository analysis plus terminal execution, testing, debugging, large or precise code work |
| **Lovable** | Verified | Reads its connected project and generates preview/build feedback | Writes frontend code, creates commits on its connected branch, rebuilds preview and can publish through available tooling | Credits are currently `0`; variants were unavailable in the observed workspace; plan mode unexpectedly edited code; backend capabilities must stay disabled; direct-to-main writes require review | Bounded frontend/UX work only when credits and a safe reviewable branch/variant are available |
| **Work** | Unverified pending capability inventory | Unknown until Work confirms and demonstrates GitHub/web/source access | Unknown; no repository write or execution capability should be assumed | Self-description alone is insufficient. Must distinguish analysis ability from actual connectors, browser, terminal and write permissions | Independent product, architecture, security, KVKK and pilot analysis after access is verified |

## Verified project-specific evidence

### Main assistant

- Read and updated private GitHub repository documentation.
- Created and merged documentation PRs through the GitHub connector.
- Read Lovable project metadata and synchronized it with repository state.
- Must still distinguish remote connector actions from founder-local terminal execution.

### Codex

- Ran Bun `1.3.14` validation in project workflows.
- Performed mobile E2E at `390 × 844`.
- Reproduced and helped resolve multi-word search and fixed-footer overlap defects.
- Produced local/repository evidence that was later recorded in GitHub.

### Lovable

- Implemented bounded frontend changes and the 81-province list.
- Reported lint/build success during the credit sprint.
- Committed generated route-tree drift that required independent GitHub cleanup.
- Variant creation was unavailable; plan mode was not safely non-writing in the observed run.

### Work

No capability claim is yet accepted as verified. The next Work task must begin with a read-only capability inventory and, where practical, demonstrate repository access by identifying the exact current branch/SHA and reading named canonical files.

## Routing rules

Use the minimum capable team member:

- **Main assistant:** the path is clear, low-risk, reversible and within approved project/documentation/frontend coordination scope.
- **Work:** the problem is primarily product strategy, architecture, security, KVKK, pilot design, cost or an expensive-to-reverse decision.
- **Codex:** correct analysis requires local repository inspection, shell commands, tests, browser automation, debugging or substantial implementation.
- **Lovable:** bounded frontend/visual implementation is justified and a safe isolated/reviewable workflow exists.
- **Founder:** ownership, real data, backend, secrets, payments, paid services, public pilot or other consequential commitments.

Only one code writer operates at a time.

## Capability verification protocol

Before assigning a new class of work to any AI/tool:

1. ask it to list the exact connected resources and actions available in that session;
2. require it to distinguish read, write and execute capabilities;
3. test one small, reversible read-only action where practical;
4. record proven access, limits and evidence here;
5. do not grant broader trust than the demonstrated capability;
6. re-verify after account, plan, connector, permission or tool changes.

## Required Work capability inventory

The pending Work assessment should verify at least:

- access to the private `ronurgungor/arar-buluruz` repository;
- ability to read branches, commits, PRs, issues, CI and file contents;
- repository search and diff inspection;
- any GitHub write capability;
- local terminal/shell availability;
- interactive browser testing, console/network inspection and screenshots;
- current web research capability;
- other connected sources;
- approval requirements for any mutation;
- where Work is materially stronger or weaker than the main assistant, Codex and Lovable.

After the response, update this file with only demonstrated facts and clearly mark anything based solely on Work's self-report.
