import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import { handleStage1SelfServiceRequest } from "./stage1-self-service-server";
import { createSellerRecoveryCode, sha256Hex } from "./stage1-seller-credentials";

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const listings = new Set<string>();
const listingBodies = new Map<string, Record<string, unknown>>();
const storedObjects = new Set<string>();
const photoMetadata = new Set<string>();
const submissionKeys = new Map<string, { listingId: string; complete: boolean }>();
const sellers = new Map<
  string,
  { recoverySelector: string; recoveryDigest: string; recoveryRotatedAt: string }
>();
const sessions = new Map<
  string,
  { sellerId: string; expiresAt: string; revokedAt: string | null }
>();

let failNextClaim = false;
let failNextPhotoMetadataRegistration = false;
let failNextStorageDelete = false;
let failNextSessionRevoke = false;
type RecoveryBehavior = "normal" | "commit_then_transport_error" | "transport_error_before_commit";
let nextRecoveryBehavior: RecoveryBehavior = "normal";
type PublicationBehavior =
  | "normal"
  | "commit_then_transport_error"
  | "transport_error_before_commit";
let nextPublicationBehavior: PublicationBehavior = "normal";
let failReconciliationClaimAfterPublicationError = false;
let publicationTransportErrorOccurred = false;
let lastPublicationListingId: string | null = null;
let listingDeleteCallCount = 0;
let storageDeleteCallCount = 0;
let backendCallCount = 0;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function uint32BigEndian(value: number): Uint8Array {
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, value >>> 0, false);
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = concatBytes(typeBytes, data);
  return concatBytes(uint32BigEndian(data.byteLength), body, uint32BigEndian(crc32(body)));
}

function makeSyntheticPng(seed = 0x12): Uint8Array {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 2, false);
  view.setUint32(4, 2, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines = concatBytes(
    new Uint8Array([0, seed, 0x34, 0x56, 0xff, 0x78, 0x9a, 0xbc, 0xff]),
    new Uint8Array([0, 0x33, seed, 0x77, 0xff, 0xaa, 0xbb, 0xcc, 0xff]),
  );
  return concatBytes(
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", new Uint8Array(deflateSync(scanlines))),
    pngChunk("IEND", new Uint8Array()),
  );
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}

function cascadeDeleteListing(listingId: string): void {
  listings.delete(listingId);
  listingBodies.delete(listingId);
  for (const [keyHash, state] of submissionKeys) {
    if (state.listingId === listingId) submissionKeys.delete(keyHash);
  }
  for (const path of photoMetadata) {
    if (path.startsWith(`listings/${listingId}/`)) photoMetadata.delete(path);
  }
}

function installBackendMock(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    backendCallCount += 1;
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input : input.url,
    );
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");

    if (url.pathname === "/rest/v1/rpc/create_seller_identity" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as {
        p_seller_id: string;
        p_recovery_selector: string;
        p_recovery_digest: string;
        p_session_digest: string;
        p_session_expires_at: string;
      };
      sellers.set(body.p_seller_id, {
        recoverySelector: body.p_recovery_selector,
        recoveryDigest: body.p_recovery_digest,
        recoveryRotatedAt: new Date().toISOString(),
      });
      sessions.set(body.p_session_digest, {
        sellerId: body.p_seller_id,
        expiresAt: body.p_session_expires_at,
        revokedAt: null,
      });
      return json(body.p_seller_id);
    }

    if (url.pathname === "/rest/v1/rpc/resolve_seller_session" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as { p_session_digest: string };
      const session = sessions.get(body.p_session_digest);
      if (!session || session.revokedAt !== null || Date.parse(session.expiresAt) <= Date.now()) {
        return json([]);
      }
      return json([{ seller_id: session.sellerId, expires_at: session.expiresAt }]);
    }

    if (url.pathname === "/rest/v1/rpc/revoke_seller_session" && method === "POST") {
      if (failNextSessionRevoke) {
        failNextSessionRevoke = false;
        return new Response("synthetic revoke failure", { status: 503 });
      }
      const body = JSON.parse(String(init?.body)) as { p_session_digest: string };
      const session = sessions.get(body.p_session_digest);
      if (!session || session.revokedAt) return json(false);
      session.revokedAt = new Date().toISOString();
      return json(true);
    }

    if (url.pathname === "/rest/v1/rpc/recover_seller_identity" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as {
        p_recovery_selector: string;
        p_recovery_digest: string;
        p_new_recovery_selector: string;
        p_new_recovery_digest: string;
        p_new_session_digest: string;
        p_new_session_expires_at: string;
      };
      if (nextRecoveryBehavior === "transport_error_before_commit") {
        nextRecoveryBehavior = "normal";
        throw new TypeError("synthetic recovery transport failure before commit");
      }
      const match = Array.from(sellers.entries()).find(
        ([, seller]) =>
          seller.recoverySelector === body.p_recovery_selector &&
          seller.recoveryDigest === body.p_recovery_digest,
      );
      if (!match) return json([]);
      const [sellerId, seller] = match;
      seller.recoverySelector = body.p_new_recovery_selector;
      seller.recoveryDigest = body.p_new_recovery_digest;
      seller.recoveryRotatedAt = new Date().toISOString();
      for (const session of sessions.values()) {
        if (session.sellerId === sellerId && !session.revokedAt) {
          session.revokedAt = new Date().toISOString();
        }
      }
      sessions.set(body.p_new_session_digest, {
        sellerId,
        expiresAt: body.p_new_session_expires_at,
        revokedAt: null,
      });
      if (nextRecoveryBehavior === "commit_then_transport_error") {
        nextRecoveryBehavior = "normal";
        throw new TypeError("synthetic recovery transport failure after commit");
      }
      return json([{ seller_id: sellerId, session_expires_at: body.p_new_session_expires_at }]);
    }

    if (url.pathname === "/rest/v1/rpc/reconcile_seller_recovery" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as {
        p_recovery_selector: string;
        p_recovery_digest: string;
        p_new_session_digest: string;
        p_new_session_expires_at: string;
      };
      const match = Array.from(sellers.entries()).find(
        ([, seller]) =>
          seller.recoverySelector === body.p_recovery_selector &&
          seller.recoveryDigest === body.p_recovery_digest,
      );
      if (!match) return json([]);
      const [sellerId] = match;
      for (const session of sessions.values()) {
        if (session.sellerId === sellerId && !session.revokedAt) {
          session.revokedAt = new Date().toISOString();
        }
      }
      sessions.set(body.p_new_session_digest, {
        sellerId,
        expiresAt: body.p_new_session_expires_at,
        revokedAt: null,
      });
      return json([{ seller_id: sellerId, session_expires_at: body.p_new_session_expires_at }]);
    }

    if (url.pathname === "/rest/v1/rpc/delete_seller_identity_if_unowned" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as { p_seller_id: string };
      const hasListing = Array.from(listingBodies.values()).some(
        (row) => row.owner_user_id === body.p_seller_id,
      );
      if (hasListing) return json(false);
      sellers.delete(body.p_seller_id);
      for (const [digest, session] of sessions) {
        if (session.sellerId === body.p_seller_id) sessions.delete(digest);
      }
      return json(true);
    }

    if (url.pathname === "/rest/v1/listings" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown> & { id: string };
      const now = new Date().toISOString();
      listings.add(body.id);
      listingBodies.set(body.id, {
        ...body,
        created_at: now,
        updated_at: now,
        published_at: null,
        expires_at: null,
        unpublished_at: null,
        sold_at: null,
        contact_verified_at: null,
        contact_verification_method: null,
        private_seller_declaration_at: null,
        content_rights_declaration_at: null,
      });
      return json([{ id: body.id }], 201);
    }

    if (url.pathname === "/rest/v1/listings" && method === "GET") {
      const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
      const sellerId = (url.searchParams.get("owner_user_id") ?? "").replace(/^eq\./, "");
      return json(
        Array.from(listingBodies.values()).filter((row) => {
          if (id && row.id !== id) return false;
          if (sellerId && row.owner_user_id !== sellerId) return false;
          return true;
        }),
      );
    }

    if (url.pathname === "/rest/v1/listings" && method === "PATCH") {
      const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
      const current = listingBodies.get(id);
      if (!current) return json([]);
      const patch = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (Object.hasOwn(patch, "owner_user_id") && patch.owner_user_id !== current.owner_user_id) {
        return new Response("listing owner_user_id is immutable", { status: 409 });
      }
      listingBodies.set(id, { ...current, ...patch, updated_at: new Date().toISOString() });
      return json([{ id }]);
    }

    if (url.pathname === "/rest/v1/listings" && method === "DELETE") {
      listingDeleteCallCount += 1;
      const listingId = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
      cascadeDeleteListing(listingId);
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/rest/v1/rpc/get_listing_photo_inventory" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as { p_listing_id: string };
      return json(
        Array.from(photoMetadata)
          .filter((objectPath) => objectPath.startsWith(`listings/${body.p_listing_id}/`))
          .map((object_path, sort_order) => ({
            photo_id:
              object_path
                .split("/")
                .at(-1)
                ?.replace(/\.webp$/, "") ?? crypto.randomUUID(),
            object_path,
            mime_type: "image/webp",
            byte_size: 100,
            sort_order,
          })),
      );
    }

    if (url.pathname.startsWith("/storage/v1/object/sign/listing_photos/") && method === "POST") {
      const objectPath = decodeURIComponent(
        url.pathname.slice("/storage/v1/object/sign/listing_photos/".length),
      );
      return json({ signedURL: `/object/sign/listing_photos/${objectPath}?token=synthetic` });
    }

    if (url.pathname === "/rest/v1/rpc/claim_listing_submission_key" && method === "POST") {
      if (failNextClaim) {
        failNextClaim = false;
        return new Response("synthetic claim failure", { status: 500 });
      }
      if (publicationTransportErrorOccurred && failReconciliationClaimAfterPublicationError) {
        publicationTransportErrorOccurred = false;
        failReconciliationClaimAfterPublicationError = false;
        return new Response("synthetic reconciliation failure", { status: 500 });
      }
      const body = JSON.parse(String(init?.body)) as {
        p_key_hash: string;
        p_listing_id: string;
      };
      const existing = submissionKeys.get(body.p_key_hash);
      if (!existing) {
        submissionKeys.set(body.p_key_hash, { listingId: body.p_listing_id, complete: false });
        return json([{ listing_id: body.p_listing_id, state: "claimed" }]);
      }
      const state =
        existing.listingId === body.p_listing_id && !existing.complete
          ? "claimed"
          : existing.complete
            ? "complete"
            : "in_progress";
      if (publicationTransportErrorOccurred) publicationTransportErrorOccurred = false;
      return json([{ listing_id: existing.listingId, state }]);
    }

    if (
      url.pathname === "/rest/v1/rpc/complete_and_publish_listing_submission" &&
      method === "POST"
    ) {
      const body = JSON.parse(String(init?.body)) as {
        p_key_hash: string;
        p_listing_id: string;
      };
      lastPublicationListingId = body.p_listing_id;
      const behavior = nextPublicationBehavior;
      nextPublicationBehavior = "normal";
      if (behavior === "transport_error_before_commit") {
        publicationTransportErrorOccurred = true;
        throw new TypeError("synthetic transport loss before publication commit");
      }
      const existing = submissionKeys.get(body.p_key_hash);
      const row = listingBodies.get(body.p_listing_id);
      const ready =
        row?.status === "pending" &&
        typeof row.owner_user_id === "string" &&
        row.contact_channel === "phone_whatsapp" &&
        typeof row.contact_e164 === "string" &&
        typeof row.publication_instruction_at === "string" &&
        typeof row.listing_rules_version === "string" &&
        typeof row.listing_rules_accepted_at === "string" &&
        Array.from(photoMetadata).some((objectPath) =>
          objectPath.startsWith(`listings/${body.p_listing_id}/`),
        );
      if (!existing || existing.listingId !== body.p_listing_id || !ready) {
        return new Response("listing is not publish-ready", { status: 409 });
      }
      existing.complete = true;
      listingBodies.set(body.p_listing_id, {
        ...row,
        status: "published",
        published_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        unpublished_at: null,
        sold_at: null,
        updated_at: new Date().toISOString(),
      });
      if (behavior === "commit_then_transport_error") {
        publicationTransportErrorOccurred = true;
        throw new TypeError("synthetic transport loss after publication commit");
      }
      return json(true);
    }

    if (url.pathname === "/rest/v1/rpc/register_sanitized_listing_photo" && method === "POST") {
      if (failNextPhotoMetadataRegistration) {
        failNextPhotoMetadataRegistration = false;
        return new Response("synthetic metadata failure", { status: 500 });
      }
      const body = JSON.parse(String(init?.body)) as { p_object_path: string };
      photoMetadata.add(body.p_object_path);
      return json(true);
    }

    if (url.pathname.startsWith("/storage/v1/object/listing_photos/") && method === "POST") {
      storedObjects.add(
        decodeURIComponent(url.pathname.slice("/storage/v1/object/listing_photos/".length)),
      );
      return new Response(null, { status: 200 });
    }

    if (url.pathname.startsWith("/storage/v1/object/listing_photos/") && method === "GET") {
      const objectPath = decodeURIComponent(
        url.pathname.slice("/storage/v1/object/listing_photos/".length),
      );
      return new Response(storedObjects.has(objectPath) ? "synthetic" : null, {
        status: storedObjects.has(objectPath) ? 200 : 404,
      });
    }

    if (url.pathname === "/storage/v1/object/listing_photos" && method === "DELETE") {
      storageDeleteCallCount += 1;
      if (failNextStorageDelete) {
        failNextStorageDelete = false;
        return new Response("synthetic storage delete failure", { status: 500 });
      }
      const body = JSON.parse(String(init?.body)) as { prefixes: string[] };
      for (const objectPath of body.prefixes) storedObjects.delete(objectPath);
      return json([]);
    }

    throw new Error(`Unexpected backend request: ${method} ${url.pathname}`);
  }) as typeof fetch;
}

function requestFor(
  form: FormData,
  options: {
    origin?: string;
    originHeader?: string;
    fetchSite?: string;
    trustedIp?: string;
    contentLength?: number;
    xff?: string;
    cookie?: string;
  } = {},
): Request {
  const origin = options.origin ?? "http://127.0.0.1:4173";
  const headers = new Headers({
    Origin: options.originHeader ?? origin,
    "Sec-Fetch-Site": options.fetchSite ?? "same-origin",
    "Content-Length": String(options.contentLength ?? 4096),
  });
  if (options.trustedIp) headers.set("x-arar-client-ip", options.trustedIp);
  if (options.xff) headers.set("x-forwarded-for", options.xff);
  if (options.cookie) headers.set("cookie", options.cookie);
  return new Request(`${origin}/ilan-ver`, { method: "POST", headers, body: form });
}

function cookieFromResponse(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=Lax");
  expect(setCookie).toContain("Secure");
  expect(setCookie).toContain("Max-Age=604800");
  const cookie = setCookie.split(";")[0] ?? "";
  assert(cookie.startsWith("arar_seller_session="), "seller session cookie missing");
  return cookie;
}

async function bootstrapSeller(): Promise<{
  cookie: string;
  recoveryCode: string;
  sellerId: string;
}> {
  const before = new Set(sellers.keys());
  const form = new FormData();
  form.set("action", "seller_bootstrap");
  const response = await handleStage1SelfServiceRequest(requestFor(form));
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { recoveryCode?: string };
  assert(typeof payload.recoveryCode === "string", "recovery code missing");
  const sellerId = Array.from(sellers.keys()).find((id) => !before.has(id));
  assert(sellerId, "seller identity was not created");
  const cookie = cookieFromResponse(response);
  const rawToken = cookie.split("=")[1] ?? "";
  expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(sessions.has(rawToken)).toBe(false);
  expect(sessions.has(await sha256Hex(rawToken))).toBe(true);
  return { cookie, recoveryCode: payload.recoveryCode, sellerId };
}

function recoveryForm(recoveryCode: string, replacementRecoveryCode: string): FormData {
  const form = new FormData();
  form.set("action", "seller_recover");
  form.set("recoveryCode", recoveryCode);
  form.set("replacementRecoveryCode", replacementRecoveryCode);
  return form;
}

function reconciliationForm(recoveryCode: string): FormData {
  const form = new FormData();
  form.set("action", "seller_reconcile_recovery");
  form.set("recoveryCode", recoveryCode);
  return form;
}

async function recoverSeller(
  recoveryCode: string,
  replacementRecoveryCode = createSellerRecoveryCode(),
): Promise<{ cookie: string; recoveryCode: string }> {
  const response = await handleStage1SelfServiceRequest(
    requestFor(recoveryForm(recoveryCode, replacementRecoveryCode)),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, action: "seller_recovered" });
  return { cookie: cookieFromResponse(response), recoveryCode: replacementRecoveryCode };
}

function submissionForm(
  idempotencyKey: string,
  options: {
    phone?: string;
    photoBytes?: Uint8Array;
    extraField?: [string, string];
    condition?: string | null;
    description?: string | null;
    category?: string;
    isFree?: boolean;
  } = {},
): FormData {
  const form = new FormData();
  form.set("action", "submit_listing");
  form.set("category", options.category ?? "home");
  form.set("title", "Sentetik self service ilan");
  if (options.condition !== null) form.set("condition", options.condition ?? "good");
  form.set("priceMode", options.isFree ? "free" : "priced");
  form.set("price", options.isFree ? "0" : "1250");
  if (options.description !== null) {
    form.set(
      "description",
      options.description ?? "Self service submission güvenlik kabul testi açıklaması.",
    );
  }
  form.set("province", "Tekirdağ");
  form.set("district", "Çorlu");
  form.set("sellerDisplayName", "Sentetik Satıcı");
  form.set("phone", options.phone ?? "+12025550188");
  form.set("idempotencyKey", idempotencyKey);
  form.append(
    "photo",
    new File([new Uint8Array(options.photoBytes ?? makeSyntheticPng()).buffer], "synthetic.png", {
      type: "image/png",
    }),
  );
  if (options.extraField) form.set(options.extraField[0], options.extraField[1]);
  return form;
}

function sellerAction(action: string, listingId?: string): FormData {
  const form = new FormData();
  form.set("action", action);
  if (listingId) form.set("listingId", listingId);
  return form;
}

beforeAll(() => {
  process.env.PILOT_SELF_SERVICE_ENABLED = "enabled";
  process.env.PILOT_SYNTHETIC_TEST_MODE = "enabled";
  process.env.PILOT_SUBMISSION_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.PILOT_SUBMISSION_SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-role-key";
  process.env.PILOT_TRUSTED_PROXY_ENABLED = "enabled";
  process.env.PILOT_TRUSTED_CLIENT_IP_HEADER = "x-arar-client-ip";
  console.error = () => {};
  console.warn = () => {};
  installBackendMock();
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe("Stage 1 SMS-less seller ownership server acceptance", () => {
  test("opaque HttpOnly session is server-side, malformed tokens fail and logout revokes", async () => {
    const seller = await bootstrapSeller();

    const list = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: seller.cookie }),
    );
    expect(list.status).toBe(200);

    const [name, value = ""] = seller.cookie.split("=");
    const tamperedCookie = `${name}=${value.slice(0, -1)}${value.endsWith("a") ? "b" : "a"}`;
    const tampered = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: tamperedCookie }),
    );
    expect(tampered.status).toBe(401);
    expect(await tampered.json()).toMatchObject({ ok: false, code: "SESSION_REQUIRED" });

    const logout = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_logout"), { cookie: seller.cookie }),
    );
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");

    const revoked = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: seller.cookie }),
    );
    expect(revoked.status).toBe(401);
  });

  test("logout clears the browser cookie even when server-side revoke cannot be confirmed", async () => {
    const seller = await bootstrapSeller();
    failNextSessionRevoke = true;
    const logout = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_logout"), { cookie: seller.cookie }),
    );
    expect(logout.status).toBe(503);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await logout.json()).toMatchObject({ ok: false, code: "LOGOUT_PARTIAL" });

    const rawToken = seller.cookie.split("=")[1] ?? "";
    expect(sessions.get(await sha256Hex(rawToken))?.revokedAt).toBeNull();
  });

  test("cookie loss recovers, rotates one-time code, rejects replay and revokes the old session", async () => {
    const seller = await bootstrapSeller();
    const recovered = await recoverSeller(seller.recoveryCode);
    expect(recovered.recoveryCode).not.toBe(seller.recoveryCode);

    const oldSession = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: seller.cookie }),
    );
    expect(oldSession.status).toBe(401);

    const replayResponse = await handleStage1SelfServiceRequest(
      requestFor(
        recoveryForm(seller.recoveryCode, createSellerRecoveryCode()),
      ),
    );
    expect(replayResponse.status).toBe(401);
    expect(await replayResponse.json()).toMatchObject({ ok: false, code: "RECOVERY_FAILED" });

    const restored = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: recovered.cookie }),
    );
    expect(restored.status).toBe(200);
  });

  test("committed recovery survives response loss through the pre-generated candidate", async () => {
    const seller = await bootstrapSeller();
    const candidate = createSellerRecoveryCode();
    nextRecoveryBehavior = "commit_then_transport_error";

    const ambiguous = await handleStage1SelfServiceRequest(
      requestFor(recoveryForm(seller.recoveryCode, candidate)),
    );
    expect(ambiguous.status).toBe(500);

    const oldSession = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: seller.cookie }),
    );
    expect(oldSession.status).toBe(401);

    const oldReplay = await handleStage1SelfServiceRequest(
      requestFor(recoveryForm(seller.recoveryCode, createSellerRecoveryCode())),
    );
    expect(oldReplay.status).toBe(401);
    expect(await oldReplay.json()).toMatchObject({ ok: false, code: "RECOVERY_FAILED" });

    const reconciled = await handleStage1SelfServiceRequest(
      requestFor(reconciliationForm(candidate)),
    );
    expect(reconciled.status).toBe(200);
    expect(await reconciled.json()).toMatchObject({
      ok: true,
      action: "seller_recovery_reconciled",
    });
    const reconciledCookie = cookieFromResponse(reconciled);
    const restored = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: reconciledCookie }),
    );
    expect(restored.status).toBe(200);
    expect(
      Array.from(sessions.values()).filter(
        (session) => session.sellerId === seller.sellerId && session.revokedAt === null,
      ),
    ).toHaveLength(1);
  });

  test("uncommitted recovery leaves the old credential usable", async () => {
    const seller = await bootstrapSeller();
    const candidate = createSellerRecoveryCode();
    nextRecoveryBehavior = "transport_error_before_commit";

    const ambiguous = await handleStage1SelfServiceRequest(
      requestFor(recoveryForm(seller.recoveryCode, candidate)),
    );
    expect(ambiguous.status).toBe(500);

    const reconciliation = await handleStage1SelfServiceRequest(
      requestFor(reconciliationForm(candidate)),
    );
    expect(reconciliation.status).toBe(409);
    expect(await reconciliation.json()).toMatchObject({
      ok: false,
      code: "RECOVERY_NOT_COMMITTED",
    });

    const recovered = await recoverSeller(seller.recoveryCode);
    const restored = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: recovered.cookie }),
    );
    expect(restored.status).toBe(200);
  });

  test("concurrent or replayed recovery creates only one successful active replacement session", async () => {
    const seller = await bootstrapSeller();
    const candidate = createSellerRecoveryCode();
    const [first, second] = await Promise.all([
      handleStage1SelfServiceRequest(requestFor(recoveryForm(seller.recoveryCode, candidate))),
      handleStage1SelfServiceRequest(requestFor(recoveryForm(seller.recoveryCode, candidate))),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 401]);
    expect(
      Array.from(sessions.values()).filter(
        (session) => session.sellerId === seller.sellerId && session.revokedAt === null,
      ),
    ).toHaveLength(1);
    expect(sellers.has(seller.sellerId)).toBe(true);
  });

  test("minimal fields publish atomically without phone verification and one session supports repeated listings", async () => {
    const seller = await bootstrapSeller();
    const phone = "+12025550183";

    const firstKey = "97000000-0000-4000-8000-000000000084";
    const first = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm(firstKey, {
          phone,
          condition: null,
          description: null,
          isFree: true,
        }),
        { cookie: seller.cookie },
      ),
    );
    expect(first.status).toBe(201);
    const firstPayload = (await first.json()) as { listingId: string };
    const firstRow = listingBodies.get(firstPayload.listingId);
    expect(firstRow).toMatchObject({
      owner_user_id: seller.sellerId,
      status: "published",
      description: "",
      item_condition: null,
      price_is_free: true,
      price_amount: 0,
      contact_channel: "phone_whatsapp",
      contact_e164: phone,
      contact_verified_at: null,
      contact_verification_method: null,
      listing_rules_version: "2026-08-28-v1",
      private_seller_declaration_at: null,
      content_rights_declaration_at: null,
    });
    expect(typeof firstRow?.listing_rules_accepted_at).toBe("string");
    expect(firstRow?.publication_instruction_at).toBe(firstRow?.listing_rules_accepted_at);

    const secondKey = "97000000-0000-4000-8000-000000000085";
    const second = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(secondKey, { phone, description: "", condition: "used" }), {
        cookie: seller.cookie,
      }),
    );
    expect(second.status).toBe(201);

    const replay = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(secondKey, { phone, description: "", condition: "used" }), {
        cookie: seller.cookie,
      }),
    );
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ ok: true, action: "submitted" });
  });

  test("vehicle and real-estate publication stay fail closed until production EIDS integration", async () => {
    const seller = await bootstrapSeller();

    const priorMode = process.env.PILOT_SYNTHETIC_TEST_MODE;
    process.env.PILOT_SYNTHETIC_TEST_MODE = "disabled";
    try {
      for (const category of ["vehicle", "real-estate"]) {
        const backendBefore = backendCallCount;
        const response = await handleStage1SelfServiceRequest(
          requestFor(submissionForm(crypto.randomUUID(), { category }), {
            cookie: seller.cookie,
          }),
        );
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ ok: false, code: "NOT_ENABLED" });
        expect(backendCallCount).toBe(backendBefore);
      }
    } finally {
      process.env.PILOT_SYNTHETIC_TEST_MODE = priorMode;
    }

    for (const category of ["vehicle", "real-estate"]) {
      const backendBefore = backendCallCount;
      const response = await handleStage1SelfServiceRequest(
        requestFor(submissionForm(crypto.randomUUID(), { category }), {
          origin: "https://classifieds.example.test",
          trustedIp: "198.51.100.80",
          cookie: seller.cookie,
        }),
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ ok: false, code: "NOT_ENABLED" });
      expect(backendCallCount).toBe(backendBefore);
    }

    const priorUrl = process.env.PILOT_SUBMISSION_SUPABASE_URL;
    process.env.PILOT_SUBMISSION_SUPABASE_URL = "https://synthetic.example";
    try {
      for (const category of ["vehicle", "real-estate"]) {
        const backendBefore = backendCallCount;
        const response = await handleStage1SelfServiceRequest(
          requestFor(submissionForm(crypto.randomUUID(), { category }), {
            cookie: seller.cookie,
          }),
        );
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ ok: false, code: "NOT_ENABLED" });
        expect(backendCallCount).toBe(backendBefore);
      }
    } finally {
      process.env.PILOT_SUBMISSION_SUPABASE_URL = priorUrl;
    }
  });

  test("claim/photo failures compensate and unknown fields fail before privileged listing work", async () => {
    const seller = await bootstrapSeller();
    const phone = "+12025550184";
    const beforeListings = listings.size;
    const beforePhotos = photoMetadata.size;
    const beforeObjects = storedObjects.size;
    const beforeKeys = submissionKeys.size;

    const backendBefore = backendCallCount;
    const privileged = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm("97000000-0000-4000-8000-000000000086", {
          phone,
          extraField: ["status", "published"],
        }),
        { cookie: seller.cookie },
      ),
    );
    expect(privileged.status).toBe(400);
    expect(backendCallCount).toBe(backendBefore);

    failNextClaim = true;
    const claimFailure = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000087", { phone }), {
        cookie: seller.cookie,
      }),
    );
    expect(claimFailure.status).toBe(500);
    expect(listings.size).toBe(beforeListings);
    expect(photoMetadata.size).toBe(beforePhotos);
    expect(storedObjects.size).toBe(beforeObjects);
    expect(submissionKeys.size).toBe(beforeKeys);

    failNextPhotoMetadataRegistration = true;
    failNextStorageDelete = true;
    const photoFailure = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000088", { phone }), {
        cookie: seller.cookie,
      }),
    );
    expect(photoFailure.status).toBe(500);
    expect(listings.size).toBe(beforeListings);
    expect(photoMetadata.size).toBe(beforePhotos);
    expect(storedObjects.size).toBe(beforeObjects);
    expect(submissionKeys.size).toBe(beforeKeys);

    const malformed = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm("97000000-0000-4000-8000-000000000089", {
          phone,
          photoBytes: new Uint8Array([1, 2, 3, 4, 5]),
        }),
        { cookie: seller.cookie },
      ),
    );
    expect(malformed.status).toBe(500);
    expect(listings.size).toBe(beforeListings);
  });

  test("lost publication response reconciles committed success without destructive compensation", async () => {
    const seller = await bootstrapSeller();
    const listingDeletesBefore = listingDeleteCallCount;
    const storageDeletesBefore = storageDeleteCallCount;

    nextPublicationBehavior = "commit_then_transport_error";
    const response = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000093"), {
        cookie: seller.cookie,
      }),
    );

    expect(response.status).toBe(201);
    const payload = (await response.json()) as { listingId: string };
    assert(lastPublicationListingId !== null, "publication listing identity was not captured");
    expect(payload.listingId).toBe(lastPublicationListingId);
    expect(listingBodies.get(payload.listingId)?.status).toBe("published");
    expect(
      Array.from(submissionKeys.values()).find((state) => state.listingId === payload.listingId)
        ?.complete,
    ).toBe(true);
    expect(listingDeleteCallCount).toBe(listingDeletesBefore);
    expect(storageDeleteCallCount).toBe(storageDeletesBefore);
  });

  test("proven incomplete publication cleans up while unknown outcome skips destructive cleanup", async () => {
    const seller = await bootstrapSeller();
    const listingDeletesBefore = listingDeleteCallCount;
    const storageDeletesBefore = storageDeleteCallCount;

    nextPublicationBehavior = "transport_error_before_commit";
    const incomplete = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000094"), {
        cookie: seller.cookie,
      }),
    );
    expect(incomplete.status).toBe(500);
    assert(lastPublicationListingId !== null, "publication listing identity was not captured");
    const incompleteId = lastPublicationListingId;
    expect(listingBodies.has(incompleteId)).toBe(false);
    expect(listingDeleteCallCount).toBe(listingDeletesBefore + 1);
    expect(storageDeleteCallCount).toBe(storageDeletesBefore + 1);

    nextPublicationBehavior = "commit_then_transport_error";
    failReconciliationClaimAfterPublicationError = true;
    const unknown = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000095"), {
        cookie: seller.cookie,
      }),
    );
    expect(unknown.status).toBe(500);
    const unknownId = lastPublicationListingId;
    assert(unknownId !== null, "unknown publication id missing");
    expect(listingBodies.get(unknownId)?.status).toBe("published");
  });

  test("seller_id owns list/edit/unpublish/sold/delete and phone changes never transfer ownership", async () => {
    const owner = await bootstrapSeller();
    const other = await bootstrapSeller();
    const ownerPhone = "+12025550185";
    const transferredPhone = "+12025550186";

    const created = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000090", { phone: ownerPhone }), {
        cookie: owner.cookie,
      }),
    );
    expect(created.status).toBe(201);
    const { listingId } = (await created.json()) as { listingId: string };

    const deniedList = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: other.cookie }),
    );
    expect(deniedList.status).toBe(200);
    const deniedListPayload = (await deniedList.json()) as { listings: Array<{ id: string }> };
    expect(deniedListPayload.listings.some((listing) => listing.id === listingId)).toBe(false);

    const denied = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_unpublish", listingId), { cookie: other.cookie }),
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" });

    const edit = sellerAction("seller_update", listingId);
    edit.set("category", "home");
    edit.set("priceMode", "free");
    edit.set("price", "0");
    edit.set("title", "Mercedes B 150 satılık");
    edit.set("description", "");
    edit.set("province", "İstanbul");
    edit.set("district", "Kadıköy");
    edit.set("contactPhone", transferredPhone);
    const edited = await handleStage1SelfServiceRequest(requestFor(edit, { cookie: owner.cookie }));
    expect(edited.status).toBe(200);
    expect(listingBodies.get(listingId)).toMatchObject({
      owner_user_id: owner.sellerId,
      contact_e164: transferredPhone,
      status: "published",
    });

    const stillDenied = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_unpublish", listingId), { cookie: other.cookie }),
    );
    expect(stillDenied.status).toBe(403);

    const list = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), { cookie: owner.cookie }),
    );
    expect(list.status).toBe(200);
    const listPayload = (await list.json()) as {
      listings: Array<{ id: string; contactPhone: string }>;
    };
    expect(listPayload.listings).toContainEqual(
      expect.objectContaining({ id: listingId, contactPhone: transferredPhone }),
    );

    expect(
      (
        await handleStage1SelfServiceRequest(
          requestFor(sellerAction("seller_unpublish", listingId), { cookie: owner.cookie }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handleStage1SelfServiceRequest(
          requestFor(sellerAction("seller_sold", listingId), { cookie: owner.cookie }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handleStage1SelfServiceRequest(
          requestFor(sellerAction("seller_delete", listingId), { cookie: owner.cookie }),
        )
      ).status,
    ).toBe(200);
    expect(listingBodies.has(listingId)).toBe(false);
    expect(
      Array.from(storedObjects).some((objectPath) =>
        objectPath.startsWith(`listings/${listingId}/`),
      ),
    ).toBe(false);
  });

  test("cross-origin requests fail before backend work and retired OTP actions are not shipping routes", async () => {
    const seller = await bootstrapSeller();
    const backendBefore = backendCallCount;
    const crossOrigin = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list"), {
        cookie: seller.cookie,
        originHeader: "https://evil.example",
        fetchSite: "cross-site",
      }),
    );
    expect(crossOrigin.status).toBe(403);
    expect(backendCallCount).toBe(backendBefore);

    const otp = new FormData();
    otp.set("action", "start_verification");
    otp.set("phone", "+12025550187");
    const retired = await handleStage1SelfServiceRequest(requestFor(otp));
    expect(retired.status).toBe(400);
  });

  test("trusted-IP rate limit cannot be bypassed with arbitrary X-Forwarded-For", async () => {
    const origin = "https://stage1.example.test";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const form = new FormData();
      form.set("action", "seller_bootstrap");
      const response = await handleStage1SelfServiceRequest(
        requestFor(form, {
          origin,
          trustedIp: "198.51.100.40",
          xff: `203.0.113.${attempt + 1}`,
        }),
      );
      expect(response.status).toBe(201);
    }
    const limitedForm = new FormData();
    limitedForm.set("action", "seller_bootstrap");
    const limited = await handleStage1SelfServiceRequest(
      requestFor(limitedForm, {
        origin,
        trustedIp: "198.51.100.40",
        xff: "203.0.113.250",
      }),
    );
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ ok: false, code: "RATE_LIMITED" });

    const otherIp = new FormData();
    otherIp.set("action", "seller_bootstrap");
    const other = await handleStage1SelfServiceRequest(
      requestFor(otherIp, { origin, trustedIp: "198.51.100.41" }),
    );
    expect(other.status).toBe(201);
  });
});
