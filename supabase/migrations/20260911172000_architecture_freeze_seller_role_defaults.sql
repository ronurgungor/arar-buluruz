-- Seller-role assessment defaults are intentionally separate from seller ownership/session/recovery.
-- Unknown is a valid non-blocking assessment; this migration collects no identity/KYC/company data.

insert into private.seller_role_assessments (
  seller_id,
  assessed_role,
  assessment_basis,
  assessed_at,
  review_state,
  policy_version,
  decision_origin
)
select
  s.id,
  'unknown',
  'No seller-role assessment has been completed',
  now(),
  'current',
  'architecture-freeze-v1',
  'system'
from private.sellers as s
where not exists (
  select 1
  from private.seller_role_assessments as a
  where a.seller_id = s.id
    and a.review_state <> 'superseded'
);

create function private.initialize_unknown_seller_role_assessment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.seller_role_assessments (
    seller_id,
    assessed_role,
    assessment_basis,
    assessed_at,
    review_state,
    policy_version,
    decision_origin
  ) values (
    new.id,
    'unknown',
    'No seller-role assessment has been completed',
    now(),
    'current',
    'architecture-freeze-v1',
    'system'
  );
  return new;
end;
$$;

revoke all on function private.initialize_unknown_seller_role_assessment()
  from public, anon, authenticated;
grant execute on function private.initialize_unknown_seller_role_assessment() to service_role;

create trigger sellers_initialize_unknown_role_assessment
after insert on private.sellers
for each row
execute function private.initialize_unknown_seller_role_assessment();
