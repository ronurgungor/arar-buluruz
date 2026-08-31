# Arar Buluruz — Shared Project Memory

_Last reviewed: 2026-08-31, Europe/Istanbul_

## Purpose

This file stores durable project identity, product principles and architecture/governance boundaries. Current implementation belongs in `ARAR_BULURUZ_CURRENT_STATE.md`; pending work belongs in `ARAR_BULURUZ_BACKLOG.md`; consequential founder decisions belong in `ARAR_BULURUZ_DECISION_LOG.md`.

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
- Arar Buluruz is independent from Tarladan and shares no code, data, integrations or brand assets.

## Product thesis

Arar Buluruz is a simple, mobile-first, search-first classified-listing concept for Türkiye:

- people type what they need instead of navigating a required category tree;
- listings are fast to scan and easy to act on;
- unnecessary platform complexity stays hidden;
- listing and discovery should remain lightweight;
- advertising, payments and heavier marketplace systems require measured need and separate approval.

Arar Buluruz is intended to become a business, not a permanent hobby prototype. The economic operating principle is:

- complete all reasonably feasible revenue-readiness work at **0 TL recurring production cost** first;
- begin recurring production spending only when it becomes necessary and separately founder-approved;
- once recurring spend begins, minimize the remaining time to a monetizable Phase 2 launch.

The current primary Phase 2 monetization **hypothesis** is Google programmatic advertising while core listing/search remains free. This is not an advertising implementation authorization. Ads, analytics and advertising SDKs remain separately gated.

Do not add social feeds, ratings, maps, in-app chat, payment, shipping or order flows without measured need and explicit founder scope approval.

## Current evidence boundary

The published V0 has validated:

- product comprehension: users found the application understandable;
- the current search/discovery/listing-detail usability boundary;
- **initial real supply intent**: real users explicitly said their actual listings may be published.

It has not validated:

- real-world seller completion and repeat usage;
- moderation sustainability at real volume;
- buyer contact/conversion;
- abuse and wrong-person-phone rates;
- marketplace liquidity / a functioning supply-demand loop;
- production backend reliability under real traffic.

Repository tests now validate the **technical** seller self-service, ownership, direct-contact and post-moderation contracts synthetically. They do not validate those behaviors with real users.

The old founder-controlled Çorlu intake target is historical. The current product contract is Türkiye-wide seller self-service. Any first real-data rollout may still be operationally bounded, but its geography/size is a separate activation decision rather than a product-contract restriction.

## Repository/public-runtime separation

GitHub `main` and the currently deployed public V0 are intentionally not identical in capability.

Repository `main` contains inactive real-pilot backend/schema/security preparation merged through PR #53.

The public runtime remains:

- synthetic/mock listings;
- zero-data demo listing flow;
- no real backend connection;
- no real personal data;
- no real Storage;
- no Auth;
- no public external-sales CTA.

Never infer that repository preparation is active production functionality.

The current source hardening contract additionally requires that founder/personal telephone numbers are not embedded as application contact targets. Public V0 contact actions stay fail-closed and Gate 1 browser coverage may use only an explicit non-personal test sentinel.

## Technical baseline

- Frontend: React, TanStack Start and TypeScript.
- UI: Tailwind CSS and shadcn/ui.
- Package manager: Bun `1.3.14`; `bun.lock` is canonical.
- Lovable is a frontend editor/hosting surface, not backend owner.
- PostgreSQL migrations, RLS and backend-preparation assets remain GitHub-canonical.
- PR #53 adds inactive preparation for a future controlled real Çorlu pilot; it does not activate a remote production system.

## No-rebuild architecture boundaries

- PostgreSQL schema and migrations remain GitHub-canonical.
- UI and domain business rules remain provider-independent.
- Supabase-specific calls stay behind adapter/server boundaries.
- Future user identity is an internal UUID; email and phone are not foreign keys.
- No decision may prevent a future nullable `listings.owner_user_id`.
- Auth claim/JWT shape stays out of the domain model.
- Lovable never receives permanent backend ownership or unilateral control.

## Future data-plane target

D-021 keeps the future technical target as a founder-controlled, Türkiye-located self-hosted Supabase-compatible data plane on Linux VPS when a real-data phase is justified.

This is a **technical target**, not a current purchase or activation authorization.

## Hard zero-spend boundary

D-022 remains a hard founder spending gate, but zero spend is a sequencing rule rather than the business objective itself:

- no paid VPS now;
- no paid hosted backend now;
- no paid backup now;
- no other recurring paid production infrastructure now;
- continue completing useful revenue-readiness work that can be proven at 0 TL first.

Any recurring production spend requires a separate explicit **FOUNDER BUDGET / REVENUE GATE**. When that gate is eventually opened, the decision should consider both recurring cost and how quickly the remaining work can reach a monetizable Phase 2.

Technical readiness, provider research, a production POC plan or a self-hosting runbook does not authorize spending by itself.

## External-sales / Shopier boundary

The accepted product model is provider-neutral **External Sales Link / Satış bağlantısı**, not a Shopier integration.

- no Shopier API;
- no OAuth;
- no seller credential access;
- no scraping;
- no iframe;
- no partnership/verification claim;
- Shopier is an independent third party;
- a seller may later provide their own public sales URL;
- Arar Buluruz does not process or hold payment funds.

The functionality is not public today.

A research report may recommend a particular VPS provider, backup vendor or seller-contact model. Such recommendations are non-binding unless the founder explicitly records a decision in the decision log.

## Privacy/data boundary

Real personal-data collection remains blocked.

Repository tables/contracts for future contact, photos or external links are inactive preparation. They do not authorize collection or publication of real seller data.

Future real-photo handling has a mandatory trust boundary before any uploaded photo can become publicly retrievable:

`untrusted bytes -> byte/MIME/signature limits -> trusted image decode -> orientation normalization -> approved re-encode -> sanitized bytes -> controlled private storage/delivery`

The prepared sanitizer must fail closed on malformed/unsupported/oversized input or decoder/encoder failure and must remove unnecessary container metadata such as EXIF/GPS/XMP through actual decode/re-encode rather than string stripping. Real Storage and public photo delivery remain closed until a separate activation gate wires and revalidates this boundary.

A future real-data gate must approve the actual privacy/KVKK/data-flow and operational controls before any real seller listing/contact/photo data is entered.

## Operating model

- GitHub `main` is canonical.
- Only one code writer operates at a time.
- The main assistant is the default routine executor/coordinator inside an explicitly approved scope.
- Independent reviewers, including Claude, are advisory only.
- Validation depth follows touched risk rather than ritual repetition.
- Founder approval is required before production deploy, Lovable Publish/Update, remote backend activation, environment/secrets, real data, Auth/Storage activation, paid services, advertising or analytics.
- Never force-push or rewrite published history.

## Independent-review governance

An external or independent AI review may identify defects, risks or recommendations. Its output is evidence/advice, not authorization.

No reviewer recommendation automatically becomes:

- a founder product decision;
- a new architecture decision;
- a vendor selection;
- a paid commitment;
- a repository implementation task.

Any consequential follow-up requires a separate founder-approved gate.

## Knowledge and privacy

Important product principles, identifiers, architecture limits, approvals, recovery and major decisions must not exist only in chat.

Do not store passwords, tokens, API keys, private customer/user records, unnecessary personal data or unverified assumptions in project memory.
