# Arar Buluruz — New Chat Bootstrap

_Last reviewed: 2026-07-30, Europe/Istanbul_

## Purpose

Every new AI chat or tool entering Arar Buluruz must quickly understand three things before advising or changing anything:

1. **the application** — what Arar Buluruz is, how it currently works and its hard boundaries;
2. **the work** — what has been completed, what is currently pending and which decisions are open;
3. **the team** — who the founder, main assistant, Codex, Work and Lovable are, what each can do and when each should be used.

This document is the common entry point. It does not replace the linked canonical files.

## Mandatory reading order

1. [`AGENTS.md`](../AGENTS.md) — operating contract, approvals, source priority and one-writer rule
2. [`ARAR_BULURUZ_PROJECT_MEMORY.md`](ARAR_BULURUZ_PROJECT_MEMORY.md) — durable product, architecture and ownership knowledge
3. [`ARAR_BULURUZ_CURRENT_STATE.md`](ARAR_BULURUZ_CURRENT_STATE.md) — current implementation and verified runtime state
4. [`ARAR_BULURUZ_BACKLOG.md`](ARAR_BULURUZ_BACKLOG.md) — completed, current and ordered work
5. [`ARAR_BULURUZ_DECISION_LOG.md`](ARAR_BULURUZ_DECISION_LOG.md) — consequential decisions and rationale
6. [`AI_TEAM_CAPABILITIES.md`](AI_TEAM_CAPABILITIES.md) — team capability registry and routing rules
7. [`WORK_CODEX_CAPABILITY_PROFILE.md`](WORK_CODEX_CAPABILITY_PROFILE.md) — detailed Work and Codex capability profiles
8. Relevant dated test/evidence documents for the task

GitHub `main`, the exact branch/PR under review and executable evidence remain more authoritative than summaries.

## Application snapshot

- Product: a very simple, mobile-first, search-first classified-listing application for Türkiye.
- Repository: `ronurgungor/arar-buluruz`.
- Public prototype: `https://arar-buluruz.lovable.app`.
- Current stage: frontend-only mock prototype.
- Data: local mock listings only.
- Core journeys: search, listing detail, controlled call/WhatsApp contact, editable listing preview, placeholder login and complaint flow.
- Product principle: users type what they need directly; no required visible category tree.
- Technical baseline: React, TanStack Start, TypeScript, Tailwind, shadcn/ui, Bun `1.3.14`, `bun.lock`.
- Canonical source: GitHub `main`.
- Lovable role: bounded frontend writer and hosting surface; not backend owner.
- Backend, database, auth, storage, secrets, real user data, payments and advertising network are not enabled.

Do not rely on this snapshot for exact runtime details. Read `ARAR_BULURUZ_CURRENT_STATE.md` and the current code.

## Work snapshot

The backlog is the canonical task list. At the time this bootstrap was created:

- the frontend-only mock prototype is technically validated;
- repeated full testing is not the default next step;
- shared project memory and team capability records exist;
- the first Work session produced a restricted-depth capability inventory and candidate pilot analysis;
- the capability inventory is useful for understanding Work, while its pilot recommendation is not automatically accepted;
- the next consequential product decision is still the minimum first-real-pilot scope and first real capability;
- backend or real-data work remains behind founder approval and the appropriate architecture/security/KVKK gate.

Always read the current backlog because this snapshot will age.

## Team snapshot

### Founder

- Owns product intent and final consequential decisions.
- Opens approval gates for backend, real data, auth, storage, secrets, payments, paid services and public pilot.
- Runs local PowerShell commands and real-world human checks when needed.

### Main assistant

- Default product/technical executor and coordinator.
- Reads and writes through connected GitHub tools, maintains shared memory, creates branches/PRs and reviews CI within approval scope.
- Performs work directly when current tools and demonstrated capabilities are sufficient.
- Routes to specialists only when the handoff provides material additional value.

### Codex

- Execution-focused engineering specialist.
- Best for local repository work, shell commands, Bun, lint/build/tests, debugging, browser/E2E, precise code changes and recovery evidence.
- Project-observed abilities and session-dependent limits are documented in `WORK_CODEX_CAPABILITY_PROFILE.md`.

### Work / Work Mode

- Independent analysis and risk-review specialist.
- Best for consequential pilot, product, architecture, security, KVKK, moderation, cost and lock-in decisions.
- The first restricted-depth session reported GitHub, shell, browser, web, Lovable and related tool capabilities; exact details and observed limits are documented in `WORK_CODEX_CAPABILITY_PROFILE.md`.
- Restricted depth affects analysis depth, not the validity of the environment's own capability description.

### Lovable

- Bounded frontend/UX writer and hosting surface.
- Credits are currently exhausted.
- Backend, database, auth, storage, secrets and edge functions must remain disabled.
- Use only with a safe isolated/reviewable workflow.

## Governance rules every chat must know

- No AI response is a binding command or automatic project decision.
- Recommendations are evaluated against GitHub, evidence, founder intent, risk and scope.
- Double/triple checking is proportional to consequence and uncertainty; it is not a ritual.
- Only one code writer operates at a time.
- The main assistant is the default executor; Work, Codex and Lovable are optional specialists.
- A specialist handoff must state the concrete missing capability or uncertainty it is intended to solve.
- Testing depth follows the risk and behavior touched.
- Do not force-push or rewrite published Git history.
- Do not create dependency or lockfile drift.
- Do not enable backend or real data without the required founder decision.

## Required new-chat declaration

Before consequential advice or any write action, the new chat should state:

1. repository, branch and exact SHA it can verify;
2. canonical files it read;
3. its current tools, reasoning depth and read/write/execute access;
4. its understanding of the current task;
5. whether it will act directly or recommends a specialist handoff, and why;
6. prohibited actions and approval gates relevant to the task.

For a routine low-risk task, this declaration may be concise. It must not become ceremony that blocks obvious work.

## When GitHub access is unavailable

The chat must say so. Provide or upload, at minimum:

- `AGENTS.md`;
- this bootstrap file;
- `ARAR_BULURUZ_PROJECT_MEMORY.md`;
- `ARAR_BULURUZ_CURRENT_STATE.md`;
- `ARAR_BULURUZ_BACKLOG.md`;
- `AI_TEAM_CAPABILITIES.md`;
- the exact files/diff relevant to the task.

The chat must not pretend it has read GitHub when it has not.

## Knowledge write-back

After a meaningful milestone, accepted information must be written to the appropriate repository document:

- stable principle or identity → project memory;
- current implementation/runtime → current state;
- pending work → backlog;
- consequential choice and rationale → decision log;
- team capability or limitation → capability registry/profile;
- test result → dated evidence document.

Important project knowledge should not remain only in a conversation.
