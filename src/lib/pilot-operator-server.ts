import { LISTING_PHOTO_MAX_BYTES, buildListingPhotoObjectPath } from "./listing-photo";
import {
  ingestTrustedListingPhoto,
  type TrustedListingPhotoIngestionStore,
} from "./listing-photo-trusted";
import {
  PILOT_DISTRICT,
  PILOT_PROVINCE,
  isPilotListingStatus,
  type PilotOperatorListing,
  type PilotOperatorResponse,
} from "./pilot-operator-contract";

const TARLADAN_PROJECT_REFS = new Set(["jlbsoraqnlricbyagxdk", "gwgrwwvaiizfsqaacnhf"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const PRICE_PATTERN = /^\d{1,10}(?:[.,]\d{1,2})?$/;
const MAX_PILOT_PHOTOS = 8;

class PilotOperatorError extends Error {
  readonly code: Exclude<PilotOperatorResponse, { ok: true }>["code"];

  constructor(
    code: Exclude<PilotOperatorResponse, { ok: true }>["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PilotOperatorError";
    this.code = code;
  }
}

type BackendConfig = {
  baseUrl: string;
  serviceRoleKey: string;
};

type BackendListingRow = {
  id: string;
  title: string;
  seller_display_name: string;
  status: string;
  contact_channel: string | null;
  contact_e164: string | null;
  created_at: string;
  published_at: string | null;
  expires_at: string | null;
  unpublished_at: string | null;
};

type PhotoInventoryRow = {
  photo_id: string;
  object_path: string;
  mime_type: string;
  byte_size: number | string;
  sort_order: number | string;
};

function jsonResponse(payload: PilotOperatorResponse, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

function isLoopbackAddress(value: string): boolean {
  const normalized = value.trim().replace(/^\[|\]$/g, "");
  return normalized === "127.0.0.1" || normalized === "::1";
}

function assertLocalSameOriginRequest(request: Request): void {
  const requestUrl = new URL(request.url);
  if (!isLoopbackHost(requestUrl.hostname)) {
    throw new PilotOperatorError(
      "LOCAL_ONLY",
      "Kurucu işlem yüzeyi yalnız yerel bağlantıda çalışır.",
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstHop = forwardedFor.split(",")[0] ?? "";
    if (!isLoopbackAddress(firstHop)) {
      throw new PilotOperatorError(
        "LOCAL_ONLY",
        "Kurucu işlem yüzeyi yönlendirilmiş dış istemci kabul etmez.",
      );
    }
  }

  const connectingIp = request.headers.get("cf-connecting-ip");
  if (connectingIp && !isLoopbackAddress(connectingIp)) {
    throw new PilotOperatorError("LOCAL_ONLY", "Kurucu işlem yüzeyi dış ağ istemcisi kabul etmez.");
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    throw new PilotOperatorError(
      "LOCAL_ONLY",
      "Kurucu işlemleri aynı-origin tarayıcı isteği gerektirir.",
    );
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new PilotOperatorError("LOCAL_ONLY", "Geçersiz kurucu işlem origin bilgisi.");
  }
  if (originUrl.origin !== requestUrl.origin) {
    throw new PilotOperatorError("LOCAL_ONLY", "Kurucu işlemleri cross-origin isteği kabul etmez.");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new PilotOperatorError(
      "LOCAL_ONLY",
      "Kurucu işlemleri yalnız same-origin tarayıcı bağlamında çalışır.",
    );
  }
}

function readBackendConfig(): BackendConfig {
  if (process.env.PILOT_OPERATOR_ENABLED !== "enabled") {
    throw new PilotOperatorError("NOT_ENABLED", "Kurucu işlem yüzeyi etkin değil.");
  }

  const rawUrl = process.env.PILOT_OPERATOR_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !serviceRoleKey) {
    throw new PilotOperatorError(
      "BACKEND_UNAVAILABLE",
      "Kurucu işlem backend yapılandırması eksik.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PilotOperatorError(
      "BACKEND_UNAVAILABLE",
      "Kurucu backend URL yapılandırması geçersiz.",
    );
  }

  const isLocalBackend = isLoopbackHost(url.hostname);
  if (url.protocol !== "https:" && !(isLocalBackend && url.protocol === "http:")) {
    throw new PilotOperatorError(
      "BACKEND_UNAVAILABLE",
      "Kurucu backend bağlantısı yerel geliştirme dışında HTTPS kullanmalıdır.",
    );
  }

  for (const forbiddenRef of TARLADAN_PROJECT_REFS) {
    if (url.hostname.includes(forbiddenRef)) {
      throw new PilotOperatorError(
        "BACKEND_UNAVAILABLE",
        "Tarladan projesi Arar Buluruz kurucu işlemleri için kesin olarak kapsam dışıdır.",
      );
    }
  }

  return { baseUrl: url.toString().replace(/\/+$/, ""), serviceRoleKey };
}

function serviceHeaders(config: BackendConfig, contentType = "application/json"): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "content-type": contentType,
  };
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function requireOk(response: Response, context: string): Promise<Response> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${context} failed with HTTP ${response.status}: ${body.slice(0, 1000)}`);
  }
  return response;
}

function requiredString(
  form: FormData,
  key: string,
  options: { min: number; max: number },
): string {
  const value = form.get(key);
  if (typeof value !== "string") {
    throw new PilotOperatorError("INVALID_REQUEST", `${key} alanı zorunludur.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < options.min || trimmed.length > options.max) {
    throw new PilotOperatorError("INVALID_REQUEST", `${key} alanı geçerli uzunlukta değil.`);
  }
  return trimmed;
}

function requiredConfirmation(form: FormData, key: string, message: string): void {
  if (form.get(key) !== "confirmed") {
    throw new PilotOperatorError("INVALID_REQUEST", message);
  }
}

function requiredUuid(form: FormData, key = "listingId"): string {
  const value = requiredString(form, key, { min: 36, max: 36 }).toLowerCase();
  if (!UUID_PATTERN.test(value)) {
    throw new PilotOperatorError("INVALID_REQUEST", "İlan kimliği geçersiz.");
  }
  return value;
}

function requiredPhoneOnlyContactChannel(form: FormData): "phone" {
  const value = requiredString(form, "contactChannel", { min: 5, max: 5 });
  if (value !== "phone") {
    throw new PilotOperatorError(
      "INVALID_REQUEST",
      "Stage 1–3 pilotunda yalnız telefon iletişim kanalı desteklenir.",
    );
  }
  return value;
}

function requiredE164(form: FormData): string {
  const value = requiredString(form, "contactE164", { min: 8, max: 16 });
  if (!E164_PATTERN.test(value)) {
    throw new PilotOperatorError("INVALID_REQUEST", "Telefon numarası E.164 formatında olmalıdır.");
  }
  return value;
}

function requiredPrice(form: FormData): number {
  const raw = requiredString(form, "price", { min: 1, max: 14 });
  if (!PRICE_PATTERN.test(raw)) {
    throw new PilotOperatorError(
      "INVALID_REQUEST",
      "Fiyat en fazla iki ondalık basamak içermelidir.",
    );
  }
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9_999_999_999.99) {
    throw new PilotOperatorError("INVALID_REQUEST", "Fiyat geçerli aralıkta değil.");
  }
  return parsed;
}

function requiredExpiryDays(form: FormData): number {
  const raw = requiredString(form, "expiresInDays", { min: 1, max: 3 });
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 90) {
    throw new PilotOperatorError("INVALID_REQUEST", "Yayın süresi 1–90 gün arasında olmalıdır.");
  }
  return parsed;
}

function requiredPhoto(form: FormData): File {
  const value = form.get("photo");
  if (!(value instanceof File) || value.size <= 0) {
    throw new PilotOperatorError("INVALID_REQUEST", "En az bir ilan fotoğrafı zorunludur.");
  }
  if (value.size > LISTING_PHOTO_MAX_BYTES) {
    throw new PilotOperatorError("INVALID_REQUEST", "İlan fotoğrafı 8 MB sınırını aşıyor.");
  }
  return value;
}

async function fetchListing(config: BackendConfig, listingId: string): Promise<BackendListingRow | null> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${listingId}`);
  url.searchParams.set(
    "select",
    "id,title,seller_display_name,status,contact_channel,contact_e164,created_at,published_at,expires_at,unpublished_at",
  );
  url.searchParams.set("limit", "1");
  const response = await requireOk(
    await fetch(url, { headers: { ...serviceHeaders(config), Accept: "application/json" } }),
    "operator listing lookup",
  );
  const rows = (await response.json()) as BackendListingRow[];
  return rows[0] ?? null;
}

async function fetchPhotoInventory(config: BackendConfig, listingId: string): Promise<PhotoInventoryRow[]> {
  const response = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/rpc/get_listing_photo_inventory`, {
      method: "POST",
      headers: serviceHeaders(config),
      body: JSON.stringify({ p_listing_id: listingId }),
    }),
    "operator photo inventory",
  );
  const rows = (await response.json()) as PhotoInventoryRow[];
  if (!Array.isArray(rows) || rows.length > MAX_PILOT_PHOTOS) {
    throw new Error("Operator photo inventory returned an unexpected row count.");
  }
  const expectedPrefix = `listings/${listingId.toLowerCase()}/`;
  for (const row of rows) {
    if (
      !UUID_PATTERN.test(row.photo_id) ||
      row.mime_type !== "image/webp" ||
      !row.object_path.startsWith(expectedPrefix) ||
      !row.object_path.endsWith(".webp") ||
      Number(row.byte_size) < 1 ||
      Number(row.byte_size) > LISTING_PHOTO_MAX_BYTES ||
      !Number.isInteger(Number(row.sort_order))
    ) {
      throw new Error("Operator photo inventory violated the trusted metadata contract.");
    }
  }
  return rows;
}

async function listOperatorListings(config: BackendConfig): Promise<PilotOperatorListing[]> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set(
    "select",
    "id,title,seller_display_name,status,contact_channel,contact_e164,created_at,published_at,expires_at,unpublished_at",
  );
  url.searchParams.set("order", "created_at.desc,id.desc");
  url.searchParams.set("limit", "20");
  const response = await requireOk(
    await fetch(url, { headers: { ...serviceHeaders(config), Accept: "application/json" } }),
    "operator listings read",
  );
  const rows = (await response.json()) as BackendListingRow[];
  if (!Array.isArray(rows) || rows.length > 20) {
    throw new Error("Operator listing inventory returned an unexpected row count.");
  }
  return await Promise.all(
    rows.map(async (row) => {
      if (!UUID_PATTERN.test(row.id) || !isPilotListingStatus(row.status)) {
        throw new Error("Operator listing inventory violated the listing identity contract.");
      }
      const contactChannel =
        row.contact_channel === "whatsapp" || row.contact_channel === "phone"
          ? row.contact_channel
          : null;
      if (row.contact_channel !== null && contactChannel === null) {
        throw new Error("Operator listing inventory returned an invalid contact channel.");
      }
      const photos = await fetchPhotoInventory(config, row.id);
      return {
        id: row.id,
        title: row.title,
        sellerDisplayName: row.seller_display_name,
        status: row.status,
        contactChannel,
        contactE164: row.contact_e164,
        photoCount: photos.length,
        createdAt: row.created_at,
        publishedAt: row.published_at,
        expiresAt: row.expires_at,
        unpublishedAt: row.unpublished_at,
      } satisfies PilotOperatorListing;
    }),
  );
}

async function deleteListingRow(config: BackendConfig, listingId: string): Promise<void> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${listingId}`);
  const response = await requireOk(
    await fetch(url, {
      method: "DELETE",
      headers: { ...serviceHeaders(config), Prefer: "return=representation" },
    }),
    "operator listing delete",
  );
  const rows = (await response.json()) as Array<{ id?: string }>;
  if (rows.length !== 1 || rows[0]?.id !== listingId) {
    throw new Error("Operator listing delete did not remove exactly the requested listing.");
  }
}

function createIngestionStore(config: BackendConfig): TrustedListingPhotoIngestionStore {
  const storageBase = `${config.baseUrl}/storage/v1`;
  return {
    async uploadSanitizedObject(input) {
      await requireOk(
        await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(input.objectPath)}`, {
          method: "POST",
          headers: {
            ...serviceHeaders(config, input.mimeType),
            "cache-control": "max-age=60",
            "x-upsert": "false",
          },
          body: input.bytes,
        }),
        "operator sanitized photo upload",
      );
    },
    async insertPhotoMetadata(metadata) {
      await requireOk(
        await fetch(`${config.baseUrl}/rest/v1/rpc/register_sanitized_listing_photo`, {
          method: "POST",
          headers: serviceHeaders(config),
          body: JSON.stringify({
            p_listing_id: metadata.listingId,
            p_photo_id: metadata.photoId,
            p_object_path: metadata.objectPath,
            p_byte_size: metadata.byteSize,
            p_sort_order: metadata.sortOrder,
          }),
        }),
        "operator sanitized photo metadata registration",
      );
    },
    async deleteObject(objectPath) {
      await requireOk(
        await fetch(`${storageBase}/object/listing_photos`, {
          method: "DELETE",
          headers: serviceHeaders(config),
          body: JSON.stringify({ prefixes: [objectPath] }),
        }),
        "operator compensating photo delete",
      );
    },
  };
}

async function createPendingListing(config: BackendConfig, form: FormData): Promise<string> {
  requiredConfirmation(
    form,
    "privacyNoticeDelivered",
    "İlan verisi alınmadan önce aydınlatmanın verildiği teyit edilmelidir.",
  );
  requiredConfirmation(
    form,
    "privateSellerDeclaration",
    "Stage 1–3 için özel/ara sıra satıcı ve kendi kullanılmış eşyası beyanı zorunludur.",
  );
  requiredConfirmation(
    form,
    "contentRightsDeclaration",
    "Fotoğraf/içerik yetkisi ve üçüncü kişi/çocuk/hassas veri kontrolü teyit edilmelidir.",
  );

  const sellerDisplayName = requiredString(form, "sellerDisplayName", { min: 2, max: 80 });
  const title = requiredString(form, "title", { min: 3, max: 120 });
  const description = requiredString(form, "description", { min: 10, max: 5000 });
  const price = requiredPrice(form);
  const contactChannel = requiredPhoneOnlyContactChannel(form);
  const contactE164 = requiredE164(form);
  const photo = requiredPhoto(form);
  const listingId = crypto.randomUUID();
  const photoId = crypto.randomUUID();

  const insertResponse = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/listings`, {
      method: "POST",
      headers: { ...serviceHeaders(config), Prefer: "return=representation" },
      body: JSON.stringify({
        id: listingId,
        title,
        description,
        price_amount: price,
        province: PILOT_PROVINCE,
        district: PILOT_DISTRICT,
        seller_display_name: sellerDisplayName,
        search_keywords: [],
        contact_channel: contactChannel,
        contact_e164: contactE164,
        status: "pending",
      }),
    }),
    "operator pending listing create",
  );
  const insertedRows = (await insertResponse.json()) as Array<{ id?: string }>;
  if (insertedRows.length !== 1 || insertedRows[0]?.id !== listingId) {
    throw new Error("Operator listing create did not return the requested listing identity.");
  }

  try {
    const bytes = new Uint8Array(await photo.arrayBuffer());
    await ingestTrustedListingPhoto(
      {
        listingId,
        photoId,
        declaredMimeType: photo.type,
        bytes,
        sortOrder: 0,
      },
      createIngestionStore(config),
    );
  } catch (cause) {
    try {
      await deleteListingRow(config, listingId);
    } catch (cleanupCause) {
      throw new AggregateError(
        [cause, cleanupCause],
        `Photo ingestion failed and pending listing cleanup also failed for ${listingId}.`,
      );
    }
    throw cause;
  }
  return listingId;
}

async function patchListing(
  config: BackendConfig,
  listingId: string,
  patch: Record<string, unknown>,
  context: string,
): Promise<void> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${listingId}`);
  const response = await requireOk(
    await fetch(url, {
      method: "PATCH",
      headers: { ...serviceHeaders(config), Prefer: "return=representation" },
      body: JSON.stringify(patch),
    }),
    context,
  );
  const rows = (await response.json()) as Array<{ id?: string }>;
  if (rows.length !== 1 || rows[0]?.id !== listingId) {
    throw new Error(`${context} did not mutate exactly the requested listing.`);
  }
}

async function publishListing(config: BackendConfig, form: FormData): Promise<string> {
  const listingId = requiredUuid(form);
  const expiryDays = requiredExpiryDays(form);
  if (
    form.get("contactControlConfirmed") !== "confirmed" ||
    form.get("publicationInstructionConfirmed") !== "confirmed"
  ) {
    throw new PilotOperatorError(
      "INVALID_REQUEST",
      "Yayın için telefon kontrolü ve kamuya açık yayın talimatı ayrı ayrı teyit edilmelidir.",
    );
  }

  const listing = await fetchListing(config, listingId);
  if (!listing || (listing.status !== "pending" && listing.status !== "unpublished")) {
    throw new PilotOperatorError(
      "INVALID_STATE",
      "Yalnız pending veya unpublished ilan yayınlanabilir.",
    );
  }
  if (listing.contact_channel !== "phone" || !listing.contact_e164) {
    throw new PilotOperatorError(
      "INVALID_STATE",
      "Stage 1–3 yayını yalnız doğrulanacak telefon iletişim kanalıyla yapılabilir.",
    );
  }

  const inventory = await fetchPhotoInventory(config, listingId);
  if (inventory.length < 1) {
    throw new PilotOperatorError("INVALID_STATE", "Fotoğrafsız pilot ilanı yayınlanamaz.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  await patchListing(
    config,
    listingId,
    {
      contact_verified_at: now.toISOString(),
      contact_verification_method: "manual_callback",
      publication_instruction_at: now.toISOString(),
      status: "published",
      published_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      unpublished_at: null,
    },
    "operator listing publication",
  );
  return listingId;
}

async function unpublishListing(config: BackendConfig, form: FormData): Promise<string> {
  const listingId = requiredUuid(form);
  const listing = await fetchListing(config, listingId);
  if (!listing || listing.status !== "published") {
    throw new PilotOperatorError(
      "INVALID_STATE",
      "Yalnız yayınlanmış ilan yayından kaldırılabilir.",
    );
  }
  await patchListing(
    config,
    listingId,
    { status: "unpublished", unpublished_at: new Date().toISOString() },
    "operator listing unpublication",
  );
  return listingId;
}

async function rejectListing(config: BackendConfig, form: FormData): Promise<string> {
  const listingId = requiredUuid(form);
  const listing = await fetchListing(config, listingId);
  if (!listing || listing.status !== "pending") {
    throw new PilotOperatorError("INVALID_STATE", "Yalnız pending ilan reddedilebilir.");
  }
  await patchListing(config, listingId, { status: "rejected" }, "operator listing rejection");
  return listingId;
}

async function deleteStoredPhotos(config: BackendConfig, inventory: PhotoInventoryRow[]): Promise<void> {
  if (inventory.length === 0) return;
  const paths = inventory.map((row) => row.object_path);
  const storageBase = `${config.baseUrl}/storage/v1`;
  await requireOk(
    await fetch(`${storageBase}/object/listing_photos`, {
      method: "DELETE",
      headers: serviceHeaders(config),
      body: JSON.stringify({ prefixes: paths }),
    }),
    "operator Storage object deletion",
  );
  for (const path of paths) {
    const probe = await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(path)}`, {
      headers: serviceHeaders(config, "application/octet-stream"),
    });
    if (probe.ok) throw new Error(`Storage deletion verification failed for ${path}.`);
  }
}

async function hardDeleteListing(config: BackendConfig, form: FormData): Promise<string> {
  const listingId = requiredUuid(form);
  let listing = await fetchListing(config, listingId);
  if (!listing) throw new PilotOperatorError("INVALID_STATE", "Silinecek ilan bulunamadı.");

  if (listing.status === "published") {
    await patchListing(
      config,
      listingId,
      { status: "unpublished", unpublished_at: new Date().toISOString() },
      "operator pre-delete unpublication",
    );
    listing = await fetchListing(config, listingId);
    if (!listing || listing.status !== "unpublished") {
      throw new Error("Listing did not enter the fail-closed unpublished state before deletion.");
    }
  }

  const inventory = await fetchPhotoInventory(config, listingId);
  await deleteStoredPhotos(config, inventory);
  await deleteListingRow(config, listingId);
  if (await fetchListing(config, listingId)) {
    throw new Error("Hard listing deletion verification found the listing row after delete.");
  }
  const remainingInventory = await fetchPhotoInventory(config, listingId);
  if (remainingInventory.length !== 0) {
    throw new Error("Hard listing deletion verification found private photo metadata after delete.");
  }
  return listingId;
}

async function runAction(config: BackendConfig, form: FormData): Promise<PilotOperatorResponse> {
  const action = form.get("action");
  if (typeof action !== "string") {
    throw new PilotOperatorError("INVALID_REQUEST", "Kurucu işlem türü eksik.");
  }
  if (action === "list") {
    return {
      ok: true,
      message: "Kurucu ilan envanteri güncellendi.",
      listings: await listOperatorListings(config),
    };
  }
  if (action === "create") {
    const listingId = await createPendingListing(config, form);
    return { ok: true, message: "Pending ilan ve güvenli fotoğraf kaydedildi.", listingId };
  }
  if (action === "publish") {
    const listingId = await publishListing(config, form);
    return { ok: true, message: "İlan yayınlandı.", listingId };
  }
  if (action === "unpublish") {
    const listingId = await unpublishListing(config, form);
    return { ok: true, message: "İlan yayından kaldırıldı.", listingId };
  }
  if (action === "reject") {
    const listingId = await rejectListing(config, form);
    return { ok: true, message: "İlan reddedildi.", listingId };
  }
  if (action === "delete") {
    const listingId = await hardDeleteListing(config, form);
    return { ok: true, message: "İlan ve ilişkili Storage objeleri silindi.", listingId };
  }
  throw new PilotOperatorError("INVALID_REQUEST", "Bilinmeyen kurucu işlem türü.");
}

export async function handlePilotOperatorRequest(request: Request): Promise<Response> {
  try {
    assertLocalSameOriginRequest(request);
    const config = readBackendConfig();
    const form = await request.formData();
    return jsonResponse(await runAction(config, form));
  } catch (error) {
    if (error instanceof PilotOperatorError) {
      const status = error.code === "NOT_ENABLED" ? 404 : error.code === "LOCAL_ONLY" ? 403 : 400;
      return jsonResponse({ ok: false, code: error.code, message: error.message }, status);
    }
    console.error("Pilot operator server failure", error);
    return jsonResponse(
      {
        ok: false,
        code: "OPERATION_FAILED",
        message: "Kurucu işlemi güvenli biçimde tamamlanamadı. İşlem uygulanmış kabul edilmedi.",
      },
      500,
    );
  }
}
