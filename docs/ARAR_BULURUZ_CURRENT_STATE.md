GitHub comparison confirmed that `59e5d987f4d73be486958a3d36d371cfa5dd2abe` differs from application-fix merge `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7` only in `docs/ARAR_BULURUZ_CURRENT_STATE.md` and `docs/ARAR_BULURUZ_BACKLOG.md`. The published application code is therefore the production-mode-validated application code.

## Accepted corrected V0 publication

Founder approval was given for a bounded Lovable Publish/Update of the already synchronized project.

Publication record:

- public URL: `https://arar-buluruz.lovable.app`;
- Lovable project: `dca896f8-bb48-4a67-ae49-0493610ca6ad`;
- deployment ID: `ddf816c6-9bf1-44af-8cfa-b242d437cc36`;
- synchronized and published source identity: `59e5d987f4d73be486958a3d36d371cfa5dd2abe`;
- application correction identity: `7a999d44ea1e8978a48ce150bbfdeafa648dbfa7`;
- Lovable project metadata after deployment: `is_published: true`, public URL active;
- no Lovable agent message, environment/listing-source change, backend activation, secret, real data, advertising, analytics or paid operation was used.

Acceptance was grounded in three matching controls:

1. Lovable was synchronized to the exact current `main` SHA before Publish/Update and remained without later agent edits.
2. GitHub confirmed current `main` and the validated application correction differ only by documentation.
3. The exact application code passed the production-mode browser/PWA suite covering the mandatory V0 notice, synthetic `/ara` results, absence of the disconnected-state messages, synthetic detail navigation, `/gizlilik`, non-collecting real-operation demo routes, manifest/icons/service worker, honest offline fallback and absence of auth/backend/analytics/ad-network/Google-Fonts requests.

No acceptance criterion produced a failure signal, so rollback was not triggered. The corrected publication is accepted as **V0 — UX ve değer önerisi doğrulaması**.

This acceptance does not establish a real marketplace, real user accounts, real listing behavior, moderation sustainability, seller-contact operations or supply-demand validation.

## Bounded accessibility cleanup

The founder later authorized up to five existing Lovable credits for a narrow missing-item cleanup. A single Lovable agent run consumed `2.3` credits and made three justified frontend changes:

- Turkish 404 and root error-boundary copy;
- consistent visible keyboard focus treatment;
- a polite live region for search-result count and empty-state changes.

The Lovable run also changed `package.json` and `bun.lock` despite an explicit no-dependency boundary. Those two files were restored exactly to their pre-run canonical blobs before acceptance. Gate 1's not-found browser assertion was updated only to expect the new Turkish `Sayfa bulunamadı` copy. No additional Lovable credit was used for rollback or test alignment.

The accepted delta from pre-cleanup canonical source is limited to:

- `src/routes/__root.tsx`;
- `src/routes/ara.tsx`;
- `src/styles.css`;
- the matching localized assertion in `scripts/gate1-browser-e2e.ts`.

No new dependency, backend, environment, data, analytics, advertising, PWA-strategy or publish action belongs to this cleanup.

## Backend and no-rebuild position

- Backend/provider selection remains frozen under D-019.
- Do not recommend Supabase ↔ Türkiye self-managed switching without a measured D-019 trigger.
- Supabase Free remains development/technical-validation only.
- PostgreSQL migrations remain canonical in GitHub.
- UI/domain rules remain provider-independent; provider calls stay in adapters.
- Future identity remains an internal UUID; e-mail/phone are not foreign keys.
- Do not block a future nullable `listings.owner_user_id`.
- JWT/auth claims remain outside the domain model.
- No Storage, Realtime, Edge Functions or provider-heavy capability is added before backend selection.

## Current gate

The corrected synthetic V0 publication gate is complete and accepted.

There is no active product, backend, auth, advertising, analytics, TWA, Play Store or paid-infrastructure implementation gate. Do not open one implicitly.

Permitted next work is limited to observing V0 UX/value-proposition evidence under the existing synthetic and privacy boundary. Any consequential implementation, real-data pilot, backend activation or store-distribution step requires a separate explicit founder gate.