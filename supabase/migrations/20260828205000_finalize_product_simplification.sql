-- Final product simplification for the near-final/KOSGEB-ready consumer contract.
-- Synthetic/local/CI scope only: this migration does not activate production, real data or paid services.

-- Description is optional. Preserve a non-null empty-string representation so older adapters
-- and indexes do not need a nullable-text rewrite, but remove the arbitrary 10-character floor.
alter table public.listings
  drop constraint if exists listings_description_length_check,
  add constraint listings_description_length_check
    check (char_length(description) <= 5000);

comment on column public.listings.description is
  'Optional seller description. Empty string means no description; no filler text is fabricated.';

-- Condition is optional and must never be silently defaulted for new listings.
alter table public.listings
  alter column item_condition drop not null,
  alter column item_condition drop default,
  drop constraint if exists listings_item_condition_check,
  add constraint listings_item_condition_check
    check (
      item_condition is null
      or item_condition in ('like_new', 'good', 'used', 'needs_repair')
    );

comment on column public.listings.item_condition is
  'Optional seller-selected condition metadata. Null means the seller did not provide a condition.';

-- Supersede the three-checkbox Stage-1 evidence model. Historical columns remain nullable
-- for migration safety/history, but normal publication no longer requires or fabricates them.
alter table public.listings
  add column listing_rules_version text,
  add column listing_rules_accepted_at timestamptz;

alter table public.listings
  add constraint listings_rules_version_check
    check (
      listing_rules_version is null
      or (
        listing_rules_version = btrim(listing_rules_version)
        and char_length(listing_rules_version) between 1 and 64
      )
    ),
  add constraint listings_rules_evidence_pair_check
    check ((listing_rules_version is null) = (listing_rules_accepted_at is null)),
  add constraint listings_rules_acceptance_after_verification_check
    check (
      listing_rules_accepted_at is null
      or (
        contact_verified_at is not null
        and listing_rules_accepted_at >= contact_verified_at
      )
    );

comment on column public.listings.listing_rules_version is
  'Version of the listing rules presented in the publication context.';
comment on column public.listings.listing_rules_accepted_at is
  'Audit timestamp for acceptance through the explicit publish action. Not a KVKK consent field.';
comment on column public.listings.private_seller_declaration_at is
  'Historical Stage-1 checkbox evidence only; no longer required or fabricated for new publication.';
comment on column public.listings.content_rights_declaration_at is
  'Historical Stage-1 checkbox evidence only; no longer required or fabricated for new publication.';
comment on column public.listings.contact_channel is
  'Legacy/internal delivery metadata. New self-service listings derive phone_whatsapp server-side; it is not a seller preference or consent field.';

-- Do not invent rules acceptance for already-live rows. If a persisted row predates the new
-- evidence model, fail closed until an explicit future re-publication path records valid evidence.
update public.listings
set
  status = 'unpublished',
  unpublished_at = coalesce(unpublished_at, now())
where status = 'published'
  and (
    listing_rules_version is null
    or listing_rules_accepted_at is null
  );

alter table public.listings
  drop constraint if exists listings_published_stage1_declarations_ready_check,
  add constraint listings_published_rules_ready_check
    check (
      status <> 'published'
      or (
        listing_rules_version is not null
        and listing_rules_accepted_at is not null
      )
      or (
        -- Compatibility only for historical operator-created rows using the old
        -- verification methods. New self-service publication uses one_time_code
        -- and must satisfy the versioned rules evidence branch above.
        contact_verification_method in (
          'whatsapp_same_number',
          'manual_callback',
          'founder_equivalent'
        )
        and private_seller_declaration_at is not null
        and content_rights_declaration_at is not null
      )
    );

-- Replace atomic publication readiness with the current evidence contract.
create or replace function public.complete_and_publish_listing_submission(
  p_key_hash text,
  p_listing_id uuid,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid idempotency key hash';
  end if;

  if p_expires_at <= v_now or p_expires_at > v_now + interval '90 days' then
    raise exception 'invalid listing expiry';
  end if;

  if not exists (
    select 1
    from private.listing_submission_keys as k
    where k.key_hash = p_key_hash
      and k.listing_id = p_listing_id
      and k.completed_at is null
  ) then
    return false;
  end if;

  if not exists (
    select 1
    from public.listings as l
    where l.id = p_listing_id
      and l.status = 'pending'
      and l.contact_channel = 'phone_whatsapp'
      and l.contact_e164 is not null
      and l.contact_verified_at is not null
      and l.contact_verification_method is not null
      and l.publication_instruction_at is not null
      and l.listing_rules_version is not null
      and l.listing_rules_accepted_at is not null
      and l.listing_rules_accepted_at >= l.contact_verified_at
      and exists (
        select 1
        from private.listing_photos as p
        where p.listing_id = l.id
      )
  ) then
    raise exception 'listing is not publish-ready';
  end if;

  update public.listings
  set
    status = 'published',
    published_at = v_now,
    expires_at = p_expires_at,
    unpublished_at = null,
    sold_at = null
  where id = p_listing_id
    and status = 'pending';

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'listing publication did not update exactly one row';
  end if;

  update private.listing_submission_keys
  set completed_at = v_now
  where key_hash = p_key_hash
    and listing_id = p_listing_id
    and completed_at is null;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'idempotency completion did not update exactly one row';
  end if;

  return true;
end;
$$;

revoke all on function public.complete_and_publish_listing_submission(text, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.complete_and_publish_listing_submission(text, uuid, timestamptz)
  to service_role;
