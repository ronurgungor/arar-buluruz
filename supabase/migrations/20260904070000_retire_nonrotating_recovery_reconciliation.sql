-- Retire the obsolete non-rotating seller recovery reconciliation primitive.
-- The application now reconciles an ambiguous A -> B recovery by atomically rotating
-- B -> pre-generated C through public.recover_seller_identity(...).
-- Repository/local/synthetic preparation only; no production activation is authorized.

revoke all on function public.reconcile_seller_recovery(text, text, text, timestamptz)
  from public, anon, authenticated, service_role;

drop function if exists public.reconcile_seller_recovery(text, text, text, timestamptz);

-- Reassert the only recovery-rotation privilege boundary after retiring the obsolete RPC.
revoke all on function public.recover_seller_identity(text, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.recover_seller_identity(text, text, text, text, text, timestamptz)
  to service_role;
