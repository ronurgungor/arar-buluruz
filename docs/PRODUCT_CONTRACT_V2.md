# Arar Buluruz — Product Contract V2

_Last updated: 2026-09-04, Europe/Istanbul_

## Authority

This file is the current consumer product contract for Arar Buluruz. Live GitHub, executable exact-head evidence, `ARAR_BULURUZ_CURRENT_STATE.md`, legal/compliance decisions and the decision log remain separate authorities for their own domains. Dated older documents remain historical evidence only where this contract supersedes them.

## Product identity

Arar Buluruz is a simple, mobile-first classifieds product for Türkiye. The public experience is a normal classifieds flow, not a founder intake form, test harness, identity product or payment intermediary.

Primary public roles remain **Ara**, **İlan Ver** and **İlanlarım**.

## Seller identity, ownership and recovery

Ordinary-goods seller ownership is **SMSless**.

- SMS OTP is removed as an ordinary-goods product requirement.
- A new seller receives a pseudonymous internal UUID (`seller_id`).
- A seller-owned listing binds `listings.owner_user_id` to that UUID.
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

The publication transaction fails closed unless seller ownership, public-contact instruction, rules evidence, trusted-photo readiness and lifecycle state are complete.

## Public contact

An active listing exposes one public E.164 phone and derives both buyer actions from it:

- **Ara** → `tel:<phone>`
- **WhatsApp’tan yaz** → `https://wa.me/<phone without +>`

The phone is intentionally public contact information while the listing is active. It must never be treated as the credential for `İlanlarım`, edit, unpublish, sold or delete operations.

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
- lifecycle-gated signed public photo delivery;
- direct anonymous writes denied;
- RLS/grants and service-role/browser separation;
- idempotency and race handling;
- atomic publication and ambiguity reconciliation;
- partial-failure/orphan safeguards;
- post-moderation takedown fails closed across collection, detail, contact and signed-photo delivery.

## Vasıta, Emlak and EİDS

Vasıta / Araç and Emlak remain available in product taxonomy and synthetic/local development.

**Real production publication for both Vasıta and Emlak must fail closed until the required EİDS authorization verification is actually integrated and separately approved.**

No repository preparation or synthetic test is permission to call production EİDS. The only synthetic Vasıta/Emlak bypass is default-off and requires **both** explicit `PILOT_SYNTHETIC_TEST_MODE=enabled` and the applicable loopback request/backend conditions. Loopback alone is never sufficient.

## Search and presentation

Search normalization remains, including `b150` ↔ `b 150`.

Free listings display **Ücretsiz**, never `₺0`.

The consumer UI must not present phone verification as ordinary seller identity or imply that Arar Buluruz verifies the seller's legal identity, item ownership or permanent phone ownership.

## Current hard boundaries

Still OFF unless separately authorized by the founder:

- production/public activation;
- real personal, seller, listing, contact or photo data;
- AWS or other production infrastructure provisioning;
- secrets/environment mutation;
- recurring paid infrastructure/services;
- real SMS;
- production EİDS calls/integration;
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

The still-valid Türkiye-wide self-service, direct public contact, trusted-photo, atomic-publication, post-moderation, search, RLS/Storage and no-rebuild principles remain active.
