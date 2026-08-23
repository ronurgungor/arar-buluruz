-- Founder-operated pilot deletion support only.
-- This migration does not activate production, public writes, Auth or real data.

create function public.get_listing_photo_inventory(
  p_listing_id uuid
)
returns table (
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
    p.id as photo_id,
    p.object_path,
    p.mime_type,
    p.byte_size,
    p.sort_order
  from private.listing_photos as p
  where p.listing_id = p_listing_id
  order by p.sort_order, p.id
$$;

comment on function public.get_listing_photo_inventory(uuid) is
  'Service-role-only operator inventory used to delete private Storage objects before hard listing deletion. It is not a public photo-delivery path.';

revoke all on function public.get_listing_photo_inventory(uuid)
  from public, anon, authenticated;
grant execute on function public.get_listing_photo_inventory(uuid)
  to service_role;
