\set ON_ERROR_STOP on

-- Run after a clean-server restore. These checks intentionally avoid real row values.
do $$
declare
  anonymous_policy_qual text;
  storage_policy_qual text;
  photo_manifest_oid oid;
  photo_path_helper_oid oid;
begin
  if to_regclass('public.listings') is null then
    raise exception 'public.listings is missing';
  end if;

  if to_regclass('private.listing_contacts') is not null then
    raise exception 'obsolete private.listing_contacts still exists';
  end if;

  if to_regclass('private.listing_photos') is null
     or to_regclass('private.listing_external_sales_links') is null then
    raise exception 'one or more required private pilot tables are missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name = 'contact_e164'
  ) then
    raise exception 'public seller-contact contract is missing from public.listings';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'listings' and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on public.listings';
  end if;

  if exists (
    select 1
    from (values
      ('listing_photos'),
      ('listing_external_sales_links')
    ) as required(relname)
    where not exists (
      select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'private'
        and c.relname = required.relname
        and c.relrowsecurity
    )
  ) then
    raise exception 'RLS is not enabled on every required private pilot table';
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'private schema is reachable by a public application role';
  end if;

  if has_table_privilege('anon', 'public.listings', 'INSERT')
     or has_table_privilege('anon', 'public.listings', 'UPDATE')
     or has_table_privilege('anon', 'public.listings', 'DELETE') then
    raise exception 'anon unexpectedly has a listings write privilege';
  end if;

  if not has_column_privilege('anon', 'public.listings', 'contact_channel', 'SELECT')
     or not has_column_privilege('anon', 'public.listings', 'contact_e164', 'SELECT') then
    raise exception 'intentional public contact columns are not readable through the active-listing RLS contract';
  end if;

  if has_column_privilege('anon', 'public.listings', 'contact_verified_at', 'SELECT')
     or has_column_privilege('anon', 'public.listings', 'contact_verification_method', 'SELECT')
     or has_column_privilege('anon', 'public.listings', 'publication_instruction_at', 'SELECT') then
    raise exception 'internal contact verification/audit fields are anonymously readable';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
    where n.nspname = 'public'
      and c.relname = 'listings'
      and t.tgname = 'listings_fail_closed_contact_change'
      and not t.tgisinternal
      and t.tgenabled <> 'D'
      and pn.nspname = 'public'
      and p.proname = 'fail_closed_listing_contact_change'
  ) then
    raise exception 'fail-closed seller-contact trigger is missing, disabled or attached incorrectly';
  end if;

  select pg_catalog.pg_get_expr(p.polqual, p.polrelid)
  into anonymous_policy_qual
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'listings'
    and p.polname = 'Public can read active published listings'
    and p.polcmd = 'r'
    and p.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'anon')];

  if anonymous_policy_qual is null then
    raise exception 'canonical anonymous active-listing policy is missing';
  end if;

  -- Restore verification must validate the actual fail-closed predicate, not only
  -- the policy name. Any OR in this single canonical gate is treated as a weakened
  -- restore and therefore fails closed.
  if anonymous_policy_qual ~* '\sOR\s'
     or anonymous_policy_qual !~* 'status\s*=\s*''published''(::text)?'
     or anonymous_policy_qual !~* 'published_at\s*<=\s*now\(\)'
     or anonymous_policy_qual !~* 'expires_at\s*>\s*now\(\)'
     or anonymous_policy_qual !~* 'unpublished_at\s+IS\s+NULL'
     or anonymous_policy_qual !~* 'contact_channel\s+IS\s+NOT\s+NULL'
     or anonymous_policy_qual !~* 'contact_e164\s+IS\s+NOT\s+NULL'
     or anonymous_policy_qual !~* 'contact_verified_at\s+IS\s+NOT\s+NULL'
     or anonymous_policy_qual !~* 'contact_verification_method\s+IS\s+NOT\s+NULL'
     or anonymous_policy_qual !~* 'publication_instruction_at\s+IS\s+NOT\s+NULL'
  then
    raise exception 'canonical anonymous listings policy does not preserve the required active-published/contact-readiness predicate: %', anonymous_policy_qual;
  end if;

  if exists (
    select 1
    from public.listings
    where status = 'published'
      and (
        contact_channel is null
        or contact_e164 is null
        or contact_verified_at is null
        or contact_verification_method is null
        or publication_instruction_at is null
      )
  ) then
    raise exception 'published listing exists without complete seller-contact readiness';
  end if;

  -- Photo delivery is part of the first real-pilot scope. The restored target must
  -- preserve the private bucket, narrow public manifest and lifecycle-aware signed
  -- URL policy. Object bytes are verified separately after Storage restore.
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'Supabase Storage database schema is missing';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'listing_photos'
      and name = 'listing_photos'
      and public = false
  ) then
    raise exception 'private listing_photos Storage bucket is missing or public';
  end if;

  photo_manifest_oid := to_regprocedure('public.get_public_listing_photos(uuid)');
  photo_path_helper_oid := to_regprocedure('public.is_deliverable_listing_photo_path(text)');
  if photo_manifest_oid is null or photo_path_helper_oid is null then
    raise exception 'public photo delivery functions are missing';
  end if;

  if not (select prosecdef from pg_catalog.pg_proc where oid = photo_manifest_oid)
     or not (select prosecdef from pg_catalog.pg_proc where oid = photo_path_helper_oid) then
    raise exception 'photo delivery functions do not preserve required SECURITY DEFINER boundary';
  end if;

  if position('search_path=""' in coalesce(
       (select array_to_string(proconfig, ',') from pg_catalog.pg_proc where oid = photo_manifest_oid),
       ''
     )) = 0
     or position('search_path=""' in coalesce(
       (select array_to_string(proconfig, ',') from pg_catalog.pg_proc where oid = photo_path_helper_oid),
       ''
     )) = 0 then
    raise exception 'photo delivery function search_path is not pinned empty';
  end if;

  if not has_function_privilege('anon', photo_manifest_oid, 'EXECUTE')
     or not has_function_privilege('anon', photo_path_helper_oid, 'EXECUTE') then
    raise exception 'anon photo delivery EXECUTE contract is missing';
  end if;

  if has_table_privilege('anon', 'private.listing_photos', 'SELECT') then
    raise exception 'anon gained direct private listing_photos SELECT privilege';
  end if;

  select pg_catalog.pg_get_expr(p.polqual, p.polrelid)
  into storage_policy_qual
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and p.polname = 'Public can sign active listing photo objects'
    and p.polcmd = 'r'
    and p.polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'anon')];

  if storage_policy_qual is null
     or storage_policy_qual !~* 'bucket_id\s*=\s*''listing_photos'''
     or storage_policy_qual !~* 'allow_only_operation'
     or storage_policy_qual !~* 'storage.object.sign'
     or storage_policy_qual !~* 'is_deliverable_listing_photo_path' then
    raise exception 'Storage photo policy is missing or does not preserve signed-only bucket/lifecycle gates: %', storage_policy_qual;
  end if;
end;
$$;

select
  current_database() as database_name,
  count(*) filter (where status = 'published' and expires_at > now()) as currently_active_rows,
  count(*) filter (where status <> 'published' or expires_at <= now()) as non_active_rows
from public.listings;
