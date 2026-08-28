import { isPilotListingStatus } from "./pilot-operator-contract";
import type {
  Stage1ModerationListing,
  Stage1ModerationResponse,
} from "./stage1-moderation-contract";

const TARLADAN_PROJECT_REFS = new Set(["jlbsoraqnlricbyagxdk", "gwgrwwvaiizfsqaacnhf"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PHOTOS = 8;

type BackendConfig = { baseUrl: string; serviceRoleKey: string };
type BackendRow = {
  id: string;
  title: string;
  description: string;
  price_amount: number | string;
  price_is_free: boolean;
  category: string;
  item_condition: string | null;
  seller_display_name: string;
  status: string;
  contact_channel: string | null;
  contact_e164: string | null;
  contact_verified_at: string | null;
  publication_instruction_at: string | null;
  private_seller_declaration_at: string | null;
  content_rights_declaration_at: string | null;
  listing_rules_version: string | null;
  listing_rules_accepted_at: string | null;
  created_at: string;
  published_at: string | null;
  expires_at: string | null;
  unpublished_at: string | null;
};
type PhotoRow = {
  photo_id: string;
  object_path: string;
  mime_type: string;
  byte_size: number | string;
  sort_order: number | string;
};

class ModerationError extends Error {
  readonly code: Exclude<Stage1ModerationResponse, { ok: true }>["code"];
  constructor(code: Exclude<Stage1ModerationResponse, { ok: true }>["code"], message: string) {
    super(message);
    this.name = "ModerationError";
    this.code = code;
  }
}

function jsonResponse(payload: Stage1ModerationResponse, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function isLoopbackAddress(value: string): boolean {
  const normalized = value.trim().replace(/^\[|\]$/g, "");
  return normalized === "127.0.0.1" || normalized === "::1";
}

function assertLocalSameOriginRequest(request: Request): void {
  const url = new URL(request.url);
  if (!isLoopbackHost(url.hostname)) {
    throw new ModerationError(
      "LOCAL_ONLY",
      "Kurucu moderasyon yüzeyi yalnız yerel bağlantıda çalışır.",
    );
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor && !isLoopbackAddress(forwardedFor.split(",")[0] ?? "")) {
    throw new ModerationError("LOCAL_ONLY", "Kurucu moderasyon yüzeyi dış istemci kabul etmez.");
  }
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== url.origin) {
    throw new ModerationError("LOCAL_ONLY", "Kurucu moderasyonu aynı-origin istek gerektirir.");
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new ModerationError("LOCAL_ONLY", "Kurucu moderasyonu cross-site istek kabul etmez.");
  }
}

function readConfig(): BackendConfig {
  if (process.env.PILOT_OPERATOR_ENABLED !== "enabled") {
    throw new ModerationError("NOT_ENABLED", "Kurucu moderasyon yüzeyi etkin değil.");
  }
  const rawUrl = process.env.PILOT_OPERATOR_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !serviceRoleKey) {
    throw new ModerationError("BACKEND_UNAVAILABLE", "Kurucu backend yapılandırması eksik.");
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ModerationError("BACKEND_UNAVAILABLE", "Kurucu backend adresi geçersiz.");
  }
  const isLocal = isLoopbackHost(url.hostname);
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new ModerationError(
      "BACKEND_UNAVAILABLE",
      "Kurucu backend yerel test dışında HTTPS kullanmalıdır.",
    );
  }
  for (const ref of TARLADAN_PROJECT_REFS) {
    if (url.hostname.includes(ref)) {
      throw new ModerationError(
        "BACKEND_UNAVAILABLE",
        "Tarladan kurucu moderasyonunda kapsam dışıdır.",
      );
    }
  }
  return { baseUrl: url.toString().replace(/\/+$/, ""), serviceRoleKey };
}

function headers(config: BackendConfig, contentType = "application/json"): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "content-type": contentType,
  };
}

async function requireOk(response: Response, context: string): Promise<Response> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${context} failed with HTTP ${response.status}: ${body.slice(0, 800)}`);
  }
  return response;
}

function requiredUuid(form: FormData): string {
  const raw = form.get("listingId");
  if (typeof raw !== "string" || !UUID_PATTERN.test(raw)) {
    throw new ModerationError("INVALID_REQUEST", "İlan kimliği geçersiz.");
  }
  return raw.toLowerCase();
}

async function fetchListing(config: BackendConfig, id: string): Promise<BackendRow | null> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set(
    "select",
    "id,title,description,price_amount,price_is_free,category,item_condition,seller_display_name,status,contact_channel,contact_e164,contact_verified_at,publication_instruction_at,private_seller_declaration_at,content_rights_declaration_at,listing_rules_version,listing_rules_accepted_at,created_at,published_at,expires_at,unpublished_at",
  );
  url.searchParams.set("limit", "1");
  const response = await requireOk(
    await fetch(url, { headers: { ...headers(config), Accept: "application/json" } }),
    "moderation listing read",
  );
  const rows = (await response.json()) as BackendRow[];
  return rows[0] ?? null;
}

async function fetchPhotos(config: BackendConfig, listingId: string): Promise<PhotoRow[]> {
  const response = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/rpc/get_listing_photo_inventory`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({ p_listing_id: listingId }),
    }),
    "moderation photo inventory",
  );
  const rows = (await response.json()) as PhotoRow[];
  if (!Array.isArray(rows) || rows.length > MAX_PHOTOS)
    throw new Error("Invalid moderation photo inventory.");
  return rows;
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function signPhoto(config: BackendConfig, objectPath: string): Promise<string> {
  const response = await requireOk(
    await fetch(
      `${config.baseUrl}/storage/v1/object/sign/listing_photos/${encodeObjectPath(objectPath)}`,
      {
        method: "POST",
        headers: headers(config),
        body: JSON.stringify({ expiresIn: 60 }),
      },
    ),
    "moderation pending photo sign",
  );
  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const raw = payload.signedURL ?? payload.signedUrl;
  if (!raw) throw new Error("Pending photo signing returned no URL.");
  const normalized = raw.startsWith("/object/") ? `/storage/v1${raw}` : raw;
  return new URL(normalized, config.baseUrl).toString();
}

async function listListings(config: BackendConfig): Promise<Stage1ModerationListing[]> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set(
    "select",
    "id,title,description,price_amount,price_is_free,category,item_condition,seller_display_name,status,contact_channel,contact_e164,contact_verified_at,publication_instruction_at,private_seller_declaration_at,content_rights_declaration_at,listing_rules_version,listing_rules_accepted_at,created_at,published_at,expires_at,unpublished_at",
  );
  url.searchParams.set("order", "created_at.desc,id.desc");
  url.searchParams.set("limit", "50");
  const response = await requireOk(
    await fetch(url, { headers: { ...headers(config), Accept: "application/json" } }),
    "moderation listing inventory",
  );
  const rows = (await response.json()) as BackendRow[];
  return await Promise.all(
    rows.map(async (row) => {
      if (!UUID_PATTERN.test(row.id) || !isPilotListingStatus(row.status))
        throw new Error("Moderation row violated identity/status contract.");
      const photoRows = await fetchPhotos(config, row.id);
      const photoUrls = await Promise.all(
        photoRows.map((photo) => signPhoto(config, photo.object_path)),
      );
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        price: Number(row.price_amount),
        isFree: row.price_is_free,
        category: row.category,
        condition: row.item_condition,
        sellerDisplayName: row.seller_display_name,
        status: row.status,
        contactE164: row.contact_e164,
        phoneVerified: row.contact_verified_at !== null,
        publicationInstructionRecorded: row.publication_instruction_at !== null,
        listingRulesVersion: row.listing_rules_version,
        listingRulesAccepted: row.listing_rules_accepted_at !== null,
        photoUrls,
        createdAt: row.created_at,
        publishedAt: row.published_at,
        expiresAt: row.expires_at,
        unpublishedAt: row.unpublished_at,
      };
    }),
  );
}

async function patchListing(
  config: BackendConfig,
  id: string,
  patch: Record<string, unknown>,
  context: string,
): Promise<void> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${id}`);
  const response = await requireOk(
    await fetch(url, {
      method: "PATCH",
      headers: { ...headers(config), Prefer: "return=representation" },
      body: JSON.stringify(patch),
    }),
    context,
  );
  const rows = (await response.json()) as Array<{ id?: string }>;
  if (rows.length !== 1 || rows[0]?.id !== id)
    throw new Error(`${context} did not mutate exactly one listing.`);
}

async function publish(config: BackendConfig, form: FormData): Promise<string> {
  const id = requiredUuid(form);
  const listing = await fetchListing(config, id);
  if (!listing || (listing.status !== "pending" && listing.status !== "unpublished")) {
    throw new ModerationError(
      "INVALID_STATE",
      "Yalnız incelemedeki veya yayından kaldırılmış ilan yayınlanabilir.",
    );
  }
  if (!listing.contact_verified_at) {
    throw new ModerationError("INVALID_STATE", "Telefon kontrolü tamamlanmamış.");
  }
  if (!listing.publication_instruction_at) {
    throw new ModerationError(
      "INVALID_STATE",
      "Kamuya açık iletişim yayın talimatı kaydedilmemiş.",
    );
  }
  if (!listing.contact_e164) {
    throw new ModerationError("INVALID_STATE", "Yayınlanabilir satıcı telefonu eksik.");
  }
  if (!listing.listing_rules_version || !listing.listing_rules_accepted_at) {
    throw new ModerationError("INVALID_STATE", "Güncel ilan kuralları kabul kaydı eksik.");
  }
  if ((await fetchPhotos(config, id)).length < 1)
    throw new ModerationError("INVALID_STATE", "Fotoğrafsız ilan yayınlanamaz.");
  const rawDays = form.get("expiresInDays");
  const days = typeof rawDays === "string" ? Number(rawDays) : NaN;
  if (!Number.isInteger(days) || days < 1 || days > 90)
    throw new ModerationError("INVALID_REQUEST", "Yayın süresi 1–90 gün olmalıdır.");
  const now = new Date();
  await patchListing(
    config,
    id,
    {
      status: "published",
      published_at: now.toISOString(),
      expires_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
      unpublished_at: null,
    },
    "moderation publish",
  );
  return id;
}

async function reject(config: BackendConfig, form: FormData): Promise<string> {
  const id = requiredUuid(form);
  const listing = await fetchListing(config, id);
  if (!listing || listing.status !== "pending")
    throw new ModerationError("INVALID_STATE", "Yalnız incelemedeki ilan reddedilebilir.");
  await patchListing(config, id, { status: "rejected" }, "moderation reject");
  return id;
}

async function unpublish(config: BackendConfig, form: FormData): Promise<string> {
  const id = requiredUuid(form);
  const listing = await fetchListing(config, id);
  if (!listing || listing.status !== "published")
    throw new ModerationError("INVALID_STATE", "Yalnız yayındaki ilan kaldırılabilir.");
  await patchListing(
    config,
    id,
    { status: "unpublished", unpublished_at: new Date().toISOString() },
    "moderation unpublish",
  );
  return id;
}

async function hardDelete(config: BackendConfig, form: FormData): Promise<string> {
  const id = requiredUuid(form);
  let listing = await fetchListing(config, id);
  if (!listing) throw new ModerationError("INVALID_STATE", "Silinecek ilan bulunamadı.");
  if (listing.status === "published") {
    await patchListing(
      config,
      id,
      { status: "unpublished", unpublished_at: new Date().toISOString() },
      "moderation pre-delete unpublish",
    );
    listing = await fetchListing(config, id);
    if (!listing || listing.status !== "unpublished")
      throw new Error("Listing did not fail closed before delete.");
  }
  const photos = await fetchPhotos(config, id);
  if (photos.length > 0) {
    await requireOk(
      await fetch(`${config.baseUrl}/storage/v1/object/listing_photos`, {
        method: "DELETE",
        headers: headers(config),
        body: JSON.stringify({ prefixes: photos.map((photo) => photo.object_path) }),
      }),
      "moderation Storage delete",
    );
  }
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${id}`);
  await requireOk(
    await fetch(url, { method: "DELETE", headers: headers(config) }),
    "moderation listing delete",
  );
  if (await fetchListing(config, id)) throw new Error("Listing row remained after delete.");
  if ((await fetchPhotos(config, id)).length !== 0)
    throw new Error("Photo metadata remained after delete.");
  return id;
}

export async function handleStage1ModerationRequest(request: Request): Promise<Response> {
  try {
    assertLocalSameOriginRequest(request);
    const config = readConfig();
    const form = await request.formData();
    const action = form.get("action");
    if (action === "list")
      return jsonResponse({
        ok: true,
        message: "Moderasyon kuyruğu güncellendi.",
        listings: await listListings(config),
      });
    if (action === "publish")
      return jsonResponse({
        ok: true,
        message: "İlan yayınlandı.",
        listingId: await publish(config, form),
      });
    if (action === "reject")
      return jsonResponse({
        ok: true,
        message: "İlan reddedildi.",
        listingId: await reject(config, form),
      });
    if (action === "unpublish")
      return jsonResponse({
        ok: true,
        message: "İlan yayından kaldırıldı.",
        listingId: await unpublish(config, form),
      });
    if (action === "delete")
      return jsonResponse({
        ok: true,
        message: "İlan ve ilişkili fotoğraflar silindi.",
        listingId: await hardDelete(config, form),
      });
    throw new ModerationError("INVALID_REQUEST", "Bilinmeyen moderasyon işlemi.");
  } catch (error) {
    if (error instanceof ModerationError) {
      const status = error.code === "NOT_ENABLED" ? 404 : error.code === "LOCAL_ONLY" ? 403 : 400;
      return jsonResponse({ ok: false, code: error.code, message: error.message }, status);
    }
    console.error("Stage-1 moderation failure", error);
    return jsonResponse(
      {
        ok: false,
        code: "OPERATION_FAILED",
        message: "Moderasyon işlemi güvenli biçimde tamamlanamadı.",
      },
      500,
    );
  }
}
