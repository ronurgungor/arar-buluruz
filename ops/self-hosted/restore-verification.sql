\set ON_ERROR_STOP on

-- Run after a clean-server restore. These checks intentionally avoid real row values.
do $$
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
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'listings'
      and policyname = 'Public can read active published listings'
      and cmd = 'SELECT'
      and roles = array['anon']::name[]
  ) then
    raise exception 'canonical anonymous active-listing policy is missing';
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
end;
$$;

select
  current_database() as database_name,
  count(*) filter (where status = 'published' and expires_at > now()) as currently_active_rows,
  count(*) filter (where status <> 'published' or expires_at <= now()) as non_active_rows
from public.listings;
