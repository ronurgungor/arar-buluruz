# Arar Buluruz — External Sales Link Security Baseline

_Date: 2026-08-07, Europe/Istanbul_

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

## Future public CTA boundary

A CTA is produced only after moderation state is explicitly `approved`.

Recognized Shopier candidate:

- `Satıcının Shopier sayfasına git`
- `Haricî site: shopier.com`

Other approved domain:

- `Satıcının satış sayfasına git`
- `Haricî site: <canonical-host>`

The CTA is an external-navigation disclosure, not a security endorsement.

## Future moderation model

Future persistence/operations must support these as separate facts or events:

- new link → pending;
- changed link → pending;
- manual approval/rejection;
- canonical URL uniqueness;
- external-link kill-switch;
- complaint state;
- listing hide/review state;
- seller suspension state;
- audit trail;
- point-in-time URL ownership evidence;
- listing/product/price match evidence;
- appeal/review state.

No database migration for these future states is added in this gate. The existing Gate 1 `public.listings` schema and RLS asset remain unchanged until a later real-backend/data-model founder gate.

## Future incident operation target

When a fraudulent seller/link is established in a future real-data phase, the target operation is:

1. disable the external sales link immediately;
2. place the listing into review/hidden state;
3. block the account from adding new listings/links;
4. prevent reuse of the canonical URL;
5. retain only minimum necessary incident evidence;
6. warn affected users where legally/operationally appropriate;
7. direct users to the relevant third-party provider's dispute channel;
8. preserve an appeal path for false positives.

This is an operational target, not functionality activated by the current repository change.

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

A future URL reputation service requires a separate founder/backend gate plus current commercial-use/terms fact-checking.

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

Publication remains a separate founder gate. This implementation must not be treated as authorization to expose real external links.