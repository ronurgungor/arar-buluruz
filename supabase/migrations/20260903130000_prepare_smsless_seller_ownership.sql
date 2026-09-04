-- SMS-less seller ownership Phase 1.
-- Repository/local/synthetic preparation only: this migration does not activate production,
-- real data, paid services, SMS, EIDS or any external provider.

create table private.sellers (
  id uuid primary key,
  recovery_selector text not null unique,
  recovery_digest text not null,
  created_at timestamptz not null default now(),
  recovery_rotated_at timestamptz not null default now(),

  constraint sellers_recovery_selector_check
    check (recovery_selector ~ '^[A-Za-z0-9_-]{16}$'),
  constraint sellers_recovery_digest_check
    check (recovery_digest ~ '^[0-9a-f]{64}$')
);

comment on table private.sellers is
  'Internal pseudonymous seller identities. No phone/email/legal identity is stored here.';
comment on column private.sellers.recovery_selector is
  'Non-secret lookup selector for the current rotating recovery credential.';
comment on column private.sellers.recovery_digest is
  'SHA-256 digest of the full high-entropy recovery code. Plaintext recovery codes are never stored.';

alter table private.sellers enable row level security;
revoke all on table private.sellers from public, anon, authenticated;
grant select, insert, update, delete on table private.sellers to service_role;

create table private.seller_sessions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null
    references private.sellers (id)
    on delete cascade,
  token_digest text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,

  constraint seller_sessions_token_digest_check
    check (token_digest ~ '^[0-9a-f]{64}$'),
  constraint seller_sessions_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '7 days 1 minute'),
  constraint seller_sessions_revocation_order_check
    check (revoked_at is null or revoked_at >= created_at)
);

comment on table private.seller_sessions is
  'Server-side revocable device sessions. Only opaque-token SHA-256 digests are persisted.';
comment on column private.seller_sessions.token_digest is
  'Digest of a CSPRNG opaque browser cookie token. The raw token exists only in the HttpOnly cookie.';
comment on column private.seller_sessions.revoked_at is
  'Non-null means this device session is no longer authorized.';

create index seller_sessions_seller_id_idx
  on private.seller_sessions (seller_id, expires_at desc);

alter table private.seller_sessions enable row level security;
revoke all on table private.seller_sessions from public, anon, authenticated;
grant select, insert, update, delete on table private.seller_sessions to service_role;

alter table public.listings
  add column owner_user_id uuid;

alter table public.listings
  add constraint listings_owner_user_id_fkey
    foreign key (owner_user_id)
    references private.sellers (id);

create index listings_owner_user_id_idx
  on public.listings (owner_user_id, created_at desc, id desc)
  where owner_user_id is not null;

comment on column public.listings.owner_user_id is
  'Internal pseudonymous seller owner. Nullable for historical/operator fixtures; never derived from public phone equality.';

-- Deliberately DO NOT backfill owner_user_id from contact_e164 or any other public contact
-- attribute. Historical/synthetic rows keep owner_user_id NULL unless a later explicit,
-- evidence-backed migration assigns ownership.

create function public.prevent_listing_owner_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'listing owner_user_id is immutable';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_listing_owner_change() from public, anon, authenticated;
grant execute on function public.prevent_listing_owner_change() to service_role;

create trigger listings_prevent_owner_change
before update of owner_user_id on public.listings
for each row
execute function public.prevent_listing_owner_change();

create function public.create_seller_identity(
  p_seller_id uuid,
  p_recovery_selector text,
  p_recovery_digest text,
  p_session_digest text,
  p_session_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if p_seller_id is null
    or p_recovery_selector !~ '^[A-Za-z0-9_-]{16}$'
    or p_recovery_digest !~ '^[0-9a-f]{64}$'
    or p_session_digest !~ '^[0-9a-f]{64}$'
    or p_session_expires_at <= v_now
    or p_session_expires_at > v_now + interval '7 days 1 minute'
  then
    raise exception 'invalid seller identity credential material';
  end if;

  insert into private.sellers (
    id,
    recovery_selector,
    recovery_digest,
    created_at,
    recovery_rotated_at
  ) values (
    p_seller_id,
    p_recovery_selector,
    p_recovery_digest,
    v_now,
    v_now
  );

  insert into private.seller_sessions (
    seller_id,
    token_digest,
    created_at,
    expires_at
  ) values (
    p_seller_id,
    p_session_digest,
    v_now,
    p_session_expires_at
  );

  return p_seller_id;
end;
$$;

create function public.resolve_seller_session(p_session_digest text)
returns table (seller_id uuid, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.seller_id, s.expires_at
  from private.seller_sessions as s
  where s.token_digest = p_session_digest
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1
$$;

create function public.revoke_seller_session(p_session_digest text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_session_digest !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  update private.seller_sessions
  set revoked_at = coalesce(revoked_at, now())
  where token_digest = p_session_digest
    and revoked_at is null;

  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create function public.recover_seller_identity(
  p_recovery_selector text,
  p_recovery_digest text,
  p_new_recovery_selector text,
  p_new_recovery_digest text,
  p_new_session_digest text,
  p_new_session_expires_at timestamptz
)
returns table (seller_id uuid, session_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller_id uuid;
  v_now timestamptz := now();
begin
  if p_recovery_selector !~ '^[A-Za-z0-9_-]{16}$'
    or p_recovery_digest !~ '^[0-9a-f]{64}$'
    or p_new_recovery_selector !~ '^[A-Za-z0-9_-]{16}$'
    or p_new_recovery_digest !~ '^[0-9a-f]{64}$'
    or p_new_session_digest !~ '^[0-9a-f]{64}$'
    or p_new_session_expires_at <= v_now
    or p_new_session_expires_at > v_now + interval '7 days 1 minute'
  then
    return;
  end if;

  select s.id
  into v_seller_id
  from private.sellers as s
  where s.recovery_selector = p_recovery_selector
    and s.recovery_digest = p_recovery_digest
  for update;

  if v_seller_id is null then
    return;
  end if;

  update private.sellers
  set
    recovery_selector = p_new_recovery_selector,
    recovery_digest = p_new_recovery_digest,
    recovery_rotated_at = v_now
  where id = v_seller_id;

  -- Successful recovery is a security reset: revoke every pre-existing device session.
  update private.seller_sessions as ss
  set revoked_at = coalesce(ss.revoked_at, v_now)
  where ss.seller_id = v_seller_id
    and ss.revoked_at is null;

  insert into private.seller_sessions (
    seller_id,
    token_digest,
    created_at,
    expires_at
  ) values (
    v_seller_id,
    p_new_session_digest,
    v_now,
    p_new_session_expires_at
  );

  return query
  select v_seller_id, p_new_session_expires_at;
end;
$$;

create function public.delete_seller_identity_if_unowned(p_seller_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from private.sellers as s
  where s.id = p_seller_id
    and not exists (
      select 1
      from public.listings as l
      where l.owner_user_id = s.id
    );

  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on function public.create_seller_identity(uuid, text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.resolve_seller_session(text)
  from public, anon, authenticated;
revoke all on function public.revoke_seller_session(text)
  from public, anon, authenticated;
revoke all on function public.recover_seller_identity(text, text, text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.delete_seller_identity_if_unowned(uuid)
  from public, anon, authenticated;

grant execute on function public.create_seller_identity(uuid, text, text, text, timestamptz)
  to service_role;
grant execute on function public.resolve_seller_session(text)
  to service_role;
grant execute on function public.revoke_seller_session(text)
  to service_role;
grant execute on function public.recover_seller_identity(text, text, text, text, text, timestamptz)
  to service_role;
grant execute on function public.delete_seller_identity_if_unowned(uuid)
  to service_role;

-- Phone is now an intentionally public listing contact attribute, not authorization identity.
-- Legacy verification columns remain nullable historical/internal evidence only.
alter table public.listings
  drop constraint if exists listings_publication_instruction_check,
  add constraint listings_publication_instruction_check
    check (
      publication_instruction_at is null
      or (
        contact_channel is not null
        and contact_e164 is not null
      )
    ),
  drop constraint if exists listings_published_contact_ready_check,
  add constraint listings_published_contact_ready_check
    check (
      status <> 'published'
      or (
        contact_channel is not null
        and contact_e164 is not null
        and publication_instruction_at is not null
      )
    ),
  drop constraint if exists listings_rules_acceptance_after_verification_check,
  add constraint listings_rules_acceptance_requires_publication_instruction_check
    check (
      listing_rules_accepted_at is null
      or publication_instruction_at is not null
    );

comment on column public.listings.contact_verified_at is
  'Historical/risk-triggered contact-control evidence only. Ordinary-goods seller authorization does not depend on this field.';
comment on column public.listings.contact_verification_method is
  'Historical/risk-triggered contact-control method only. Ordinary-goods seller authorization does not depend on phone verification.';
comment on column public.listings.publication_instruction_at is
  'Audit fact that the seller instructed publication of the current public phone/contact. It is not an ownership or identity credential.';

create or replace function public.fail_closed_listing_contact_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  contact_changed boolean;
begin
  contact_changed :=
    row(new.contact_channel, new.contact_e164)
    is distinct from
    row(old.contact_channel, old.contact_e164);

  if contact_changed then
    -- A phone/contact edit never changes owner_user_id. Legacy verification evidence no longer
    -- follows the number automatically.
    new.contact_verified_at := null;
    new.contact_verification_method := null;

    -- If the caller did not explicitly record a fresh publication instruction with the contact
    -- change, fail closed by clearing the old instruction.
    if new.publication_instruction_at is not distinct from old.publication_instruction_at then
      new.publication_instruction_at := null;
    end if;
  end if;

  if old.status = 'published'
    and (
      new.contact_channel is null
      or new.contact_e164 is null
      or new.publication_instruction_at is null
    )
  then
    new.status := 'unpublished';
    new.unpublished_at := coalesce(new.unpublished_at, now());
  end if;

  return new;
end;
$$;

drop policy if exists "Public can read active published listings" on public.listings;
create policy "Public can read active published listings"
on public.listings
for select
to anon
using (
  status = 'published'
  and published_at <= now()
  and expires_at > now()
  and unpublished_at is null
  and contact_channel is not null
  and contact_e164 is not null
  and publication_instruction_at is not null
);

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
      and l.owner_user_id is not null
      and l.status = 'pending'
      and l.contact_channel = 'phone_whatsapp'
      and l.contact_e164 is not null
      and l.publication_instruction_at is not null
      and l.listing_rules_version is not null
      and l.listing_rules_accepted_at is not null
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
