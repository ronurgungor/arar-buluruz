# Arar Buluruz — Approved Execution Strategy — 2026-08-21

_Status: ACTIVE founder-approved execution decision. Europe/Istanbul._

This document is the current authority for infrastructure sequencing, pilot economics and execution boundaries where older repository documents conflict. Historical decision records remain useful evidence for the state in which they were written; they are not silently rewritten.

## 1. Operating decision

The project is no longer deciding whether to build Arar Buluruz. The active objective is the lowest-cost path to a technically release-ready, founder-operated Çorlu pilot while preserving a cheap exit if demand does not validate the product.

The product remains intentionally narrow:

- local listing marketplace;
- founder-operated moderation/publication;
- no seller Auth/accounts by default;
- no payment custody or commission;
- no advertising, paid listings or subscriptions during validation;
- buyers and sellers communicate outside the platform;
- one intentionally public seller contact may be shown within the active listing contract;
- no unnecessary marketplace dashboards, chat, recommendation engines, microservices or Kubernetes.

## 2. Phase 1 — development now

Development may use the founder's personal Supabase Free account only for mock/synthetic development data.

Hard current boundaries:

- target recurring infrastructure cost: **0 TL**;
- no AWS account creation yet;
- no paid infrastructure;
- no real seller/listing/contact/photo/personal data;
- no real users;
- no production backend activation;
- no production deployment change;
- no advertising or monetization;
- no payment integration.

GitHub migrations, tests and application contracts remain the source of truth. A remote Supabase project is not required to make repository/local-CI progress, and no remote project is implicitly authorized merely by this document.

## 3. Phase 2 — pre-production migration readiness

Before any real listing or user, the application must be able to move from managed Supabase to self-hosted Supabase without an architecture rewrite.

Required evidence includes:

- reproducible version-controlled SQL migrations;
- clean PostgreSQL/Supabase initialization;
- portable RLS, grants, functions and RPCs;
- managed Supabase to self-host migration rehearsal;
- logical database backup/export;
- clean restore;
- application-level restore verification;
- RLS/grant negative tests after restore;
- secrets/security review;
- rollback/kill-switch path;
- pinned self-hosted Supabase/Docker release used for the production rehearsal;
- documented configuration and restore procedure.

Database backup/restore and Storage object migration are separate contracts. A database-only restore must not be misrepresented as proof that Storage objects were migrated or restored.

Current self-host sizing assumption is approximately 2 vCPU minimum, preferably 8 GB RAM and 40–80+ GB SSD. This is a planning envelope, not permission to provision infrastructure now.

## 4. Phase 3 — real pilot later

Only when the application is genuinely release-ready should the new AWS account be opened so the new-customer credit/free-period clock starts as late as practical.

Current production candidate:

- AWS Istanbul Local Zone `eu-central-1-ist-1a`;
- AWS Paid Plan using eligible new-customer credits rather than assuming the Free Plan is appropriate for real personal-data production;
- one minimal EC2 instance + EBS + Docker + only required self-hosted Supabase services;
- no EKS/Kubernetes;
- no NAT Gateway unless technically unavoidable;
- no unnecessary high-cost AWS architecture.

Exact Istanbul instance availability, pricing/credit eligibility and burn rate must be re-checked on the account-opening day.

Residency requirements for the production gate:

- compute/data disk in Istanbul where the selected service supports it;
- snapshot destination explicitly configured as Local where required;
- prevent accidental parent-Region/Frankfurt snapshot paths where technically enforceable;
- minimize logs and personal data in resource names, tags, support cases and telemetry;
- do not claim that every AWS control-plane operation is Türkiye-resident merely because the data plane is in Istanbul.

This AWS plan supersedes older generic Türkiye-VPS/provider-selection wording only for the current preferred production candidate. It is still subject to the production gate and new evidence on the day of activation.

## 5. Validation economics

The approved sequence is:

**Build → validate real demand → establish economics → professionalize → monetize.**

Do not establish a company merely to test demand. Do not add ads or monetization to manufacture business-model evidence before the product has useful supply/demand signal.

Useful pilot evidence may include:

- listings created/published;
- listing views;
- contact CTA usage;
- repeat sellers;
- seller-reported contacts/results;
- organic listing growth;
- aggregate page/listing views;
- future advertising inventory potential.

Do not introduce invasive identity/account tracking simply to produce conventional MAU/retention metrics for the first validation slice.

If demand fails to materialize, stop the pilot, delete personal data according to the approved deletion procedure, terminate infrastructure and exit with minimal sunk cost.

## 6. Canary rollout

Real publication remains separately gated. Once authorized, expansion is deliberately staged:

1. 1 real Çorlu listing;
2. review;
3. 3 listings;
4. review;
5. 5–10 listings.

This is a canary rollout, not an instruction to delay indefinitely.

## 7. Risk philosophy

Do not reopen infrastructure research because a theoretical zero-risk solution does not exist.

A new blocker must materially affect at least one of:

- security;
- legality;
- data integrity;
- migration feasibility;
- ability to operate the pilot;
- unexpectedly meaningful cost.

Cheap and avoidable risks should be eliminated; remaining risks should be minimized, documented and reviewed at the appropriate gate.

## 8. Real-data gate remains closed

Before the first real listing, verify at minimum:

- KVKK transparency/aydınlatma;
- exact data-controller identity and contact channel;
- retention/deletion rules;
- data-subject request process;
- intentional public-contact disclosure;
- wrong-person/incorrect-phone rapid takedown;
- allowed listing categories/content moderation;
- AWS Istanbul configuration and current availability/cost;
- local backup and successful restore;
- Storage object backup/restore if photos are used;
- network hardening and non-public admin surfaces;
- TLS, secrets and least privilege;
- RLS/grants and negative tests;
- minimum logs;
- unpublish/kill switch.

**No repository preparation, CI success or documentation completion authorizes real personal data by itself.**

## 9. Supersession notes

Where older documents conflict with this decision:

- older **5–10 immediately** pilot wording is replaced by **1 → 3 → 5–10**;
- older generic provider-selection language is replaced by **managed Supabase Free for synthetic development → self-host readiness → later AWS Istanbul candidate**;
- older blanket wording that paid production infrastructure is impossible until revenue is replaced by the narrower rule here: **0 TL during development; later AWS Paid + eligible credits may be approved at the release-ready real-pilot gate before monetization**;
- historical Shopier/external-sales preparation remains out of the first pilot unless separately reopened;
- real-data and production-activation gates remain closed.

Use `docs/ARAR_BULURUZ_CURRENT_STATE.md` for the implementation status that accompanies this decision.
