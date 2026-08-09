# Arar Buluruz — New Chat Bootstrap

_Last reviewed: 2026-08-09, Europe/Istanbul_

## Mandatory reading order

1. [`AGENTS.md`](../AGENTS.md)
2. [`ARAR_BULURUZ_PROJECT_MEMORY.md`](ARAR_BULURUZ_PROJECT_MEMORY.md)
3. [`ARAR_BULURUZ_CURRENT_STATE.md`](ARAR_BULURUZ_CURRENT_STATE.md)
4. [`ARAR_BULURUZ_DECISION_LOG.md`](ARAR_BULURUZ_DECISION_LOG.md)
5. [`ARAR_BULURUZ_BACKLOG.md`](ARAR_BULURUZ_BACKLOG.md)
6. [`REAL_CORLU_PILOT_BACKEND_PREP.md`](REAL_CORLU_PILOT_BACKEND_PREP.md)
7. [`EXTERNAL_SALES_LINK_SECURITY.md`](EXTERNAL_SALES_LINK_SECURITY.md)
8. [`TR_SELF_HOSTED_SUPABASE_PREP.md`](TR_SELF_HOSTED_SUPABASE_PREP.md)
9. relevant dated evidence

GitHub `main`, the exact branch/PR and executable evidence override summaries and chat memory.

## Current canonical snapshot

- Repository: `ronurgungor/arar-buluruz`.
- Current canonical main before this documentation-sync gate: `9376ba60dfc049a4df27ce25255fa5923b2a154e`.
- PR #52 merged successfully and its V0 usability release was publicly published.
- Public-runtime smoke testing passed.
- Users found the application understandable.
- Initial real supply intent is validated: real users explicitly said their actual listings may be published.
- PR #53 merged successfully as current `main` `9376ba60dfc049a4df27ce25255fa5923b2a154e`.
- Post-merge CI `31280761870` succeeded.
- Post-merge V0 minimal PWA run `31280761873` succeeded.

## Repository state is not the public runtime

This distinction is mandatory.

### Repository `main`

`main` now contains inactive preparation for a future controlled real Çorlu pilot, including migration/RLS/private-schema/Storage/external-sales/runbook preparation.

This preparation is not live production functionality.

### Currently deployed public V0

The public runtime still uses:

- synthetic/mock listings;
- a zero-data demo listing form;
- no real backend connection;
- no real personal data;
- no real Storage;
- no Auth;
- no public external-sales CTA.

Do not infer deployed behavior solely from repository capabilities.

## Product evidence boundary

Current evidence supports:

- users understand the core product;
- search/discovery and the V0 usability flow are usable enough for the current stage;
- initial seller/supply intent exists.

Current evidence does **not** prove:

- successful real listing operations;
- seller identity/ownership workflows;
- sustainable moderation;
- the future seller-contact model;
- safe public external-sales use;
- a functioning supply-demand loop;
- production backend operations.

The next proposed real pilot remains **5–10 founder-controlled real Çorlu listings**, but no real-data activation is authorized.

## External-sales / Shopier boundary

The accepted model is provider-neutral **Satış bağlantısı / External Sales Link**.

- no Shopier API;
- no OAuth;
- no seller credential access;
- no scraping;
- no iframe;
- Shopier is an independent third-party provider, not an Arar integration or partnership;
- a seller may later supply their own public sales URL;
- Arar Buluruz does not process or hold payment funds;
- the functionality is currently not public.

Do not promote any later research recommendation about a particular provider, contact model or backup vendor into a founder decision unless the decision log explicitly records it.

## Hard founder financial constraint

Arar Buluruz currently earns no revenue.

Until a separate explicit **FOUNDER BUDGET / REVENUE GATE** is opened and approved:

- no paid VPS;
- no paid hosted backend;
- no paid backup;
- no recurring paid production infrastructure.

Technical readiness is not spending authorization. Existing self-hosting documents describe future technical prerequisites only.

## Privacy boundary

Real personal-data collection remains blocked.

No real seller contact, photo, listing or other personal data may be entered before a separate founder-approved real-data gate completes the required privacy/KVKK and production controls.

## Team and authority

- **Founder:** owns consequential product, backend, data, KVKK, cost and publication decisions.
- **Main assistant:** routine implementer/coordinator inside an explicitly approved reversible scope.
- **Independent reviewers (including Claude):** advisory only. Findings are inputs to founder decision-making and are not automatic implementation authorization.
- **Lovable:** bounded frontend writer/hosting surface; never backend owner.

Only one writer operates at a time. Stop before production deploy, Lovable Publish/Update, remote backend, secrets/environment mutation, real data, Auth/Storage activation, paid service, advertising or analytics unless the founder explicitly opens the relevant gate.

## Next activity

After this documentation-only sync is merged, the next activity is an **independent Claude full-repository review**.

That review is research/advisory only:

- no repository mutation is implied;
- no recommendation is automatically accepted;
- no new architecture/product decision is created merely because Claude proposes it;
- implementation requires a separate founder-authorized gate.

## Knowledge write-back

- durable principle → project memory;
- current implementation/runtime → current state;
- pending work → backlog;
- consequential founder choice → decision log;
- test or publication result → dated evidence where appropriate.

No secret, credential, private user record or unnecessary personal data belongs in these files.
