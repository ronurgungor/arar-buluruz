# Arar Buluruz — Shared Project Memory

_Last reviewed: 2026-07-30, Europe/Istanbul_

## Purpose

This file stores durable project knowledge that should remain useful across AI tools, chats and handoffs. It is not a replacement for the code, the current-state snapshot or the backlog.

Every team member must distinguish:

- **durable facts and principles** → this file
- **current implementation and verified runtime state** → `ARAR_BULURUZ_CURRENT_STATE.md`
- **pending and ordered work** → `ARAR_BULURUZ_BACKLOG.md`
- **important decisions and their rationale** → `ARAR_BULURUZ_DECISION_LOG.md`
- **verified AI/tool access and limitations** → `AI_TEAM_CAPABILITIES.md`
- **historical test evidence** → dated evidence files under `docs/`

## Canonical source order

1. GitHub `main` code and configuration
2. The exact branch/PR being reviewed and its test evidence
3. `AGENTS.md`
4. This shared project memory
5. `docs/ARAR_BULURUZ_CURRENT_STATE.md`
6. `docs/ARAR_BULURUZ_DECISION_LOG.md`
7. `docs/AI_TEAM_CAPABILITIES.md`
8. `docs/ARAR_BULURUZ_BACKLOG.md`
9. Dated evidence documents
10. Old chats and historical notes only when explicitly needed

Higher sources override lower ones. No AI should rely on remembered chat details when the repository can verify the fact.

## Project identity

- Project name: **Arar Buluruz**
- Repository: `ronurgungor/arar-buluruz`
- Local checkout: `C:\Projects\arar-buluruz`
- Public prototype: `https://arar-buluruz.lovable.app`
- Lovable project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Lovable workspace ID: `AERDgNbVzztF411nAuzp`
- The project is independent from Tarladan and must not share its code, data, integrations or brand assets.

## Product thesis

Arar Buluruz is a very simple, mobile-first classified-listing product for Türkiye.

The core idea is:

- users type what they need directly instead of navigating a category tree;
- listings are fast to scan and easy to contact;
- unnecessary platform complexity remains hidden;
- listing and search should feel free, lightweight and broadly accessible;
- advertising may become the revenue model later, but only through a separate approved decision.

## Product principles

- Search-first; no visible category menu or category-selection requirement.
- Mobile speed and one-handed use take priority.
- Keep screens focused on the user's primary task.
- Direct phone and WhatsApp contact is the current prototype interaction model.
- Do not add social feeds, ratings, maps, chat, payment, shipping or order flows without a proven need and explicit scope decision.
- Do not confuse mock proximity, mock data or disabled prototype actions with real capabilities.
- Prefer the smallest useful pilot over a broad platform build.

## Current architecture baseline

- Frontend: React with TanStack Start and TypeScript.
- UI: Tailwind CSS and shadcn/ui components.
- Package manager and canonical lockfile: Bun with `bun.lock`.
- Pinned Bun version: `1.3.14`.
- Build output: Vite/Nitro using the Cloudflare module preset.
- Hosting/editor surface: Lovable.
- Data: local mock listings only.
- Backend, database, authentication, storage, secrets and edge functions: disabled.

The exact current behavior and validated SHA belong in `ARAR_BULURUZ_CURRENT_STATE.md`, not here.

## Controlled prototype contact

- Controlled number: `+905321739111`
- Call target: `tel:+905321739111`
- WhatsApp target: `https://wa.me/905321739111`

This is the only approved prototype contact target unless the founder changes it explicitly.

## Ownership and hard boundaries

- GitHub `main` is the canonical source of code and project documentation.
- Lovable is a frontend writer and hosting surface, not the backend owner.
- Lovable database, auth, storage, secrets and edge functions stay disabled.
- A future backend must use a separate founder-owned Supabase organization/project.
- The founder must control account ownership, billing and administrator access.
- Schema and every migration must be canonical in GitHub from day one.
- No backend, real data, auth, SMS, storage, secrets, payments, advertising network, paid service or recurring service is enabled without explicit founder approval and the required independent review.
- No force-push, published-history rewrite or unsafe rebase/amend workflow.

## Operating model

- The main assistant is the default executor and coordinator when it has the required connected tools, understands the scope and can perform the work safely.
- Direct execution by the main assistant is considered a capability improvement over the earlier manual copy/paste workflow; handing every task to Work or Codex is not required for progress.
- Only one code writer works at a time.
- Low-risk, reversible work inside approved scope may continue without ceremonial re-approval.
- Use reviewable branches and PRs whenever the tool supports them.
- Validation depth follows the risk introduced; do not repeat full regressions by habit.
- Existing evidence remains valid until a change touches the behavior it covered.
- Work is an optional independent analysis and risk-review specialist for product, architecture, security, KVKK and expensive-to-reverse decisions.
- Codex is an optional execution/test specialist when repository inspection must be combined with terminal execution, testing, debugging or substantial code changes.
- Lovable is used only for bounded frontend/UX work when credits, isolation and review conditions are acceptable.
- Specialist outputs are recommendations and evidence, not binding commands. The main assistant and founder evaluate them against canonical sources, scope and risk.
- Double or triple checking is reserved for consequential, uncertain, security/KVKK-sensitive or expensive-to-reverse questions. It is not a routine ritual.

Role descriptions are provisional unless their actual access has been verified in `AI_TEAM_CAPABILITIES.md`.

## Capability progression and founder preference

The founder's earlier Tarladan workflow relied mainly on ChatGPT 5.5 guidance plus manual copy/paste edits directly into GitHub files. Arar Buluruz deliberately advances beyond that model:

- the current main assistant can inspect connected sources and perform many GitHub/documentation operations directly;
- direct assistant execution reduces manual transcription, copy/paste mistakes and coordination overhead;
- Work and Codex remain valuable specialist options, but they do not need to be the primary code writer for the project to represent progress;
- the preferred team model is to use the minimum capable actor, keeping the main assistant as the default when it can complete the task correctly and safely.

## Knowledge that must be preserved

The following facts should never exist only in a chat:

- product thesis and non-goals;
- canonical repository, URLs, project IDs and controlled contact targets;
- architecture and ownership boundaries;
- package-manager and deployment conventions;
- approval gates and prohibited shortcuts;
- major product/technical decisions and why they were made;
- validated behavior and known risks;
- open strategic decisions;
- AI/team access, limitations and best routing;
- recovery, migration, deployment and rollback constraints once those systems exist.

## Information that must not be stored here

- passwords, access tokens, API keys or secrets;
- private customer/user records;
- unnecessary personal data;
- unverified assumptions presented as fact;
- temporary logs that have no durable value;
- duplicated current-state details that will become stale quickly.

## Update protocol

After every meaningful milestone:

1. update current runtime facts in `ARAR_BULURUZ_CURRENT_STATE.md`;
2. update pending work in `ARAR_BULURUZ_BACKLOG.md`;
3. append important choices and rationale to `ARAR_BULURUZ_DECISION_LOG.md`;
4. update this file only when a durable principle, identifier, ownership rule or project thesis changes;
5. update `AI_TEAM_CAPABILITIES.md` when a tool's actual access is proven, removed or materially changed;
6. link dated evidence instead of copying long logs into the shared memory.

Any AI or new chat that cannot access these files must say so explicitly and request the minimum missing context. It must not pretend that repository access exists.