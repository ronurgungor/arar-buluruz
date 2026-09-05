\set ON_ERROR_STOP on

-- Run after a clean-server restore. These checks intentionally avoid real row values.
do $$
declare
  anonymous_policy_qual text;
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
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name = 'owner_user_id'
  ) then
    raise exception 'pseudonymous seller ownership column is missing from public.listings';
  end if;

  if to_regclass('private.sellers') is null
     or to_regclass('private.seller_sessions') is null then
    raise exception 'private seller identity/session tables are missing';
  end if;

  if to_regprocedure('public.reconcile_seller_recovery(text,text,text,timestamptz)') is not null then
    raise exception 'obsolete non-rotating recovery reconciliation RPC still exists';
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

  if has_column_privilege('anon', 'public.listings', 'owner_user_id', 'SELECT')
     or has_table_privilege('anon', 'private.sellers', 'SELECT')
     or has_table_privilege('anon', 'private.seller_sessions', 'SELECT') then
    raise exception 'anonymous role can inspect seller ownership/session state';
  end if;

  if has_function_privilege('anon', 'public.resolve_seller_session(text)', 'EXECUTE')
     or has_function_privilege(
       'anon',
       'public.recover_seller_identity(text,text,text,text,text,timestamptz)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.recover_seller_identity(text,text,text,text,text,timestamptz)',
       'EXECUTE'
     ) then
    raise exception 'public application role can invoke privileged seller session/recovery functions';
  end if;

  if not has_function_privilege(
       'service_role',
       'public.recover_seller_identity(text,text,text,text,text,timestamptz)',
       'EXECUTE'
     ) then
    raise exception 'service_role recovery rotation privilege is missing';
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
        or publication_instruction_at is null
      )
  ) then
    raise exception 'published listing exists without complete public-contact publication readiness';
  end if;

  -- Photo delivery remains in first real-pilot scope, but anonymous browsers must not
  -- hold any Storage SELECT/sign policy. They receive only the narrow active-listing
  -- manifest; the application server re-checks deliverability with the service-role-only
  -- RPC immediately before creating a fixed-TTL signed URL.
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

  if not has_function_privilege('anon', photo_manifest_oid, 'EXECUTE') then
    raise exception 'anon active-listing photo manifest EXECUTE contract is missing';
  end if;

  if has_function_privilege('anon', photo_path_helper_oid, 'EXECUTE')
     or has_function_privilege('authenticated', photo_path_helper_oid, 'EXECUTE') then
    raise exception 'public application role can invoke the retired Storage-signing helper';
  end if;

  if not has_function_privilege('service_role', photo_path_helper_oid, 'EXECUTE')
     or not has_function_privilege(
       'service_role',
       'public.get_deliverable_listing_photo(uuid,uuid)',
       'EXECUTE'
     ) then
    raise exception 'service-role photo delivery privilege is missing';
  end if;

  if has_table_privilege('anon', 'private.listing_photos', 'SELECT') then
    raise exception 'anon gained direct private listing_photos SELECT privilege';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can sign active listing photo objects'
  ) then
    raise exception 'obsolete anonymous Storage photo-signing policy still exists';
  end if;
end;
$$;

select
  current_database() as database_name,
  count(*) filter (where status = 'published' and expires_at > now()) as currently_active_rows,
  count(*) filter (where status <> 'published' or expires_at <= now()) as non_active_rows
from public.listings;
