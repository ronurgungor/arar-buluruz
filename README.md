# Arar Buluruz

Türkiye geneline hitap eden, ücretsiz ilan verme ve ilan arama hizmeti sunmayı amaçlayan, aşırı sade ve hızlı bir mobil-öncelikli web uygulaması/PWA prototipi.

**Live prototype:** https://arar-buluruz.lovable.app

## Start here — humans and AI agents

Before making decisions or changes, read the canonical project context in this order:

1. [`AGENTS.md`](AGENTS.md) — operating contract, approvals and source priority
2. [`docs/ARAR_BULURUZ_PROJECT_MEMORY.md`](docs/ARAR_BULURUZ_PROJECT_MEMORY.md) — durable project knowledge
3. [`docs/ARAR_BULURUZ_CURRENT_STATE.md`](docs/ARAR_BULURUZ_CURRENT_STATE.md) — current implementation and verified state
4. [`docs/ARAR_BULURUZ_DECISION_LOG.md`](docs/ARAR_BULURUZ_DECISION_LOG.md) — consequential decisions and rationale
5. [`docs/AI_TEAM_CAPABILITIES.md`](docs/AI_TEAM_CAPABILITIES.md) — verified AI/tool access and limits
6. [`docs/ARAR_BULURUZ_BACKLOG.md`](docs/ARAR_BULURUZ_BACKLOG.md) — pending and ordered work

GitHub `main` and the exact branch/PR under review remain more authoritative than summaries. An AI without repository access must say so and request the minimum missing context.

## Product thesis

- Users type what they need directly instead of browsing a category tree.
- Search, listing creation and direct contact should remain simple and fast.
- Mobile use and one-handed interaction take priority.
- The prototype must clearly distinguish mock data and disabled actions from real capabilities.
- The project is independent from Tarladan and shares no code, data, integrations or brand assets with it.

## Current scope

The current stage is frontend-only and uses local mock data.

Not enabled:

- database or backend;
- Supabase/Lovable Cloud;
- authentication or SMS;
- real photo storage;
- payments;
- advertising SDK/network;
- secrets or external services;
- real user or seller data.

These require separate analysis and explicit founder approval as defined in `AGENTS.md`.

## Core screens

1. Home: Arar Buluruz wordmark, large search input, location, listing and profile access.
2. Search results: photo, title, price, location and minimal sorting/filter controls.
3. Listing detail: photos, title, price, description, location, seller name, call, WhatsApp and complaint flow.
4. Listing creation: prototype photo slots, title, price, location, description and editable preview.
5. Login/profile placeholder.

## Product constraints

- No visible category menu or required category selection.
- No unnecessary cards, carousel, news feed, campaign area or social features.
- No rating system, map, live chat, payment, shipping or order flow without a proven need.
- Main search screen has no ad placeholder.
- Ads remain design placeholders only and must not be deceptive or full-screen.

## Technology

- React + TanStack Start + TypeScript
- Tailwind CSS + shadcn/ui
- Bun `1.3.14`; canonical lockfile: `bun.lock`
- Vite/Nitro Cloudflare module build
- Lovable frontend editor/hosting connection

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

Do not run `npm install`, `npm ci` or create a second lockfile. Do not rewrite published Git history or force-push.

## Lovable

The project is connected to:

https://lovable.dev/projects/dca896f8-bb48-4a67-ae49-0493610ca6ad

Lovable remains a bounded frontend writer/hosting surface. Its database, auth, storage, secrets and edge functions stay disabled.
