-- Trusted real-pilot photo pipeline preparation only.
-- No production Storage/Auth/backend activation and no real data are introduced here.

create function public.register_sanitized_listing_photo(
  p_listing_id uuid,
  p_photo_id uuid,
  p_object_path text,
  p_byte_size bigint,
  p_sort_order smallint
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_object_path is distinct from (
    'listings/' || p_listing_id::text || '/' || p_photo_id::text || '.webp'
  ) then
    raise exception 'sanitized listing photo path does not match the controlled WebP contract'
      using errcode = '22023';
  end if;

  if p_byte_size is null or p_byte_size < 1 or p_byte_size > 8388608 then
    raise exception 'sanitized listing photo byte size is outside the trusted boundary'
      using errcode = '22023';
  end if;

  insert into private.listing_photos (
    id,
    listing_id,
    object_path,
    mime_type,
    byte_size,
    sort_order
  ) values (
    p_photo_id,
    p_listing_id,
    p_object_path,
    'image/webp',
    p_byte_size,
    p_sort_order
  );
end;
$$;

comment on function public.register_sanitized_listing_photo(uuid, uuid, text, bigint, smallint) is
  'Service-role-only bridge for canonical sanitized WebP metadata. The caller must sanitize and upload the object before invoking this function.';

revoke all on function public.register_sanitized_listing_photo(uuid, uuid, text, bigint, smallint)
  from public, anon, authenticated;
grant execute on function public.register_sanitized_listing_photo(uuid, uuid, text, bigint, smallint)
  to service_role;

create function public.get_deliverable_listing_photo(
  p_listing_id uuid,
  p_photo_id uuid
)
returns table (
  listing_id uuid,
  photo_id uuid,
  object_path text,
  mime_type text,
  byte_size bigint,
  sort_order smallint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.listing_id,
    p.id as photo_id,
    p.object_path,
    p.mime_type,
    p.byte_size,
    p.sort_order
  from private.listing_photos as p
  join public.listings as l
    on l.id = p.listing_id
  where l.id = p_listing_id
    and p.id = p_photo_id
    and p.listing_id = p_listing_id
    and l.status = 'published'
    and l.published_at is not null
    and l.published_at <= now()
    and l.expires_at is not null
    and l.expires_at > now()
    and l.unpublished_at is null
    and p.mime_type = 'image/webp'
    and p.byte_size between 1 and 8388608
    and p.object_path = (
      'listings/' || p_listing_id::text || '/' || p_photo_id::text || '.webp'
    )
  limit 1
$$;

comment on function public.get_deliverable_listing_photo(uuid, uuid) is
  'Service-role-only lifecycle gate for private sanitized photo metadata. Returns no row unless the owning listing is currently published and active.';

revoke all on function public.get_deliverable_listing_photo(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_deliverable_listing_photo(uuid, uuid)
  to service_role;
