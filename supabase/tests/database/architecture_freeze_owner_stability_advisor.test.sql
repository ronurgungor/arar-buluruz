begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select no_plan();

insert into private.sellers (
  id,
  recovery_selector,
  recovery_digest
) values (
  'f3140000-0000-4000-8000-000000000001'::uuid,
  'AdvisorOwner0001',
  repeat('a', 64)
);

insert into public.listings (
  id,
  title,
  description,
  price_amount,
  category,
  province,
  district,
  seller_display_name,
  owner_user_id,
  contact_channel,
  contact_e164,
  publication_instruction_at,
  status,
  published_at,
  expires_at
) values (
  'f3140000-0000-4000-8000-000000000002'::uuid,
  'Ownership stability fixture',
  'Synthetic Advisor regression fixture.',
  1,
  'electronics',
  'Tekirdağ',
  'Çorlu',
  'Synthetic Seller',
  'f3140000-0000-4000-8000-000000000001'::uuid,
  'phone_whatsapp',
  '+12025550230',
  now() - interval '2 minutes',
  'pending',
  null,
  null
);

insert into private.listing_enforcement_cases (
  listing_id,
  reason_type,
  reason_detail,
  decision_action,
  action_at,
  created_origin
) values (
  'f3140000-0000-4000-8000-000000000002'::uuid,
  'operator_review',
  'Synthetic ownership-stability enforcement fixture',
  'remove',
  now(),
  'operator'
);

select is(
  (
    select owner_user_id
    from public.listings
    where id = 'f3140000-0000-4000-8000-000000000002'::uuid
  ),
  'f3140000-0000-4000-8000-000000000001'::uuid,
  'enforcement propagation never changes the pseudonymous listing owner'
);

update public.listings
set category = 'vehicle'
where id = 'f3140000-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select owner_user_id
    from public.listings
    where id = 'f3140000-0000-4000-8000-000000000002'::uuid
  ),
  'f3140000-0000-4000-8000-000000000001'::uuid,
  'seller-editable policy metadata reassessment never changes listing ownership identity'
);

select * from finish();
rollback;