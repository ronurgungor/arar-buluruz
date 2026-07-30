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
| **Codex** | Verified through project executions | Inspects the local repository, diffs, generated files and runtime behavior | Runs local terminal commands, Bun lint/build, browser/E2E checks, debugging and code changes in an isolated working context | Exact permissions, network access and GitHub mutation ability depend on the Codex session; code/push/deploy scope must be stated; avoid duplicate writer overlap | Repository analysis plus terminal execution, testing, debugging and precise implementation |
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

## Codex role charter

### Mission

Codex is the project’s execution-focused engineering specialist. It should be used when a correct answer depends on inspecting the repository and then performing terminal, test, debugging or implementation work in the same task.

### Assign Codex when the task requires

- inspecting the local checkout, branches, commits, diffs, generated files or dependency state;
- running shell commands, Bun scripts, build tools, linters or targeted test suites;
- reproducing a runtime, browser, responsive-layout, CI or local-only failure;
- examining logs, stack traces, console/network output or build artifacts;
- preparing a narrow code fix, migration candidate, refactor or review package;
- verifying that a change actually works rather than only reasoning about it;
- producing exact technical evidence for a later GitHub PR or founder decision.

### Default permitted work

Only within the explicit task scope and approval boundaries, Codex may:

- read and analyze repository content;
- run local commands and tests;
- create or modify files in an isolated working branch/context;
- prepare diffs, patches, test evidence and rollback instructions;
- identify root cause and propose the minimum safe fix.

Commit, push, PR, deployment, secret, environment, backend and real-data actions are **not implied** by the Codex role. They must be explicitly authorized and technically available in that session.

### Required Codex handoff

Every substantial Codex result should report:

1. repository, starting branch and starting SHA;
2. exact task scope and assumptions;
3. files inspected and files changed;
4. commands and tests executed;
5. pass/fail results and relevant warnings;
6. remaining risks, unknowns and skipped checks;
7. rollback or restore method;
8. final branch, final SHA and working-tree status;
9. whether anything was committed, pushed, opened as a PR or deployed.

### Do not use Codex as

- the final authority for product strategy or founder priorities;
- the final legal/KVKK decision-maker;
- permission to broaden scope into unrelated refactors;
- permission to mutate production, secrets, billing or real data;
- a second simultaneous code writer while another tool is editing the same scope;
- a reason to repeat low-value tests that existing evidence already covers.

### Current verification boundary

Verified: local repository analysis, terminal execution, Bun validation, browser/mobile E2E, debugging and scoped code work.

Session-specific and therefore re-verified each time: internet/network access, GitHub write access, commit/push/PR ability, deployment access, secrets and external service permissions.

## Work role charter

### Mission

Work is the project’s independent decision and risk-review specialist. It should challenge assumptions and compare options before Arar Buluruz enters a costly, sensitive or difficult-to-reverse stage.

### Assign Work when the task requires

- defining the first real pilot or public-pilot scope;
- comparing product directions, user journeys or prioritization alternatives;
- reviewing backend ownership, architecture boundaries and provider lock-in;
- reviewing authentication, authorization, RLS, storage and service-role boundaries;
- evaluating personal-data minimization, retention, KVKK exposure and data residency;
- evaluating abuse, moderation, complaint handling and operational burden;
- comparing paid services, recurring costs or expensive-to-reverse commitments;
- independently challenging a plan already proposed by the main assistant, Codex or Lovable;
- converting a complex decision into a small set of founder approval gates.

### Expected Work behavior

Work should:

- begin by declaring the exact resources and tools available in that session;
- distinguish clearly between analysis, read access, write access and execution access;
- read GitHub `main` and the canonical project-memory files directly when access exists;
- identify the exact branch/SHA and files used as evidence;
- separate verified facts, assumptions, inferences and recommendations;
- compare alternatives rather than automatically approve the current plan;
- recommend one bounded path and state why the alternatives are deferred;
- identify the smallest safe pilot, minimum data and explicit decision gates;
- state which next step belongs to the main assistant, Codex, Lovable or founder.

### Required Work handoff

Every consequential Work result should include:

1. capability and access inventory for that session;
2. sources read, including repository branch/SHA and canonical files;
3. current-state summary based only on verified sources;
4. options considered and comparison criteria;
5. one recommended decision with rationale;
6. assumptions, risks and unresolved questions;
7. minimum data, security, KVKK and operational requirements where relevant;
8. deliberately deferred items;
9. no more than five founder decisions;
10. recommended owner for the next action.

### Do not use Work as

- proof of GitHub, browser, terminal or write access before demonstration;
- the default code implementer or test runner unless those capabilities are verified;
- a substitute for qualified legal advice or an official KVKK determination;
- permission to change repository files, backend, secrets, billing or production;
- the final founder decision-maker;
- a reason to create enterprise-scale architecture for a small pilot;
- a reason to repeat already sufficient technical validation.

### Current verification boundary

Work’s intended analytical role is accepted, but its actual GitHub, browser, web, terminal and mutation capabilities remain **unverified**. Update this section only after Work demonstrates specific access. Self-report may be recorded as self-report but not promoted to verified without evidence.

## Main assistant coordination contract

The main assistant remains responsible for orchestration:

- read the common project memory before routing work;
- choose the minimum capable team member;
- give Work or Codex a bounded prompt with source priority, constraints and prohibited actions;
- prevent simultaneous writers;
- review the returned evidence and detect unsupported claims;
- convert accepted results into GitHub state, backlog, decision log or capability-registry updates;
- stop for founder approval at consequential gates.

A Work or Codex response is an input to project governance, not automatically the final project state. Only accepted and recorded information becomes shared memory.

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
