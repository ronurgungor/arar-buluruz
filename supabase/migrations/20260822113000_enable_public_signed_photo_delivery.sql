-- Public buyer-visible photo delivery for the founder-operated real-pilot scope.
-- The bucket remains private. Only controlled canonical WebP objects that belong to
-- currently active published listings may be discovered/signed by the public role.
-- This migration does not activate a remote backend or introduce real data.

create function public.is_deliverable_listing_photo_path(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.listing_photos as p
    join public.listings as l
      on l.id = p.listing_id
    where p.object_path = p_object_path
      and p.mime_type = 'image/webp'
      and p.byte_size between 1 and 8388608
      and p.object_path = (
        'listings/' || p.listing_id::text || '/' || p.id::text || '.webp'
      )
      and l.status = 'published'
      and l.published_at is not null
      and l.published_at <= now()
      and l.expires_at is not null
      and l.expires_at > now()
      and l.unpublished_at is null
  )
$$;

comment on function public.is_deliverable_listing_photo_path(text) is
  'Fail-closed Storage RLS helper. Returns true only for canonical WebP objects attached to a currently active published listing.';

revoke all on function public.is_deliverable_listing_photo_path(text)
  from public, anon, authenticated;
grant execute on function public.is_deliverable_listing_photo_path(text)
  to anon, authenticated, service_role;

create function public.get_public_listing_photos(p_listing_id uuid)
returns table (
  photo_id uuid,
  object_path text,
  mime_type text,
  byte_size bigint,
  sort_order smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id as photo_id,
    p.object_path,
    p.mime_type,
    p.byte_size,
    p.sort_order
  from private.listing_photos as p
  join public.listings as l
    on l.id = p.listing_id
  where l.id = p_listing_id
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
      'listings/' || p_listing_id::text || '/' || p.id::text || '.webp'
    )
  order by p.sort_order, p.id
$$;

comment on function public.get_public_listing_photos(uuid) is
  'Anonymous read-only manifest for canonical photo objects of one currently active published listing. It does not return seller-private data or Storage credentials.';

revoke all on function public.get_public_listing_photos(uuid)
  from public;
grant execute on function public.get_public_listing_photos(uuid)
  to anon, authenticated, service_role;

-- Keep the bucket private. Storage sets storage.operation for each request. Permit
-- anon SELECT only while Storage is evaluating the signed-URL creation operation;
-- direct authenticated reads and object/bucket listing remain outside this policy.
create policy "Public can sign active listing photo objects"
on storage.objects
for select
to anon
using (
  bucket_id = 'listing_photos'
  and storage.allow_only_operation('storage.object.sign')
  and public.is_deliverable_listing_photo_path(name)
);
