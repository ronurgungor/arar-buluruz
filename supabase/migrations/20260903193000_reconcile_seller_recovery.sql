-- SMS-less seller recovery reconciliation hardening.
-- Repository/local/synthetic preparation only. This migration does not activate production,
-- real data, SMS, EIDS, paid services or any external provider.

create function public.reconcile_seller_recovery(
  p_recovery_selector text,
  p_recovery_digest text,
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

  -- Reconciliation proves that the candidate credential committed after an ambiguous
  -- transport outcome. Keep that credential current, revoke every possibly stale session,
  -- and establish exactly one fresh browser session for the reconciliation response.
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

revoke all on function public.reconcile_seller_recovery(text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reconcile_seller_recovery(text, text, text, timestamptz)
  to service_role;
