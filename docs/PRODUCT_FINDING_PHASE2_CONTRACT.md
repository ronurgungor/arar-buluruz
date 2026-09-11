# Arar Buluruz — Product Finding Phase 2 Contract

_Last updated: 2026-09-11, Europe/Istanbul_

## Purpose

Phase 2 turns the Phase 1 structured product-finding foundation into the user-facing seller and buyer flow without changing the settled ownership, photo, EİDS, RLS or production boundaries. The 2026-09-11 architecture freeze clarifies authority ordering without redesigning the search engine.

The implementation remains conceptually:

**ELIGIBILITY → PRODUCT ROLE / SCOPE → HARD FILTERS → TEXT RELEVANCE → SORT**

The earlier implementation shorthand **QUERY → INTENT/SCOPE → RELEVANT SET → FILTER → SORT** remains compatible: legal/public availability constrains the candidate inventory before Product Finding operates, and sort never expands the relevant set.

## Two independent authority axes

### Intent authority

1. legal/publication availability;
2. explicit user category/product-type/filter scope;
3. high-confidence deterministic inferred intent;
4. remaining free-text relevance.

An explicit `productType` or explicit hard filter always wins over inferred query intent. An invalid explicit hard filter fails closed; it is never secretly relaxed.

### Fact authority

1. regulatory/provider verified fact;
2. validated seller structured fact;
3. deterministic derived/external fact with explicit provenance/confidence;
4. free-text claim.

Hard filtering consumes the highest-authority structured fact available for that field. Contradictory title/description text cannot override a structured hard-filter fact. A missing required hard-filter fact fails closed.

Native and external facts remain provenance-distinguishable. Phase 3.0 external facts are `external_source_extracted`; native listing facts remain seller-declared. Phase 3.0 external supply remains synthetic-only and does not authorize real merchant discovery/ingestion or public external cards.

## Deterministic intent resolution

Phase 2 intentionally does not use typo tolerance, embeddings, LLMs, external search engines or probabilistic semantic search.

High-confidence intent can come from:

- an explicit product-type alias from the frozen Phase 1 registry, preferring the longest/specific alias;
- typed inventory evidence when the query matches one and only one main product family;
- a controlled generic role marker (`parça` / `yedek parça`, or `aksesuar` / `kılıf` / `case` / `kablo` / `şarj` / `charger`) only after one main product family is already resolved.

Related-role mapping is deliberately shallow:

- `automobile` → `automobile-part` / `automobile-accessory`;
- `phone` → `phone-accessory`;
- `bicycle` → `bicycle-part`.

If direct aliases conflict with typed inventory evidence, more than one main family is plausible, or both part and accessory markers are present, confidence is low and no product type is silently forced.

Known typed incompatible roles are excluded after a high-confidence inferred scope. Legacy `product_type = null` rows are not silently treated as a known product type.

## Required examples

- `Corolla` with typed automobile + automobile-part/accessory matches resolves to the automobile main family. `price_asc` may reorder cars but cannot pull cheap Corolla parts/accessories back into the relevant set.
- `Corolla parça` resolves to `automobile-part` only when the automobile family is unambiguous.
- `iPhone 13` with typed phone + phone-accessory matches resolves to the phone main family. Cases/cables remain outside that relevant set.
- `iPhone 13 kılıf` resolves to `phone-accessory` only when the phone family is unambiguous.
- an explicit `automobile-part` or `phone-accessory` filter wins even if the free-text query would otherwise infer a main product.
- a listing whose title says `256 GB` but whose validated structured storage fact is `128` does not satisfy a hard `256 GB` filter.
- a listing missing a structured fact required by an active hard filter is excluded.
- ambiguous query evidence does not force a type.

## Filtering semantics

The Phase 1 `SearchRequestV1` remains authoritative:

- location and price are universal hard filters;
- category and product type are hard scope filters;
- contextual buyer facets have explicit modes: `multi` for discrete/exact OR values and `range` for numeric min/max bounds;
- same `multi`-facet values are OR;
- different contextual facets are AND;
- range filters support min-only, max-only or min+max;
- a listing missing a structured value fails an active contextual filter, including an active numeric range;
- explicit contextual ranges are hard filters and are never silently relaxed;
- changing category/product type clears incompatible contextual filters while retaining compatible universal location/price state;
- no numeric slider is required; price and contextual range facets use explicit min/max inputs.

Initial buyer facet modes are deliberately shallow and deterministic:

- Automobile: Marka `multi`/dynamic; Yıl `range`; Km `range`; Vites `multi`; Yakıt `multi`; Kasa tipi `multi`.
- Housing: İlan tipi `multi`; Konut tipi `multi`; Oda sayısı `multi`; m² `range`.
- Phone: Marka `multi`/dynamic; Depolama `multi`.
- Wardrobe: buyer-exposed dimensions use `range`; Kapak tipi remains `multi`.
- Shoe size and similarly discrete numeric fit values may remain `multi`/exact.

Vehicle is an explicit exception to the normal roughly 2–5 contextual-facet guideline: Automobile keeps all six buyer facets, including Km.

## Sort defaults

- non-empty query → `relevance`;
- browse / empty query → `newest`.

`relevance`, `newest`, `price_asc` and `price_desc` all operate only after the same relevant set has been established. Sorting cannot add a candidate excluded by eligibility, product scope or a hard filter.

## Seller-selected category vs policy scope

Seller-selected broad category remains product metadata. Product Finding may use it as explicit user/product scope, but compliance/publication authority is separate.

The server-owned listing policy decision may resolve to `ordinary`, `eids_vehicle`, `eids_real_estate`, `review_required` or `restricted`. Vehicle and real-estate main-product scopes remain EİDS-gated; ambiguous `other` without structured type is `review_required`. This legal/publication classification occurs outside and before text relevance and cannot be overridden by a search query.

## Seller UI contract

The seller sees only product concepts, never schema internals.

- category remains shallow;
- compatible `product_type` choices come from the Phase 1 registry;
- product type remains nullable for backward compatibility, but supported types are surfaced clearly;
- selecting/changing category or product type clears incompatible structured attributes using the existing transition contract;
- only fields declared for that product type are shown;
- structured fields are optional unless a later explicit product decision makes one required;
- JSON, schema versions, generated search keywords, EİDS internals, ownership/recovery internals and compliance flags are never rendered as seller controls;
- create and edit submit the same validated `productType` + structured attributes contract.

The UI metadata source is `src/lib/product-finding-ui-contract.ts`; buyer facet modes are sourced from `src/lib/product-finding-buyer-facets.ts`.

## Buyer UI contract

`/ara` remains mobile-first and search-first.

- top-level quick chips show the active scope/sort/filter state without becoming a category tree;
- one clean mobile filter sheet/bottom-sheet contains universal location + price, shallow category/product type and contextual facets;
- contextual facets normally remain around 2–5 groups per product type, with Automobile explicitly allowed six;
- `multi` facets render discrete/dynamic choices; `range` facets render min/max inputs and never sliders;
- no desktop control-panel layout, no Advanced Filters junk drawer, no giant taxonomy;
- contextual multi-filter options are derived from currently loaded validated listing values rather than a second hand-maintained taxonomy where fixed choices are not declared;
- listing cards may show at most three short contextual facts from the shared UI metadata;
- loading, disabled/error and zero-result states remain explicit and fail closed.

## URL, Back and scroll state

The `/ara` search state is the source of truth for query, location, category, product type, contextual filters and sort. Opening a detail page must not clear or rewrite that state. Back navigation returns to the same search URL/state and restores the results scroll position. A product-scope change must clear only incompatible contextual filters, not unrelated universal filters.

## Regression invariants

Focused tests must preserve at least:

1. explicit filter wins inferred query intent;
2. structured fact wins contradictory free text for hard filtering;
3. missing hard-filter fact fails closed;
4. sorting cannot enlarge the relevant set;
5. native/external provenance remains distinguishable;
6. Phase-2 native execution remains behaviorally compatible when routed through the Phase-3 common candidate seam.

## End-to-end acceptance before Product Finding changes

Synthetic acceptance must prove:

1. seller create UI → submitted structured data;
2. seller edit UI → transitioned structured data;
3. persisted structured data → public adapter;
4. eligibility → query intent/product scope → hard filters → relevance → sort;
5. contextual listing-card facts;
6. detail navigation and Back restore query/category/product type/filter/sort/scroll state.

Canonical workflows must be GREEN on one exact final head before merge of a consequential Product Finding change.

## Hard boundaries

No AI semantic search, typo engine, Elasticsearch/external search engine, general Auth redesign, ads/payment/chat work, production activation, taxonomy explosion, real merchant ingestion or reopening of settled Phase-1/2/3.0 architecture belongs in this contract clarification.
