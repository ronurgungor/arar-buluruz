# Arar Buluruz — Shared Project Memory

_Last reviewed: 2026-07-31, Europe/Istanbul_

## Purpose

This file stores durable project identity, product principles and architecture boundaries. Current implementation belongs in `ARAR_BULURUZ_CURRENT_STATE.md`; pending work belongs in `ARAR_BULURUZ_BACKLOG.md`; consequential decisions belong in `ARAR_BULURUZ_DECISION_LOG.md`.

## Canonical source order

1. GitHub `main` code and configuration
2. Exact branch/PR and executable evidence
3. `AGENTS.md`
4. `AI_CHAT_BOOTSTRAP.md`
5. This file
6. Current state, decision log, capability records and backlog
7. Dated evidence
8. Old chats only when needed

## Project identity

- Name: **Arar Buluruz**
- Repository: `ronurgungor/arar-buluruz`
- Founder-local checkout: `C:\Projects\arar-buluruz`
- Public URL: `https://arar-buluruz.lovable.app`
- Lovable project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Lovable workspace ID: `AERDgNbVzztF411nAuzp`
- Arar Buluruz is independent from Tarladan and shares no code, data, integrations or brand assets.

## Product thesis

Arar Buluruz is a simple, mobile-first, search-first classified-listing concept for Türkiye:

- people type what they need instead of navigating a required category tree;
- listings are fast to scan and easy to contact;
- unnecessary platform complexity stays hidden;
- the product aims to keep listing and discovery free and lightweight;
- advertising may be evaluated later only through a separate approved decision.

Do not add social feeds, ratings, maps, in-app chat, payment, shipping or order flows without measured need and explicit scope approval.

## Active phase principle

The active phase is **V0 — UX ve değer önerisi doğrulaması**.

V0 validates only product comprehension, search/discovery, listing card/detail UX, mobile/desktop usability, minimal-PWA installability and general interest. It does not validate real listing supply, accounts, listing management, moderation, seller contact operations or a supply-demand loop.

The live V0 uses synthetic/mock listings and visibly states that it is a test version. It contains no real account, real listing, real seller phone/email, advertising or analytics.

## Technical baseline

- Frontend: React, TanStack Start and TypeScript.
- UI: Tailwind CSS and shadcn/ui.
- Package manager: Bun `1.3.14`; `bun.lock` is canonical.
- Build: Vite/Nitro with the existing Lovable configuration.
- Lovable is a frontend editor and hosting surface, not backend owner.
- Lovable database, auth, storage, secrets and edge functions remain disabled.
- Gate 1 PostgreSQL migration, RLS, REST adapter and tests remain reusable technical preparation, not an active remote backend or pilot.

## Minimal-PWA boundary

The minimal PWA is limited to:

- manifest;
- durable application identity;
- correct icons;
- installability;
- safe and honest offline/error behavior.

It excludes push, background sync, complete offline listings, cache-first dynamic listings, auth, real backend, ads, analytics, TWA and Play Store.

## No-rebuild architecture boundaries

- PostgreSQL schema and migrations remain GitHub-canonical.
- UI and domain business rules remain independent from the backend provider.
- Supabase calls remain inside an adapter layer.
- Future user identity is represented by an internal UUID; email and phone are not foreign keys.
- No decision may prevent a future nullable `listings.owner_user_id`.
- Auth claim/JWT shape is not embedded in the domain model.
- Supabase Storage, Realtime, Edge Functions and provider-heavy capabilities are not introduced before backend selection.
- Lovable never receives permanent backend ownership or unilateral control.

## Backend decision freeze

Backend/provider selection remains closed until at least one measured trigger exists:

- external user accounts;
- real personal data;
- an unworkable KVKK transfer model;
- measured free-tier or uptime failure;
- confirmed photo/storage need;
- measured cost or technical necessity.

Without a trigger, do not recommend switching between Supabase and Türkiye self-managed infrastructure. Supabase Free may be used only for development and technical verification; it is not presumed to be production infrastructure for a real external-user pilot.

Any future backend must remain under founder control, use GitHub-canonical migrations, and receive separate review for region, RLS, auth, backups, retention/KVKK, secrets, export/restore and provider exit.

## Controlled synthetic contact

- Controlled prototype number: `+905321739111`
- Call target: `tel:+905321739111`
- WhatsApp target: `https://wa.me/905321739111`

This target is synthetic/prototype-only and does not prove a future seller-contact model.

## Operating model

- GitHub `main` is canonical.
- Only one code writer operates at a time.
- The main assistant is the default routine executor/coordinator when current tools are sufficient.
- Work and Codex are optional specialists, not mandatory handoffs.
- Validation depth follows touched risk rather than ritual repetition.
- Feature branch, PR, CI and routine merge may proceed under D-018.
- Founder approval is required before Lovable Publish/Update, another production deploy, remote backend, environment/secrets, real data, auth, storage, paid services, advertising or analytics.
- Never force-push or rewrite published history.

## Knowledge and privacy

Important product principles, identifiers, architecture limits, approvals, recovery and major decisions must not exist only in chat.

Do not store passwords, tokens, API keys, private customer/user records, unnecessary personal data or unverified assumptions in project memory.
