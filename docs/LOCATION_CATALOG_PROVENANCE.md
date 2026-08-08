# Türkiye location catalog provenance

_Last verified: 2026-08-08, Europe/Istanbul_

## Purpose

Arar Buluruz V0 uses a repository-vendored province/district catalog so location choices are independent from current listing supply. The catalog is static application data: the browser does not call a location API at runtime and the catalog introduces no recurring infrastructure cost.

The runtime source is `src/data/turkiye-locations.ts`.

## Administrative fact-check

The snapshot is constrained by current official administrative references:

- T.C. İçişleri Bakanlığı, Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü, MERNİS information reports service coverage across **81 provinces and 973 district population directorates**.
- T.C. Millî Savunma Bakanlığı, Harita Genel Müdürlüğü announced on **2026-01-21** that the Mülkî İdare Bölümleri and physical map set for all **81 provinces** had been updated.

The 973 figure is the user-facing province/district catalog invariant used here. Other Interior Ministry pages may report a narrower kaymakamlık count because central districts have a different administrative organization; that narrower number must not be substituted for this selector without a new administrative fact-check.

## District-name snapshot

The district-name snapshot was transcribed from the versioned **TurkiyeAPI v2 2025 dataset** at commit:

`b2aad200b482aeb1606aa05eeb55b6573e654288`

The upstream project reports:

- dataset version: `2025`;
- last updated: `2026-05-21`;
- 81 provinces;
- 973 districts;
- source inputs including TÜİK MEDAS and other public administrative datasets.

TurkiyeAPI is an **independent open-data project and is not a government authority**. It is used for the compact district-name snapshot, while the 81/973 administrative invariant and recency are separately cross-checked against the official NVI/HGM references above.

## Compatibility rule

Existing Arar Buluruz province display spelling that may already appear in V0 URL state is preserved where practical. A future catalog refresh must not silently rename URL-state values without a migration/canonicalization decision.

## Update rule

A catalog refresh requires all of the following before merge:

1. re-check the official administrative count/structure;
2. use a dated/versioned source for changed province/district names;
3. preserve or explicitly migrate existing URL canonicalization semantics;
4. prove exactly 81 provinces and the then-current district count in unit tests;
5. prove representative province catalogs and zero-supply district selection in production-mode browser tests;
6. keep runtime location lookup local unless a separate founder gate explicitly authorizes a remote service.

No runtime remote location request, geolocation lookup, analytics event, user location collection or backend persistence is authorized by this document.
