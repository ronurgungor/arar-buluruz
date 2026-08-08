\set ON_ERROR_STOP on

-- Run after a clean-server restore. These checks intentionally avoid real row values.
do $$
begin
  if to_regclass('public.listings') is null then
    raise exception 'public.listings is missing';
  end if;

  if to_regclass('private.listing_contacts') is null
     or to_regclass('private.listing_photos') is null
     or to_regclass('private.listing_external_sales_links') is null then
    raise exception 'one or more private pilot tables are missing';
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
      ('listing_contacts'),
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
    raise exception 'RLS is not enabled on every private pilot table';
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
end;
$$;

select
  current_database() as database_name,
  count(*) filter (where status = 'published' and expires_at > now()) as currently_active_rows,
  count(*) filter (where status <> 'published' or expires_at <= now()) as non_active_rows
from public.listings;
