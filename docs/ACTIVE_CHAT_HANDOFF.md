# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-08-26, Europe/Istanbul_

## Purpose

This is the **short-lived continuity layer** between chat rooms.

It does not replace GitHub code, exact PR evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, the decision log or official external sources. It records the current working context that is most likely to be lost when a chat room fills up.

Before acting, a new chat must verify live GitHub state.

---

## Active roles

- **Founder:** final consequential decision owner.
- **Current Main Execution Chat:** `Sohbet 8` at the time of this handoff. When it fills, the role moves to `Sohbet 9`, then onward. The room number is not the identity of the role.
- **Current Advisor Chat:** `Sohbet Danışman 1` at the time of this handoff. When it fills, the role moves to `Sohbet Danışman 2`, then onward.
- **Codex:** budgeted highest-leverage specialist engineer; may implement difficult engineering work, but is not the routine default developer.
- **Work:** budgeted deep-research/analysis/independent-review specialist; does not own final project decisions.
- **Lovable:** credit-budgeted high-throughput frontend/UX specialist; use when it saves meaningful implementation effort.

Read `docs/AI_OPERATING_MODEL_V2.md` for the durable role/routing rules.

---

## Live repository checkpoint at handoff creation

Verified on 2026-08-26 before creating this handoff:

- Repository: `ronurgungor/arar-buluruz`
- Canonical branch: `main`
- Canonical `main` SHA: `0e00bb6ee6ad3f8a46ecdeabf8515dba934f7168`
- PR #74: merged/closed; hosted synthetic pilot RC proof completed.
- Issue #72: completed/closed in current-state documentation.
- Active phase: first real listing activation readiness.
- Issue #75: active first-real-listing readiness gate.
- PR #76: **OPEN**, base `main`, branch `agent/first-real-listing-readiness`, exact observed head `56e626a2a2f41bf0b847f014361f5a54d2551b2b`, mergeable at observation time.
- PR #76 changes activation-facing pilot/legal/logging preparation; it is **not merged** and does not authorize production or real data.

Re-verify all of the above before using them later.

---

## Proven technical state — do not casually rebuild

Current canonical evidence already supports:

- Development = PASS.
- Portability = PASS.
- Product pilot release-candidate technical proof = PASS.
- Managed Supabase synthetic → pinned self-host migration/rollback proof completed.
- Founder create → sanitized private photo → pending → publish → public search/detail → signed photo → seller contact → unpublish → hard delete flow proved synthetically.
- Separate reject → hard delete flow proved.
- Private Storage / signed-photo architecture proved.
- PWA/offline/fail-closed production-artifact behavior proved.
- Service-role/privileged material kept outside the public artifact/browser boundary.
- Tarladan remains untouched and out of scope.

Do not reopen these architecture blocks without a material new reason.

---

## Current pilot product model

The intended validation sequence is:

1. **1 real Çorlu listing**;
2. review;
3. **3 listings**;
4. review;
5. **5–10 listings**.

Current intended Stage-1 operating model:

- founder-operated moderation;
- no Auth;
- no seller account/dashboard;
- no public self-service write;
- no chat;
- no platform payment/order/reservation;
- no commission;
- **ads OFF during initial product validation**;
- seller calls founder;
- founder creates pending listing through trusted operator path;
- public seller contact initially **phone-only**;
- buyer/seller transaction happens outside Arar Buluruz;
- WhatsApp intake/contact/complaint is intentionally OFF for the first pilot direction.

Do not re-add Auth, dashboard, payment, chat, category tree, recommendation engine, Kubernetes or speculative infrastructure without measured need and explicit scope approval.

---

## Recent founder/advisor corrections that must not be lost

These points were clarified after some older readiness documents were written.

### 1. Truth and economic viability outrank reassurance

The founder explicitly prioritizes:

- facts over comforting conclusions;
- product usefulness over sunk-cost protection;
- revenue/economic viability over technical showmanship;
- the shortest defensible experiment over bureaucracy for its own sake.

Do not soften negative evidence merely to make the founder feel better.

### 2. REDTEAM materiality rule

Do not equate every legal/compliance uncertainty with a launch blocker.

For every proposed blocker ask:

> Why exactly does this stop the specific next bounded experiment?

Classify findings as:

- `BLOCKER` — must stop the next specific action;
- `IMPORTANT` — should fix/verify, not necessarily a stop;
- `CAN WAIT` — real but later;
- `FALSE POSITIVE / OVERENGINEERING` — do not spend time now.

### 3. Free validation is not treated as a generic government-permission gate

The current operating correction is:

- a free web/app product test is **not assumed to require a generic prior government approval/permission** merely because it is public;
- separate legal obligations such as privacy, provider notification/logging or takedown must still be evaluated on their actual applicability and materiality;
- a CİMER/SGB answer, if sought, is information/clarification and must not automatically be converted into a de facto permission certificate for product validation.

This is an operating/legal-materiality correction, not permission to ignore applicable law.

### 4. Company/business registration is not an automatic pre-revenue technical prerequisite

Do **not** assume the founder must create a Ltd./AŞ merely to test one free listing.

The initial validation direction is pre-revenue:

- 0 TL platform revenue;
- no ads initially;
- no commission/payment/order/reservation.

Company/tax/monetization status should be reopened when monetization or continued commercial operation actually makes it material.

Any PR/build rule that hard-codes business/tax registration as an unconditional prerequisite for the first free validation must therefore be re-reviewed rather than blindly accepted.

### 5. Monetization is a later explicit gate

Initial product-validation question:

> Do people discover/use the product and contact sellers?

Only after useful product/liquidity evidence should Ads/monetization be opened.

Ad economics should be measured from actual page/ad impressions and actual RPM/eCPM rather than using session time alone as the business model.

Opening Ads/revenue changes the tax/commercial fact pattern and requires a separate current-law review.

---

## PR #76 — current caution before merge

PR #76 contains substantial useful activation work, but it was created under assumptions that are now being re-examined.

Before merge, the Main Execution Chat / Advisor should specifically review whether PR #76 still incorrectly encodes any of the following as unconditional Stage-1 blockers:

- business/tax registration;
- public legal identity fields tied to a commercial-entity assumption;
- public residence/address assumptions not yet established for the exact pre-revenue fact pattern;
- any language that turns information/notification obligations into a prior-permission model.

Do not throw away valid PR #76 engineering work merely because some gate assumptions changed. Preserve good implementation and remove only stale assumptions after exact review.

PR #76 does **not** overlap this handoff-documentation branch at the time this file was created.

---

## Frontend / launch-completion question currently open

The advisor has been asked to determine whether the application is genuinely frontend-complete for the first real validation.

Known high-level state:

- home/search/listing-detail flows exist;
- city/district search exists;
- private photo + signed delivery architecture exists;
- seller phone contact exists in pilot preparation;
- phone-first `/ilan-ver` pilot direction exists in PR #76;
- complaint/contact/privacy/rules pages are being prepared in PR #76;
- seller-facing Auth/dashboard/self-service upload are intentionally absent, not missing features for Stage-1.

One launch/discovery item was identified for exact review before public traffic testing:

- pilot routes/sitemap/indexability behavior may still carry prior synthetic/private `noindex` assumptions.

Do **not** blindly implement an SEO change from this note. The Main Execution Chat should inspect exact current route/meta/robots/sitemap behavior and make the smallest launch-appropriate change only if public organic discovery is actually part of the first validation plan.

Do not build dozens of province/district SEO landing pages for a one-listing pilot.

---

## Specialist budget / routing state

At this handoff:

- **Lovable:** the most recent attempt reported workspace credits exhausted; previously created frontend-lab improvements may still exist and should be reviewed rather than recreated blindly.
- **Codex:** use as specialist engineering escalation where its superior engineering execution materially helps; do not spend usage on routine work.
- **Work:** use for difficult/high-consequence research or independent analysis only when a second pass materially reduces decision risk.

These are high-change facts; re-check availability before relying on them.

---

## Hard boundaries still in force unless founder explicitly changes them

- AWS OFF.
- Production activation OFF.
- Real personal data OFF until an explicit real-data/public-activation decision.
- Paid recurring infrastructure OFF.
- Tarladan untouched.
- No Auth/payment/chat/commission/ads during initial free validation unless a later founder gate explicitly changes scope.
- No secret/environment/production-resource mutation without explicit founder authorization.

---

## Immediate continuity objective

The next work should **not** restart architecture research from zero.

The current practical objective is:

1. finish the cross-chat operating/handoff documentation update;
2. let the Main Execution Chat inspect the exact current frontend + PR #76 state;
3. identify only the remaining work required for a real **1-listing free product validation**;
4. preserve already-proven photo/search/detail/PWA/backend contracts;
5. remove stale blockers/assumptions only when evidence justifies it;
6. use Codex/Work/Lovable only where their comparative advantage justifies limited usage;
7. reach the shortest defensible path to real traffic and real seller-contact evidence.

The project objective is not to maximize preparation. It is to learn whether Arar Buluruz can become a useful and profitable product without taking unjustified legal, privacy, security or financial risk.
