# Arar Buluruz — Product Contract V2

_Last updated: 2026-08-28, Europe/Istanbul_

## Authority

This file is the current **consumer product contract** for Arar Buluruz.

Executable code, exact-head workflow evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, legal/compliance decisions and the decision log remain separate authorities for their own domains. Older product notes remain historical evidence; where they conflict with this contract, they are superseded unless the founder explicitly re-opens them.

## Product identity

Arar Buluruz is a simple, mobile-first classifieds product for **Türkiye**.

The consumer experience should feel like a normal classifieds product, not a founder intake form, pilot console, compliance questionnaire or internal admin tool.

Primary public roles:

- **Ara**
- **İlan Ver**
- **İlanlarım**

## Seller publication flow

The seller creates the listing directly.

Current consumer flow:

1. 1–8 photos;
2. broad category, title, optional condition, price / Ücretsiz;
3. optional description, İl, İlçe;
4. seller display name, one public phone, verification when required, concise publication disclosure and publish.

### Photos

- 1–8 photos;
- local preview;
- first photo is the cover;
- reorder/remove remain available;
- trusted decode/re-encode is mandatory;
- Storage remains private;
- public photo delivery remains lifecycle-gated and signed.

### Product fields

Broad categories remain intentionally simple. No large category tree or universal category-specific attribute engine is required in this stage.

**Condition is optional.** It has no silent UI or database default.

**Description is optional.** Empty description is a valid representation; filler text must not be fabricated.

Price supports normal TL/₺ presentation.

**Ücretsiz** is explicit:

- selecting Ücretsiz clears/inactivates the price field;
- turning it off returns an empty price field;
- public rendering says **Ücretsiz**, never `₺0`.

### Location

The product is Türkiye-wide:

- İl;
- İlçe;
- no Çorlu-only product restriction;
- no exact home-address field in the normal listing flow.

## Seller contact and verification

The seller provides:

- display name;
- **one phone number**.

There is **no seller contact-preference selector**.

The verified public phone is intentionally visible on an active listing and the buyer receives both actions derived from that same E.164 value:

- **Ara** → `tel:<verified phone>`
- **WhatsApp’tan yaz** → `https://wa.me/<same phone without +>`

Legacy/internal `contact_channel` metadata may remain for compatibility, but it is not a seller preference or consent field. New self-service listings derive the combined delivery metadata server-side.

The product does not require a classic username/password account.

### Remembered seller session

Successful phone verification creates a bounded seller-recognition session:

- signed;
- phone-bound;
- **HttpOnly**;
- **SameSite=Lax**;
- **Secure** on HTTPS;
- maximum current lifetime: **7 days**.

The secret session token is not stored in JavaScript-accessible local/session storage.

A still-valid session avoids needless repeat OTP prompts. Expiry, tampering or phone mismatch fails closed and requires verification again.

## Publication evidence

The former three consumer declaration checkboxes are **superseded**.

New publication does not fabricate historical declaration timestamps.

Current publication evidence is:

- verified phone;
- public-phone publication instruction;
- versioned listing-rules evidence: `listing_rules_version` + `listing_rules_accepted_at`;
- trusted-photo readiness;
- listing lifecycle readiness.

The publish action presents concise links/copy and records acceptance of the current listing-rules version. Privacy/aydınlatma remains informational/legal disclosure, not a blanket consent checkbox.

Historical declaration columns may remain nullable for migration/history compatibility. They are not required or invented for new self-service publication.

## Publication model

Current contract:

**seller self-service → verified/remembered seller session → trusted photo completion → atomic auto-publication**

Normal publication is **not founder pre-approval**.

Founder operations are **post-moderation / takedown**.

The publication transaction remains fail closed. A listing must not become public before all current publication facts and trusted-photo state are ready.

Success state remains consumer-facing:

- **İlanın yayınlandı**
- **İlanı görüntüle**
- **İlanlarım**

## Buyer search and detail

Search preserves established normalization, including:

`b150` ↔ `b 150`

Search results prioritize photo, title, price/Ücretsiz and location.

Listing detail prioritizes photos, title, price/Ücretsiz, location, optional condition, optional description, seller and the two direct contact actions.

There is no in-app chat, payment, order, reservation, commission, shipping or ratings system in the current product contract.

## İlanlarım

`/ilanlarim` is lightweight seller ownership, not a traditional dashboard.

Flow:

**remembered seller session when valid → otherwise phone verification → own listings → manage**

Actions:

- Görüntüle;
- Düzenle;
- Yayından kaldır;
- Satıldı;
- Sil.

Cross-phone isolation is a security boundary. Another verified phone must not infer or mutate the seller's listings.

## Rate limiting and abuse boundary

Rate limiting is purpose-specific rather than one undifferentiated IP counter:

- OTP-start limits include a phone-primary limiter plus coarse trusted-IP protection;
- wrong OTP attempts are challenge-bounded;
- listing creation/management uses seller-phone velocity limits plus coarse trusted-IP protection;
- idempotent replay is resolved before consuming a new-listing quota;
- local synthetic CI may use explicitly relaxed ceilings without weakening production-like limits.

Unexpected rate limiting remains observable by limiter class. Arbitrary forwarded headers must not bypass trusted-client-IP handling.

## Vasıta / Araç and EİDS

**Vasıta / Araç remains part of the product taxonomy and synthetic/local development experience.**

Real production vehicle publication is **fail closed until the required EİDS authorization verification is actually integrated and approved**.

Do not remove the category merely to avoid EİDS work; do not silently publish real vehicle listings before that gate.

## Moderation

Founder moderation is post-publication operational control, not routine listing entry.

Founder may inspect, take down or delete through the privileged server-side path. A takedown must fail closed across public collection/detail/contact/signed-photo delivery.

High-risk reports such as wrong-person phone, child imagery, sensitive data or unauthorized personal data should support immediate takedown-first review.

## Security/backend invariants

Do not weaken these without a demonstrated defect and founder-approved architecture change:

- RLS/grants;
- service-role outside browser;
- direct anon-write denial;
- private Storage;
- trusted image sanitization;
- signed-photo lifecycle;
- phone-bound seller authorization;
- idempotency/race handling;
- atomic publication;
- partial-failure/orphan cleanup;
- post-moderation fail-closed takedown.

## Current hard boundaries

Still OFF unless separately authorized:

- production activation;
- real personal data / real seller data;
- AWS / production infrastructure provisioning;
- recurring paid infrastructure/services;
- real SMS;
- EİDS production integration;
- Ads/monetization;
- payment/order/reservation/commission;
- in-app chat;
- classic Auth/password account system;
- native app / Play Store;
- Tarladan changes.

Repository readiness does not authorize real-data collection or production.

## Settled business/formalization sequence

The founder's current settled sequence is:

**APPLICATION COMPLETION → ŞAHIS ŞİRKETİ → KOSGEB → SUPPORT / INVESTMENT → FUNDED PRODUCTION / LEGAL / EİDS / INFRASTRUCTURE**

This sequence supersedes assumptions that paid production infrastructure, production EİDS/legal execution or monetization should be opened before the application is substantially complete and the company/KOSGEB sequence is reached.

## Historical supersession note

D-025 and earlier decisions remain historical records. The 2026-08-28 simplification specifically supersedes:

- seller selection among Telefon / WhatsApp / Telefon + WhatsApp;
- three consumer declaration checkboxes;
- fabricated declaration timestamps;
- short-lived JavaScript-readable capability framing;
- universal condition/description requirements.

It does **not** erase the prior decisions or their evidence. Valid security, privacy, migration and lifecycle principles remain preserved where compatible with this contract.

## PR #78 closure rule

PR #78 remains **OPEN / DRAFT / UNMERGED** until explicitly changed by the founder.

Do not claim final technical closure until all seven canonical workflows are **SUCCESS on one exact SHA**. Live GitHub workflow evidence controls over older checkpoint text.
