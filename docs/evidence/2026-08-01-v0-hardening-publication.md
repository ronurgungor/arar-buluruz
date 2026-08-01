# V0 phase/privacy hardening publication record

_Date: 2026-08-01, Europe/Istanbul_

## Scope

This record covers only the founder-approved Publish/Update of the public V0 phase/privacy hardening completed through PR #43 and the release-path correction completed through PR #44.

No product capability, backend, Supabase activation, environment/listing-source setting, secret, real data, advertising, analytics, paid operation, dependency or lockfile change was included.

## Published identity

- Repository: `ronurgungor/arar-buluruz`
- Canonical source: `f33856d7417e449ad3e9bfec1f501eb61989de45`
- Lovable project: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Public URL: `https://arar-buluruz.lovable.app`
- Deployment ID: `9b7c3685-7611-40a4-9486-ccf6c0b7b454`
- Lovable status after deployment: `completed`
- Lovable publication metadata: `is_published: true`, `publish_visibility: public`
- Post-deployment metadata timestamp: `2026-08-01T13:03:39.258106Z`
- Latest synchronized screenshot/source prefix: `f33856d7`
- Latest Lovable edit: exact source `f33856d7417e449ad3e9bfec1f501eb61989de45`

No Lovable agent message was sent. No Lovable environment or source setting was changed.

## Release-path proof

PR #44 made the repository's standard production command the canonical public V0 path:

```text
bun run build
```

with build profile and listings source unset.

The build succeeded and the generated artifact contained the exact non-sensitive identity:

```text
public-v0|listings=mock|gate1=off
```

The same artifact checks rejected the following public identities:

```text
public-v0|listings=supabase
public-v0|listings=disabled
public-v0|listings=mock|gate1=on
```

The negative build gates also rejected public V0 with Gate 1 operations, Supabase source, disabled source and an unknown build profile. Explicit `public-v0` plus `mock` remained successful. The separate `ci-disabled` and `gate1-ephemeral-ci` profiles remained intact.

## Acceptance controls

Acceptance was based on the following matching controls for the exact published source:

1. Lovable's synchronized edit history ends at exact canonical source `f33856d7417e449ad3e9bfec1f501eb61989de45`.
2. The post-Publish/Update project metadata is `completed`, public and `is_published: true`.
3. The standard bare production build emitted `public-v0|listings=mock|gate1=off`; the root shell binds this compiled value to the `<html data-arar-build-signature>` attribute.
4. The exact production-mode artifact passed the V0 browser/privacy/PWA suite covering:
   - the visible V0 phase notice;
   - synthetic `/ara` results and absence of disconnected-state messaging;
   - synthetic listing-detail navigation;
   - `/gizlilik`;
   - non-collecting `/ilan-ver`, `/giris` and `/sikayet/$id` public routes;
   - no normal-navigation application cookie, auth, Supabase/backend, analytics, advertising-network or Google Fonts request;
   - fail-closed public error forwarding;
   - manifest, service-worker registration, bounded shell cache and the honest offline screen.
5. Frozen installation, lint, unit tests, production builds, 22/22 pgTAP/RLS, local REST integration and Gate 1 desktop/mobile E2E remained green.

The assistant's generic public-web fetch layer returned a tooling `cache miss` before reaching the application. This was not an HTTP response from the published app and therefore was not treated as an application acceptance failure or as evidence of a successful direct public click-through. The publication decision rests on the matching Lovable metadata, exact synchronized source, deterministic bare-build identity and production-mode browser evidence above.

No acceptance control produced an application failure signal. Rollback or Unpublish was therefore not triggered.

## Accepted boundary

The publication is accepted only as **V0 — UX ve değer önerisi doğrulaması** with synthetic/mock listings.

It does not establish or open:

- a real-data pilot;
- real accounts or authentication;
- real listing submission or ownership;
- sustainable moderation or seller-contact operations;
- backend/provider activation;
- advertising or analytics;
- TWA, Android or Play Store work;
- PR B, PR C or any new consequential implementation gate.

The project stops at the existing synthetic V0 observation boundary. Any further consequential work requires a separate explicit founder gate.
