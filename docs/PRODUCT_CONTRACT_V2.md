# Arar Buluruz — Product Contract V2

_Last updated: 2026-09-11, Europe/Istanbul_

## Authority

This file is the current consumer product contract for Arar Buluruz. Live GitHub, executable exact-head evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, legal/compliance decisions and the decision log remain separate authorities for their own domains. Dated older documents remain historical evidence only where this contract supersedes them.

## Product identity

Arar Buluruz is a simple, mobile-first classifieds product for Türkiye. The public experience is a normal classifieds flow, not a founder intake form, test harness, identity product or payment intermediary.

Primary public roles remain **Ara**, **İlan Ver** and **İlanlarım**.

## Seller principal, role, ownership and recovery

Ordinary-goods seller ownership is **SMSless**.

- `private.sellers` is the persistent pseudonymous ownership principal.
- A seller-owned listing binds `listings.owner_user_id` to that UUID.
- The seller principal/session/recovery model does **not** encode whether the seller is a private person, professional seller or regulated business.
- Seller role is a separate internal policy assessment. Supported architecture states are `unknown`, `private_occasional`, `professional` and `regulated_business`.
- An unknown seller role is valid and non-blocking for ordinary-goods ownership; future reassessment changes policy metadata, not the seller UUID or listing ownership identity.
- Role assessment records preserve basis, assessment time, review/reassessment state, policy version, origin and bounded evidence metadata. This contract does not authorize company onboarding, tax-number collection, KYC or business-document upload.
- SMS OTP is removed as an ordinary-goods product requirement.
- The public phone number is listing contact data. It is **not** legal identity, account identity or authorization identity.
- Equal phone numbers do not imply equal sellers. Changing a listing phone never transfers ownership.
- Historical rows are not ownership-backfilled from phone equality or other public contact attributes.

The seller session is server-side and revocable:

- the browser receives only a high-entropy opaque cookie token;
- the cookie is HttpOnly, SameSite=Lax and Secure on HTTPS;
- current maximum lifetime is seven days;
- only a SHA-256 token digest is persisted server-side;
- every logout attempt clears the browser cookie; successful server revocation completes logout, while an unconfirmed revoke returns explicit partial-failure semantics and must not claim server logout completed;
- expired, malformed, unknown or revoked sessions fail closed.

Initial seller creation also returns a high-entropy rotating recovery code for the seller to save. Plaintext recovery material is transiently shown to the seller but is not persisted in the database, logs, localStorage/sessionStorage or URL. The database keeps only a non-secret selector and digest.

For a normal recovery rotation, the browser generates replacement candidate **B** with Web Crypto and shows it to the seller **before** the irreversible `A → B` atomic recovery mutation. The server validates/hashes the credentials and uses the privileged atomic `recover_seller_identity(...)` primitive, which consumes A, installs B, revokes prior seller sessions and creates a replacement session. If the response to `A → B` is ambiguous, the browser must generate and display a second replacement candidate **C before any reconciliation mutation**. Reconciliation then attempts `B → C` through the same atomic primitive. If `A → B` committed, B is current, `B → C` succeeds, B is consumed and C becomes current; replay of B fails. If `A → B` did not commit, `B → C` fails. That failure must not be presented as proof that A is definitely still valid, because a concurrent rotation cannot be excluded.

Manual line-control or WhatsApp-control verification is **risk-triggered only**. Any retained `contact_verified_at` / verification-method fields are historical or risk-control evidence; they are not ordinary-goods authorization prerequisites.

There is no general e-Devlet login. Passkey, email, OAuth and password authentication are deferred until evidence justifies them.

## Listing product metadata vs policy/legal scope

Seller-selected category/product metadata is not the sole compliance authority.

- Broad `category` and structured product type remain product metadata.
- A separate server-owned policy decision records the current legal/product scope, decision basis, policy version, evaluation time, origin and optional evidence provenance.
- Supported architecture scopes are `ordinary`, `eids_vehicle`, `eids_real_estate`, `review_required` and `restricted`.
- Deterministic structured facts only are used in this freeze; no AI classifier is authorized.
- Vehicle/automobile resolves fail-closed to `eids_vehicle`; real-estate/housing resolves fail-closed to `eids_real_estate`.
- Ambiguous `other` without structured product type resolves to `review_required`, so choosing Other cannot permanently grant ordinary-goods publication authority.
- An operator may later override/reassess policy through an explicit evidence-bearing decision without changing seller ownership.

## Orthogonal listing state axes

`public.listings.status` remains a legacy/current workflow field during migration; it is not the long-term sole authority for every public behavior.

The internal architecture separately represents:

- **Lifecycle:** `draft`, `active`, `sold`, `withdrawn`, `expired`, `deleted`.
- **Eligibility:** `eligible`, `review_required`, `regulated_verification_required`, `blocked`.
- **Enforcement:** `clear`, `held`, `removed`.
- **Contact availability:** `available`, `suppressed`.

These axes may change independently. A legal takedown or contact suppression never changes seller ownership identity.

## Seller publication flow

The seller creates the listing directly:

1. establish or reuse a valid seller session;
2. add 1–8 trusted photos;
3. choose a broad category and title;
4. optionally set condition and description;
5. set price or explicit **Ücretsiz**;
6. choose İl / İlçe;
7. provide seller display name and one intentionally public phone;
8. accept the current versioned listing rules and record the public-phone publication instruction;
9. publish through the atomic server-side publication path.

Normal publication is not founder pre-approval. Founder operations are post-moderation/takedown, with an exceptional local-only moderation surface for recovery/operations.

The publication transaction fails closed unless seller ownership, public-contact instruction, rules evidence, trusted-photo readiness and lifecycle state are complete. The server-owned policy scope and orthogonal eligibility/enforcement/contact axes additionally constrain public capability exposure.

## One derived public capability contract

Public exposure is decided by one internal listing-level capability seam rather than independent route-specific policy copies. It can answer whether the listing may expose:

- search/index candidate;
- detail;
- signed photo;
- public contact / WhatsApp;
- external sales CTA where applicable.

The decision derives from legacy publication readiness plus lifecycle, eligibility, enforcement, contact availability, server-owned policy scope and expiry. Existing valid ordinary published listings keep their normal public behavior.

Fail-closed rules include:

- unresolved/restricted policy scope does not become public;
- regulated EİDS scopes remain unavailable until separately approved verification makes them eligible;
- held/removed enforcement removes public capabilities;
- contact suppression removes contact capability and, while contact fields still live on the current public listing row, conservatively removes row-level public surfaces to prevent contact leakage;
- signed-photo delivery reuses the existing canonical WebP/private-Storage checks and delegates only listing-level eligibility to the capability seam;
- external CTA additionally requires the existing ownership, listing-match, moderation, complaint and explicit `allow_public_cta` facts. Listing capability alone never approves an external link.

## Public contact

An active capability-approved listing exposes one public E.164 phone and derives both buyer actions from it:

- **Ara** → `tel:<phone>`
- **WhatsApp’tan yaz** → `https://wa.me/<phone without +>`

The phone is intentionally public contact information while the listing is active and contact availability is not suppressed. It must never be treated as the credential for `İlanlarım`, edit, unpublish, sold or delete operations.

## İlanlarım

`/ilanlarim` is lightweight seller-owned listing management.

A valid opaque seller session authorizes access to listings whose `owner_user_id` matches the resolved `seller_id`. If the cookie is lost, the seller may recover using the rotating recovery code.

Actions remain:

- Görüntüle;
- Düzenle;
- Yayından kaldır;
- Satıldı;
- Sil.

Seller A/B isolation is `seller_id → owner_user_id`, not phone equality.

## Photos, publication and takedown invariants

The established controls remain mandatory:

- 1–8 photos;
- trusted decode/re-encode before accepted Storage state;
- private Storage;
- lifecycle/capability-gated signed public photo delivery;
- direct anonymous writes denied;
- RLS/grants and service-role/browser separation;
- idempotency and race handling;
- atomic publication and ambiguity reconciliation;
- partial-failure/orphan safeguards;
- post-moderation takedown fails closed across collection, detail, contact, CTA and signed-photo delivery.

A minimal internal enforcement case records case id, target listing, reason/type, received time, optional deadline, decision/action, action time, evidence/audit metadata and appeal/restoration state. No moderation dashboard is implied.

## Vasıta, Emlak and EİDS

Vasıta / Araç and Emlak remain available in product taxonomy and synthetic/local development.

**Real production publication for both Vasıta and Emlak must fail closed until the required EİDS authorization verification is actually integrated and separately approved.**

The server-owned policy decision separately records `eids_vehicle` or `eids_real_estate`; the architecture-freeze default eligibility for those scopes is `regulated_verification_required`.

No repository preparation or synthetic test is permission to call production EİDS. The only synthetic Vasıta/Emlak bypass is default-off and requires **both** explicit `PILOT_SYNTHETIC_TEST_MODE=enabled` and the applicable loopback request/backend conditions. Loopback alone is never sufficient.

## Product Finding authority

The settled Phase-2 search engine remains intact. Two independent authority axes are frozen:

**Intent authority**

1. legal/publication availability;
2. explicit user category/product/filter;
3. high-confidence inferred intent;
4. remaining free-text relevance.

**Fact authority**

1. regulatory/provider verified fact;
2. validated seller structured fact;
3. deterministic derived/external fact with provenance/confidence;
4. free-text claim.

Conceptual execution remains:

**ELIGIBILITY → PRODUCT ROLE / SCOPE → HARD FILTERS → TEXT RELEVANCE → SORT**

Consequences:

- explicit filters win inferred query intent;
- structured facts win contradictory free text for hard filtering;
- a missing required hard-filter fact fails closed;
- sorting cannot enlarge the relevant set;
- native and external provenance remain distinguishable;
- no semantic AI search is authorized.

## External supply freeze

External Supply Phase 3.0 is complete and remains **synthetic-only**.

- `private.external_sources` / `private.external_offers` stay separate from native listings and seller ownership.
- external offers remain explicit `condition = new` with `provenance = external_source_extracted`;
- only synthetic `.invalid` offer ingestion is permitted;
- professional-merchant source metadata may exist only as review-state representation; real merchant offer ingestion remains blocked;
- vehicle/real-estate external supply remains excluded;
- no crawler, public external offer/card, external images, real-source discovery/ingestion, service activation or external second-hand is authorized;
- Phase 3.1 is explicitly deferred until a later founder/Advisor gate.

## Search and presentation

Search normalization remains, including `b150` ↔ `b 150`.

Free listings display **Ücretsiz**, never `₺0`.

The consumer UI must not present phone verification as ordinary seller identity or imply that Arar Buluruz verifies the seller's legal identity, item ownership or permanent phone ownership.

## Current hard boundaries

Still OFF unless separately authorized by the founder:

- production/public activation;
- real personal, seller, listing, contact or photo data;
- real merchant discovery/ingestion or public external supply;
- crawler or external image ingestion;
- AWS or other production infrastructure provisioning;
- secrets/environment mutation;
- recurring paid infrastructure/services;
- real SMS;
- production EİDS calls/integration;
- global e-Devlet/KYC;
- professional-seller/company/tax-document onboarding;
- AI moderation/search;
- Ads/monetization;
- payments, orders, reservations or commission;
- in-app chat;
- Publish/Update;
- Tarladan changes;
- Git history rewrite/force-push.

Repository readiness does not authorize any closed gate.

## Current business/formalization sequence

The founder plan remains:

**APPLICATION COMPLETION → GVK MÜKERRER 20/B PERSONAL-DEVELOPER ROUTE WHILE APPLICABLE → MARKET / REVENUE VALIDATION → COMPANY / KOSGEB WHEN REQUIRED OR ADVANTAGEOUS**

Before first taxable revenue, then-current eligibility and mechanics must be re-verified. This does not waive KVKK, EİDS, production, real-data, security or infrastructure requirements.

## Supersession

D-030 supersedes D-025/D-026 only where those decisions made verified phone, phone equality, OTP or a phone-bound session part of current seller ownership/authorization. Their historical evidence remains preserved in the decision log.

The 2026-09-11 architecture freeze does not redesign those settled identity or search decisions. It separates seller role from seller principal, policy scope from seller-selected category, public capability from legacy status, and enforcement/contact controls from ownership.

The still-valid Türkiye-wide self-service, direct public contact, trusted-photo, atomic-publication, post-moderation, Product Finding, RLS/Storage and no-rebuild principles remain active.
