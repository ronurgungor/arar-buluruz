# Arar Buluruz — Active Chat Handoff

_Last updated: 2026-09-11, Europe/Istanbul_

## Purpose

Short-lived continuity layer for PR #89 mandatory architecture-freeze closure. Live GitHub and executable exact-head evidence are authoritative for exact SHA/workflow state.

## Repository state

- Repository: `ronurgungor/arar-buluruz`.
- Canonical branch: `main`.
- Verified PR #89 base/main at branch creation: `3ca449e8f0e07d7131c59739e45f6ca46d9050fb` (normal merge commit of PR #88).
- Active branch: `agent/architecture-freeze-closure`.
- PR #88 External Supply Phase 3.0: **MERGED / COMPLETE**.
- External supply after PR #88: synthetic `.invalid` only; Phase 3.1 real-source discovery/ingestion is explicitly paused.
- PR #89 must remain **OPEN / UNMERGED** for Advisor review. Resolve its final exact head from live GitHub; this document cannot embed its own containing commit SHA without changing it.

## Architecture freeze objective

Separate durable authorities without redesigning the settled product:

1. `private.sellers` remains the pseudonymous listing-ownership principal.
2. Seller role is a separate assessment: `unknown`, `private_occasional`, `professional`, `regulated_business`.
3. Seller-selected category/product metadata is separate from server-owned policy scope: `ordinary`, `eids_vehicle`, `eids_real_estate`, `review_required`, `restricted`.
4. Listing lifecycle, publication eligibility, enforcement and contact availability are orthogonal internal axes; legacy `public.listings.status` remains during migration.
5. One listing-level public capability seam decides search/index, detail, signed photo, public contact and external CTA exposure.
6. Legal/operator notice cases propagate fail-closed enforcement without changing seller ownership.
7. Product Finding keeps the settled Phase-2 engine while freezing separate intent-authority and fact-authority hierarchies.

## Preserved seller-security truth

- Ordinary-goods SMS OTP remains removed.
- Seller ownership remains `seller_id → listings.owner_user_id`.
- `owner_user_id` remains immutable.
- Server-backed opaque HttpOnly sessions and rotating recovery credentials remain unchanged.
- Phone remains intentionally public listing contact, never authorization identity.
- Equal phones never merge sellers; phone changes never transfer ownership.
- Seller-role assessment contains no company/tax/KYC identity semantics.
- Unknown role is valid and non-blocking for ordinary ownership.

## Policy and public-capability truth

- Vehicle/automobile defaults to `eids_vehicle` + `regulated_verification_required`.
- Real-estate/housing defaults to `eids_real_estate` + `regulated_verification_required`.
- Ambiguous `other` without structured product type is `review_required`, not ordinary by default.
- Ordinary structured goods may be `eligible` when their existing publication requirements are satisfied.
- Enforcement `held`/`removed` fails closed.
- Contact `suppressed` fails closed; while contact fields remain on `public.listings`, suppression conservatively removes row-level public exposure to prevent leakage.
- Signed-photo delivery retains canonical WebP/private-Storage checks and delegates only listing-level visibility to the capability seam.
- External CTA additionally retains the existing ownership-confirmed, product-match, moderation-approved, complaint-clear and explicit `allow_public_cta` requirements.

## Enforcement case seam

`private.listing_enforcement_cases` records case id, target listing, reason/type, received/deadline time, decision/action, action time, evidence/audit metadata and appeal/restoration state.

Removal propagates to enforcement=`removed` and contact=`suppressed`. Tests must prove collection/search, detail, signed-photo, public contact and external CTA are all disabled while ownership remains unchanged.

## Product Finding authority freeze

Intent authority:

1. legal/publication availability;
2. explicit user category/product/filter;
3. high-confidence deterministic inferred intent;
4. free-text relevance.

Fact authority:

1. regulatory/provider verified;
2. validated seller structured;
3. deterministic derived/external with provenance/confidence;
4. free-text claim.

Execution remains **ELIGIBILITY → PRODUCT ROLE/SCOPE → HARD FILTERS → TEXT RELEVANCE → SORT**. No AI/semantic search.

Required conflict regressions: explicit filter beats inference; structured fact beats contradictory text for hard filtering; missing hard-filter fact fails closed; sorting cannot enlarge the relevant set; native/external provenance remains distinguishable.

## External-supply freeze

Phase 3.0 remains closed at synthetic-only:

- no real merchant offer ingestion;
- no crawler;
- no public external offers/cards;
- no external images;
- no external service activation;
- no external second-hand;
- no vehicle/real-estate external supply;
- no Phase 3.1 implementation in PR #89.

## Validation / next action

Before Advisor handoff:

1. lint/Prettier and full unit suite;
2. production-like build;
3. full migration rebuild;
4. complete pgTAP/RLS and trusted-photo checks;
5. REST integration and browser E2E;
6. privileged-key boundary;
7. clean diff audit against `3ca449e8f0e07d7131c59739e45f6ca46d9050fb`;
8. verify live main has not moved;
9. open PR #89 unmerged;
10. require all applicable canonical workflows GREEN on one exact final PR head;
11. return to Advisor. Do not merge and do not start Phase 3.1/public-launch readiness.

## Hard boundaries

Remain closed: production/public activation, real personal data, real merchant ingestion, crawler, company/tax/KYC onboarding, production EİDS calls, global e-Devlet, SMS OTP, new auth methods, Redis solely for this seam, AI moderation/search, paid services, Ads/monetization, payments/orders/reservations/commission/chat, Publish/Update, Tarladan changes and history rewrite.

## PR #89 Advisor second-pass closure

Preserve the accepted architecture. The second pass adds explicit loopback-only synthetic regulated eligibility evidence, trusted policy/eligibility precedence against seller metadata edits, aggregate multi-case enforcement recomputation, capability-aware restore verification, explicit ordinary infrastructure fixtures, and architecture/Phase-3 portability fingerprint coverage. Do not start Phase 3.1 or public-launch readiness; leave PR #89 unmerged for Advisor review.
