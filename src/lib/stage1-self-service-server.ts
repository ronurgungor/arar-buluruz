import { isIP } from "node:net";
import { LISTING_PHOTO_MAX_BYTES, validateListingPhoto } from "./listing-photo";
import {
  ingestTrustedListingPhoto,
  type StoredListingPhotoMetadata,
  type TrustedListingPhotoIngestionStore,
} from "./listing-photo-trusted";
import { getDistrictsForCity, isLocationCity } from "../data/turkiye-locations";
import type {
  Stage1SellerListing,
  Stage1SellerListingStatus,
  Stage1SellerManagementResponse,
} from "./stage1-seller-management-contract";
import {
  STAGE1_CAPABILITY_TTL_SECONDS,
  STAGE1_MAX_PHOTOS,
  STAGE1_MAX_TOTAL_UPLOAD_BYTES,
  stage1CategorySchema,
  stage1ConditionSchema,
  stage1ContactPreferenceSchema,
  stage1E164Schema,
  type Stage1SubmissionResponse,
} from "./stage1-self-service-contract";

const TARLADAN_PROJECT_REFS = new Set(["jlbsoraqnlricbyagxdk", "gwgrwwvaiizfsqaacnhf"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const PRICE_PATTERN = /^\d{1,10}(?:[.,]\d{1,2})?$/;
const MAX_REQUEST_BYTES = STAGE1_MAX_TOTAL_UPLOAD_BYTES + 2 * 1024 * 1024;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;

class Stage1SubmissionError extends Error {
  readonly code: Exclude<Stage1SubmissionResponse, { ok: true }>["code"];
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(
    code: Exclude<Stage1SubmissionResponse, { ok: true }>["code"],
    message: string,
    status = 400,
    retryAfterSeconds?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "Stage1SubmissionError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type BackendConfig = { baseUrl: string; serviceRoleKey: string };
type Challenge = { e164: string; codeHash: string; expiresAt: number; attempts: number };
type RateBucket = { count: number; resetAt: number };
type CapabilityPayload = {
  e164: string;
  verifiedAt: string;
  expiresAt: string;
  nonce: string;
};
type SubmissionClaim = {
  listing_id: string;
  state: "claimed" | "complete" | "in_progress";
};

type Stage1ApiResponse = Stage1SubmissionResponse | Stage1SellerManagementResponse;

type SellerBackendRow = {
  id: string;
  title: string;
  description: string;
  price_amount: number | string;
  price_is_free: boolean;
  category: string;
  item_condition: string;
  province: string;
  district: string;
  seller_display_name: string;
  status: string;
  contact_channel: string | null;
  contact_e164: string | null;
  contact_verified_at: string | null;
  publication_instruction_at: string | null;
  private_seller_declaration_at: string | null;
  content_rights_declaration_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  expires_at: string | null;
  unpublished_at: string | null;
  sold_at: string | null;
};

type SellerPhotoRow = {
  photo_id: string;
  object_path: string;
  mime_type: string;
  byte_size: number | string;
  sort_order: number | string;
};

const challenges = new Map<string, Challenge>();
const rateBuckets = new Map<string, RateBucket>();

function jsonResponse(payload: Stage1ApiResponse, status = 200): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  if (!payload.ok && payload.retryAfterSeconds) {
    headers.set("Retry-After", String(payload.retryAfterSeconds));
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function assertSameOrigin(request: Request): void {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (!origin) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "İstek kaynağı doğrulanamadı.", 403);
  }
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new Stage1SubmissionError("INVALID_REQUEST", "İstek kaynağı doğrulanamadı.", 403);
  }
  if (originUrl.origin !== requestUrl.origin) {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "Cross-origin ilan gönderimi kabul edilmez.",
      403,
    );
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "Cross-site ilan gönderimi kabul edilmez.",
      403,
    );
  }
}

function assertRequestSize(request: Request): void {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "İstek boyutu doğrulanamadı. Lütfen sayfayı yenileyip tekrar deneyin.",
      411,
    );
  }
  const contentLength = Number(rawLength);
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "İlan gönderimi boyut sınırını aşıyor.",
      413,
    );
  }
}

function resolveTrustedClientIp(request: Request): string {
  const requestUrl = new URL(request.url);
  if (isLoopbackHost(requestUrl.hostname)) return "127.0.0.1";

  if (process.env.PILOT_TRUSTED_PROXY_ENABLED !== "enabled") {
    throw new Stage1SubmissionError(
      "BACKEND_UNAVAILABLE",
      "İlan gönderimi için güvenilir istemci-IP sınırı yapılandırılmamış.",
      503,
    );
  }
  const headerName = process.env.PILOT_TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (!headerName || !/^[a-z0-9-]{2,64}$/.test(headerName)) {
    throw new Stage1SubmissionError(
      "BACKEND_UNAVAILABLE",
      "İlan gönderimi için güvenilir istemci-IP başlığı yapılandırılmamış.",
      503,
    );
  }
  const value = request.headers.get(headerName)?.trim() ?? "";
  if (!value || value.includes(",") || isIP(value) === 0) {
    throw new Stage1SubmissionError(
      "BACKEND_UNAVAILABLE",
      "Güvenilir istemci-IP bilgisi doğrulanamadı.",
      503,
    );
  }
  return value;
}

function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw new Stage1SubmissionError(
      "RATE_LIMITED",
      "Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.",
      429,
      retryAfterSeconds,
    );
  }
  current.count += 1;
}

function readBackendConfig(): BackendConfig {
  const rawUrl =
    process.env.PILOT_SUBMISSION_SUPABASE_URL?.trim() ??
    process.env.PILOT_OPERATOR_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.PILOT_SUBMISSION_SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !serviceRoleKey) {
    throw new Stage1SubmissionError(
      "BACKEND_UNAVAILABLE",
      "İlan gönderim altyapısı bu ortamda etkin değil.",
      503,
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Stage1SubmissionError("BACKEND_UNAVAILABLE", "İlan backend adresi geçersiz.", 503);
  }
  const isLocal = isLoopbackHost(url.hostname);
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Stage1SubmissionError(
      "BACKEND_UNAVAILABLE",
      "İlan backend bağlantısı yerel test dışında HTTPS kullanmalıdır.",
      503,
    );
  }
  for (const forbiddenRef of TARLADAN_PROJECT_REFS) {
    if (url.hostname.includes(forbiddenRef)) {
      throw new Stage1SubmissionError(
        "BACKEND_UNAVAILABLE",
        "Tarladan kaynakları Arar Buluruz ilan gönderimi için kapsam dışıdır.",
        503,
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

async function requireOk(response: Response, context: string): Promise<Response> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${context} failed with HTTP ${response.status}: ${body.slice(0, 800)}`);
  }
  return response;
}

function encodeObjectPath(objectPath: string): string {
  return objectPath.split("/").map(encodeURIComponent).join("/");
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
          body: new Uint8Array(input.bytes).buffer,
        }),
        "self-service sanitized photo upload",
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
        "self-service sanitized photo metadata registration",
      );
    },
    async deleteObject(objectPath) {
      await requireOk(
        await fetch(`${storageBase}/object/listing_photos`, {
          method: "DELETE",
          headers: serviceHeaders(config),
          body: JSON.stringify({ prefixes: [objectPath] }),
        }),
        "self-service compensating photo delete",
      );
    },
  };
}

async function deleteStoredObjects(
  config: BackendConfig,
  objectPaths: readonly string[],
): Promise<void> {
  if (objectPaths.length === 0) return;
  await requireOk(
    await fetch(`${config.baseUrl}/storage/v1/object/listing_photos`, {
      method: "DELETE",
      headers: serviceHeaders(config),
      body: JSON.stringify({ prefixes: objectPaths }),
    }),
    "self-service Storage cleanup",
  );
}

async function deleteListingRow(config: BackendConfig, listingId: string): Promise<void> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${listingId}`);
  await requireOk(
    await fetch(url, {
      method: "DELETE",
      headers: { ...serviceHeaders(config), Prefer: "return=minimal" },
    }),
    "self-service listing cleanup",
  );
}

function requiredString(form: FormData, key: string, min: number, max: number): string {
  const raw = form.get(key);
  if (typeof raw !== "string") {
    throw new Stage1SubmissionError("INVALID_REQUEST", "İlan bilgileri eksik veya geçersiz.");
  }
  const value = raw.trim();
  if (value.length < min || value.length > max) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "İlan bilgileri eksik veya geçersiz.");
  }
  return value;
}

function requiredConfirmation(form: FormData, key: string): void {
  if (form.get(key) !== "confirmed") {
    throw new Stage1SubmissionError("INVALID_REQUEST", "Gerekli ilan beyanları tamamlanmadı.");
  }
}

function assertAllowedFields(form: FormData, allowed: ReadonlySet<string>): void {
  for (const key of form.keys()) {
    if (!allowed.has(key)) {
      throw new Stage1SubmissionError("INVALID_REQUEST", "İstek beklenmeyen alan içeriyor.");
    }
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getCapabilitySecret(): string {
  const secret = process.env.PILOT_SUBMISSION_CAPABILITY_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new Stage1SubmissionError(
      "BACKEND_UNAVAILABLE",
      "İlan doğrulama yetenek anahtarı bu ortamda yapılandırılmamış.",
      503,
    );
  }
  return secret;
}

function base64UrlEncode(value: Uint8Array | string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const decoded = new Uint8Array(Buffer.from(value, "base64url"));
  return base64UrlEncode(decoded) === value ? decoded : null;
}

async function signCapabilityPayload(payloadPart: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart));
  return base64UrlEncode(new Uint8Array(signature));
}

async function createCapability(e164: string): Promise<{ token: string; expiresAt: string }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STAGE1_CAPABILITY_TTL_SECONDS * 1000);
  const payload: CapabilityPayload = {
    e164,
    verifiedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce: crypto.randomUUID(),
  };
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signature = await signCapabilityPayload(payloadPart, getCapabilitySecret());
  return { token: `${payloadPart}.${signature}`, expiresAt: payload.expiresAt };
}

async function verifyCapability(token: string, expectedE164: string): Promise<CapabilityPayload> {
  const pieces = token.split(".");
  if (pieces.length !== 2 || !pieces[0] || !pieces[1]) {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması gerekiyor.", 401);
  }
  const [payloadPart, signature] = pieces;
  const expectedSignature = await signCapabilityPayload(payloadPart, getCapabilitySecret());
  const actualBytes = base64UrlDecode(signature);
  const expectedBytes = base64UrlDecode(expectedSignature);
  if (!actualBytes || !expectedBytes || actualBytes.byteLength !== expectedBytes.byteLength) {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması gerekiyor.", 401);
  }
  let mismatch = 0;
  for (let index = 0; index < actualBytes.byteLength; index += 1) {
    mismatch |= actualBytes[index] ^ expectedBytes[index];
  }
  if (mismatch !== 0) {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması gerekiyor.", 401);
  }

  let payload: CapabilityPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as CapabilityPayload;
  } catch {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması gerekiyor.", 401);
  }
  if (
    !stage1E164Schema.safeParse(payload.e164).success ||
    payload.e164 !== expectedE164 ||
    !UUID_PATTERN.test(payload.nonce)
  ) {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması gerekiyor.", 401);
  }
  const verifiedAt = Date.parse(payload.verifiedAt);
  const expiresAt = Date.parse(payload.expiresAt);
  const now = Date.now();
  if (
    !Number.isFinite(verifiedAt) ||
    !Number.isFinite(expiresAt) ||
    verifiedAt > now + 60_000 ||
    expiresAt <= now ||
    expiresAt - verifiedAt > STAGE1_CAPABILITY_TTL_SECONDS * 1000 + 1000
  ) {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması gerekiyor.", 401);
  }
  return payload;
}

async function startVerification(
  form: FormData,
  clientIp: string,
  request: Request,
): Promise<Response> {
  assertAllowedFields(form, new Set(["action", "phone"]));
  enforceRateLimit(`verification-start:${clientIp}`, 5, 15 * 60 * 1000);
  const e164 = stage1E164Schema.parse(requiredString(form, "phone", 8, 16));
  const mode = process.env.PILOT_PHONE_VERIFICATION_MODE?.trim() ?? "disabled";
  if (mode !== "synthetic") {
    throw new Stage1SubmissionError(
      "VERIFICATION_UNAVAILABLE",
      "Telefon doğrulama hizmeti bu ortamda henüz etkin değil.",
      503,
    );
  }
  if (!isLoopbackHost(new URL(request.url).hostname)) {
    throw new Stage1SubmissionError(
      "VERIFICATION_UNAVAILABLE",
      "Sentetik telefon doğrulaması yalnız yerel testte kullanılabilir.",
      503,
    );
  }
  const code = process.env.PILOT_SYNTHETIC_VERIFICATION_CODE?.trim() ?? "";
  if (!/^\d{6}$/.test(code)) {
    throw new Stage1SubmissionError(
      "VERIFICATION_UNAVAILABLE",
      "Sentetik telefon doğrulama kodu yapılandırılmamış.",
      503,
    );
  }
  const challengeId = crypto.randomUUID();
  challenges.set(challengeId, {
    e164,
    codeHash: await sha256Hex(`${challengeId}:${code}`),
    expiresAt: Date.now() + VERIFICATION_TTL_MS,
    attempts: 0,
  });
  return jsonResponse({
    ok: true,
    action: "verification_started",
    challengeId,
    message: "Telefon doğrulama adımı başlatıldı.",
  });
}

async function verifyPhone(form: FormData, clientIp: string): Promise<Response> {
  assertAllowedFields(form, new Set(["action", "phone", "challengeId", "code"]));
  enforceRateLimit(`verification-confirm:${clientIp}`, 10, 15 * 60 * 1000);
  const e164 = stage1E164Schema.parse(requiredString(form, "phone", 8, 16));
  const challengeId = requiredString(form, "challengeId", 36, 36).toLowerCase();
  const code = requiredString(form, "code", 6, 6);
  if (!UUID_PATTERN.test(challengeId) || !/^\d{6}$/.test(code)) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "Doğrulama bilgisi geçersiz.");
  }
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.expiresAt <= Date.now() || challenge.e164 !== e164) {
    challenges.delete(challengeId);
    throw new Stage1SubmissionError(
      "VERIFICATION_REQUIRED",
      "Telefon doğrulaması yeniden gerekiyor.",
      401,
    );
  }
  challenge.attempts += 1;
  if (challenge.attempts > 5) {
    challenges.delete(challengeId);
    throw new Stage1SubmissionError("RATE_LIMITED", "Doğrulama deneme sınırı aşıldı.", 429, 600);
  }
  if ((await sha256Hex(`${challengeId}:${code}`)) !== challenge.codeHash) {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Doğrulama kodu geçersiz.", 401);
  }
  challenges.delete(challengeId);
  const capability = await createCapability(e164);
  return jsonResponse({
    ok: true,
    action: "phone_verified",
    capability: capability.token,
    capabilityExpiresAt: capability.expiresAt,
    message: "Telefon kontrolü doğrulandı.",
  });
}

function parsePrice(form: FormData): { price: number; isFree: boolean } {
  const mode = requiredString(form, "priceMode", 4, 6);
  if (mode === "free") return { price: 0, isFree: true };
  if (mode !== "priced") {
    throw new Stage1SubmissionError("INVALID_REQUEST", "Fiyat bilgisi geçersiz.");
  }
  const raw = requiredString(form, "price", 1, 14);
  if (!PRICE_PATTERN.test(raw)) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "Fiyat bilgisi geçersiz.");
  }
  const price = Number(raw.replace(",", "."));
  if (!Number.isFinite(price) || price < 0 || price > 9_999_999_999.99) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "Fiyat bilgisi geçersiz.");
  }
  return { price, isFree: false };
}

function readPhotos(form: FormData): File[] {
  const entries = form.getAll("photo");
  if (entries.length < 1 || entries.length > STAGE1_MAX_PHOTOS) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "1–8 fotoğraf ekleyin.");
  }
  let totalBytes = 0;
  return entries.map((entry) => {
    if (!(entry instanceof File)) {
      throw new Stage1SubmissionError("INVALID_REQUEST", "Fotoğraf dosyası geçersiz.");
    }
    if (
      validateListingPhoto(entry.type, entry.size) !== null ||
      entry.size > LISTING_PHOTO_MAX_BYTES
    ) {
      throw new Stage1SubmissionError(
        "INVALID_REQUEST",
        "Fotoğraflar JPEG, PNG veya WebP olmalı ve dosya başına 8 MB sınırını aşmamalı.",
      );
    }
    totalBytes += entry.size;
    if (totalBytes > STAGE1_MAX_TOTAL_UPLOAD_BYTES) {
      throw new Stage1SubmissionError("INVALID_REQUEST", "Toplam fotoğraf boyutu sınırı aşıldı.");
    }
    return entry;
  });
}

async function claimSubmission(
  config: BackendConfig,
  keyHash: string,
  listingId: string,
): Promise<SubmissionClaim> {
  const response = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/rpc/claim_listing_submission_key`, {
      method: "POST",
      headers: serviceHeaders(config),
      body: JSON.stringify({ p_key_hash: keyHash, p_listing_id: listingId }),
    }),
    "self-service idempotency claim",
  );
  const rows = (await response.json()) as SubmissionClaim[];
  const claim = rows[0];
  if (
    rows.length !== 1 ||
    !claim ||
    !UUID_PATTERN.test(claim.listing_id) ||
    !["claimed", "complete", "in_progress"].includes(claim.state)
  ) {
    throw new Error("Submission idempotency RPC returned an invalid response.");
  }
  return claim;
}

async function completeAndPublishSubmission(
  config: BackendConfig,
  keyHash: string,
  listingId: string,
): Promise<void> {
  const response = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/rpc/complete_and_publish_listing_submission`, {
      method: "POST",
      headers: serviceHeaders(config),
      body: JSON.stringify({
        p_key_hash: keyHash,
        p_listing_id: listingId,
        p_expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      }),
    }),
    "self-service atomic publication",
  );
  const completed = (await response.json()) as boolean;
  if (completed !== true) {
    throw new Error("Atomic listing publication was not acknowledged.");
  }
}

async function cleanupFailedSubmission(
  config: BackendConfig,
  listingId: string,
  photos: readonly StoredListingPhotoMetadata[],
): Promise<void> {
  const errors: unknown[] = [];
  try {
    await deleteStoredObjects(
      config,
      photos.map((photo) => photo.objectPath),
    );
  } catch (error) {
    errors.push(error);
  }
  try {
    await deleteListingRow(config, listingId);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, `Whole-submission cleanup failed for ${listingId}.`);
  }
}

async function createPendingRow(
  config: BackendConfig,
  input: {
    listingId: string;
    title: string;
    description: string;
    price: number;
    isFree: boolean;
    category: string;
    condition: string;
    province: string;
    district: string;
    sellerDisplayName: string;
    contactPreference: string;
    phone: string;
    verifiedAt: string;
    declarationTime: string;
  },
): Promise<void> {
  const response = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/listings`, {
      method: "POST",
      headers: { ...serviceHeaders(config), Prefer: "return=representation" },
      body: JSON.stringify({
        id: input.listingId,
        title: input.title,
        description: input.description,
        price_amount: input.price,
        price_is_free: input.isFree,
        category: input.category,
        item_condition: input.condition,
        province: input.province,
        district: input.district,
        seller_display_name: input.sellerDisplayName,
        search_keywords: [],
        contact_channel: input.contactPreference,
        contact_e164: input.phone,
        contact_verified_at: input.verifiedAt,
        contact_verification_method: "one_time_code",
        publication_instruction_at: input.declarationTime,
        private_seller_declaration_at: input.declarationTime,
        content_rights_declaration_at: input.declarationTime,
        status: "pending",
      }),
    }),
    "self-service pending listing create",
  );
  const rows = (await response.json()) as Array<{ id?: string }>;
  if (rows.length !== 1 || rows[0]?.id !== input.listingId) {
    throw new Error("Self-service listing create did not return the requested listing identity.");
  }
}

async function submitListing(form: FormData, clientIp: string): Promise<Response> {
  assertAllowedFields(
    form,
    new Set([
      "action",
      "category",
      "title",
      "condition",
      "priceMode",
      "price",
      "description",
      "province",
      "district",
      "sellerDisplayName",
      "phone",
      "contactPreference",
      "privateSellerDeclaration",
      "contentRightsDeclaration",
      "publicationInstructionConfirmed",
      "capability",
      "idempotencyKey",
      "photo",
    ]),
  );
  enforceRateLimit(`submit:${clientIp}`, 3, 60 * 60 * 1000);

  const category = stage1CategorySchema.parse(requiredString(form, "category", 3, 32));
  const condition = stage1ConditionSchema.parse(requiredString(form, "condition", 3, 32));
  const title = requiredString(form, "title", 3, 120);
  const description = requiredString(form, "description", 10, 5000);
  const sellerDisplayName = requiredString(form, "sellerDisplayName", 2, 80);
  const phone = stage1E164Schema.parse(requiredString(form, "phone", 8, 16));
  const contactPreference = stage1ContactPreferenceSchema.parse(
    requiredString(form, "contactPreference", 5, 20),
  );
  const province = requiredString(form, "province", 2, 64);
  const district = requiredString(form, "district", 2, 64);
  if (!isLocationCity(province) || !getDistrictsForCity(province).includes(district)) {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "İl ve ilçe seçimi Türkiye konum kataloğuyla eşleşmiyor.",
    );
  }
  requiredConfirmation(form, "privateSellerDeclaration");
  requiredConfirmation(form, "contentRightsDeclaration");
  requiredConfirmation(form, "publicationInstructionConfirmed");

  const capability = requiredString(form, "capability", 20, 4096);
  const verified = await verifyCapability(capability, phone);
  const { price, isFree } = parsePrice(form);
  const photos = readPhotos(form);
  const idempotencyKey = requiredString(form, "idempotencyKey", 36, 36).toLowerCase();
  if (!UUID_PATTERN.test(idempotencyKey)) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "İlan gönderim kimliği geçersiz.");
  }
  const keyHash = await sha256Hex(idempotencyKey);
  if (!SHA256_HEX_PATTERN.test(keyHash)) {
    throw new Error("Idempotency hash generation failed.");
  }

  const config = readBackendConfig();
  const listingId = crypto.randomUUID();
  const declarationTime = new Date().toISOString();
  await createPendingRow(config, {
    listingId,
    title,
    description,
    price,
    isFree,
    category,
    condition,
    province,
    district,
    sellerDisplayName,
    contactPreference,
    phone,
    verifiedAt: verified.verifiedAt,
    declarationTime,
  });

  let claim: SubmissionClaim;
  try {
    claim = await claimSubmission(config, keyHash, listingId);
  } catch (cause) {
    try {
      await cleanupFailedSubmission(config, listingId, []);
    } catch (cleanupCause) {
      throw new AggregateError(
        [cause, cleanupCause],
        "Idempotency claim failed and pending-listing cleanup was incomplete.",
      );
    }
    throw cause;
  }

  if (claim.state !== "claimed") {
    await deleteListingRow(config, listingId);
    if (claim.state === "complete") {
      return jsonResponse(
        {
          ok: true,
          action: "submitted",
          listingId: claim.listing_id,
          message: "İlanın yayınlandı.",
        },
        200,
      );
    }
    throw new Stage1SubmissionError(
      "IN_PROGRESS",
      "Bu ilan gönderimi zaten işleniyor. Lütfen tekrar göndermeyin.",
      409,
      5,
    );
  }

  const storedPhotos: StoredListingPhotoMetadata[] = [];
  try {
    const store = createIngestionStore(config);
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const metadata = await ingestTrustedListingPhoto(
        {
          listingId,
          photoId: crypto.randomUUID(),
          declaredMimeType: photo.type,
          bytes: new Uint8Array(await photo.arrayBuffer()),
          sortOrder: index,
        },
        store,
      );
      storedPhotos.push(metadata);
    }
    await completeAndPublishSubmission(config, keyHash, listingId);
  } catch (cause) {
    try {
      await cleanupFailedSubmission(config, listingId, storedPhotos);
    } catch (cleanupCause) {
      throw new AggregateError(
        [cause, cleanupCause],
        "Submission failed and cleanup was incomplete.",
      );
    }
    throw cause;
  }

  return jsonResponse(
    {
      ok: true,
      action: "submitted",
      listingId,
      message: "İlanın yayınlandı.",
    },
    201,
  );
}


function requiredUuid(form: FormData, key = "listingId"): string {
  const value = requiredString(form, key, 36, 36).toLowerCase();
  if (!UUID_PATTERN.test(value)) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "İlan kimliği geçersiz.");
  }
  return value;
}

function sellerStatus(value: string): Stage1SellerListingStatus | null {
  return value === "pending" ||
    value === "published" ||
    value === "unpublished" ||
    value === "rejected" ||
    value === "sold"
    ? value
    : null;
}

async function fetchSellerRows(
  config: BackendConfig,
  input: { listingId?: string; phone?: string },
): Promise<SellerBackendRow[]> {
  const url = new URL(`${config.baseUrl}/rest/v1/listings`);
  if (input.listingId) url.searchParams.set("id", `eq.${input.listingId}`);
  if (input.phone) url.searchParams.set("contact_e164", `eq.${input.phone}`);
  url.searchParams.set(
    "select",
    [
      "id",
      "title",
      "description",
      "price_amount",
      "price_is_free",
      "category",
      "item_condition",
      "province",
      "district",
      "seller_display_name",
      "status",
      "contact_channel",
      "contact_e164",
      "contact_verified_at",
      "publication_instruction_at",
      "private_seller_declaration_at",
      "content_rights_declaration_at",
      "created_at",
      "updated_at",
      "published_at",
      "expires_at",
      "unpublished_at",
      "sold_at",
    ].join(","),
  );
  url.searchParams.set("order", "created_at.desc,id.desc");
  const response = await requireOk(
    await fetch(url, { headers: { ...serviceHeaders(config), Accept: "application/json" } }),
    "seller listing read",
  );
  const rows = (await response.json()) as SellerBackendRow[];
  if (!Array.isArray(rows) || rows.length > 100) {
    throw new Error("Seller listing inventory returned an invalid response.");
  }
  return rows;
}

async function fetchSellerPhotoInventory(
  config: BackendConfig,
  listingId: string,
): Promise<SellerPhotoRow[]> {
  const response = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/rpc/get_listing_photo_inventory`, {
      method: "POST",
      headers: serviceHeaders(config),
      body: JSON.stringify({ p_listing_id: listingId }),
    }),
    "seller photo inventory",
  );
  const rows = (await response.json()) as SellerPhotoRow[];
  if (!Array.isArray(rows) || rows.length > STAGE1_MAX_PHOTOS) {
    throw new Error("Seller photo inventory returned an invalid response.");
  }
  return rows;
}

async function signSellerPhoto(config: BackendConfig, objectPath: string): Promise<string> {
  const response = await requireOk(
    await fetch(
      `${config.baseUrl}/storage/v1/object/sign/listing_photos/${encodeObjectPath(objectPath)}`,
      {
        method: "POST",
        headers: serviceHeaders(config),
        body: JSON.stringify({ expiresIn: 60 }),
      },
    ),
    "seller photo sign",
  );
  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const raw = payload.signedURL ?? payload.signedUrl;
  if (!raw) throw new Error("Seller photo signing returned no URL.");
  const normalized = raw.startsWith("/object/") ? `/storage/v1${raw}` : raw;
  const signed = new URL(normalized, config.baseUrl);
  if (signed.origin !== new URL(config.baseUrl).origin) {
    throw new Error("Seller photo signing changed backend origin.");
  }
  return signed.toString();
}

async function assertSellerCapability(form: FormData): Promise<{
  phone: string;
  verified: CapabilityPayload;
}> {
  const phone = stage1E164Schema.parse(requiredString(form, "phone", 8, 16));
  const capability = requiredString(form, "capability", 20, 4096);
  return { phone, verified: await verifyCapability(capability, phone) };
}

async function requireOwnedListing(
  config: BackendConfig,
  listingId: string,
  phone: string,
): Promise<SellerBackendRow> {
  const rows = await fetchSellerRows(config, { listingId });
  const listing = rows[0];
  if (!listing || listing.contact_e164 !== phone) {
    throw new Stage1SubmissionError(
      "NOT_AUTHORIZED",
      "Bu ilan için yönetim yetkisi doğrulanamadı.",
      403,
    );
  }
  return listing;
}

async function mapSellerListing(
  config: BackendConfig,
  row: SellerBackendRow,
): Promise<Stage1SellerListing> {
  const category = stage1CategorySchema.safeParse(row.category);
  const condition = stage1ConditionSchema.safeParse(row.item_condition);
  const contactPreference = stage1ContactPreferenceSchema.safeParse(row.contact_channel);
  const status = sellerStatus(row.status);
  if (!category.success || !condition.success || !contactPreference.success || !status) {
    throw new Error("Seller listing violated the classifieds contract.");
  }
  const inventory = await fetchSellerPhotoInventory(config, row.id);
  const photoUrls = await Promise.all(
    inventory
      .slice()
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((photo) => signSellerPhoto(config, photo.object_path)),
  );
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number(row.price_amount),
    isFree: row.price_is_free,
    category: category.data,
    condition: condition.data,
    province: row.province,
    district: row.district,
    sellerDisplayName: row.seller_display_name,
    contactPreference: contactPreference.data,
    status,
    photoUrls,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    unpublishedAt: row.unpublished_at,
    soldAt: row.sold_at,
  };
}

async function patchSellerListing(
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
    throw new Error(`${context} did not mutate exactly one listing.`);
  }
}

async function sellerList(form: FormData, clientIp: string): Promise<Response> {
  assertAllowedFields(form, new Set(["action", "phone", "capability"]));
  enforceRateLimit(`seller-list:${clientIp}`, 30, 15 * 60 * 1000);
  const { phone } = await assertSellerCapability(form);
  const config = readBackendConfig();
  const rows = await fetchSellerRows(config, { phone });
  const listings = await Promise.all(
    rows.map((row) => mapSellerListing(config, row)),
  );
  return jsonResponse({
    ok: true,
    action: "seller_list",
    listings,
    message: listings.length > 0 ? "İlanların yüklendi." : "Bu telefonla yönetilen ilan bulunamadı.",
  });
}

async function sellerUpdate(form: FormData, clientIp: string): Promise<Response> {
  assertAllowedFields(
    form,
    new Set([
      "action",
      "phone",
      "capability",
      "listingId",
      "category",
      "condition",
      "priceMode",
      "price",
      "title",
      "description",
      "province",
      "district",
      "contactPreference",
    ]),
  );
  enforceRateLimit(`seller-update:${clientIp}`, 20, 15 * 60 * 1000);
  const { phone } = await assertSellerCapability(form);
  const config = readBackendConfig();
  const listingId = requiredUuid(form);
  const listing = await requireOwnedListing(config, listingId, phone);
  if (listing.status !== "published" && listing.status !== "unpublished") {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "Bu ilan mevcut durumunda düzenlenemez.",
      409,
    );
  }

  const category = stage1CategorySchema.parse(requiredString(form, "category", 3, 32));
  const condition = stage1ConditionSchema.parse(requiredString(form, "condition", 3, 32));
  const contactPreference = stage1ContactPreferenceSchema.parse(
    requiredString(form, "contactPreference", 5, 20),
  );
  const title = requiredString(form, "title", 3, 120);
  const description = requiredString(form, "description", 10, 5000);
  const province = requiredString(form, "province", 2, 64);
  const district = requiredString(form, "district", 2, 64);
  if (!isLocationCity(province) || !getDistrictsForCity(province).includes(district)) {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "İl ve ilçe seçimi Türkiye konum kataloğuyla eşleşmiyor.",
    );
  }
  const { price, isFree } = parsePrice(form);
  const now = new Date().toISOString();
  await patchSellerListing(
    config,
    listingId,
    {
      category,
      item_condition: condition,
      contact_channel: contactPreference,
      publication_instruction_at: now,
      title,
      description,
      province,
      district,
      price_amount: price,
      price_is_free: isFree,
    },
    "seller listing update",
  );
  return jsonResponse({
    ok: true,
    action: "seller_updated",
    listingId,
    message: "İlan güncellendi.",
  });
}

async function sellerUnpublish(form: FormData, clientIp: string): Promise<Response> {
  assertAllowedFields(form, new Set(["action", "phone", "capability", "listingId"]));
  enforceRateLimit(`seller-unpublish:${clientIp}`, 20, 15 * 60 * 1000);
  const { phone } = await assertSellerCapability(form);
  const config = readBackendConfig();
  const listingId = requiredUuid(form);
  const listing = await requireOwnedListing(config, listingId, phone);
  if (listing.status !== "published") {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "Yalnız yayındaki ilan kaldırılabilir.",
      409,
    );
  }
  await patchSellerListing(
    config,
    listingId,
    { status: "unpublished", unpublished_at: new Date().toISOString() },
    "seller listing unpublish",
  );
  return jsonResponse({
    ok: true,
    action: "seller_unpublished",
    listingId,
    message: "İlan yayından kaldırıldı.",
  });
}

async function sellerMarkSold(form: FormData, clientIp: string): Promise<Response> {
  assertAllowedFields(form, new Set(["action", "phone", "capability", "listingId"]));
  enforceRateLimit(`seller-sold:${clientIp}`, 20, 15 * 60 * 1000);
  const { phone } = await assertSellerCapability(form);
  const config = readBackendConfig();
  const listingId = requiredUuid(form);
  const listing = await requireOwnedListing(config, listingId, phone);
  if (listing.status !== "published" && listing.status !== "unpublished") {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      "Bu ilan satıldı olarak işaretlenemez.",
      409,
    );
  }
  const now = new Date().toISOString();
  await patchSellerListing(
    config,
    listingId,
    {
      status: "sold",
      unpublished_at: listing.unpublished_at ?? now,
      sold_at: now,
    },
    "seller listing sold",
  );
  return jsonResponse({
    ok: true,
    action: "seller_sold",
    listingId,
    message: "İlan satıldı olarak işaretlendi.",
  });
}

async function sellerDelete(form: FormData, clientIp: string): Promise<Response> {
  assertAllowedFields(form, new Set(["action", "phone", "capability", "listingId"]));
  enforceRateLimit(`seller-delete:${clientIp}`, 10, 15 * 60 * 1000);
  const { phone } = await assertSellerCapability(form);
  const config = readBackendConfig();
  const listingId = requiredUuid(form);
  const listing = await requireOwnedListing(config, listingId, phone);

  if (listing.status === "published") {
    await patchSellerListing(
      config,
      listingId,
      { status: "unpublished", unpublished_at: new Date().toISOString() },
      "seller pre-delete unpublish",
    );
  }

  const inventory = await fetchSellerPhotoInventory(config, listingId);
  const objectPaths = inventory.map((photo) => photo.object_path);
  await deleteStoredObjects(config, objectPaths);
  await deleteListingRow(config, listingId);

  if ((await fetchSellerRows(config, { listingId })).length !== 0) {
    throw new Error("Seller delete verification found the listing row.");
  }
  if ((await fetchSellerPhotoInventory(config, listingId)).length !== 0) {
    throw new Error("Seller delete verification found private photo metadata.");
  }
  for (const objectPath of objectPaths) {
    const probe = await fetch(
      `${config.baseUrl}/storage/v1/object/listing_photos/${encodeObjectPath(objectPath)}`,
      { headers: serviceHeaders(config, "application/octet-stream") },
    );
    if (probe.ok) throw new Error(`Seller delete verification found Storage object ${objectPath}.`);
  }

  return jsonResponse({
    ok: true,
    action: "seller_deleted",
    listingId,
    message: "İlan silindi.",
  });
}

export async function handleStage1SelfServiceRequest(request: Request): Promise<Response> {
  try {
    if (process.env.PILOT_SELF_SERVICE_ENABLED !== "enabled") {
      throw new Stage1SubmissionError(
        "NOT_ENABLED",
        "İlan gönderimi bu ortamda henüz etkin değil.",
        503,
      );
    }
    assertSameOrigin(request);
    assertRequestSize(request);
    const clientIp = resolveTrustedClientIp(request);
    const form = await request.formData();
    const action = form.get("action");
    if (action === "start_verification") return await startVerification(form, clientIp, request);
    if (action === "verify_phone") return await verifyPhone(form, clientIp);
    if (action === "submit_listing") return await submitListing(form, clientIp);
    if (action === "seller_list") return await sellerList(form, clientIp);
    if (action === "seller_update") return await sellerUpdate(form, clientIp);
    if (action === "seller_unpublish") return await sellerUnpublish(form, clientIp);
    if (action === "seller_sold") return await sellerMarkSold(form, clientIp);
    if (action === "seller_delete") return await sellerDelete(form, clientIp);
    throw new Stage1SubmissionError("INVALID_REQUEST", "Bilinmeyen ilan işlemi.");
  } catch (error) {
    if (error instanceof Stage1SubmissionError) {
      return jsonResponse(
        {
          ok: false,
          code: error.code,
          message: error.message,
          ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
        },
        error.status,
      );
    }
    if (error instanceof Error && error.name === "ZodError") {
      return jsonResponse(
        { ok: false, code: "INVALID_REQUEST", message: "İlan bilgileri eksik veya geçersiz." },
        400,
      );
    }
    console.error("Stage-1 self-service submission failure", error);
    return jsonResponse(
      {
        ok: false,
        code: "SUBMISSION_FAILED",
        message: "İlan güvenli biçimde gönderilemedi. Lütfen tekrar deneyin.",
      },
      500,
    );
  }
}
