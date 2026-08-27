# Arar Buluruz — Product Contract V2

_Last updated: 2026-08-27, Europe/Istanbul_

## Authority

This file is the current **product contract** for the consumer classifieds experience.

It does not replace executable code, exact-head CI evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, legal/compliance decisions, or the decision log. If an older product note, pilot document, backlog entry or historical decision conflicts with this contract, the older product assumption is superseded unless explicitly re-opened by the founder.

## Product identity

Arar Buluruz is a simple, mobile-first classifieds product for **Türkiye**.

The product should feel like a normal consumer classifieds experience, not a pilot, test harness, founder-operated intake form, compliance form or internal admin tool.

Primary public roles are discoverable without introducing a classic account concept:

- **Ara**
- **İlan Ver**
- **İlanlarım**

## Seller publication flow

The seller creates the listing directly.

Current 4-step consumer flow:

1. photos;
2. category, title, condition, price / Ücretsiz;
3. description, İl, İlçe;
4. seller display name, phone, contact preference, short required declarations, phone verification and publication.

### Photos

- 1–8 photos;
- local preview;
- first photo is the cover;
- reorder and remove are available;
- one-photo state does not show unnecessary reorder controls;
- the existing trusted image decode/re-encode, private Storage and lifecycle controls remain unchanged.

### Product fields

Broad categories remain intentionally simple. No complex category tree or category-specific attribute engine is required at this stage.

Condition has no default selection.

Price supports a normal TL/₺ presentation.

**Ücretsiz** is an explicit state:

- selecting Ücretsiz clears the visible price;
- the price field becomes inactive;
- turning Ücretsiz off returns an empty price field;
- free listings render as **Ücretsiz**, never `₺0`.

### Location

Location is Türkiye-wide:

- İl;
- İlçe;
- no Çorlu-only product restriction;
- no exact home-address field in the normal listing flow.

### Seller contact

Seller provides:

- display name;
- phone;
- contact preference: **Telefon / WhatsApp / Telefon + WhatsApp**.

The phone is verified through the current provider-neutral verification contract before the first publication action for that verified-phone capability.

The product does not require a classic username/password account.

### Required declarations

Backend-required declaration evidence remains mandatory, but consumer presentation must stay short and natural.

The declarations preserve the current semantics for:

- private/occasional seller status;
- content/photo rights and third-party-data responsibility;
- intentional publication of the selected seller-contact channel.

Longer detail belongs in linked notices/rules rather than a compliance wall in the main listing flow.

## Publication model

The current product contract is:

**seller self-service → verified phone → trusted photo completion → atomic auto-publication**

Normal publication is **not** founder pre-approval.

Founder operations are **post-moderation / takedown**.

The publication transaction must remain fail closed. A listing must not become public before all required publication facts and trusted photo state are ready.

Success state is consumer-facing:

- **İlanın yayınlandı**
- **İlanı görüntüle**
- **İlanlarım**

Raw UUID is not a prominent consumer element.

## Buyer search and listing detail

Search preserves the established normalization contract, including equivalent matching such as:

`b150` ↔ `b 150`

Search results prioritize:

1. photo;
2. title;
3. price / Ücretsiz;
4. location.

Listing detail prioritizes:

1. photos;
2. title;
3. price / Ücretsiz;
4. location;
5. description;
6. seller;
7. direct contact actions.

Seller-contact behavior remains exact:

- phone CTA → `tel:`
- WhatsApp CTA → `https://wa.me/`

There is no in-app chat, payment, shipping, reservation or ratings system in the current product contract.

## İlanlarım

`/ilanlarim` is lightweight seller ownership, not a traditional dashboard.

Flow:

**phone verification → own listings → manage**

Each listing shows:

- photo;
- title;
- price / Ücretsiz;
- location;
- lifecycle status.

Current actions:

- Görüntüle;
- Düzenle;
- Yayından kaldır;
- Satıldı;
- Sil.

Cross-phone ownership isolation remains a security boundary. A different verified phone must not infer or mutate another seller's listings.

No token/capability/auth implementation terminology belongs in consumer copy.

## Moderation

Founder moderation remains operationally available for post-publication control.

Founder can take down or delete a listing through the privileged server-side path.

A founder takedown must fail closed across:

- public collection;
- public detail;
- public contact;
- public signed-photo delivery.

Founder UI is not part of the consumer product identity.

## Security and backend invariants

Frontend work must not weaken or redesign these established boundaries without a demonstrated contract defect:

- RLS;
- service-role browser boundary;
- verified-phone capability isolation;
- seller lifecycle authorization;
- direct anonymous write denial;
- private Storage;
- trusted photo sanitization;
- signed-photo lifecycle;
- idempotency and race handling;
- rate limiting;
- atomic auto-publication;
- partial-failure cleanup;
- post-moderation takedown.

## Responsive quality

Consumer routes must remain usable and free of horizontal overflow across phone, tablet and desktop widths.

Current automated responsive smoke covers approximately:

- 360 px;
- 390 px;
- 768 px;
- 1280 px.

Touch targets, labels, focus behavior, loading, errors and empty states should remain consumer-grade.

## Exact-head frontend checkpoint

Frontend near-final checkpoint:

`41691652070cbc117a943578a49056d49d51e6f0`

PR #78 remains:

**OPEN / DRAFT / UNMERGED**

All seven canonical workflows are GREEN on that exact head:

- Activation readiness — `33091191102`;
- V0 minimal PWA — `33091191295`;
- CI — `33091191358`;
- Real pilot backend prep — `33091191160`;
- Stage 1 Phase A code gate — `33091191189`;
- Self-host migration rehearsal — `33091191164`;
- Stage 1 self-service acceptance — `33091191129`, successful rerun job `98587435492`.

The first Stage 1 acceptance attempt on this SHA failed before browser execution because local Supabase could not bind host port `54322`; rerunning the same job on the same SHA succeeded without application-code changes.

## Current hard boundaries

These remain closed unless explicitly authorized later:

- production activation;
- real personal data / real seller data;
- AWS / production hosting provisioning;
- recurring paid infrastructure/services;
- Ads/monetization;
- payment/order/reservation/commission;
- in-app chat;
- full classic Auth/account/password system;
- native app / Play Store rollout;
- Tarladan changes.

Repository readiness does not authorize production or real-data collection.
