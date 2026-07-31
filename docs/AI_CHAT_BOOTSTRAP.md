# Arar Buluruz — New Chat Bootstrap

_Last reviewed: 2026-07-31, Europe/Istanbul_

## Mandatory reading order

1. [`AGENTS.md`](../AGENTS.md)
2. [`ARAR_BULURUZ_PROJECT_MEMORY.md`](ARAR_BULURUZ_PROJECT_MEMORY.md)
3. [`ARAR_BULURUZ_CURRENT_STATE.md`](ARAR_BULURUZ_CURRENT_STATE.md)
4. [`ARAR_BULURUZ_DECISION_LOG.md`](ARAR_BULURUZ_DECISION_LOG.md)
5. [`ARAR_BULURUZ_BACKLOG.md`](ARAR_BULURUZ_BACKLOG.md)
6. [`AI_TEAM_CAPABILITIES.md`](AI_TEAM_CAPABILITIES.md)
7. [`WORK_CODEX_CAPABILITY_PROFILE.md`](WORK_CODEX_CAPABILITY_PROFILE.md)
8. [`FOUNDER_WINDOWS_DEV_MACHINE_PROFILE.md`](FOUNDER_WINDOWS_DEV_MACHINE_PROFILE.md) only for founder-local execution
9. Relevant dated evidence

GitHub `main`, the exact branch/PR and executable evidence override summaries and chat memory.

## Application snapshot

- Product: mobile-first, search-first classified-listing concept for Türkiye.
- Repository: `ronurgungor/arar-buluruz`.
- Public URL: `https://arar-buluruz.lovable.app`.
- Frontend: React, TanStack Start, TypeScript, Tailwind/shadcn.
- Package boundary: Bun `1.3.14` and `bun.lock`.
- Lovable: frontend editor/hosting surface only; its backend features remain disabled.
- Gate 1 PostgreSQL migration/RLS/adapter/test work is retained as a reusable technical asset but is not an active real pilot.

## Active phase — V0

**V0 — UX ve değer önerisi doğrulaması** is the only active product phase.

V0 may validate only:

- whether people understand the product;
- search and listing discovery;
- listing cards and detail pages;
- mobile and desktop usability;
- minimal-PWA installability;
- general user interest.

V0 must not be reported as validating:

- real listing creation;
- account creation;
- listing ownership or management;
- sustainable moderation;
- the seller-contact operating model;
- a functioning supply-demand loop.

The live V0 uses synthetic/mock listings only and must disclose that it is a test version. It uses no real account, real listing, real seller phone/email, advertising or analytics.

## Minimal-PWA boundary

Allowed:

- manifest;
- durable application identity;
- correct icons;
- installability;
- safe and honest offline/error screen.

Excluded:

- push notifications;
- background sync;
- full offline listings;
- cache-first dynamic listings;
- auth or real backend;
- advertising or analytics;
- TWA or Play Store.

## Backend freeze and no-rebuild rules

- Do not reopen backend selection unless there is an external user account, real personal data, an unworkable KVKK transfer model, measured free-tier/uptime failure, confirmed photo/storage need, or measured cost/technical necessity.
- Without a trigger, do not recommend switching between Supabase and Türkiye self-managed infrastructure.
- Supabase Free is development/technical-validation only; do not assume it is production infrastructure for a real external-user pilot.
- Keep PostgreSQL migrations canonical in GitHub.
- Keep UI and domain rules provider-independent.
- Keep Supabase calls inside adapters.
- Future user identity is an internal UUID; email/phone are not foreign keys.
- Do not block a future nullable `listings.owner_user_id`.
- Do not embed JWT/auth claim shape in the domain model.
- Do not add Supabase Storage, Realtime, Edge Functions or provider-heavy features before backend selection.

## Team and authority

- **Founder:** owns consequential product, backend, data, KVKK, cost and publish decisions.
- **Main assistant:** default routine implementer/coordinator within approved reversible scope.
- **Codex:** optional execution/test specialist when its terminal environment adds material value.
- **Work:** optional independent strategy/risk review for consequential uncertainty.
- **Lovable:** bounded frontend writer/hosting surface; never backend owner.

Only one writer operates at a time. Routine feature-branch, PR, CI and merge work may proceed under D-018. Stop before Lovable Publish/Update, production deploy, remote backend, secrets/environment, real data, auth, storage, paid service, advertising or analytics.

## Current task order

1. Prepare and validate the narrow V0 minimal-PWA package.
2. Produce exact diff, CI, screenshots, risks and rollback.
3. Merge routine repository work only after evidence passes.
4. Ask the founder once for Lovable Publish/Update approval.
5. Keep backend and real-user work frozen until a D-019 trigger exists.

## Knowledge write-back

- durable principle → project memory;
- current implementation/runtime → current state;
- pending work → backlog;
- consequential choice → decision log;
- test result → dated evidence;
- local-machine constraint → founder machine profile.

No secret, credential, private user record or unnecessary personal data belongs in these files.
