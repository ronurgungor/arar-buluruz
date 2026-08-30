import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import { handleStage1SelfServiceRequest } from "./stage1-self-service-server";

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalDateNow = Date.now;

const listings = new Set<string>();
const listingBodies = new Map<string, Record<string, unknown>>();
const storedObjects = new Set<string>();
const photoMetadata = new Set<string>();
const submissionKeys = new Map<string, { listingId: string; complete: boolean }>();
let failNextClaim = false;
let failNextPhotoMetadataRegistration = false;
let failNextStorageDelete = false;
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
        private_seller_declaration_at: null,
        content_rights_declaration_at: null,
      });
      return json([{ id: body.id }], 201);
    }

    if (url.pathname === "/rest/v1/listings" && method === "GET") {
      const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
      const phone = (url.searchParams.get("contact_e164") ?? "").replace(/^eq\./, "");
      return json(
        Array.from(listingBodies.values()).filter((row) => {
          if (id && row.id !== id) return false;
          if (phone && row.contact_e164 !== phone) return false;
          return true;
        }),
      );
    }

    if (url.pathname === "/rest/v1/listings" && method === "PATCH") {
      const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
      const current = listingBodies.get(id);
      if (!current) return json([]);
      const patch = JSON.parse(String(init?.body)) as Record<string, unknown>;
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
          .filter((path) => path.startsWith(`listings/${body.p_listing_id}/`))
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
        row.contact_channel === "phone_whatsapp" &&
        typeof row.contact_e164 === "string" &&
        typeof row.contact_verified_at === "string" &&
        typeof row.publication_instruction_at === "string" &&
        typeof row.listing_rules_version === "string" &&
        typeof row.listing_rules_accepted_at === "string" &&
        Array.from(photoMetadata).some((path) => path.startsWith(`listings/${body.p_listing_id}/`));
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
      for (const path of body.prefixes) storedObjects.delete(path);
      return json([]);
    }

    throw new Error(`Unexpected backend request: ${method} ${url.pathname}`);
  }) as typeof fetch;
}

function requestFor(
  form: FormData,
  options: {
    origin?: string;
    trustedIp?: string;
    contentLength?: number;
    xff?: string;
    cookie?: string;
  } = {},
): Request {
  const origin = options.origin ?? "http://127.0.0.1:4173";
  const headers = new Headers({
    Origin: origin,
    "Sec-Fetch-Site": "same-origin",
    "Content-Length": String(options.contentLength ?? 4096),
  });
  if (options.trustedIp) headers.set("x-arar-client-ip", options.trustedIp);
  if (options.xff) headers.set("x-forwarded-for", options.xff);
  if (options.cookie) headers.set("cookie", options.cookie);
  return new Request(`${origin}/ilan-ver`, { method: "POST", headers, body: form });
}

async function syntheticSession(phone: string): Promise<string> {
  const start = new FormData();
  start.set("action", "start_verification");
  start.set("phone", phone);
  const started = await handleStage1SelfServiceRequest(requestFor(start));
  expect(started.status).toBe(200);
  const startedPayload = (await started.json()) as {
    ok: boolean;
    challengeId?: string;
  };
  assert(startedPayload.ok && typeof startedPayload.challengeId === "string", "OTP not issued");

  const verify = new FormData();
  verify.set("action", "verify_phone");
  verify.set("phone", phone);
  verify.set("challengeId", startedPayload.challengeId);
  verify.set("code", "424242");
  const verified = await handleStage1SelfServiceRequest(requestFor(verify));
  expect(verified.status).toBe(200);
  const payload = (await verified.json()) as Record<string, unknown>;
  expect(payload).toMatchObject({ ok: true, action: "phone_verified" });
  expect(payload).not.toHaveProperty("capability");
  const setCookie = verified.headers.get("set-cookie") ?? "";
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=Lax");
  expect(setCookie).toContain("Max-Age=604800");
  const cookie = setCookie.split(";")[0] ?? "";
  assert(cookie.startsWith("arar_seller_session="), "seller session cookie missing");
  return cookie;
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

function sellerAction(action: string, phone: string, listingId?: string): FormData {
  const form = new FormData();
  form.set("action", action);
  form.set("phone", phone);
  if (listingId) form.set("listingId", listingId);
  return form;
}

beforeAll(() => {
  process.env.PILOT_SELF_SERVICE_ENABLED = "enabled";
  process.env.PILOT_PHONE_VERIFICATION_MODE = "synthetic";
  process.env.PILOT_SYNTHETIC_VERIFICATION_CODE = "424242";
  process.env.PILOT_SUBMISSION_CAPABILITY_SECRET = "stage1-test-capability-secret-0123456789";
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
  Date.now = originalDateNow;
});

describe("Stage 1 self-service server acceptance", () => {
  test("seller session is HttpOnly, phone-bound, tamper-resistant and expires", async () => {
    const phone = "+12025550181";
    const cookie = await syntheticSession(phone);
    const backendBefore = backendCallCount;

    const wrongPhone = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm("97000000-0000-4000-8000-000000000081", { phone: "+12025550182" }),
        { cookie },
      ),
    );
    expect(wrongPhone.status).toBe(401);

    const [name, value = ""] = cookie.split("=");
    const tamperedCookie = `${name}=${value.slice(0, -1)}${value.endsWith("a") ? "b" : "a"}`;
    const tampered = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000082", { phone }), {
        cookie: tamperedCookie,
      }),
    );
    expect(tampered.status).toBe(401);

    Date.now = () => originalDateNow() + 8 * 24 * 60 * 60 * 1000;
    const expired = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000083", { phone }), { cookie }),
    );
    Date.now = originalDateNow;
    expect(expired.status).toBe(401);
    expect(backendCallCount).toBe(backendBefore);
  });

  test("minimal fields publish atomically and one session supports repeated listings", async () => {
    const phone = "+12025550183";
    const cookie = await syntheticSession(phone);

    const firstKey = "97000000-0000-4000-8000-000000000084";
    const first = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm(firstKey, {
          phone,
          condition: null,
          description: null,
          isFree: true,
        }),
        { cookie },
      ),
    );
    expect(first.status).toBe(201);
    const firstPayload = (await first.json()) as { listingId: string };
    const firstRow = listingBodies.get(firstPayload.listingId);
    expect(firstRow).toMatchObject({
      status: "published",
      description: "",
      item_condition: null,
      price_is_free: true,
      price_amount: 0,
      contact_channel: "phone_whatsapp",
      contact_e164: phone,
      listing_rules_version: "2026-08-28-v1",
      private_seller_declaration_at: null,
      content_rights_declaration_at: null,
    });
    expect(typeof firstRow?.listing_rules_accepted_at).toBe("string");
    expect(firstRow?.publication_instruction_at).toBe(firstRow?.listing_rules_accepted_at);

    const secondKey = "97000000-0000-4000-8000-000000000085";
    const second = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(secondKey, { phone, description: "", condition: "used" }), {
        cookie,
      }),
    );
    expect(second.status).toBe(201);
    expect(listings.size).toBeGreaterThanOrEqual(2);

    const replay = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(secondKey, { phone, description: "", condition: "used" }), {
        cookie,
      }),
    );
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ ok: true, action: "submitted" });
  });

  test("real vehicle publication stays fail closed until EİDS integration is enabled", async () => {
    const phone = "+12025550180";
    const cookie = await syntheticSession(phone);
    const backendBefore = backendCallCount;
    const response = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm("97000000-0000-4000-8000-000000000080", {
          phone,
          category: "vehicle",
        }),
        {
          origin: "https://classifieds.example.test",
          trustedIp: "198.51.100.80",
          cookie,
        },
      ),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, code: "NOT_ENABLED" });
    expect(backendCallCount).toBe(backendBefore);
  });

  test("claim/photo failures compensate and unknown fields fail before privileged work", async () => {
    const phone = "+12025550184";
    const cookie = await syntheticSession(phone);

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
        { cookie },
      ),
    );
    expect(privileged.status).toBe(400);
    expect(backendCallCount).toBe(backendBefore);

    failNextClaim = true;
    const claimFailure = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000087", { phone }), { cookie }),
    );
    expect(claimFailure.status).toBe(500);
    expect(listings.size).toBe(beforeListings);
    expect(photoMetadata.size).toBe(beforePhotos);
    expect(storedObjects.size).toBe(beforeObjects);
    expect(submissionKeys.size).toBe(beforeKeys);

    failNextPhotoMetadataRegistration = true;
    failNextStorageDelete = true;
    const photoFailure = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000088", { phone }), { cookie }),
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
        { cookie },
      ),
    );
    expect(malformed.status).toBe(500);
    expect(listings.size).toBe(beforeListings);
    expect(photoMetadata.size).toBe(beforePhotos);
    expect(storedObjects.size).toBe(beforeObjects);
  });

  test("lost publication response reconciles committed success without destructive compensation", async () => {
    const phone = "+12025550193";
    const cookie = await syntheticSession(phone);
    const listingDeletesBefore = listingDeleteCallCount;
    const storageDeletesBefore = storageDeleteCallCount;

    nextPublicationBehavior = "commit_then_transport_error";
    const response = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000093", { phone }), { cookie }),
    );

    expect(response.status).toBe(201);
    const payload = (await response.json()) as { listingId: string };
    assert(lastPublicationListingId !== null, "publication listing identity was not captured");
    expect(payload.listingId).toBe(lastPublicationListingId);
    expect(listingBodies.get(payload.listingId)?.status).toBe("published");
    expect(
      Array.from(photoMetadata).some((path) => path.startsWith(`listings/${payload.listingId}/`)),
    ).toBe(true);
    expect(
      Array.from(storedObjects).some((path) => path.startsWith(`listings/${payload.listingId}/`)),
    ).toBe(true);
    expect(
      Array.from(submissionKeys.values()).find((state) => state.listingId === payload.listingId)
        ?.complete,
    ).toBe(true);
    expect(listingDeleteCallCount).toBe(listingDeletesBefore);
    expect(storageDeleteCallCount).toBe(storageDeletesBefore);
  });

  test("proven incomplete publication still performs whole-submission cleanup", async () => {
    const phone = "+12025550194";
    const cookie = await syntheticSession(phone);
    const listingDeletesBefore = listingDeleteCallCount;
    const storageDeletesBefore = storageDeleteCallCount;

    nextPublicationBehavior = "transport_error_before_commit";
    const response = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000094", { phone }), { cookie }),
    );

    expect(response.status).toBe(500);
    assert(lastPublicationListingId !== null, "publication listing identity was not captured");
    const listingId = lastPublicationListingId;
    expect(listingBodies.has(listingId)).toBe(false);
    expect(
      Array.from(photoMetadata).some((path) => path.startsWith(`listings/${listingId}/`)),
    ).toBe(false);
    expect(
      Array.from(storedObjects).some((path) => path.startsWith(`listings/${listingId}/`)),
    ).toBe(false);
    expect(Array.from(submissionKeys.values()).some((state) => state.listingId === listingId)).toBe(
      false,
    );
    expect(listingDeleteCallCount).toBe(listingDeletesBefore + 1);
    expect(storageDeleteCallCount).toBe(storageDeletesBefore + 1);
  });

  test("unknown publication outcome skips destructive cleanup when reconciliation fails", async () => {
    const phone = "+12025550195";
    const cookie = await syntheticSession(phone);
    const listingDeletesBefore = listingDeleteCallCount;
    const storageDeletesBefore = storageDeleteCallCount;

    nextPublicationBehavior = "commit_then_transport_error";
    failReconciliationClaimAfterPublicationError = true;
    const response = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000095", { phone }), { cookie }),
    );

    expect(response.status).toBe(500);
    assert(lastPublicationListingId !== null, "publication listing identity was not captured");
    const listingId = lastPublicationListingId;
    expect(listingBodies.get(listingId)?.status).toBe("published");
    expect(
      Array.from(photoMetadata).some((path) => path.startsWith(`listings/${listingId}/`)),
    ).toBe(true);
    expect(
      Array.from(storedObjects).some((path) => path.startsWith(`listings/${listingId}/`)),
    ).toBe(true);
    expect(
      Array.from(submissionKeys.values()).find((state) => state.listingId === listingId)?.complete,
    ).toBe(true);
    expect(listingDeleteCallCount).toBe(listingDeletesBefore);
    expect(storageDeleteCallCount).toBe(storageDeletesBefore);
  });

  test("verified phone owns edit/unpublish/sold/delete while another phone gets generic 403", async () => {
    const ownerPhone = "+12025550185";
    const otherPhone = "+12025550186";
    const ownerCookie = await syntheticSession(ownerPhone);
    const otherCookie = await syntheticSession(otherPhone);

    const created = await handleStage1SelfServiceRequest(
      requestFor(submissionForm("97000000-0000-4000-8000-000000000090", { phone: ownerPhone }), {
        cookie: ownerCookie,
      }),
    );
    expect(created.status).toBe(201);
    const { listingId } = (await created.json()) as { listingId: string };

    const denied = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_unpublish", otherPhone, listingId), {
        cookie: otherCookie,
      }),
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" });

    const edit = sellerAction("seller_update", ownerPhone, listingId);
    edit.set("category", "vehicle");
    edit.set("priceMode", "free");
    edit.set("price", "0");
    edit.set("title", "Mercedes B 150 satılık");
    edit.set("description", "");
    edit.set("province", "İstanbul");
    edit.set("district", "Kadıköy");
    const edited = await handleStage1SelfServiceRequest(requestFor(edit, { cookie: ownerCookie }));
    expect(edited.status).toBe(200);
    expect(listingBodies.get(listingId)).toMatchObject({
      category: "vehicle",
      item_condition: null,
      description: "",
      price_amount: 0,
      price_is_free: true,
      province: "İstanbul",
      district: "Kadıköy",
      status: "published",
    });

    const list = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_list", ownerPhone), { cookie: ownerCookie }),
    );
    expect(list.status).toBe(200);
    const listPayload = (await list.json()) as {
      listings: Array<{ id: string; condition: string | null }>;
    };
    expect(listPayload.listings).toContainEqual(
      expect.objectContaining({ id: listingId, condition: null }),
    );

    const unpublished = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_unpublish", ownerPhone, listingId), { cookie: ownerCookie }),
    );
    expect(unpublished.status).toBe(200);

    const sold = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_sold", ownerPhone, listingId), { cookie: ownerCookie }),
    );
    expect(sold.status).toBe(200);

    const deleted = await handleStage1SelfServiceRequest(
      requestFor(sellerAction("seller_delete", ownerPhone, listingId), { cookie: ownerCookie }),
    );
    expect(deleted.status).toBe(200);
    expect(listingBodies.has(listingId)).toBe(false);
    expect(
      Array.from(storedObjects).some((objectPath) =>
        objectPath.startsWith(`listings/${listingId}/`),
      ),
    ).toBe(false);
  });

  test("rate limits are phone-primary and arbitrary X-Forwarded-For cannot bypass them", async () => {
    process.env.PILOT_PHONE_VERIFICATION_MODE = "disabled";
    const phone = "+12025550187";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const form = new FormData();
      form.set("action", "start_verification");
      form.set("phone", phone);
      const response = await handleStage1SelfServiceRequest(
        requestFor(form, {
          origin: "https://stage1.example.test",
          trustedIp: "198.51.100.40",
          xff: `203.0.113.${attempt + 1}`,
        }),
      );
      expect(response.status).toBe(503);
    }
    const limitedForm = new FormData();
    limitedForm.set("action", "start_verification");
    limitedForm.set("phone", phone);
    const limited = await handleStage1SelfServiceRequest(
      requestFor(limitedForm, {
        origin: "https://stage1.example.test",
        trustedIp: "198.51.100.41",
        xff: "203.0.113.250",
      }),
    );
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ ok: false, code: "RATE_LIMITED" });

    const otherPhone = new FormData();
    otherPhone.set("action", "start_verification");
    otherPhone.set("phone", "+12025550188");
    const other = await handleStage1SelfServiceRequest(
      requestFor(otherPhone, {
        origin: "https://stage1.example.test",
        trustedIp: "198.51.100.41",
      }),
    );
    expect(other.status).toBe(503);
    process.env.PILOT_PHONE_VERIFICATION_MODE = "synthetic";
  });
});
