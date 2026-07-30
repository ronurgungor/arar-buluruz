# Arar Buluruz — Current State

_Last updated: 2026-07-30, Europe/Istanbul_

## Repository

- Repository: `ronurgungor/arar-buluruz`
- Visibility: Private
- Default branch: `main`
- GitHub `main` is canonical; read its exact live SHA at the start of every task rather than relying on a copied current-SHA field in documentation.
- Gate 1 PR: #25
- Gate 1 implementation head: `1d9d0f6112464e5078d90df510488f7a786cddef`
- Gate 1 normal merge commit: `994b8b1705d52434be0c000093a052fa0e519542`
- Canonical package manager and lockfile: Bun `1.3.14` and `bun.lock`.

## Shared knowledge system

- `AGENTS.md`: operating contract and source priority
- `docs/AI_CHAT_BOOTSTRAP.md`: common new-chat entry point
- `docs/ARAR_BULURUZ_PROJECT_MEMORY.md`: durable thesis, identifiers, architecture and ownership boundaries
- `docs/ARAR_BULURUZ_CURRENT_STATE.md`: current behavior, verification and risks
- `docs/ARAR_BULURUZ_DECISION_LOG.md`: consequential decisions and rationale
- `docs/ARAR_BULURUZ_BACKLOG.md`: completed, current and pending work
- `docs/AI_TEAM_CAPABILITIES.md` and `docs/WORK_CODEX_CAPABILITY_PROFILE.md`: team/tool capabilities and limits

No chat memory overrides GitHub `main`.

## Completed milestones

- Controlled frontend-only classified-listing prototype created and published.
- Search-first/categoryless interaction, mock listing detail/contact, editable listing preview and mobile fixes validated.
- Site-wide `noindex/nofollow` and `X-Robots-Tag` protection added.
- GitHub-canonical memory, decision, capability and backlog system established.
- Reduced founder-operated persistence direction selected in D-016.
- Web-first/minimal-PWA/Play-Store sequence recorded in D-017.
- Gate 1 implementation completed and merged through PR #25 with a normal merge commit.
- Gate 1 includes the local migration, RLS, REST reader, safe route behavior, controlled WhatsApp flows and executable validation package.

## Gate 1 implementation now on `main`

### Database package

- One migration-canonical `public.listings` table only.
- Fields: `id`, `title`, `description`, `price_amount`, `province`, `district`, `seller_display_name`, `search_keywords`, `status`, `created_at`, `updated_at`, `published_at`, `expires_at`, `unpublished_at`.
- Initial status values: `draft`, `published`, `unpublished`.
- Proportionate required-field, length, price, lifecycle and date-order constraints.
- Focused public-visibility index and `updated_at` trigger.
- RLS enabled.
- Public/anonymous visibility is enforced by the database:

```sql
status = 'published'
and published_at <= now()
and expires_at > now()
```

- Anonymous/public INSERT, UPDATE and DELETE are denied.
- Public reads expose only approved public columns; seller phone and privileged fields are absent.
- No `is_mock`, auth tables, role tables, seller-contact table, Storage or expiration cron.

### Application package

- Native-fetch public Supabase REST reader; no privileged client secret and no product auth dependency.
- Production default remains disconnected unless a later Gate 3 explicitly supplies approved public configuration.
- Development/test mocks remain isolated from the real-data path.
- `/ara` reads public-visible listings in Supabase mode and does not show mock distance or mock advertising behavior in that mode.
- `/ilan/$id` returns only public-visible listings; draft, unpublished, future-published, expired and unknown rows resolve to a safe not-found state.
- Visible listing WhatsApp messages include the listing ID and use the controlled central line.
- `/ilan-ver` prepares a structured WhatsApp application and performs no public database insert.
- `/sikayet/$id` prepares an ID-bearing structured WhatsApp complaint and performs no public database insert.
- `/giris` states that pilot login is unavailable; no signup/login/auth-client flow exists.
- Real listings use an honest no-photo state; photo upload and Storage remain absent.

## CI and executable validation

GitHub Actions runs for pull requests targeting `main`, pushes to `main` and manual dispatch with read-only repository permissions.

Canonical quality job:

- Bun `1.3.14`
- `bun install --frozen-lockfile`
- Bun-only lockfile/package boundary
- lint
- 7 unit tests
- production build with `VITE_LISTINGS_SOURCE=disabled`

Gate 1 local integration job:

- Supabase CLI `2.101.0`
- remote project-ref/credential prohibition
- GoTrue enabled only in the disposable runner copy to expose documented local `API_URL`/`ANON_KEY`
- clean local `supabase db reset --local --no-seed`
- 22/22 pgTAP schema, grants, constraints and RLS tests
- application REST adapter → local Kong/PostgREST → RLS integration
- exact-pinned `playwright@1.55.0` resolved through Bun
- desktop `1440 × 900` and mobile `390 × 844` E2E
- intercepted external WhatsApp navigation; no real message sent
- direct draft/expired detail 404 checks
- no `/auth/v1` request
- local stack and data removed with `supabase stop --no-backup`

Pre-merge CI run `30560604524` passed completely on the approved PR head.

## Lovable

- Project ID: `dca896f8-bb48-4a67-ae49-0493610ca6ad`
- Workspace ID: `AERDgNbVzztF411nAuzp`
- Public URL: `https://arar-buluruz.lovable.app`
- Preview URL: `https://id-preview--dca896f8-bb48-4a67-ae49-0493610ca6ad.lovable.app`
- Lovable database/backend remains disabled.
- Project remains published publicly, but publication is a separate snapshot.
- The GitHub merge synchronized the Lovable editor/preview to merge commit `994b8b17…`.
- No Lovable Publish/Update was performed for Gate 1.
- Latest previously confirmed public runtime SHA remains `2660990f699724e63b1d007b39952461d1d05cdb` until a separately authorized publication changes it.
- Project-panel display name still reports `Find It Fast`; repository/runtime naming uses `Arar Buluruz`.
- Remaining Lovable credits: `0`.

## Current stage

- Gate 1 local/isolated implementation is completed and merged to GitHub `main`.
- The repository contains backend schema/RLS/application connection code, but there is still no remote Arar Buluruz Supabase organization/project.
- No remote migration has been applied.
- No Supabase project ref, secret or real environment value has been connected.
- No real seller/listing data has been entered.
- No real pilot has started.
- No Lovable Publish/Update or other production deployment was performed for Gate 1.
- Gates 2–5 remain closed.
- The public Lovable site therefore remains the previously published frontend-only mock snapshot.

## Next real gate

Gate 2 is founder-owned Supabase organization/project creation. It may not start until the relevant Package A ownership, MFA/recovery, region and KVKK preparation is resolved and the founder gives explicit approval.

A separate narrow minimal-PWA package is planned after Gate 1 and before pilot publication, but it does not authorize or substitute for Gate 2–5 approvals.

## Backend ownership position

- Lovable remains a frontend writer and hosting surface, not the backend owner.
- Any remote backend will use a separate founder-owned Supabase organization/project.
- The founder controls account, organization, billing, MFA, recovery and administrator access.
- Schema/RLS/security changes remain GitHub-migration canonical.
- Future Dashboard row operations are founder-only and temporary; Dashboard schema/security mutation remains prohibited.
- Seller phone remains outside Supabase and communication remains on the controlled central line.

## Known gaps and risks

- Package A remains unresolved: account ownership/recovery/MFA, region, controlled-line ownership, data-controller identity, notice/legal basis, retention/deletion and possible international transfer.
- Remote project creation, environment connection, real-data entry and pilot publication remain separate founder gates.
- WhatsApp handling remains personal-data processing even when the phone/messages are not stored in Supabase.
- Founder-only Dashboard operation is intentionally temporary and has explicit exit triggers.
- Browser E2E uses local Vite SSR plus an ephemeral local Supabase stack; the Lovable/Cloudflare production runtime is build-verified but not deployed for Gate 1.
- `bun run preview` still requires adapter-specific verification before changing its current path.
- Six non-blocking Fast Refresh warnings remain in shared shadcn UI files.

## Operating policy

- The main assistant is the active default implementer and coordinator for routine, reversible work within canonical scope.
- Only one code writer operates at a time.
- Testing depth follows risk; existing evidence remains valid until touched behavior changes.
- Stop for founder approval before new architecture/product direction, scope expansion, new security/KVKK risk, remote Supabase or migration, secret/environment changes, real data, production publication/deployment, paid services, advertising/analytics/external SDKs or expensive-to-reverse actions.
- Gates 2–5 remain closed until separately approved.
