# Arar Buluruz — Current State

_Last updated: 2026-09-11, Europe/Istanbul_

## Canonical repository checkpoint

- Repository: `ronurgungor/arar-buluruz`.
- Canonical branch: `main`.
- Verified `main` at PR #89 branch creation: `3ca449e8f0e07d7131c59739e45f6ca46d9050fb`.
- That SHA is the normal merge commit of PR #88 — **Phase 3.0: add synthetic external supply seam**.
- Active PR #89 implementation branch: `agent/architecture-freeze-closure`.
- Live GitHub is authoritative for the final PR #89 head and whether `main` has moved after this synchronization.

Historical checkpoints remain historical evidence in Git and the append-oriented Decision Log; obsolete PR #84/open-head wording is not current authority.

## Current phase

**Mandatory architecture freeze closure before external-supply or public-rollout expansion.**

PR #88 / External Supply Phase 3.0 is complete. Phase 3.1 real-source discovery/ingestion is paused. The current work is not a redesign and does not authorize production/public activation.

## Settled seller ownership

- `private.sellers` remains the persistent pseudonymous seller principal.
- Listing ownership remains `public.listings.owner_user_id → private.sellers.id`.
- Ownership is immutable and is never inferred from public phone equality.
- Seller sessions remain opaque, HttpOnly, revocable and digest-only server-side.
- Recovery remains rotating one-time high-entropy credentials through the established atomic recovery primitive.
- Public phone remains listing contact data only.
- SMS OTP remains absent for ordinary-goods ownership.

## New architecture-freeze seams

### Seller role assessment

Role is separate from principal identity. Internal assessments support:

- `unknown`;
- `private_occasional`;
- `professional`;
- `regulated_business`.

Each assessment can preserve basis, assessment time, review/reassessment state, policy version, origin and bounded evidence. Existing/new sellers default to non-blocking `unknown`; no company/tax/KYC data or onboarding UI is introduced.

### Server-owned listing policy scope

Seller-selected category/product type remains product metadata. A separate current server-owned decision records:

- `ordinary`;
- `eids_vehicle`;
- `eids_real_estate`;
- `review_required`;
- `restricted`.

The initial classifier is deterministic only. Vehicle/automobile and real-estate/housing remain EİDS-gated. Ambiguous `other` without structured product type is `review_required`.

### Orthogonal listing controls

`public.listings.status` remains as legacy/current workflow state while internal controls separately represent:

- lifecycle: draft / active / sold / withdrawn / expired / deleted;
- eligibility: eligible / review_required / regulated_verification_required / blocked;
- enforcement: clear / held / removed;
- contact: available / suppressed.

No historical migration is destructively rewritten.

### One public capability decision

`public.listing_has_public_capability(listing_id, capability)` is the listing-level fail-closed seam for:

- `search_index`;
- `detail`;
- `signed_photo`;
- `public_contact`;
- `external_cta`.

It combines current publication dates/evidence with lifecycle, policy scope, eligibility, enforcement and contact state. Existing ordinary published listings remain compatible when valid.

Because the current public listing row still contains public contact columns, `contact=suppressed` conservatively removes row-level public exposure rather than risking contact leakage. This may be relaxed only after a separately approved contact-free public projection exists.

Existing private-Storage trusted-photo checks remain unchanged; the photo helpers now delegate listing-level exposure to the capability seam. External CTA also keeps the established external-link ownership/match/moderation/complaint/explicit-allow requirements.

### Notice/enforcement propagation

`private.listing_enforcement_cases` provides durable case/action state with reason/type, times/deadline, decision/action, evidence/audit metadata and appeal/restoration representation.

A removal propagates to enforcement=`removed` and contact=`suppressed`; it does not change seller ownership. Database tests prove removal disables search/collection, detail, signed-photo, public contact and external CTA coherently.

## Product Finding authority freeze

No Phase-2 search rewrite is intended.

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

Execution remains **ELIGIBILITY → PRODUCT ROLE/SCOPE → HARD FILTERS → TEXT RELEVANCE → SORT**.

Regression coverage freezes explicit-filter precedence, structured-fact precedence over contradictory text, fail-closed missing hard facts, sort-set invariance and native/external provenance distinction.

## External Supply Phase 3.0

Current merged boundary remains:

- separate private `external_sources` / `external_offers`;
- only synthetic `.invalid` offer ingestion;
- professional-merchant source shape is review metadata only; real merchant offers are blocked;
- external condition is `new`;
- external provenance is `external_source_extracted`;
- no external vehicle/real-estate supply;
- no public external results/cards;
- no crawler;
- no external images;
- no real-source discovery/ingestion;
- no external service activation;
- no external second-hand.

Phase 3.1 is deferred.

## Security / provider boundaries

Preserved:

- RLS/grants and service-role/browser separation;
- direct-anon-write denial;
- private Storage;
- trusted decode/re-encode WebP pipeline;
- lifecycle/capability-gated signed-photo delivery;
- CSRF/origin controls;
- idempotency/race and atomic-publication controls;
- fail-closed takedown;
- EİDS synthetic bypass remains default-off and limited to the established explicit synthetic-test + loopback conditions.

No production EİDS provider call, KYC, global e-Devlet or new authentication method is added.

## Documentation authority

Current architecture is synchronized in:

- `docs/PRODUCT_CONTRACT_V2.md`;
- `docs/PRODUCT_FINDING_PHASE2_CONTRACT.md`;
- `docs/ARAR_BULURUZ_DECISION_LOG.md` — D-032;
- `docs/ARAR_BULURUZ_CURRENT_STATE.md`;
- `docs/ACTIVE_CHAT_HANDOFF.md`.

## Hard boundaries

Remain closed unless explicitly reopened later:

- production/public activation;
- real personal/seller/listing/contact/photo data;
- real merchant ingestion / crawler / public external supply;
- professional-seller/company/tax-document onboarding;
- production EİDS calls;
- global e-Devlet/KYC;
- SMS OTP or passkey/email/OAuth additions;
- Redis solely for this architecture seam;
- AI moderation/search;
- paid services or production infrastructure;
- Ads/monetization;
- payments/orders/reservations/commission/chat;
- Publish/Update;
- Tarladan changes;
- history rewrite.

## PR #89 completion gate

Before Advisor review, require one exact final head with clean diff plus canonical validation covering lint/Prettier, full unit suite, production-like build, full migration rebuild, pgTAP/RLS/trusted-photo probes, REST integration, browser E2E and privileged-key boundary. Re-verify live `main`, open PR #89 **UNMERGED**, and stop. Do not start Phase 3.1 or public-launch readiness in the same workstream.

## PR #89 Advisor second-pass hardening

- The existing loopback-only synthetic Vehicle/Real-Estate path is preserved through an auditable `synthetic_test` eligibility transition after the exact application triple gate; production EİDS remains closed and fail-closed.
- Seller metadata reassessment uses fail-closed trusted-policy/eligibility precedence, so seller edits cannot remove stricter operator/legal restrictions or trusted blocks.
- Enforcement is aggregate across all active cases rather than last-event-wins.
- Restore verification and managed portability equality now cover the architecture-freeze state, including the Phase-3.0 private external-supply state.
