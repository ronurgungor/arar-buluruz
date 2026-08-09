# Arar Buluruz

Türkiye geneline hitap eden, ücretsiz ilan verme ve ilan arama hizmeti sunmayı amaçlayan, sade ve hızlı bir mobil-öncelikli web uygulaması/PWA projesi.

**Public V0:** https://arar-buluruz.lovable.app

## Start here — humans and AI agents

Every new chat or independent reviewer should first use the common bootstrap:

1. [`docs/AI_CHAT_BOOTSTRAP.md`](docs/AI_CHAT_BOOTSTRAP.md)
2. [`AGENTS.md`](AGENTS.md)
3. [`docs/ARAR_BULURUZ_PROJECT_MEMORY.md`](docs/ARAR_BULURUZ_PROJECT_MEMORY.md)
4. [`docs/ARAR_BULURUZ_CURRENT_STATE.md`](docs/ARAR_BULURUZ_CURRENT_STATE.md)
5. [`docs/ARAR_BULURUZ_DECISION_LOG.md`](docs/ARAR_BULURUZ_DECISION_LOG.md)
6. [`docs/ARAR_BULURUZ_BACKLOG.md`](docs/ARAR_BULURUZ_BACKLOG.md)
7. relevant technical contracts and dated evidence

GitHub `main` and the exact branch/PR under review are more authoritative than summaries or old chat memory.

## Product thesis

- Users type what they need directly instead of browsing a required category tree.
- Search, listing creation and contact should remain simple and fast.
- Mobile use and one-handed interaction take priority.
- Mock, inactive and real capabilities must never be presented as equivalent.
- The project is independent from Tarladan and shares no code, data, integrations or brand assets with it.

## Current repository vs public runtime

These are intentionally different and must not be conflated.

### Repository `main`

Current canonical `main` contains the public V0 application **plus inactive preparation** for a future founder-controlled real Çorlu pilot. PR #53 added schema/security/Storage/external-sales preparation and production runbook contracts, but did not activate a remote backend or real-data path.

### Currently deployed public V0

The public runtime remains:

- synthetic/mock listings;
- a zero-data demo listing form;
- no real backend connection;
- no real personal data;
- no real Storage;
- no Auth;
- no public external-sales CTA.

PR #52's V0 usability release was published, its public smoke test passed, users found the application understandable, and real users explicitly stated that their actual listings may be published. This validates **initial supply intent**, not a functioning real marketplace or sustainable operating model.

## Future controlled pilot target

The future target remains **5–10 founder-controlled real Çorlu listings**. Repository preparation does not authorize activation.

The provider-neutral external-sales decision remains:

- no Shopier API;
- no OAuth;
- no seller credential access;
- no scraping or iframe;
- Shopier is an independent third-party provider;
- a seller may later supply their own public sales URL;
- Arar Buluruz does not process or hold payment funds.

This functionality is not public today.

## Hard financial boundary

Arar Buluruz currently earns no revenue.

Therefore, until a separate explicit **FOUNDER BUDGET / REVENUE GATE** is approved:

- no paid VPS;
- no paid hosted backend;
- no paid backup;
- no recurring paid production infrastructure.

Technical readiness, a provider shortlist or a completed self-hosting runbook is **not spending authorization**.

## Privacy and activation boundary

Real personal-data collection remains blocked. No real seller listing/contact/photo data may be entered merely because the repository contains inactive backend preparation.

Future real-data activation requires a separate founder gate after privacy/KVKK, infrastructure, network, RLS/Storage, backup/restore and stability prerequisites pass.

## Technology

- React + TanStack Start + TypeScript
- Tailwind CSS + shadcn/ui
- Bun `1.3.14`; canonical lockfile: `bun.lock`
- Vite/Nitro with the existing Lovable frontend/hosting connection
- PostgreSQL/Supabase-compatible migration and RLS assets retained in GitHub

Lovable remains a bounded frontend writer/hosting surface. Its database, auth, storage, secrets and edge functions are not the active production backend.

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
