create table public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  price_amount numeric(12, 2) not null,
  province text not null,
  district text not null,
  seller_display_name text not null,
  search_keywords text[] not null default '{}'::text[],
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  expires_at timestamptz,
  unpublished_at timestamptz,

  constraint listings_title_length_check
    check (char_length(btrim(title)) between 3 and 120),
  constraint listings_title_trimmed_check
    check (title = btrim(title)),
  constraint listings_description_length_check
    check (char_length(btrim(description)) between 10 and 5000),
  constraint listings_description_trimmed_check
    check (description = btrim(description)),
  constraint listings_price_amount_check
    check (price_amount >= 0),
  constraint listings_province_length_check
    check (char_length(btrim(province)) between 2 and 64),
  constraint listings_province_trimmed_check
    check (province = btrim(province)),
  constraint listings_district_length_check
    check (char_length(btrim(district)) between 2 and 64),
  constraint listings_district_trimmed_check
    check (district = btrim(district)),
  constraint listings_seller_display_name_length_check
    check (char_length(btrim(seller_display_name)) between 2 and 80),
  constraint listings_seller_display_name_trimmed_check
    check (seller_display_name = btrim(seller_display_name)),
  constraint listings_search_keywords_count_check
    check (cardinality(search_keywords) <= 40),
  constraint listings_search_keywords_empty_check
    check (array_position(search_keywords, '') is null),
  constraint listings_status_check
    check (status in ('draft', 'published', 'unpublished')),
  constraint listings_updated_at_check
    check (updated_at >= created_at),
  constraint listings_publication_order_check
    check (
      expires_at is null
      or (published_at is not null and expires_at > published_at)
    ),
  constraint listings_unpublication_order_check
    check (
      unpublished_at is null
      or (published_at is not null and unpublished_at >= published_at)
    ),
  constraint listings_status_dates_check
    check (
      (
        status = 'draft'
        and published_at is null
        and expires_at is null
        and unpublished_at is null
      )
      or (
        status = 'published'
        and published_at is not null
        and expires_at is not null
        and unpublished_at is null
      )
      or (
        status = 'unpublished'
        and published_at is not null
        and expires_at is not null
        and unpublished_at is not null
      )
    )
);

comment on table public.listings is
  'Founder-operated classified listings for the controlled Corlu persistence pilot.';
comment on column public.listings.search_keywords is
  'Non-visible search synonyms; never seller contact data.';

create function public.set_listings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_listings_updated_at() from public, anon, authenticated;

create trigger listings_set_updated_at
before update on public.listings
for each row
execute function public.set_listings_updated_at();

create index listings_public_feed_idx
  on public.listings (published_at desc, expires_at, id)
  where status = 'published';

alter table public.listings enable row level security;

revoke all on table public.listings from public, anon, authenticated;
grant usage on schema public to anon;
grant select (
  id,
  title,
  description,
  price_amount,
  province,
  district,
  seller_display_name,
  search_keywords,
  created_at,
  published_at
) on table public.listings to anon;

create policy "Public can read active published listings"
on public.listings
for select
to anon
using (
  status = 'published'
  and published_at <= now()
  and expires_at > now()
);
