# AdSense / Discovery Readiness Contract

Status: preparation only. No advertising, analytics, CMP, cookie banner, AdSense account verification, ads.txt, paid infrastructure or real-data activation is authorized by this document.

## Economic boundary

Arar Buluruz is intended to become a real business. Core listing/search remains free. The current primary Phase 2 monetization hypothesis is Google programmatic advertising / AdSense.

The sequencing rule is:

1. complete reasonable revenue-readiness work at 0 TL recurring production cost;
2. do not start recurring paid infrastructure while meaningful no-cost work remains;
3. when recurring production spend becomes genuinely necessary, minimize the remaining path to a monetizable Phase 2 launch.

No assumed Türkiye Page RPM is allowed in planning.

## Current public V0 boundary

The current public V0 remains:

- mock/synthetic;
- globally `noindex, nofollow, noarchive, nosnippet`;
- ad-free and tracker-free;
- disconnected from production backend, Storage and Auth;
- free of real personal data.

The V0 is not an AdSense submission target.

## Future indexability matrix

A later real-content gate may make only these surfaces indexable:

- homepage;
- genuine published listing details;
- permanent publisher-information pages;
- genuinely useful real search/discovery surfaces only after a separate result-quality decision.

Always noindex / non-monetizable utility surfaces:

- listing creation;
- complaint/report forms;
- login or placeholder screens;
- privacy/legal utility screens where appropriate;
- no-result search states;
- offline, error and not-found screens;
- navigation-only and test/demo-only surfaces.

The runtime discovery profile is fail-closed. `real-content` requires both a non-public-V0 runtime and the real `supabase` listing source. The public-V0 build profile must reject attempts to enable real-content discovery.

## Production sitemap contract

The public V0 sitemap must not advertise synthetic listing inventory.

A future production sitemap may be emitted only when:

- the discovery profile is explicitly `real-content`;
- a valid HTTPS canonical origin is configured;
- the listing source is the genuine published-listing source;
- listing retrieval succeeds in the approved public schema.

The production sitemap contains only:

- homepage;
- permanent publisher-information pages;
- genuine published listing-detail URLs.

It does not contain login, listing-create, complaint/report or mock/test listing URLs.

## Founder-operated UGC moderation baseline

For the initial 5–10 real-listing pilot, every listing is manually reviewed before publication. No automated moderation system is required.

The founder checks at minimum for:

- illegal or prohibited goods/services;
- counterfeit goods or intellectual-property infringement;
- sexually explicit material;
- dangerous, derogatory or hateful content;
- fraud, impersonation or deceptive claims;
- weapons and explosives;
- tobacco and nicotine;
- recreational/illegal drugs;
- alcohol;
- gambling;
- prescription or restricted pharmaceuticals;
- other Google Publisher Policy / Publisher Restrictions concerns.

For this small pilot, Google-restricted high-risk categories are rejected from publication instead of building per-page ad-exclusion complexity.

A report can trigger re-review and unpublication. This is moderation, not a payment-refund or buyer-protection guarantee.

## Future manual-ad route contract

No ad code is authorized yet.

Initial hypothesis after a separate AdSense gate:

- genuine listing detail: candidate for one manual ad;
- non-empty genuine search results: candidate for one manual ad;
- homepage: later candidate for zero or one ad.

Never monetize:

- no-result pages;
- listing-create forms;
- complaint/report forms;
- privacy pages;
- login/placeholder screens;
- offline/error/not-found screens;
- navigation-only/test surfaces.

Future ads must remain clearly separated from contact, report, navigation and other high-touch controls. Auto Ads are not authorized by this contract.

## Minimum economic measurement

Do not add Google Analytics or another analytics product merely for monetization measurement.

Minimum future metrics:

- AdSense page views;
- actual measured AdSense Page RPM;
- estimated earnings;
- finalized earnings;
- monthly recurring production cost;
- revenue / recurring-cost ratio.

Formulae:

`monthly ad revenue = page views / 1000 × actual measured Page RPM`

`break-even page views = monthly recurring cost / actual measured Page RPM × 1000`

Internal economic gates may compare revenue with recurring cost at `<1×`, approximately `1×`, `>=2×` and `>=3×`. These are decision thresholds, not forecasts or guarantees.

## Deferred domain / CMP / AdSense work

Do not do any of the following before the future AdSense review gate:

- buy a custom domain solely for AdSense readiness;
- upgrade Lovable solely for AdSense readiness;
- add AdSense scripts or placeholder ad slots;
- create placeholder `ads.txt`;
- add Google CMP or another CMP;
- add a cookie banner;
- add Google Analytics;
- add AdSense ownership-verification metadata;
- request AdSense review.

`lovable.app` is currently present in the Public Suffix List. Actual AdSense site eligibility for the Arar Buluruz host must still be reverified inside the real AdSense account at the future review gate.

A custom domain is not authorized solely for AdSense readiness today.
