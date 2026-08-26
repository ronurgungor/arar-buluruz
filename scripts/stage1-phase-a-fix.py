from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one patch marker in {path}; found {count}")
    write(path, text.replace(old, new, 1))


def replace_all_exact(path: str, old: str, new: str, expected: int) -> None:
    text = read(path)
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"Expected {expected} patch markers in {path}; found {count}")
    write(path, text.replace(old, new))


server_path = "src/lib/stage1-moderation-server.ts"
replace_once(
    server_path,
    "  contact_verified_at: string | null;\n  publication_instruction_at: string | null;\n  created_at: string;",
    "  contact_verified_at: string | null;\n  publication_instruction_at: string | null;\n  private_seller_declaration_at: string | null;\n  content_rights_declaration_at: string | null;\n  created_at: string;",
)
replace_all_exact(
    server_path,
    "contact_channel,contact_e164,contact_verified_at,publication_instruction_at,created_at",
    "contact_channel,contact_e164,contact_verified_at,publication_instruction_at,private_seller_declaration_at,content_rights_declaration_at,created_at",
    2,
)
replace_once(
    server_path,
    "  if (!listing.contact_verified_at || !listing.publication_instruction_at || !listing.contact_e164 || !parseContactChannel(listing.contact_channel)) {\n    throw new ModerationError(\"INVALID_STATE\", \"Telefon kontrolü ve satıcı yayın talimatı tamamlanmamış.\");\n  }\n  if ((await fetchPhotos(config, id)).length < 1) throw new ModerationError(\"INVALID_STATE\", \"Fotoğrafsız ilan yayınlanamaz.\");",
    "  if (!listing.contact_verified_at) {\n    throw new ModerationError(\"INVALID_STATE\", \"Telefon kontrolü tamamlanmamış.\");\n  }\n  if (!listing.publication_instruction_at) {\n    throw new ModerationError(\"INVALID_STATE\", \"Satıcı yayın talimatı kaydedilmemiş.\");\n  }\n  if (!listing.contact_e164 || !parseContactChannel(listing.contact_channel)) {\n    throw new ModerationError(\"INVALID_STATE\", \"Geçerli açık iletişim bilgisi bulunmuyor.\");\n  }\n  if (!listing.private_seller_declaration_at) {\n    throw new ModerationError(\"INVALID_STATE\", \"Özel satıcı beyanı kaydedilmemiş.\");\n  }\n  if (!listing.content_rights_declaration_at) {\n    throw new ModerationError(\"INVALID_STATE\", \"İçerik hakları beyanı kaydedilmemiş.\");\n  }\n  if ((await fetchPhotos(config, id)).length < 1) {\n    throw new ModerationError(\"INVALID_STATE\", \"Fotoğrafsız ilan yayınlanamaz.\");\n  }",
)


test_path = "src/lib/stage1-moderation-server.test.ts"
replace_once(
    test_path,
    "let patchCalls = 0;\nlet photoCalls = 0;",
    "let patchCalls = 0;\nlet photoCalls = 0;\nlet hasPhoto = true;",
)
replace_once(
    test_path,
    "      return Response.json([\n        {\n          photo_id: \"98100000-0000-4000-8000-000000000001\",\n          object_path: `listings/${listingId}/98100000-0000-4000-8000-000000000001.webp`,\n          mime_type: \"image/webp\",\n          byte_size: 72,\n          sort_order: 0,\n        },\n      ]);",
    "      return Response.json(\n        hasPhoto\n          ? [\n              {\n                photo_id: \"98100000-0000-4000-8000-000000000001\",\n                object_path: `listings/${listingId}/98100000-0000-4000-8000-000000000001.webp`,\n                mime_type: \"image/webp\",\n                byte_size: 72,\n                sort_order: 0,\n              },\n            ]\n          : [],\n      );",
)
old_describe = '''describe("Stage 1 moderation publish readiness", () => {
  test("rejects missing phone-control verification independently", async () => {
    currentRow = { ...readyRow(), contact_verified_at: null };
    patchCalls = 0;
    photoCalls = 0;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("rejects missing public-contact publication instruction independently", async () => {
    currentRow = { ...readyRow(), publication_instruction_at: null };
    patchCalls = 0;
    photoCalls = 0;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("rejects missing required seller/content declaration evidence", async () => {
    currentRow = {
      ...readyRow(),
      private_seller_declaration_at: null,
      content_rights_declaration_at: null,
    };
    patchCalls = 0;
    photoCalls = 0;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });
});
'''
new_describe = '''describe("Stage 1 moderation publish readiness", () => {
  test("rejects missing phone-control verification independently", async () => {
    currentRow = { ...readyRow(), contact_verified_at: null };
    patchCalls = 0;
    photoCalls = 0;
    hasPhoto = true;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("rejects missing public-contact publication instruction independently", async () => {
    currentRow = { ...readyRow(), publication_instruction_at: null };
    patchCalls = 0;
    photoCalls = 0;
    hasPhoto = true;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("rejects missing private-seller declaration independently", async () => {
    currentRow = { ...readyRow(), private_seller_declaration_at: null };
    patchCalls = 0;
    photoCalls = 0;
    hasPhoto = true;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("rejects missing content-rights declaration independently", async () => {
    currentRow = { ...readyRow(), content_rights_declaration_at: null };
    patchCalls = 0;
    photoCalls = 0;
    hasPhoto = true;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("rejects an invalid public contact independently", async () => {
    currentRow = { ...readyRow(), contact_e164: null };
    patchCalls = 0;
    photoCalls = 0;
    hasPhoto = true;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("rejects a listing without a valid photo independently", async () => {
    currentRow = readyRow();
    patchCalls = 0;
    photoCalls = 0;
    hasPhoto = false;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(1);
  });

  test("publishes only when the complete readiness evidence is present", async () => {
    currentRow = readyRow();
    patchCalls = 0;
    photoCalls = 0;
    hasPhoto = true;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, listingId });
    expect(patchCalls).toBe(1);
    expect(photoCalls).toBe(1);
  });
});
'''
replace_once(test_path, old_describe, new_describe)


migration_path = "supabase/migrations/20260826181500_prepare_stage1_self_service.sql"
migration = read(migration_path)
constraint_name = "listings_published_stage1_declarations_ready_check"
if constraint_name not in migration:
    marker = "-- These are buyer-visible product facts on rows that already pass the existing published-only RLS.\n"
    if migration.count(marker) != 1:
        raise SystemExit("Expected Stage-1 migration insertion marker exactly once")
    addition = '''-- Existing synthetic/local rows do not receive fabricated declaration evidence.
-- If an old prepared row is already published without both declarations, fail closed by unpublishing it.
update public.listings
set
  status = 'unpublished',
  unpublished_at = coalesce(unpublished_at, now())
where status = 'published'
  and (
    private_seller_declaration_at is null
    or content_rights_declaration_at is null
  );

alter table public.listings
  add constraint listings_published_stage1_declarations_ready_check
  check (
    status <> 'published'
    or (
      private_seller_declaration_at is not null
      and content_rights_declaration_at is not null
    )
  );

'''
    write(migration_path, migration.replace(marker, addition + marker, 1))


pg_path = "supabase/tests/database/stage1_self_service.test.sql"
pg = read(pg_path)
pg_marker = "select * from finish();\n"
if "raw privileged publish is blocked when the private-seller declaration is missing" not in pg:
    if pg.count(pg_marker) != 1:
        raise SystemExit("Expected Stage-1 pgTAP finish marker exactly once")
    addition = '''select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.listings'::regclass
      and conname = 'listings_published_stage1_declarations_ready_check'
      and contype = 'c'
  ),
  'published Stage-1 declaration readiness is enforced by a DB check constraint'
);

insert into public.listings (
  id, title, description, price_amount, price_is_free, category, item_condition,
  province, district, seller_display_name, contact_channel, contact_e164,
  contact_verified_at, contact_verification_method, publication_instruction_at,
  private_seller_declaration_at, content_rights_declaration_at, status
)
values
  (
    '96000000-0000-4000-8000-000000000002',
    'Missing private-seller declaration fixture',
    'Synthetic raw privileged publish denial fixture.',
    100, false, 'home', 'good', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
    'phone_whatsapp', '+12025550188', now() - interval '2 minutes', 'one_time_code',
    now() - interval '1 minute', null, now() - interval '1 minute', 'pending'
  ),
  (
    '96000000-0000-4000-8000-000000000003',
    'Missing content-rights declaration fixture',
    'Synthetic raw privileged publish denial fixture.',
    100, false, 'home', 'good', 'Tekirdağ', 'Çorlu', 'Synthetic Seller',
    'phone_whatsapp', '+12025550188', now() - interval '2 minutes', 'one_time_code',
    now() - interval '1 minute', now() - interval '1 minute', null, 'pending'
  );

create function pg_temp.stage1_declaration_publish_is_blocked(p_listing_id uuid)
returns boolean
language plpgsql
as $$
declare
  failed_constraint text;
begin
  update public.listings
  set
    status = 'published',
    published_at = now(),
    expires_at = now() + interval '30 days'
  where id = p_listing_id;
  return false;
exception
  when check_violation then
    get stacked diagnostics failed_constraint = CONSTRAINT_NAME;
    return failed_constraint = 'listings_published_stage1_declarations_ready_check';
end;
$$;

select ok(
  pg_temp.stage1_declaration_publish_is_blocked('96000000-0000-4000-8000-000000000002'),
  'raw privileged publish is blocked when the private-seller declaration is missing'
);
select ok(
  pg_temp.stage1_declaration_publish_is_blocked('96000000-0000-4000-8000-000000000003'),
  'raw privileged publish is blocked when the content-rights declaration is missing'
);

'''
    write(pg_path, pg.replace(pg_marker, addition + pg_marker, 1))


for path, required in {
    server_path: [
        "private_seller_declaration_at: string | null;",
        "content_rights_declaration_at: string | null;",
        "Özel satıcı beyanı kaydedilmemiş.",
        "İçerik hakları beyanı kaydedilmemiş.",
    ],
    test_path: [
        "rejects missing private-seller declaration independently",
        "rejects missing content-rights declaration independently",
        "publishes only when the complete readiness evidence is present",
    ],
    migration_path: [constraint_name],
    pg_path: [
        "raw privileged publish is blocked when the private-seller declaration is missing",
        "raw privileged publish is blocked when the content-rights declaration is missing",
    ],
}.items():
    text = read(path)
    missing = [needle for needle in required if needle not in text]
    if missing:
        raise SystemExit(f"Phase A postcondition failed for {path}: {missing}")

print("Stage 1 Phase A invariant patch is present.")
