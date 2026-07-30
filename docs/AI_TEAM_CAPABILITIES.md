# Arar Buluruz — AI and Team Capability Registry

_Last verified: 2026-07-30, Europe/Istanbul_

## Purpose

This file records the team structure, capability confidence and task-routing rules for Arar Buluruz.

Every new chat must distinguish four different questions:

1. **Nominal capability:** What can this environment/tool generally do?
2. **Project-observed capability:** What has it already demonstrated in Arar Buluruz?
3. **Current-session availability:** Which connectors, credentials, runtimes and permissions are active now?
4. **Project authorization:** Which read/write/execute actions are approved for this task?

An environment is considered a reliable source for describing its own nominal tools and capabilities, even when a restricted reasoning-depth setting is used. Restricted depth may reduce analytical depth; it does not automatically invalidate the environment's own capability inventory. Session availability and project authorization still require separate checks before consequential actions.

Detailed Work and Codex profiles: [`WORK_CODEX_CAPABILITY_PROFILE.md`](WORK_CODEX_CAPABILITY_PROFILE.md)

New-chat entry point: [`AI_CHAT_BOOTSTRAP.md`](AI_CHAT_BOOTSTRAP.md)

## Confidence labels

- **Verified:** demonstrated in this project with current or recent evidence.
- **Self-reported:** described by the environment itself; accepted as a nominal capability profile.
- **Partially observed:** some project-specific use or access was observed, but the full capability was not exercised.
- **Session-dependent:** may change with connector, credential, plan, runtime, reasoning-depth or permission state.
- **Unavailable:** known not to be accessible in the relevant session.

## Capability matrix

| Team member / tool | Confidence | Read capabilities | Write / execute capabilities | Main limits | Best current use |
|---|---|---|---|---|---|
| **Founder** | Verified | Reviews product behavior, GitHub state, terminal output, proposals and decisions | Gives approval; runs local PowerShell commands; performs real-world smoke checks | Consequential commitments remain explicit founder decisions | Product intent, ownership, approval gates and final judgment |
| **Arar Buluruz main assistant** | Verified in the connected environment | Reads private GitHub files, commits, PRs, CI summaries, uploaded evidence and connected project context | Creates branches/files/PRs, reviews CI, merges approved work and maintains shared memory; may be primary writer when connected tools support the task | Does not automatically possess the founder's local Windows shell; connector access is session-dependent | Default product/technical executor, GitHub operator, coordinator and decision synthesizer |
| **Codex** | Verified through project executions; some abilities session-dependent | Local repository, Git state, diffs, generated files, runtime behavior, logs and browser evidence | Shell commands, Bun, lint/build/test, browser/E2E, debugging and scoped code changes in an isolated context | Network, GitHub mutation, deployment, secrets and external-service access vary by session and authority | Engineering specialist when local execution, testing, debugging or precise implementation adds value |
| **Work / Work Mode** | Nominal capabilities self-reported and accepted; project-specific read access partially observed | Authorized private GitHub repositories, branches, commits, PRs, issues, workflow/CI, files, diffs, architecture, web, Lovable and live-browser context | Reports GitHub mutation, shell, browser interaction and connected-tool capabilities when permissions/authorization allow | Restricted depth affects analysis quality; repo clone/Bun were unavailable in the first session; mutation abilities were not exercised; exact connectors remain session-dependent | Independent product, architecture, security, KVKK, pilot, cost and risk review when the decision merits a second opinion |
| **Lovable** | Verified | Reads its connected frontend project and produces preview/build feedback | Writes frontend code, creates commits on its connected branch and can publish through available tooling | Credits are `0`; variants were unavailable; plan mode unexpectedly wrote code; backend capabilities must remain disabled | Bounded frontend/UX work only under safe isolated/reviewable conditions |

## Founder

### Role

- Owns product intent and final consequential decisions.
- Approves backend, real data, auth, storage, secrets, payments, paid services and public-pilot gates.
- Provides real-world judgment that tools cannot replace.

### Proven capabilities

- Reads and evaluates terminal output and GitHub state.
- Runs local PowerShell commands in `C:\Projects\arar-buluruz`.
- Performs human mobile/product checks when useful.

## Main assistant

### Role

The main assistant is the default executor and coordination center. It is not limited to routing work.

### Proven capabilities

- Reads and updates the private GitHub repository.
- Reads files, commits, PRs, diffs and CI summaries.
- Creates feature branches, documentation/code files and pull requests.
- Merges approved low-risk work.
- Maintains project memory, current state, backlog, decisions and capability records.
- Evaluates Work, Codex and Lovable outputs rather than treating them as commands.

### Limits

- Must not claim founder-local terminal execution without evidence.
- Current connectors and permissions must be checked when consequential.
- Must stop at explicit founder approval gates.

## Codex

### Project-observed capabilities

Codex has demonstrated:

- local repository and working-tree inspection;
- branch, SHA, commit and diff analysis;
- Bun `1.3.14` execution;
- frozen dependency validation;
- `bun run lint` and `bun run build`;
- mobile/browser E2E at `390 × 844`;
- reproduction and correction of multi-word search behavior;
- reproduction and correction of mobile fixed-footer overlap;
- debugging and scoped code changes;
- generated-file drift and recovery evidence;
- detailed technical handoffs later recorded in GitHub.

### Best assignment

Use Codex when correct execution depends on:

- a local checkout or shell;
- running tests/build tools;
- browser automation or deterministic viewport checks;
- logs, stack traces or runtime reproduction;
- a precise implementation, refactor or migration candidate;
- rollback/recovery evidence.

Do not route work to Codex merely because code is involved. The main assistant remains the default executor when its tools are sufficient.

### Session-dependent capabilities

Re-check each time:

- private GitHub authentication;
- network/web access;
- commit, push and PR ability;
- deployment access;
- secrets/environment access;
- Supabase or external-service access;
- backend/real-data mutation authority.

### Required handoff

A substantial Codex result should include starting branch/SHA, scope, files, commands/tests, results, risks, rollback, final branch/SHA/working-tree state and an explicit list of any commit/push/PR/deploy actions.

## Work / Work Mode

### Accepted capability profile

The first Work session ran at restricted reasoning depth. The founder accepts that Work can accurately describe its own nominal capabilities. The following inventory is therefore preserved as a valid Work capability profile, while session availability and project authorization remain separate questions.

Work reported:

- access to private GitHub repositories authorized through its connector;
- direct read access to `ronurgungor/arar-buluruz`;
- branches, commits, PRs, issues, workflows/CI and file-content reading;
- repository search, with connector-search reliability limitations;
- diff and architecture inspection;
- technical availability of GitHub branch/file/commit/PR/issue/comment/merge mutations when permissions and explicit authority allow;
- a shell environment;
- interactive cloud-browser access;
- screenshots and console inspection;
- partial network and responsive inspection;
- current web research;
- Lovable read access;
- Supabase-related tools, although no Arar Buluruz Supabase project or mutation authority was established;
- product, architecture, security and KVKK analysis.

### First-session observed limits

- The private repository could not be cloned into the shell because credentials were not available there.
- The shell was not in a repository checkout.
- Bun and `gh` were unavailable.
- Local lint/build/test execution did not occur.
- GitHub mutation capabilities were not exercised.
- Full HAR/network and deterministic mobile-resize workflows were not present.
- The pilot recommendation was restricted-depth advisory input rather than an automatic project decision. The founder later selected a reduced founder-operated persistence pilot after independent comparison and synthesis; the accepted scope is recorded in the decision log and backlog.

### Best assignment

Use Work when the expected reduction in decision risk justifies a separate review, particularly for:

- consequential pilot scope;
- product-direction alternatives;
- backend ownership and provider lock-in;
- auth/RLS/storage/service-role boundaries;
- KVKK, retention, data minimization and residency;
- moderation, abuse and operational burden;
- paid/recurring services and expensive commitments.

### Required handoff

A consequential Work result should identify reasoning depth, connected tools, branch/SHA and sources; separate facts from assumptions and recommendations; compare alternatives; recommend one bounded path; state risks/deferred work; reduce the result to no more than five founder decisions; and assign the next owner.

## Lovable

### Proven capabilities

- Implemented bounded frontend and UX changes.
- Added the complete 81-province list.
- Produced commits and preview/build feedback.
- Published the connected frontend.

### Limits and cautions

- Current credits: `0`.
- Variants were unavailable in the observed workspace.
- Plan mode unexpectedly edited code.
- Generated route-tree drift required independent cleanup.
- Database, auth, storage, secrets and edge functions must remain disabled.

## Routing rules

Use the minimum capable team member:

- **Main assistant:** default executor for project work supported by current tools and approval scope.
- **Work:** optional independent analysis for consequential or difficult-to-reverse decisions.
- **Codex:** optional engineering specialist for local repository, terminal, testing, debugging, browser automation or precise implementation.
- **Lovable:** bounded frontend/visual implementation when a safe reviewable workflow exists and using it is efficient.
- **Founder:** final authority for ownership, backend, real data, secrets, payments, paid services, public pilot and consequential commitments.

Only one code writer operates at a time.

## Governance rule

No teammate's output is an automatic command. Work, Codex, Lovable and main-assistant outputs are evaluated against:

- GitHub `main` and the exact branch/PR;
- executable evidence;
- founder intent;
- project constraints;
- risk and reversibility;
- approval boundaries.

Double or triple checking is used proportionally for consequential, uncertain, security/KVKK-sensitive, costly or difficult-to-reverse matters. It is not required for routine low-risk work.

## New-chat protocol

Every new project chat must read:

1. `AGENTS.md`;
2. `AI_CHAT_BOOTSTRAP.md`;
3. project memory and current state;
4. backlog and decision log;
5. this registry;
6. `WORK_CODEX_CAPABILITY_PROFILE.md`.

It should then know:

- the application and current architecture;
- completed, current and next work;
- founder, main assistant, Codex, Work and Lovable roles;
- each teammate's nominal capability, demonstrated capability, session limits and authority boundaries.

## Update protocol

Update this registry/profile when:

- a teammate demonstrates a new project capability;
- a nominal capability is clarified;
- connector, runtime, permission or reasoning-depth availability changes materially;
- a capability is removed;
- a previous assumption is disproved.

Do not store secrets, tokens or unnecessary personal data here.
