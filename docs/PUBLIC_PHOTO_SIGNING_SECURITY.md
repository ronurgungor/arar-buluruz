# Public Photo Signing Security Boundary

Scope: repository/local/synthetic implementation contract only. This document does not activate production, real data, paid infrastructure or an external service.

## Final issuance path

The `listing_photos` Storage bucket remains private. Public browsers may obtain only the existing lifecycle-gated photo manifest for an active published listing through `get_public_listing_photos(listing_id)`.

The browser does **not** call the Supabase Storage signing API. Public listing adapters expose a same-origin application URL of the form:

`/api/listing-photo/<listing-uuid>/<photo-uuid>`

The application server handles that path and, immediately before issuance:

1. validates both opaque UUIDs;
2. calls the existing service-role-only `get_deliverable_listing_photo(listing_id, photo_id)` RPC;
3. requires the canonical trusted WebP metadata/path contract;
4. requests a signed URL for exactly that object with the fixed **60-second** public-delivery TTL;
5. validates that the returned signed URL stays on the configured Supabase origin and exact Storage object path;
6. returns a non-cacheable redirect to the short-lived signed URL.

No request parameter controls the signed URL TTL. A query such as `?expiresIn=86400` has no effect.

## Anonymous Storage boundary

The former anonymous `storage.objects` SELECT policy used only for `storage.object.sign` is removed by the append-only migration `20260905180500_close_anonymous_public_photo_signing.sql`.

Anonymous/authenticated application roles cannot execute the historical path helper used by that policy. They retain no direct private `listing_photos` metadata privilege. The private bucket is not made public, and no anonymous object or bucket listing capability is introduced.

The narrow public manifest remains intentionally available only for active deliverable listings; this preserves the established listing/photo-manifest product contract without granting Storage signing authority.

## Takedown and lifecycle behavior

New signed URL issuance fails closed whenever `get_deliverable_listing_photo(...)` no longer returns the photo. This includes unpublished/taken-down, expired, sold, rejected/pending or otherwise non-deliverable listing states under the existing lifecycle contract.

A takedown therefore stops **future issuance immediately after the lifecycle mutation is visible to the database**.

### Unavoidable already-issued URL window

Supabase signed Storage URLs are bearer URLs. Once a valid URL has already been issued, changing the listing lifecycle cannot individually revoke that already-minted token. It may remain usable until its fixed TTL expires.

For the public application path, that residual window is bounded by the canonical **60-second issuance TTL** (plus ordinary clock/network propagation effects). Redirect responses are `no-store`; the application never issues a longer public TTL.

Hard deletion of the Storage object can of course make an already-issued URL fail sooner, but normal takedown security must not depend on destructive object deletion.

## Preserved invariants

This closure does not redesign the trusted-photo pipeline:

- upload still uses trusted decode/re-encode to canonical WebP;
- private photo metadata remains server-only;
- the Storage bucket remains private;
- public listing manifest semantics remain lifecycle-gated;
- seller ownership/session/RLS boundaries are unchanged;
- signed public delivery remains short-lived and browser-transparent;
- self-host and managed Supabase use the same database/Storage primitives.
