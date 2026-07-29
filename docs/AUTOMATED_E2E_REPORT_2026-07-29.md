# Arar Buluruz — Automated Mobile E2E Report

_Date: 2026-07-29 · Viewport: 390 × 844_

## Scope

This was a technical browser-automation run, not a moderated human usability test. It validated route behavior, form state, links, response headers, console/network health and basic mobile layout.

## Raw automation result

- PASS: 3
- FAIL: 2
- BLOCKED: 0
- Console errors: 0
- Unhandled page errors: 0
- Checked 404/500 responses: 0
- Broken images: 0

## Independent triage

### Scenario 1 — Multi-word search

**Real product defect.** The example query `ikinci el masa` returned zero results even though the dataset contains `İkinci el ofis masası`. Search treated the entire query as one contiguous substring and did not allow tokens to match across title, description and hidden keywords.

Resolution in this change: split normalized multi-word queries into tokens and require every token to appear somewhere in the combined searchable text.

### Scenario 2 — City zero-result recovery

**PASS.** `traktör` returned results, the İzmir filter produced the expected zero-result state, and `Tüm Türkiye'de ara` restored nationwide results.

### Scenario 3 — Listing contact controls

**PASS with a confirmed visual defect.** Call and WhatsApp targets were correct and the phone number was not printed in listing copy. At 390 × 844, the fixed contact bar overlapped the `Şikâyet Et` link by approximately 8.5 px when its explanatory text wrapped.

Resolution in this change: reserve 8 rem plus safe-area inset below listing content instead of 6.5 rem.

### Scenario 4 — Listing preview

**Form flow PASS; test-data mismatch.** The automation requested `Tekirdağ`, but the prototype selector intentionally contains only the cities represented by the current mock dataset. The form still preserved title, price and description and produced a valid preview using an available city.

No city was added as a one-off fix. Full province coverage remains a product-completeness item before a real listing pilot.

### Scenario 5 — Complaint flow

**PASS.** A prototype complaint was submitted, the no-record message appeared, and navigation returned to the listing detail.

## Public comparison

The public Lovable deployment returned HTTP 200 for the checked routes and matched local behavior. The expected header was confirmed on local and public routes:

`X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`

The public deployment additionally displays the Lovable editing badge.

## Corrected baseline classification

Before applying the fixes in this change, the independently classified result is:

- PASS: 4
- FAIL: 1
- Confirmed visual defects attached to passing scenarios: 1

## Acceptance criteria for the fix

- `ikinci el masa` returns the existing second-hand office-table listing.
- Existing single-word and phrase examples continue to work.
- At 390 × 844, the fixed contact bar does not cover `Şikâyet Et` at the bottom of the listing.
- Frozen install, lint and build pass.
- No dependency, lockfile, backend or deployment configuration changes are introduced.
