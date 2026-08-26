import { isIP } from "node:net";
import { LISTING_PHOTO_MAX_BYTES, validateListingPhoto } from "./listing-photo";
import {
  ingestTrustedListingPhoto,
  type StoredListingPhotoMetadata,
  type TrustedListingPhotoIngestionStore,
} from "./listing-photo-trusted";
import {
  PILOT_DISTRICT,
  PILOT_PROVINCE,
} from "./pilot-operator-contract";
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
type SubmissionClaim = { listing_id: string; state: "claimed" | "complete" | "in_progress" };

const challenges = new Map<string, Challenge>();
const rateBuckets = new Map<string, RateBucket>();

function jsonResponse(payload: Stage1SubmissionResponse, status = 200): Response {
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
    throw new Stage1SubmissionError("INVALID_REQUEST", "Cross-origin ilan gönderimi kabul edilmez.", 403);
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new Stage1SubmissionError("INVALID_REQUEST", "Cross-site ilan gönderimi kabul edilmez.", 403);
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
  if (!Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > MAX_REQUEST_BYTES) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "İlan gönderimi boyut sınırını aşıyor.", 413);
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

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
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

async function deleteStoredObjects(config: BackendConfig, objectPaths: readonly string[]): Promise<void> {
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

function base64UrlDecode(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
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
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature || token.split(".").length !== 2) {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması gerekiyor.", 401);
  }
  const expectedSignature = await signCapabilityPayload(payloadPart, getCapabilitySecret());
  const actualBytes = base64UrlDecode(signature);
  const expectedBytes = base64UrlDecode(expectedSignature);
  if (actualBytes.byteLength !== expectedBytes.byteLength) {
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
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as CapabilityPayload;
  } catch {
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması gerekiyor.", 401);
  }
  if (
    stage1E164Schema.safeParse(payload.e164).success === false ||
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

async function startVerification(form: FormData, clientIp: string, request: Request) {
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

async function verifyPhone(form: FormData, clientIp: string) {
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
    throw new Stage1SubmissionError("VERIFICATION_REQUIRED", "Telefon doğrulaması yeniden gerekiyor.", 401);
  }
  challenge.attempts += 1;
  if (challenge.attempts > 5) {
    challenges.delete(challengeId);
    throw new Stage1SubmissionError("RATE_LIMITED", "Doğrulama deneme sınırı aşıldı.", 429, 600);
  }
  const codeHash = await sha256Hex(`${challengeId}:${code}`);
  if (codeHash !== challenge.codeHash) {
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
  const photos = form.getAll("photo");
  if (photos.length < 1 || photos.length > STAGE1_MAX_PHOTOS) {
    throw new Stage1SubmissionError("INVALID_REQUEST", "1–8 fotoğraf ekleyin.");
  }
  let totalBytes = 0;
  return photos.map((entry) => {
    if (!(entry instanceof File)) {
      throw new Stage1SubmissionError("INVALID_REQUEST", "Fotoğraf dosyası geçersiz.");
    }
    if (validateListingPhoto(entry.type, entry.size) !== null || entry.size > LISTING_PHOTO_MAX_BYTES) {
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

async function completeSubmissionKey(
  config: BackendConfig,
  keyHash: string,
  listingId: string,
): Promise<void> {
  const response = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/rpc/complete_listing_submission_key`, {
      method: "POST",
      headers: serviceHeaders(config),
      body: JSON.stringify({ p_key_hash: keyHash, p_listing_id: listingId }),
    }),
    "self-service idempotency completion",
  );
  const completed = (await response.json()) as boolean;
  if (completed !== true) throw new Error("Submission idempotency completion was not acknowledged.");
}

async function cleanupFailedSubmission(
  config: BackendConfig,
  listingId: string,
  photos: readonly StoredListingPhotoMetadata[],
): Promise<void> {
  const errors: unknown[] = [];
  try {
    await deleteStoredObjects(config, photos.map((photo) => photo.objectPath));
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

async function submitListing(form: FormData, clientIp: string) {
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
  if (province !== PILOT_PROVINCE || district !== PILOT_DISTRICT) {
    throw new Stage1SubmissionError(
      "INVALID_REQUEST",
      `Stage 1 ilanları yalnız ${PILOT_PROVINCE} / ${PILOT_DISTRICT} konumunda kabul edilir.`,
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
  if (!SHA256_HEX_PATTERN.test(keyHash)) throw new Error("Idempotency hash generation failed.");

  const config = readBackendConfig();
  const listingId = crypto.randomUUID();
  const declarationTime = new Date().toISOString();
  const inserted = await requireOk(
    await fetch(`${config.baseUrl}/rest/v1/listings`, {
      method: "POST",
      headers: { ...serviceHeaders(config), Prefer: "return=representation" },
      body: JSON.stringify({
        id: listingId,
        title,
        description,
        price_amount: price,
        price_is_free: isFree,
        category,
        item_condition: condition,
        province,
        district,
        seller_display_name: sellerDisplayName,
        search_keywords: [],
        contact_channel: contactPreference,
        contact_e164: phone,
        contact_verified_at: verified.verifiedAt,
        contact_verification_method: "one_time_code",
        publication_instruction_at: declarationTime,
        private_seller_declaration_at: declarationTime,
        content_rights_declaration_at: declarationTime,
        status: "pending",
      }),
    }),
    "self-service pending listing create",
  );
  const rows = (await inserted.json()) as Array<{ id?: string }>;
  if (rows.length !== 1 || rows[0]?.id !== listingId) {
    throw new Error("Self-service listing create did not return the requested listing identity.");
  }

  const claim = await claimSubmission(config, keyHash, listingId);
  if (claim.state !== "claimed") {
    await deleteListingRow(config, listingId);
    if (claim.state === "complete") {
      return jsonResponse(
        {
          ok: true,
          action: "submitted",
          listingId: claim.listing_id,
          message: "İlanınız incelemeye alındı.",
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
    await completeSubmissionKey(config, keyHash, listingId);
  } catch (cause) {
    try {
      await cleanupFailedSubmission(config, listingId, storedPhotos);
    } catch (cleanupCause) {
      throw new AggregateError([cause, cleanupCause], "Submission failed and cleanup was incomplete.");
    }
    throw cause;
  }

  return jsonResponse(
    {
      ok: true,
      action: "submitted",
      listingId,
      message: "İlanınız incelemeye alındı. Yayınlanmadan önce kontrol edilecek.",
    },
    202,
  );
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
    throw new Stage1SubmissionError("INVALID_REQUEST", "Bilinmeyen ilan gönderim işlemi.");
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
