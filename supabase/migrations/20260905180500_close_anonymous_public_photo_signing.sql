-- Public signed-photo issuance security closure.
-- Repository/local/synthetic preparation only: no production activation or real data is introduced.
--
-- Public browsers keep the lifecycle-gated listing photo manifest, but they must no longer be
-- able to call the Storage signing endpoint directly. Signed URL creation is mediated by the
-- application server, which re-checks deliverability through the existing service-role-only
-- get_deliverable_listing_photo(...) RPC and uses the canonical short TTL.

drop policy if exists "Public can sign active listing photo objects" on storage.objects;

-- This helper previously existed only to support the anonymous Storage sign policy. Keep it as
-- append-only schema history/diagnostic logic, but remove it from public application roles so it
-- cannot be used as an object-path existence oracle.
revoke execute on function public.is_deliverable_listing_photo_path(text)
  from public, anon, authenticated;
grant execute on function public.is_deliverable_listing_photo_path(text)
  to service_role;

-- The narrow active-listing manifest remains intentionally public. Direct private photo metadata,
-- Storage object reads/listing and signing remain outside the anonymous browser role.
revoke all on function public.get_deliverable_listing_photo(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_deliverable_listing_photo(uuid, uuid)
  to service_role;
