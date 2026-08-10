# Arar Buluruz — Real Çorlu Pilot Seller Contact Contract

_Date: 2026-08-10, Europe/Istanbul_

## Status

**Phase 1.5 — Revenue-Ready / 0 TL preparation only.**

This contract is repository/CI preparation for the founder-operated 5–10 listing Çorlu pilot. It does **not** authorize a production backend, production Storage, Auth, real listing, real phone number, real photo, personal data, deployment, Lovable publication, advertising or paid infrastructure.

## Founder product decision

The initial pilot uses an intentionally public seller-contact CTA for active published listings.

Default channel: `whatsapp`.

Seller may instead choose: `phone`.

Exactly one public contact channel is stored per publishable listing.

Rejected for this pilot:

- anonymous privileged contact resolver;
- click-to-reveal as a claimed privacy/security control;
- founder relay;
- in-app messaging;
- SMS OTP;
- Auth dependency;
- CAPTCHA dependency;
- contact-click analytics;
- a separate `public_contact_enabled` lifecycle switch.

## Single source of truth

The contact lives on `public.listings`:

- `contact_channel`
- `contact_e164`
- `contact_verified_at`
- `contact_verification_method`
- `publication_instruction_at`

The preparation-only `private.listing_contacts` table is removed. There is no duplicated public/private phone value and no resolver whose sole purpose is to preserve an illusion that an anonymously obtainable contact is secret.

Only `contact_channel` and `contact_e164` are anonymous-readable, and only for rows passing the existing active-published RLS policy. Verification and audit fields are not granted to anon.

## Public Data API exposure

This design intentionally accepts that an anonymous caller can request the selected contact fields for all currently active published listings through PostgREST.

Classification for the 5–10 listing pilot:

**ACCEPTED PUBLIC-DISCLOSURE CONSEQUENCE**

It is not treated as a blocker because the product decision itself is intentional public disclosure and the pilot explicitly rejects adding a privileged resolver merely to turn a small public enumeration from one request into several unauthenticated requests.

The normal application nevertheless minimizes incidental propagation:

- collection-card/list payload does not request or carry contact;
- sitemap carries listing URLs only;
- listing-detail head metadata does not include contact;
- no JSON-LD contact is produced;
- analytics remain absent;
- application logs must not intentionally log contact values.

These omissions are data-minimization/product behavior, not a security boundary.

## Lifecycle contract

Public contact availability follows listing lifecycle, not a separate contact switch.

Public contact is eligible only when:

- `status = 'published'`;
- `published_at <= now()`;
- `expires_at > now()`;
- `unpublished_at is null`;
- `contact_channel` exists;
- `contact_e164` exists;
- `contact_verified_at` exists;
- a channel-compatible `contact_verification_method` exists;
- `publication_instruction_at` exists and is not earlier than verification.

Draft, pending and rejected listings are not anonymously readable. Expired and unpublished listings no longer follow the normal public listing/contact contract.

## Contact change and withdrawal

Contact identity change is fail-closed:

1. unpublish if currently live;
2. replace channel/value;
3. reset verification timestamp/method;
4. reset publication instruction;
5. verify the replacement contact;
6. record a new publication instruction;
7. explicitly republish.

If the seller withdraws the public-contact instruction, the listing is unpublished. There is no founder-relay fallback.

Unpublish prevents new normal public retrieval but cannot revoke copies already obtained by a buyer, browser, scraper, screenshot, phone contact list or WhatsApp.

## Verification contract

Future operational rule, not activated by this PR:

- WhatsApp: seller proves present control from the same number intended for publication;
- phone: manual callback or equivalent founder verification.

Verification proves only present control of the number at that time. It does not prove:

- legal identity;
- ownership of the listed item;
- permanent ownership of the phone number.

`publication_instruction_at` records an operational audit fact. It must not automatically be described as “KVKK explicit consent”.

## User-facing CTA contract

WhatsApp default:

`WhatsApp’tan yaz`

Seller-selected phone:

`Satıcıyı ara`

WhatsApp target is derived from E.164 at runtime. Phone target is derived as `tel:` from E.164. Neither `whatsapp_url` nor a second copy of the phone number is stored.

For WhatsApp, future live copy may explain that the user is redirected to WhatsApp and Arar Buluruz does not operate the conversation.

The UI must not claim the number is hidden/private merely because digits are not rendered as text.

## Abuse and wrong-person handling

Before real-data activation, the operator procedure must support immediate fail-closed action for:

- seller asks to remove contact;
- spam/harassment complaint;
- wrong phone number;
- another person's number submitted;
- seller changes number;
- public-disclosure instruction withdrawn.

Default action when authority/control is disputed: unpublish first, investigate second, and republish only after the required verification/publication steps are satisfied.

## KVKK / privacy pre-activation boundary

The GSM/public-institution announcement relevant to this review is dated **27 July 2026**. The KVKK states there that GSM numbers are personal data and that processing must satisfy the applicable conditions in Article 5. This repository therefore does not treat a phone number as non-personal merely because a seller intends it to be public.

The official aydınlatma rules require the collection-time notice to cover at least the controller/representative identity, processing purpose, recipients and purposes, collection method and legal reason, and the data-subject rights under Article 11.

The current Article 9 regime addresses overseas transfers through adequacy, appropriate safeguards and limited exceptional cases; this repository does not state that Türkiye hosting is universally mandatory.

The 2026 KVKK principle decision also reinforces that aydınlatma and explicit-consent texts are distinct concepts where explicit consent is actually relied upon. This repository therefore makes no blanket claim that explicit consent is always required or never required.

### MUST BE CLOSED BEFORE REAL DATA

- exact data controller identity;
- exact Article 5 legal basis for collecting/maintaining seller contact;
- exact legal basis for intentional public disclosure;
- collection-time aydınlatma;
- recipient/alıcı-group definition, including public visitors/prospective buyers as applicable;
- WhatsApp/provider data-flow assessment;
- hosting/CDN/log/backup/operator-device data-flow map;
- Article 9 cross-border assessment where applicable;
- retention/deletion rule;
- data-subject request procedure;
- wrong-person phone complaint process;
- current VERBİS applicability assessment.

No final legal text is created by this implementation gate.

## Retention

No T+7 or other contact-retention period is hard-coded or described as a statutory requirement.

If a candidate deletion period is proposed later, it must be labelled:

**PRODUCT / DATA-MINIMIZATION PROPOSAL — NOT STATUTORY RETENTION PERIOD**

Final retention is decided at the real-data activation gate.

## Deferred until larger scale

- Auth/accounts;
- SMS/OTP;
- phone masking/relay;
- CAPTCHA/bot challenge;
- dedicated rate-limit infrastructure beyond the future general public edge controls;
- custom messaging;
- contact analytics;
- WhatsApp username support.

WhatsApp username support may be reconsidered only after availability for intended Turkish pilot accounts is verified.

## Zero-cost boundary

This contract adds no paid service or recurring production infrastructure. It requires no Auth, SMS provider, relay number or custom messaging system.

Recurring production cost authorized by this gate remains **0 TL**.
