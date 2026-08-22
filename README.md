# Arar Buluruz

Türkiye geneline hitap etmeyi amaçlayan, sade ve hızlı mobil-öncelikli ilan arama/yayınlama web uygulaması/PWA projesi.

**Public V0:** https://arar-buluruz.lovable.app

## Start here — humans and AI agents

Current work must begin from the repository, not old chat memory.

Read in this order:

1. [`docs/ARAR_BULURUZ_CURRENT_STATE.md`](docs/ARAR_BULURUZ_CURRENT_STATE.md)
2. [`docs/EXECUTION_STRATEGY_2026-08-21.md`](docs/EXECUTION_STRATEGY_2026-08-21.md)
3. [`docs/AI_CHAT_BOOTSTRAP.md`](docs/AI_CHAT_BOOTSTRAP.md)
4. [`AGENTS.md`](AGENTS.md)
5. [`docs/ARAR_BULURUZ_DECISION_LOG.md`](docs/ARAR_BULURUZ_DECISION_LOG.md)
6. relevant technical contracts and dated evidence

Older `PROJECT_MEMORY`, `BACKLOG`, provider and readiness documents remain historical evidence. If their current-status/provider/budget wording conflicts with the two 2026-08-21 documents above, the newer documents control.

GitHub `main` and the exact branch/PR under review remain more authoritative than summaries.

## Current product boundary

The first real pilot is intentionally minimal and is **not active yet**.

Target operating model after later gates pass:

- founder-operated Çorlu pilot;
- rollout **1 listing → review → 3 → review → 5–10**;
- no seller Auth/accounts by default;
- no public self-service writes;
- no payment custody or commission;
- no chat;
- no advertising, paid listing or subscription during validation;
- buyers and sellers communicate outside the platform;
- exactly one intentionally public seller contact may be shown on an active listing;
- external-sales/Shopier functionality is out of the first pilot unless separately reopened.

## Current development/infrastructure sequence

### Now

- repository/local-CI development;
- founder-owned Supabase Free may be used only for synthetic/mock development data;
- production backend OFF;
- no real personal data/users/listings/photos;
- no AWS account yet;
- no paid infrastructure;
- target recurring development infrastructure cost: **0 TL**.

### Before real data

Prepare and prove:

- reproducible SQL migrations;
- managed Supabase → self-hosted Supabase portability;
- logical backup/export and clean restore;
- application-level restore verification;
- RLS/grant negative tests;
- rollback;
- exact self-hosted Docker release pinning;
- security/secrets/network configuration;
- Storage object migration/restore if real photos are used;
- KVKK/privacy/retention/deletion/takedown controls.

### Real pilot later

Current preferred production candidate is a minimal self-hosted Supabase deployment on AWS Istanbul Local Zone `eu-central-1-ist-1a`, using EC2/EBS/Docker and eligible new-customer credits after the application is genuinely release-ready.

This is a future candidate, not an instruction to open AWS now. Exact Istanbul availability, pricing, credit eligibility, snapshot residency/configuration and burn rate must be re-checked at the production gate.

## Repository vs deployed public V0

Do not conflate these states.

### Repository `main`

Contains the public V0 plus inactive preparation for:

- founder-controlled listing lifecycle;
- fail-closed RLS/grants;
- intentionally-public seller contact with internal readiness/audit fields;
- trusted private-photo ingestion/delivery primitives;
- logical backup/clean restore/application verification;
- future self-host migration.

### Public V0

The known deployed V0 remains synthetic/mock and non-collecting unless a separate deployment gate changes it:

- no authorized real backend connection;
- no real personal data;
- no real production Storage;
- no Auth;
- no public external-sales CTA;
- no payment/advertising/monetization activation.

Repository merges do not automatically authorize a Lovable Publish/Update or another production deployment.

## Photo scope caveat

Trusted photo primitives and synthetic Storage integration are prepared, but the public Supabase listing adapter currently maps `photos: []`.

Therefore:

- a zero-photo first real listing can remain the smallest release slice if media is explicitly out of scope;
- if the first real listing requires photos, buyer-visible signed-photo delivery and Storage object backup/migration/restore proof are required before real activation.

Database restore proof must not be presented as Storage-object restore proof.

## Technology

- React 19 + TanStack Start / Router / Query
- TypeScript
- Tailwind CSS + shadcn/ui
- Bun `1.3.14`; canonical lockfile: `bun.lock`
- Vite/Nitro
- PostgreSQL/Supabase-compatible version-controlled migrations, RLS and RPCs
- small PostgREST/fetch application adapter rather than a managed-only domain dependency

Lovable remains a bounded frontend/hosting surface. Its database, Auth, Storage, secrets and Edge Functions are not the active production backend.

## Development

```powershell
Set-Location C:\Projects\arar-buluruz
bun install --frozen-lockfile
bun run dev
```

Validation:

```powershell
bun run lint
bun run build
```

Do not run `npm install`, `npm ci`, create a second lockfile, force-push or rewrite published Git history.

## Absolute current prohibition

**REAL DATA COLLECTION and PRODUCTION ACTIVATION remain CLOSED until their later explicit gates pass.**
