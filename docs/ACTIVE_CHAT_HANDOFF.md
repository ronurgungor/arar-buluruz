# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-08-27, Europe/Istanbul_

## Purpose

This is the short-lived continuity layer between Arar Buluruz chat rooms.

It does not replace live GitHub, exact workflow evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, `PRODUCT_CONTRACT_V2.md`, the decision log or official external sources. A new room must verify live repository state before acting.

## Active roles

- **Founder:** final consequential decision owner; not routine QA.
- **Main Execution Chat:** ordinary implementation, debugging, CI and repository synchronization owner.
- **Advisor Chat:** independent product/strategy/risk review.
- **Codex:** narrow specialist engineering/security review when a Codex session is actually available.
- **Work:** deep research/independent review when materially useful.
- **Lovable:** optional frontend accelerator only; never a hard dependency.

One-writer rule remains in force.

## Live repository checkpoint

Frontend exact-head checkpoint independently and executable-evidence verified:

`41691652070cbc117a943578a49056d49d51e6f0`

PR #78:

**OPEN / DRAFT / UNMERGED**

All seven canonical workflows are GREEN on that exact head:

- Activation readiness — run `33091191102`;
- V0 minimal PWA — run `33091191295`;
- CI — run `33091191358`;
- Real pilot backend prep — run `33091191160`;
- Stage 1 Phase A code gate — run `33091191189`;
- Self-host migration rehearsal — run `33091191164`;
- Stage 1 self-service acceptance — run `33091191129`, successful rerun job `98587435492`.

The initial Stage 1 acceptance attempt failed before the browser journey because local Supabase could not bind host port `54322`. The same job was rerun on the same SHA and passed with no application-code change. Treat this as resolved runner/local-container collision evidence, not a product regression.

Subsequent documentation-only commits on the PR branch may move the branch head. Re-verify live GitHub before relying on this exact SHA as current branch head.

## Current product truth

Read `docs/PRODUCT_CONTRACT_V2.md` before making product decisions.

The current consumer model is:

- Türkiye-wide İl / İlçe;
- seller self-service;
- 1–8 trusted photos;
- broad categories;
- explicit condition selection;
- priced or **Ücretsiz**;
- seller display name + phone;
- contact preference: **Telefon / WhatsApp / Telefon + WhatsApp**;
- provider-neutral phone verification;
- short required seller/publication declarations;
- atomic auto-publication after all required facts and trusted-photo state are ready;
- founder **post-moderation/takedown**, not normal pre-approval;
- lightweight `İlanlarım` ownership via phone verification;
- no classic username/password account;
- no in-app chat, payment, order, reservation, commission or shipping;
- search normalization including `b150` ↔ `b 150`;
- near-final consumer UX on `/ilan-ver`, `/ara`, `/ilan/$id`, `/ilanlarim`;
- public header: **Ara / İlan Ver / İlanlarım**.

The following older assumptions are superseded as current product identity:

- Çorlu-only product;
- seller calls founder;
- founder routinely creates listings;
- founder pre-approval as normal publication;
- phone-only seller contact;
- WhatsApp OFF;
- no self-service;
- no seller ownership surface;
- pilot/test/internal-tool framing in consumer UI.

Historical documents may still describe those states. Do not delete history merely to make old evidence look current.

## Frozen backend/security invariants

Do not reopen these without a demonstrated contract defect:

- RLS and grants;
- service-role outside browser;
- verified-phone capability isolation;
- cross-phone authorization;
- direct anon-write denial;
- private Storage;
- trusted photo decode/re-encode;
- signed-photo lifecycle;
- atomic auto-publication;
- idempotency/race handling;
- rate limiting;
- partial-failure/orphan cleanup;
- founder post-moderation fail-closed takedown.

Tarladan remains untouched.

## Current hard boundaries

Still OFF / closed unless explicitly authorized later:

- production activation;
- real personal data / real seller data;
- AWS / production provisioning;
- recurring paid infrastructure/services;
- Ads/monetization;
- payment/order/reservation/commission;
- in-app chat;
- full classic Auth/password system;
- native app / Play Store;
- production secret/environment mutation.

Repository readiness is not real-data or production authorization.

## Lovable state

Lovable is not blocking the product.

Latest pre-flight established:

- workspace: Onur's Lovable;
- plan: Free;
- usable credits unavailable at that checkpoint;
- official Arar Buluruz Lovable project stale relative to the frozen GREEN branch;
- no safe Lovable implementation base was available;
- no Lovable implementation/diff was created.

Do not wait for Lovable, buy credits, use stale Lovable main or discard completed direct frontend work. If credits later become available, use it only for a bounded visual/accessibility polish pass from the then-current exact SHA.

## Immediate continuation objective

After the frontend exact-head GREEN checkpoint:

1. synchronize canonical docs and Issue #75 to the current product truth;
2. synchronize the founder Windows development-machine profile;
3. run the approved narrow security REDTEAM against the current code state when the requested specialist is available;
4. fix only MATERIAL repository-controlled findings;
5. rerun all seven canonical workflows on one exact final SHA if code/security changes occur;
6. keep PR #78 **DRAFT / UNMERGED**;
7. stop for founder/advisor hands-on product review.

Founder should inspect the product as a user, not perform routine technical QA.
