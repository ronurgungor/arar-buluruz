# Arar Buluruz

Türkiye geneline hitap etmeyi amaçlayan, sade ve hızlı mobil-öncelikli ilan arama/yayınlama web uygulaması/PWA projesi.

**Public V0:** https://arar-buluruz.lovable.app

## Start here — humans and AI agents

Current work must begin from the repository, not old chat memory.

Read in this order:

1. [`docs/ARAR_BULURUZ_CURRENT_STATE.md`](docs/ARAR_BULURUZ_CURRENT_STATE.md)
2. [`docs/PRODUCT_CONTRACT_V2.md`](docs/PRODUCT_CONTRACT_V2.md)
3. [`docs/EXECUTION_STRATEGY_2026-08-21.md`](docs/EXECUTION_STRATEGY_2026-08-21.md)
4. [`docs/AI_CHAT_BOOTSTRAP.md`](docs/AI_CHAT_BOOTSTRAP.md)
5. [`AGENTS.md`](AGENTS.md)
6. [`docs/ARAR_BULURUZ_DECISION_LOG.md`](docs/ARAR_BULURUZ_DECISION_LOG.md)
7. relevant technical contracts and dated evidence

Older `PROJECT_MEMORY`, `BACKLOG`, provider and readiness documents remain historical evidence. If their current-status/provider/budget wording conflicts with the current-state/strategy documents above, the newer documents control.

GitHub `main` and the exact branch/PR under review remain more authoritative than summaries.

## Current product boundary

The current repository product contract is a **Türkiye-wide seller self-service classifieds experience**. It is technically prepared and verified in PR #78, but production/real-data activation is still OFF.

Current consumer model:

- seller creates the listing directly;
- 1–8 trusted photos;
- broad category + title + condition;
- price or Ücretsiz;
- description + İl / İlçe;
- seller display name + phone;
- Telefon / WhatsApp / Telefon + WhatsApp;
- provider-neutral phone verification;
- atomic auto-publication after required declaration/publication evidence and trusted-photo readiness;
- lightweight phone-verified `İlanlarım` ownership;
- founder post-moderation/takedown;
- search normalization including `b150` ↔ `b 150`;
- no classic username/password account;
- no in-app chat, payment/order/reservation/commission/shipping.

Older Çorlu-only, seller-calls-founder, founder-pre-approval, phone-only, WhatsApp-OFF and no-self-service assumptions are historical/superseded as current product truth.

Frontend exact-head checkpoint:

`41691652070cbc117a943578a49056d49d51e6f0`

All seven canonical workflows were GREEN on that exact head. See `docs/PRODUCT_CONTRACT_V2.md` and `docs/ARAR_BULURUZ_CURRENT_STATE.md`.

Production activation, real personal data, AWS/paid infrastructure, Ads/monetization and Tarladan changes remain closed.

## Current development/infrastructure sequence

### Now

- repository/local-CI development;
- isolated founder-owned `Arar Buluruz / arar-buluruz-synthetic-dev` Supabase **Free** project is available for synthetic/mock development and portability evidence only;
- project ref: `rzosrvenlvhijeckmwyc`, region `eu-central-1` / Frankfurt;
- the existing `tarladan` Supabase organization/projects are out of scope and remain untouched;
- production backend OFF;
- no real personal data/users/listings/photos;
- AWS OFF;
- no paid infrastructure;
- target recurring development infrastructure cost: **0 TL**.

### Before real data

The repository now has passing synthetic evidence for:

- reproducible PostgreSQL 17 migrations;
- fail-closed RLS/grants and negative tests;
- logical DB backup/export and clean restore;
- application-level restore verification;
- private Storage object backup/restore with byte/hash verification;
- buyer-visible lifecycle-gated short-lived signed-photo delivery;
- exact self-hosted Supabase release/image pinning;
- separate self-host Docker target migration/restore;
- source rollback after destroying the target;
- loopback-only self-host rehearsal exposure and secret/default checks;
- **real dedicated managed Supabase Free → exact pinned self-host DB + Storage migration and rollback**.

The final hosted provider-specific portability checkpoint passed in GitHub Actions run `32638398176` on exact `main` SHA `2f86ec41cb2b6dd3f51d2ac3999a0739ffd32469`. Issue #66 is **CLOSED / COMPLETED**.

Separate privacy/legal and actual production network/TLS/backup-residency gates remain required before real data.

### Real pilot later

Current preferred production candidate is a minimal self-hosted Supabase deployment on AWS Istanbul Local Zone `eu-central-1-ist-1a`, using EC2/EBS/Docker and eligible new-customer credits after the application is genuinely release-ready.

This is a future candidate, not an instruction to open AWS now. Exact Istanbul availability, pricing, credit eligibility, snapshot residency/configuration and burn rate must be re-checked at the production gate.

## Repository vs deployed public V0

Do not conflate these states.

### Repository / current release candidate

Contains the public V0 plus inactive preparation for:

- founder-controlled listing lifecycle;
- fail-closed RLS/grants;
- intentionally-public seller contact with internal readiness/audit fields;
- trusted private-photo ingestion;
- lifecycle-gated public signed-photo delivery;
- logical DB backup/clean restore/application verification;
- separate Storage object backup/restore;
- pinned self-host migration/restore and rollback rehearsal;
- dedicated hosted managed Free → pinned self-host portability proof.

### Public V0

The known deployed V0 remains synthetic/mock and non-collecting unless a separate deployment gate changes it:

- no authorized real backend connection;
- no real personal data;
- no real production Storage;
- no Auth;
- no public external-sales CTA;
- no payment/advertising/monetization activation.

Repository merges do not automatically authorize a Lovable Publish/Update or another production deployment.

## Photo and Storage readiness

The public Supabase listing adapter supports buyer-visible photos from the private `listing_photos` bucket through lifecycle-gated, short-lived signed URLs without exposing service-role secrets.

Synthetic migration/restore rehearsal separately verifies both database state and Storage object bytes. The canonical fixture is exactly one 72-byte WebP object and the application verifies SHA-256:

`fd89cface8e12174fb1c6e78c0a8b0b26be925820eed38713ff1d921d5f969df`

The same object/hash contract passed both the local self-host rehearsal and the live dedicated managed-Supabase → pinned-self-host rehearsal.

Database restore must still not be presented as equivalent to Storage-object restore; they are deliberately separate backup/verification paths.

## Pinned self-host rehearsal

Current tested synthetic target is pinned to:

- Supabase self-host release `self-hosted/v0.8.0`;
- upstream commit `241bb11c0627f2981746d37033f57dbfa81d29b0`;
- PostgreSQL `supabase/postgres:17.6.1.136`;
- Storage API `supabase/storage-api:v1.60.4`;
- PostgREST `postgrest/postgrest:v14.12`;
- Envoy `envoyproxy/envoy:v1.39.0`.

Both portability paths have passed:

- local synthetic source → separate pinned target → target verification → target destruction → source rollback;
- dedicated hosted Supabase Free synthetic source → the same pinned target → target verification → target destruction → managed-source rollback verification.

The previous provider-specific checkpoint is therefore complete.

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

**REAL DATA COLLECTION, AWS/PAID INFRASTRUCTURE and PRODUCTION ACTIVATION remain CLOSED until their later explicit gates pass.**
