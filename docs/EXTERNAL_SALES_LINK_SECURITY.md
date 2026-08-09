# Arar Buluruz — External Sales Link Security Baseline

_Date: 2026-08-07, Europe/Istanbul_

> **Current status — 2026-08-09:** The product decision below remains active: provider-neutral External Sales Link, no Shopier API/OAuth/credentials/scraping/iframe, and no Arar payment handling. PR #53 later added inactive persistent review/security preparation and a stricter full-state CTA eligibility contract. That repository preparation is **not public**: the deployed V0 still exposes no external-sales field, real seller URL or CTA. No VPS provider, backup provider or seller-contact model is selected by this document or by later non-binding research.

## Founder decision

The canonical product concept is **External Sales Link / Haricî Satış Bağlantısı**. It is provider-neutral and is not a Shopier integration.

Arar Buluruz does not operate payment or shipping infrastructure. It does not collect or hold transaction funds, access a seller's Shopier account, use Shopier API/OAuth, import Shopier orders or purchase shipping labels.

Shopier is currently only one independently operated third-party sales/payment/shipping service that a seller may choose. A seller may instead use another allowed provider or the seller's own sales page.

No Shopier logo, Shopier color/badge, partnership claim, “Shopier destekli”, “güvenli satın al”, “doğrulanmış Shopier satıcısı/ürünü”, API or OAuth is authorized by this baseline.

## Future single-field UX contract

The repository security core exports the exact future copy, but **the field is not rendered in public V0**.

- Label: `Satış bağlantısı (isteğe bağlı)`
- Persistent helper: `Shopier gibi bir ödeme/kargo hizmetini veya kendi satış sayfanızı kullanıyorsanız bağlantısını ekleyebilirsiniz.`
- Placeholder: `Örn. https://shopier.com/...`

There is no provider dropdown and no second “Shopier kullanıyor musunuz?” question. Provider identification is derived from the validated hostname when possible.

A placeholder is never persisted as a value.

## Provider registry

Provider identification is exact-host based. Substring matching is forbidden.

The initial Shopier registry contains only hosts directly verified against Shopier's official web presence on 2026-08-07:

- `shopier.com`
- `www.shopier.com`

Both normalize to provider canonical host `shopier.com` for provider identity and duplicate representation.

Do not add guessed Shopier subdomains. A written response from Shopier or another reliable first-party source is required before expanding the registry.

## URL decision model

Every non-empty candidate is classified into exactly one of:

1. `INVALID`
2. `KNOWN_PROVIDER_CANDIDATE`
3. `CUSTOM_DOMAIN_REQUIRES_REVIEW`

These labels intentionally do **not** mean safe seller, verified seller, product match, ownership proof or transaction guarantee.

The validator performs no network request.

### Deterministic checks implemented now

- maximum input length: 2048 characters;
- standard WHATWG `URL` parser;
- HTTPS only;
- literal whitespace/control-style protocol confusion rejected;
- malformed percent encoding rejected;
- username/password/userinfo rejected;
- percent-encoded authority/hostname tricks rejected;
- IPv4 literals rejected, including alternate spellings normalized by the URL parser;
- IPv6 literals rejected;
- localhost and common non-public/internal hostname suffixes rejected;
- non-default/custom ports rejected;
- hostname lower-case normalization;
- trailing-dot normalization;
- hostname syntax and label-length validation;
- IDNA/punycode review signal;
- a Unicode authority that IDNA-normalizes directly onto a known provider host is rejected instead of being treated as that provider;
- provider detection uses only the exact-host registry;
- known URL shorteners in the small local denylist are rejected because the final destination is intentionally obscured;
- fragments are removed from the canonical duplicate representation;
- known provider aliases normalize to their provider canonical host.

### Important deterministic limitation

This client-side/pure validator does not perform DNS resolution. It therefore cannot prove that an apparently public hostname will not later resolve to a private address, nor can it defend by itself against DNS rebinding. That control belongs to a future server-side moderation/ownership layer and must still avoid arbitrary unsafe fetch behavior.

The absence of a DNS/network check today is deliberate. No server-side arbitrary URL fetch, redirect crawler, scraper or resolver is authorized by this gate.

## Canonical representation

A valid candidate receives a `canonicalUrl` and `canonicalHost` for deterministic duplicate comparison.

Canonicalization currently:

- lowercases the hostname;
- removes trailing dots;
- removes the URL fragment;
- relies on the standard URL parser for default HTTPS-port normalization;
- normalizes the two accepted Shopier hosts to `shopier.com`;
- preserves path and query semantics rather than sorting/re-writing query parameters.

Canonical equivalence is a duplicate-control aid, not proof that two remote resources are semantically identical.

## Fraud-control dimensions

Fraud state must never collapse into one `verified` boolean. The reusable baseline keeps these dimensions independent:

- URL syntax/security classification;
- provider identification;
- URL ownership;
- listing/product match;
- moderation status;
- complaint status;
- external-link kill-switch.

A new or changed valid link starts with moderation status `pending`. URL ownership and listing/product match start as `not_checked`.

The default model keeps the kill-switch enabled as a capability boundary: future moderation can suppress the external link without deleting the listing or rewriting historical evidence.

## Current full-state CTA contract after PR #53

The earlier baseline requirement “moderation approved” remains necessary but is no longer sufficient by itself.

Current repository preparation requires all of the following before a public CTA can be produced in a future separately activated real-data phase:

1. current URL re-validates and is not `INVALID`;
2. stored canonical URL equals the current canonical URL;
3. stored URL-security classification equals current validation;
4. stored provider identification matches current provider classification;
5. ownership status is `confirmed`;
6. listing/product-match status is `matched`;
7. moderation status is `approved`;
8. complaint status is `clear`;
9. explicit operator decision is `allow_public_cta`.

Anything else is fail-closed and produces no CTA.

Recognized Shopier candidate copy remains:

- `Satıcının Shopier sayfasına git`
- `Haricî site: shopier.com`

Other approved domain:

- `Satıcının satış sayfasına git`
- `Haricî site: <canonical-host>`

The CTA is an external-navigation disclosure, not a security endorsement.

## Historical baseline note

The original 2026-08-07 gate added no database migration for persistent external-link review states. That statement remains historically true for that gate. PR #53 subsequently introduced inactive persistent review state under a separate founder-authorized backend-preparation gate. See `REAL_CORLU_PILOT_BACKEND_PREP.md` for the current repository contract.

## Future incident operation target

When a fraudulent seller/link is established in a future real-data phase, the target operation is:

1. disable the external sales link immediately;
2. place the listing into review/hidden state;
3. prevent reuse/continued publication as appropriate to the approved operating model;
4. retain only minimum necessary incident evidence;
5. warn affected users where legally/operationally appropriate;
6. direct users to the relevant third-party provider's dispute channel;
7. preserve an appeal/review path where applicable.

This is an operational target, not functionality activated by the current repository state.

## Deferred network/reputation controls

Not implemented now:

- scraping;
- server-side arbitrary URL fetch;
- redirect crawling;
- DNS resolving;
- automatic ownership proof;
- PhishTank;
- Google Safe Browsing;
- VirusTotal;
- Web Risk;
- any paid or network-dependent fraud service.

A future URL reputation service requires a separate founder/backend gate plus current commercial-use/terms fact-checking. Any paid service additionally requires the FOUNDER BUDGET / REVENUE gate.

## Shopier fact boundary

Shopier's first-party site currently describes a hosted store, card payment flow and contracted shipping services. Arar Buluruz must still present Shopier only as an independent third party and must not translate Shopier's own trust language into an Arar guarantee, escrow claim or “verified seller/product” status.

A written Shopier response remains relevant for:

- any expanded hostname registry;
- acceptable nominative brand wording beyond plain text;
- any logo/badge use;
- API/OAuth or technical integration questions;
- any claim about partnership, endorsement or verification.

Until then, none of those capabilities or claims is enabled.

## Public V0 boundary

This module is not connected to `/ilan-ver`, listing detail, synthetic data or another public V0 route. Public V0 continues to use synthetic/mock listings and collects no external sales URL or transaction data.

Publication remains a separate founder gate. Repository preparation must not be treated as authorization to expose real external links.
