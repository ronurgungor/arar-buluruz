# Arar Buluruz — Decision Log

_Last updated: 2026-07-30, Europe/Istanbul_

This is an append-oriented record of consequential product, technical and operating decisions. It preserves **what was decided, why, alternatives rejected and what would cause reconsideration**.

Do not use this file for routine implementation details or temporary task notes.

## Decision format

Each new entry should include:

- date and status;
- decision;
- rationale;
- rejected or deferred alternatives;
- consequences and review trigger;
- evidence or related PR when available.

---

## D-001 — Independent project boundary

- **Date:** 2026-07-27
- **Status:** Active
- **Decision:** Arar Buluruz is independent from Tarladan and shares no code, data, integrations or brand assets.
- **Rationale:** Prevent cross-project coupling, accidental data/secret reuse and unclear ownership.
- **Review trigger:** None expected; changing this would require explicit founder approval and a migration plan.

## D-002 — Search-first, categoryless product model

- **Date:** 2026-07-27
- **Status:** Active
- **Decision:** Users search with natural terms; the product does not require visible category-tree navigation or category selection for listing creation.
- **Rationale:** The product thesis is speed and simplicity rather than marketplace taxonomy management.
- **Deferred alternative:** Category browsing and category-driven forms.
- **Review trigger:** Repeated real-user search failures that cannot be solved through search quality, synonyms or lightweight filters.

## D-003 — Frontend-only prototype first

- **Date:** 2026-07-27
- **Status:** Completed for prototype validation; first-pilot direction superseded by D-016
- **Decision:** Initial development uses local mock data with no real backend, database, auth, storage, secrets, payments or ad SDK.
- **Rationale:** Validate the core experience before introducing ownership, security, KVKK, abuse and operating burdens.
- **Review trigger:** The published public snapshot remains the mock prototype until separately approved remote activation, environment connection, real data and publication gates are completed.

## D-004 — GitHub `main` is canonical

- **Date:** 2026-07-28
- **Status:** Active
- **Decision:** GitHub `main` is the canonical code and documentation source. Chat memory and Lovable state are secondary.
- **Rationale:** A versioned, reviewable and transferable source prevents knowledge fragmentation and vendor lock-in.
- **Consequence:** Important facts and decisions must be written back to repository documentation.

## D-005 — Founder-owned future backend

- **Date:** 2026-07-28
- **Status:** Active
- **Decision:** Any future backend will use a separate founder-owned Supabase organization/project; Lovable backend remains disabled.
- **Rationale:** Preserve account, billing, administrator, data and provider-exit control.
- **Requirements:** GitHub-canonical schema/migrations; reviewed RLS, auth, backups, region, retention/KVKK, secrets and export/restore.
- **Review trigger:** A different provider may be considered only through an explicit architecture and exit-cost review.

## D-006 — One active code writer

- **Date:** 2026-07-28
- **Status:** Active
- **Decision:** Only one AI/tool writes code at a time.
- **Rationale:** Prevent overlapping edits, hidden divergence, unreviewable merges and unclear ownership of failures.
- **Handoff requirement:** Finish or stop the task, secure changes in Git, and verify exact branch/SHA before switching writers.

## D-007 — Bun and lockfile discipline

- **Date:** 2026-07-29
- **Status:** Active
- **Decision:** `bun.lock` is canonical; Bun `1.3.14` is pinned for validation. Default checks use Bun commands.
- **Rationale:** Match the existing lockfile and CI while avoiding dependency drift.
- **Prohibited shortcut:** `npm install`, `npm ci` or creation of a second lockfile without an explicit package-manager migration decision.
- **Clarification:** Test-only dependencies may be exact-pinned in `devDependencies` and resolved through the canonical Bun lockfile.

## D-008 — Controlled contact flow

- **Date:** 2026-07-28
- **Status:** Active for prototype and approved reduced pilot direction
- **Decision:** All mock listings use one controlled telephone/WhatsApp target rather than unique fake seller numbers.
- **Rationale:** Prevent accidental contact with real third parties while preserving the interaction flow.
- **Pilot extension:** The first real persistence slice also keeps communication on the central controlled line and stores no seller phone in Supabase.
- **Review trigger:** A separately approved direct-seller-contact model with verified ownership, privacy, abuse and operating controls.

## D-009 — Search and mobile defects fixed before further expansion

- **Date:** 2026-07-29
- **Status:** Completed
- **Decision:** Fix confirmed multi-word search failure and mobile fixed-footer overlap before adding speculative features.
- **Rationale:** Both defects affected the core discovery/contact flow and were reproduced by automated E2E.
- **Evidence:** PR #14 and `AUTOMATED_E2E_REPORT_2026-07-29.md`.

## D-010 — Use expiring Lovable credits only on bounded frontend work

- **Date:** 2026-07-29
- **Status:** Completed
- **Decision:** Spend all five expiring credits on a limited mobile-flow audit, bounded frontend corrections and the complete 81-province list.
- **Rationale:** Preserve value without opening backend, dependency or irreversible scope.
- **Exception recorded:** Variants were unavailable, so Lovable wrote to `main`; the diff was independently reviewed and generated route-tree drift was reverted.
- **Future rule:** Return to an isolated branch/variant workflow when available.

## D-011 — Risk-based validation rather than ritual testing

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** Testing depth follows the risk and behavior touched by a change. The current low-risk mock prototype does not require repeated full or five-person test cycles after every small change.
- **Rationale:** Repeated validation was consuming more time than the residual risk justified.
- **Normal expectation:** Bounded frontend work uses lint/build plus a focused behavior check; higher-risk slices receive proportionally deeper tests.
- **Escalation triggers:** Real data, auth, storage, payment, public pilot, security-sensitive changes, conflicting user feedback or a change touching previously validated behavior.

## D-012 — Work/Codex/Lovable/main-assistant routing

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** Continue directly when the path is clear and low-risk; use Work for independent strategy/architecture/security/KVKK analysis; use Codex when analysis requires repository/terminal/test/debugging execution; use Lovable for bounded frontend work under safe review conditions.
- **Rationale:** Match tasks to specialist strengths without unnecessary handoffs.
- **Important limitation:** Nominal capability, current-session availability and project authorization are separate and must be understood before consequential actions.

## D-013 — Repository-backed shared AI memory

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** Important project knowledge must be stored in structured GitHub documents so new AI tools and chats can reconstruct the project from canonical sources.
- **Rationale:** Shared, versioned context increases team competence and prevents each chat from rebuilding the same understanding.
- **Structure:** Stable memory, current state, backlog, decision log, capability matrix and dated evidence have separate responsibilities.
- **Limitation:** An AI without repository access cannot automatically read this memory and must be given the relevant files or a bootstrap prompt.

## D-014 — Main assistant is the default executor; specialist outputs are advisory

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** The main assistant is the default executor and coordinator whenever it has the necessary tools and can complete the work safely. Work and Codex are optional specialists used when their additional analysis, terminal execution, testing or independent challenge materially improves the decision or implementation.
- **Rationale:** Direct execution reduces transcription risk, unnecessary handoffs and fragmented ownership.
- **Governance rule:** No AI output is a binding command. Recommendations are checked against canonical GitHub sources, evidence, project constraints and founder intent.
- **Review proportionality:** Double or triple checking is reserved for consequential, uncertain, security/KVKK-sensitive, costly or difficult-to-reverse decisions. It is not required for routine low-risk work.
- **Deferred alternative:** Making Work or Codex the mandatory primary writer or mandatory reviewer for every task.
- **Review trigger:** Repeated main-assistant implementation failures, loss of required connectors, a task exceeding demonstrated capability, or a high-risk decision that clearly benefits from specialist review.

## D-015 — Every new chat receives application, work and team context

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** Every new Arar Buluruz chat must begin from a repository-backed bootstrap that covers the application, current tasks, decisions, team roles, nominal capabilities, demonstrated capabilities, session limits and approval boundaries.
- **Rationale:** Shared context reduces duplicate analysis, contradictory instructions and unnecessary handoffs.
- **Implementation:** `docs/AI_CHAT_BOOTSTRAP.md` is the common entry point; `AI_TEAM_CAPABILITIES.md` and `WORK_CODEX_CAPABILITY_PROFILE.md` preserve team knowledge.
- **Practical rule:** Routine low-risk work may use a concise bootstrap; the requirement must not become a ceremony that delays obvious execution.
- **No-access fallback:** A chat without GitHub access must say so and receive the minimum bootstrap files and task-specific evidence.
- **Review trigger:** Update the bootstrap when architecture, current stage, team roles, capabilities or governance change materially.

## D-016 — Reduced founder-operated persistence pilot

- **Date:** 2026-07-30
- **Status:** Active direction; Gate 1 implementation merged to `main`; Gates 2–5 closed
- **Decision:** Select reduced Option B. The first real capability will be listing persistence through the smallest safe founder-operated slice, beginning in Çorlu.
- **Data model:** Start with only a `listings` table containing `id`, `title`, `description`, `price_amount`, `province`, `district`, `seller_display_name`, `search_keywords`, `status`, `created_at`, `updated_at`, `published_at`, `expires_at` and `unpublished_at`. Initial status values are `draft`, `published` and `unpublished`. Mock listings never enter the production database and no `is_mock` column is added.
- **Public boundary:** The public application is read-only. Database/RLS visibility enforces `status = 'published' and published_at <= now() and expires_at > now()`. Anonymous/public INSERT, UPDATE and DELETE remain prohibited; frontend filtering is not the security boundary.
- **Founder operation:** The founder may temporarily create, edit, publish and remove approved listing rows through the Supabase Dashboard after a separately approved founder-owned project exists. Dashboard access belongs only to the founder, uses MFA and is not shared. No schema/security changes may be made through the Dashboard.
- **Canonical schema:** Schema and security changes are migration-canonical in GitHub from day one.
- **Contact/KVKK boundary:** Seller phone is not stored in Supabase. Public output shows only an approved `seller_display_name`; communication remains on the central controlled phone/WhatsApp line. Data-controller identity, notice, legal basis, retention/deletion and possible international-transfer treatment remain a separate founder/KVKK package.
- **Explicitly deferred:** Buyer/seller/moderator auth, role tables, seller-contact/private-phone tables, custom admin panel, public database insert, seller self-service, photos/Storage, SMS/OTP, expiration cron, broad analytics, direct seller phone, nationwide pilot, vehicle/real-estate listings, payment, chat, shipping and advertising network.
- **Approval gates:** Gate 1 code, migration, RLS, REST integration and local validation were merged through PR #25. Supabase organization/project creation, environment connection, real-data entry and pilot publication remain separate closed gates. Approval or completion of one gate never authorizes the next.
- **Evidence:** PR #25; expected head `1d9d0f6112464e5078d90df510488f7a786cddef`; normal merge commit `994b8b1705d52434be0c000093a052fa0e519542`; frozen Bun install, lint, unit/build, clean local reset, 22/22 pgTAP, REST/RLS and desktop/mobile E2E passed before merge.
- **Dashboard exit triggers:** Replace founder-only Dashboard operations when a second operator or role separation is needed; seller self-service or private contact data enters scope; repeated Dashboard errors require workflow/audit controls; pending operations become unsustainable; the pilot expands beyond the controlled Çorlu model; or the Dashboard prevents reliable enforcement.
- **Pilot evidence rule:** Listing counts are not mandatory hard gates. Progression depends on persistence/RLS correctness and qualitative use/operating signals.
- **Review trigger:** Reconsider scope only after real pilot evidence, a material legal/security finding or a Dashboard exit trigger.

## D-017 — Web-first delivery, minimal PWA package and separate Play Store value gate

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** The canonical delivery sequence is: responsive web → Gate 1 persistence/RLS implementation → a separate narrow minimal-PWA preparation package → controlled Çorlu pilot → real-use and operating validation → a separate Play Store value gate → if that gate passes, TWA as the default Play Store packaging path.
- **Gate 1 boundary:** Minimal PWA work is not part of Gate 1. Gate 1 receives no PWA dependency, service worker, TWA, Android Studio or Play Store files, package ID, `assetlinks.json` or other mobile-packaging scope.
- **Minimal PWA scope:** The later package is limited to a manifest, durable application identity, correct icons, installability and a safe, honest offline/error screen. Push notifications, full offline listing functionality, background sync and cache-first storage of dynamic listings remain out of scope.
- **Pilot evidence rule:** Reaching 10–20 listings is not a mandatory hard gate. Progression is based on qualitative use and operating signals.
- **Play Store gate:** Play Store publication is not automatic after the pilot. It requires separate evidence that store presence creates material value and that ongoing policy/signing/release/maintenance burden is justified.
- **Default packaging if approved:** If the Play Store value gate passes without a measured need for deeper device integration, use a Trusted Web Activity as the default packaging route.
- **Deferred alternatives:** Capacitor or native Android are reconsidered only when measured evidence shows a device-integration need that responsive web, minimal PWA and TWA cannot satisfy safely and proportionately.
- **Review trigger:** Reconsider only after real pilot evidence, a material platform-policy change, a proven installation/distribution problem or a measured device-integration requirement.

## D-018 — Routine execution authority and escalation boundary

- **Date:** 2026-07-30
- **Status:** Active
- **Decision:** The main assistant is the active primary implementer and coordinator. It independently performs routine technical details, small implementation choices, test maintenance, reversible repository operations, debugging and validation within the canonical scope.
- **No-routine-handoff rule:** Work or another independent advisor is not required for ordinary implementation or review. Specialist review is used only when it materially improves an important decision or when the founder explicitly requests it.
- **Mandatory founder escalation:** Stop before a new product/architecture direction, scope expansion, new security/KVKK/personal-data risk, remote Supabase project or migration, secret/environment change, real data, Lovable Publish/Update or another production deployment, paid service, advertising, analytics/external SDK, expensive-to-reverse/high-operational-impact action, or a genuine unresolved canonical conflict.
- **Rationale:** Preserve execution speed and clear ownership while retaining explicit founder control over consequential gates.
- **Consequence:** Low-risk work proceeds without repeated approvals; exact SHA, tests, mutations, risks and rollback remain reportable.
- **Review trigger:** Reconsider if routine autonomy causes repeated scope drift, unsafe mutations or insufficient founder visibility.
