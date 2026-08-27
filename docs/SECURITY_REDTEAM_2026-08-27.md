# Arar Buluruz — Narrow Security REDTEAM — 2026-08-27

## Scope

This review is intentionally limited to the founder-approved near-final security surface:

- atomic auto-publication;
- verified-phone capability isolation;
- cross-phone seller access;
- seller edit / unpublish / sold / delete authorization;
- direct anonymous-write leakage;
- multipart / unknown-field abuse;
- idempotency / race behavior;
- partial photo failure / orphan cleanup;
- private Storage / signed-photo lifecycle;
- service-role leakage;
- founder post-moderation fail-closed takedown.

No product or architecture redesign was performed.

## Reviewer/tool limitation

A dedicated Codex invocation surface is **not available in the current Main Execution Chat session**. No result is being mislabelled as Codex output.

The Main Execution Chat therefore performed the approved narrow repository review directly using exact repository code and executable evidence. Dedicated Codex specialist review remains an independent-review evidence item if/when an actual Codex session is available; it is not substituted by a fabricated reviewer identity.

## Evidence baseline

Frontend GREEN checkpoint before REDTEAM material fix:

`41691652070cbc117a943578a49056d49d51e6f0`

All seven canonical workflows were GREEN on that exact SHA, including Stage 1 self-service acceptance rerun job `98587435492`.

Files reviewed include:

- `src/lib/stage1-self-service-server.ts`
- `src/lib/stage1-self-service-server.test.ts`
- `src/lib/stage1-moderation-server.ts`
- `src/lib/listing-photo-trusted.ts`
- `src/lib/listing-photo-trusted.test.ts`
- `supabase/migrations/20260808211500_prepare_real_corlu_pilot_backend.sql`
- `supabase/migrations/20260822113000_enable_public_signed_photo_delivery.sql`
- `supabase/migrations/20260823150000_add_operator_photo_inventory.sql`
- `supabase/migrations/20260826181500_prepare_stage1_self_service.sql`
- `supabase/migrations/20260827120000_prepare_near_final_classifieds.sql`
- `supabase/tests/database/listings_rls.test.sql`
- `scripts/stage1-self-service-browser-e2e.ts`
- `scripts/pilot-rc-artifact-boundary-check.sh`

## Findings

### BLOCKER

**None found.**

No reviewed path demonstrated an authorization bypass, anonymous write path, premature public listing/photo exposure, service-role browser leak or cross-phone seller mutation.

### IMPORTANT — fixed

#### R-001 — Whole-submission cleanup did not retry the exact orphan path reported by a failed photo compensation

**Class:** IMPORTANT  
**Status:** FIXED

The trusted photo ingestion layer correctly reported `TrustedListingPhotoIngestionError.orphanedObjectPath` when:

1. sanitized Storage upload succeeded;
2. photo metadata persistence failed; and
3. the ingestion-layer compensating Storage delete also failed.

However, the outer whole-submission cleanup previously retried only object paths from successfully returned `StoredListingPhotoMetadata` entries. The currently failing photo never returned metadata, so its exact reported orphan path was not included in the second whole-submission Storage cleanup attempt.

This did **not** create public access: the object was private, had no valid public photo metadata, and the listing submission failed closed. It was nevertheless a repository-controlled privacy/retention cleanup gap and therefore material.

**Fix:**

- import and recognize `TrustedListingPhotoIngestionError`;
- when it reports `orphanedObjectPath`, add that exact path to whole-submission cleanup;
- de-duplicate successful-photo and orphan paths;
- retry Storage deletion before deleting the pending listing row;
- preserve AggregateError/fail-closed behavior if cleanup still cannot complete.

**Regression test:**

A server acceptance test now simulates:

- metadata registration failure;
- first compensating Storage delete failure;
- successful whole-submission retry of the known orphan path;

and asserts:

- request fails safely;
- listing row absent;
- photo metadata absent;
- Storage object absent;
- idempotency state absent.

No security assertion was weakened.

### CAN WAIT

#### R-002 — Verification challenges and rate buckets are process-local memory

Current challenge/rate state uses process-local Maps.

This is acceptable for the current synthetic/local/CI boundary and production is OFF. A future horizontally scaled or multi-process real verification deployment would need a shared/durable anti-abuse state model or a deliberately single-instance operational contract.

This is **not** a reason to redesign the current product now.

#### R-003 — Hard delete spans Storage and database rather than one cross-service transaction

Seller and founder hard-delete paths intentionally fail closed by unpublishing a published listing before deleting Storage objects and the database row.

Storage and PostgreSQL cannot be made one ordinary database transaction. A failure after unpublish can leave non-public cleanup work to retry/reconcile, but does not leave the listing publicly active.

Before real production operations, retry/reconciliation/operational recovery should be verified against the actual selected hosting/storage topology.

#### R-004 — Previously minted signed photo URLs have short residual validity

New public signing fails closed after unpublish/takedown through lifecycle-gated metadata/Storage policy. A signed URL already issued before takedown can remain usable until its short expiry.

This is an inherent short-lived signed-URL property, not an anonymous authorization bypass. Current public delivery uses the conservative short-lived contract and does not justify architecture redesign before real production evidence.

### FALSE POSITIVE / ACCEPTED DESIGN

#### R-005 — Service role exists in server implementation source

Not a browser leak.

Service-role values are read from server environment only. Public artifact scanning and browser-journey network assertions verify privileged values/mutations do not reach the public browser artifact.

#### R-006 — SECURITY DEFINER publication/photo helper functions

Not anonymously privileged.

Relevant functions use an empty search path, explicit schemas and execute grants restricted according to purpose. Atomic publication is service-role-only. Public photo manifest/sign helpers return only lifecycle-gated public photo metadata or allow only the Storage sign operation for active published canonical objects.

#### R-007 — Public seller phone/contact fields are anonymously readable for published listings

This is intentional product disclosure, not a hidden-secret boundary.

Public contact remains lifecycle-gated and buyer-facing by product contract. Internal verification/declaration fields remain non-public.

#### R-008 — Founder moderation code still contains a publish operation

The normal product path is seller verified-phone atomic auto-publication. The founder surface remains privileged/local operations tooling and the browser acceptance proves founder pre-approval is not the normal publication path.

Retaining a controlled publish operation for exceptional unpublished/pending operational states is not, by itself, a product regression.

## Verified security conclusions

The reviewed code/evidence supports:

- seller capability is HMAC signed, expiry-bounded and phone-bound;
- tampered/wrong-phone/expired capabilities fail closed;
- other verified phones cannot infer the owner's listing through `İlanlarım` and mutation returns generic `403 NOT_AUTHORIZED`;
- seller lifecycle mutations re-check ownership server-side;
- anonymous listing INSERT/UPDATE/DELETE grants are absent;
- direct anonymous Storage write is denied;
- multipart fields are allow-listed and unknown fields rejected;
- upload count, per-file size, total size, MIME and trusted image decode/re-encode are bounded;
- idempotency claim and atomic publish completion are service-role-only;
- listing publication and idempotency completion occur in one database transaction;
- publish-readiness requires verified contact, publication instruction, both declarations and at least one trusted photo metadata row;
- private photo delivery is lifecycle-gated and short-lived signed;
- founder takedown first removes public lifecycle eligibility and public signing fails closed;
- no reviewed browser path performs a privileged Supabase mutation directly.

## Next verification requirement

Because R-001 changed repository code, all seven canonical workflows must be rerun and GREEN on one final exact SHA before PR #78 is handed to founder/advisor for product review.

PR #78 must remain DRAFT / UNMERGED.
