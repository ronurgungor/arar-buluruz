import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import { handleStage1SelfServiceRequest } from "./stage1-self-service-server";

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalDateNow = Date.now;

const listings = new Set<string>();
const listingBodies = new Map<string, Record<string, unknown>>();
const storedObjects = new Set<string>();
const photoMetadata = new Set<string>();
const submissionKeys = new Map<string, { listingId: string; complete: boolean }>();
let failNextClaim = false;
let failNextPhotoMetadataRegistration = false;
let failNextStorageDelete = false;
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

function makeSyntheticPng(): Uint8Array {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 2, false);
  view.setUint32(4, 2, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines = concatBytes(
    new Uint8Array([0, 0x12, 0x34, 0x56, 0xff, 0x78, 0x9a, 0xbc, 0xff]),
    new Uint8Array([0, 0x33, 0x55, 0x77, 0xff, 0xaa, 0xbb, 0xcc, 0xff]),
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
      });
      return json([{ id: body.id }], 201);
    }

    if (url.pathname === "/rest/v1/listings" && method === "GET") {
      const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
      const phone = (url.searchParams.get("contact_e164") ?? "").replace(/^eq\./, "");
      const rows = Array.from(listingBodies.values()).filter((row) => {
        if (id && row.id !== id) return false;
        if (phone && row.contact_e164 !== phone) return false;
        return true;
      });
      return json(rows);
    }

    if (url.pathname === "/rest/v1/listings" && method === "PATCH") {
      const id = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
      const current = listingBodies.get(id);
      if (!current) return json([]);
      const patch = JSON.parse(String(init?.body)) as Record<string, unknown>;
      listingBodies.set(id, { ...current, ...patch, updated_at: new Date().toISOString() });
      return json([{ id }]);
    }

    if (url.pathname === "/rest/v1/rpc/get_listing_photo_inventory" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as { p_listing_id: string };
      const rows = Array.from(photoMetadata)
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
        }));
      return json(rows);
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
      const body = JSON.parse(String(init?.body)) as {
        p_key_hash: string;
        p_listing_id: string;
      };
      const existing = submissionKeys.get(body.p_key_hash);
      if (!existing) {
        submissionKeys.set(body.p_key_hash, { listingId: body.p_listing_id, complete: false });
        return json([{ listing_id: body.p_listing_id, state: "claimed" }]);
      }
      return json([
        {
          listing_id: existing.listingId,
          state: existing.complete ? "complete" : "in_progress",
        },
      ]);
    }

    if (
      url.pathname === "/rest/v1/rpc/complete_and_publish_listing_submission" &&
      method === "POST"
    ) {
      const body = JSON.parse(String(init?.body)) as {
        p_key_hash: string;
        p_listing_id: string;
      };
      const existing = submissionKeys.get(body.p_key_hash);
      if (
        !existing ||
        existing.listingId !== body.p_listing_id ||
        !Array.from(photoMetadata).some((path) => path.startsWith(`listings/${body.p_listing_id}/`))
      ) {
        return new Response("listing is not publish-ready", { status: 409 });
      }
      existing.complete = true;
      const current = listingBodies.get(body.p_listing_id);
      if (current) {
        listingBodies.set(body.p_listing_id, {
          ...current,
          status: "published",
          published_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          unpublished_at: null,
          sold_at: null,
          updated_at: new Date().toISOString(),
        });
      }
      return json(true);
    }

    if (url.pathname === "/rest/v1/rpc/complete_listing_submission_key" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as {
        p_key_hash: string;
        p_listing_id: string;
      };
      const existing = submissionKeys.get(body.p_key_hash);
      if (!existing || existing.listingId !== body.p_listing_id) return json(false);
      existing.complete = true;
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
      if (failNextStorageDelete) {
        failNextStorageDelete = false;
        return new Response("synthetic storage delete failure", { status: 500 });
      }
      const body = JSON.parse(String(init?.body)) as { prefixes: string[] };
      for (const path of body.prefixes) storedObjects.delete(path);
      return json([]);
    }

    if (url.pathname === "/rest/v1/listings" && method === "DELETE") {
      const filter = url.searchParams.get("id") ?? "";
      const listingId = filter.replace(/^eq\./, "");
      cascadeDeleteListing(listingId);
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected backend request: ${method} ${url.pathname}`);
  }) as typeof fetch;
}

function requestFor(
  form: FormData,
  options: { origin?: string; trustedIp?: string; contentLength?: number; xff?: string } = {},
): Request {
  const origin = options.origin ?? "http://127.0.0.1:4173";
  const headers = new Headers({
    Origin: origin,
    "Sec-Fetch-Site": "same-origin",
    "Content-Length": String(options.contentLength ?? 4096),
  });
  if (options.trustedIp) headers.set("x-arar-client-ip", options.trustedIp);
  if (options.xff) headers.set("x-forwarded-for", options.xff);
  return new Request(`${origin}/ilan-ver`, { method: "POST", headers, body: form });
}

async function syntheticCapability(phone: string): Promise<string> {
  const start = new FormData();
  start.set("action", "start_verification");
  start.set("phone", phone);
  const started = await handleStage1SelfServiceRequest(requestFor(start));
  expect(started.status).toBe(200);
  const startedPayload = (await started.json()) as {
    ok: boolean;
    action?: string;
    challengeId?: string;
  };
  const challengeId = startedPayload.challengeId;
  assert(
    startedPayload.ok && typeof challengeId === "string",
    "verification challenge was not issued",
  );

  const verify = new FormData();
  verify.set("action", "verify_phone");
  verify.set("phone", phone);
  verify.set("challengeId", challengeId);
  verify.set("code", "424242");
  const verified = await handleStage1SelfServiceRequest(requestFor(verify));
  expect(verified.status).toBe(200);
  const verifiedPayload = (await verified.json()) as {
    ok: boolean;
    action?: string;
    capability?: string;
  };
  const capability = verifiedPayload.capability;
  assert(
    verifiedPayload.ok && typeof capability === "string",
    "verification capability was not issued",
  );
  return capability;
}

function submissionForm(
  capability: string,
  idempotencyKey: string,
  options: { phone?: string; photoBytes?: Uint8Array; extraField?: [string, string] } = {},
): FormData {
  const form = new FormData();
  form.set("action", "submit_listing");
  form.set("category", "home");
  form.set("title", "Sentetik self service ilan");
  form.set("condition", "good");
  form.set("priceMode", "priced");
  form.set("price", "1250");
  form.set("description", "Self service submission güvenlik kabul testi açıklaması.");
  form.set("province", "Tekirdağ");
  form.set("district", "Çorlu");
  form.set("sellerDisplayName", "Sentetik Satıcı");
  form.set("phone", options.phone ?? "+12025550188");
  form.set("contactPreference", "phone_whatsapp");
  form.set("privateSellerDeclaration", "confirmed");
  form.set("contentRightsDeclaration", "confirmed");
  form.set("publicationInstructionConfirmed", "confirmed");
  form.set("capability", capability);
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
  installBackendMock();
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
  Date.now = originalDateNow;
});

describe("Stage 1 self-service server acceptance", () => {
  test("claim failure compensates the pending row and retry/double-submit remain idempotent", async () => {
    const phone = "+12025550188";
    const capability = await syntheticCapability(phone);
    const key = "97000000-0000-4000-8000-000000000001";

    failNextClaim = true;
    const failed = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(capability, key)),
    );
    expect(failed.status).toBe(500);
    expect(await failed.json()).toMatchObject({ ok: false, code: "SUBMISSION_FAILED" });
    expect(listings.size).toBe(0);
    expect(photoMetadata.size).toBe(0);
    expect(storedObjects.size).toBe(0);
    expect(submissionKeys.size).toBe(0);

    const retried = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(capability, key)),
    );
    expect(retried.status).toBe(201);
    const retryPayload = (await retried.json()) as { ok: boolean; listingId: string };
    expect(retryPayload.ok).toBe(true);
    expect(listings.has(retryPayload.listingId)).toBe(true);
    expect(photoMetadata.size).toBe(1);
    expect(storedObjects.size).toBe(1);

    const duplicated = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(capability, key)),
    );
    expect(duplicated.status).toBe(200);
    expect(await duplicated.json()).toMatchObject({
      ok: true,
      action: "submitted",
      listingId: retryPayload.listingId,
    });
    expect(listings.size).toBe(1);
    expect(photoMetadata.size).toBe(1);
    expect(storedObjects.size).toBe(1);

    failNextPhotoMetadataRegistration = true;
    failNextStorageDelete = true;
    const orphanRetryKey = "97000000-0000-4000-8000-000000000020";
    const failedPhoto = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(capability, orphanRetryKey), {
        origin: "https://stage1.example.test",
        trustedIp: "198.51.100.70",
      }),
    );

    expect(failedPhoto.status).toBe(500);
    expect(await failedPhoto.json()).toMatchObject({ ok: false, code: "SUBMISSION_FAILED" });
    expect(listings.size).toBe(1);
    expect(listings.has(retryPayload.listingId)).toBe(true);
    expect(photoMetadata.size).toBe(1);
    expect(storedObjects.size).toBe(1);
    expect(submissionKeys.size).toBe(1);
  });

  test("capability is phone-bound, tamper-resistant and expires", async () => {
    const capability = await syntheticCapability("+12025550189");
    const backendBefore = backendCallCount;

    const wrongPhone = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm(capability, "97000000-0000-4000-8000-000000000002", {
          phone: "+12025550190",
        }),
        {
          origin: "https://stage1.example.test",
          trustedIp: "198.51.100.20",
        },
      ),
    );
    expect(wrongPhone.status).toBe(401);
    expect(await wrongPhone.json()).toMatchObject({ ok: false, code: "VERIFICATION_REQUIRED" });

    const tampered = `${capability.slice(0, -1)}${capability.endsWith("a") ? "b" : "a"}`;
    const tamperedResponse = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm(tampered, "97000000-0000-4000-8000-000000000003", { phone: "+12025550189" }),
        {
          origin: "https://stage1.example.test",
          trustedIp: "198.51.100.21",
        },
      ),
    );
    expect(tamperedResponse.status).toBe(401);

    Date.now = () => originalDateNow() + 31 * 60 * 1000;
    const expired = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm(capability, "97000000-0000-4000-8000-000000000004", {
          phone: "+12025550189",
        }),
        {
          origin: "https://stage1.example.test",
          trustedIp: "198.51.100.22",
        },
      ),
    );
    Date.now = originalDateNow;
    expect(expired.status).toBe(401);
    expect(backendCallCount).toBe(backendBefore);
  });

  test("unknown privileged fields, body limits and malformed images fail closed", async () => {
    const capability = await syntheticCapability("+12025550191");
    const backendBefore = backendCallCount;
    const privileged = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm(capability, "97000000-0000-4000-8000-000000000005", {
          phone: "+12025550191",
          extraField: ["status", "published"],
        }),
        { origin: "https://stage1.example.test", trustedIp: "198.51.100.30" },
      ),
    );
    expect(privileged.status).toBe(400);
    expect(await privileged.json()).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
    expect(backendCallCount).toBe(backendBefore);

    const oversized = new FormData();
    oversized.set("action", "start_verification");
    oversized.set("phone", "+12025550191");
    const oversizedResponse = await handleStage1SelfServiceRequest(
      requestFor(oversized, { contentLength: 40 * 1024 * 1024 }),
    );
    expect(oversizedResponse.status).toBe(413);

    const malformedKey = "97000000-0000-4000-8000-000000000006";
    const malformed = await handleStage1SelfServiceRequest(
      requestFor(
        submissionForm(capability, malformedKey, {
          phone: "+12025550191",
          photoBytes: new Uint8Array([1, 2, 3, 4, 5]),
        }),
        { origin: "https://stage1.example.test", trustedIp: "198.51.100.31" },
      ),
    );
    expect(malformed.status).toBe(500);
    expect(await malformed.json()).toMatchObject({ ok: false, code: "SUBMISSION_FAILED" });
    expect(
      Array.from(submissionKeys.values()).some((state) => state.listingId.startsWith("970")),
    ).toBe(false);
  });

  test("verified phone owns edit, unpublish, sold and delete while cross-phone access is denied", async () => {
    const ownerPhone = "+12025550210";
    const otherPhone = "+12025550211";
    const ownerCapability = await syntheticCapability(ownerPhone);
    const otherCapability = await syntheticCapability(otherPhone);
    const idempotencyKey = "97000000-0000-4000-8000-000000000010";

    const created = await handleStage1SelfServiceRequest(
      requestFor(submissionForm(ownerCapability, idempotencyKey, { phone: ownerPhone }), {
        origin: "https://stage1.example.test",
        trustedIp: "198.51.100.60",
      }),
    );
    expect(created.status).toBe(201);
    const createdPayload = (await created.json()) as { ok: boolean; listingId: string };
    expect(createdPayload.ok).toBe(true);
    const listingId = createdPayload.listingId;
    expect(listingBodies.get(listingId)?.status).toBe("published");

    const crossPhone = new FormData();
    crossPhone.set("action", "seller_unpublish");
    crossPhone.set("phone", otherPhone);
    crossPhone.set("capability", otherCapability);
    crossPhone.set("listingId", listingId);
    const denied = await handleStage1SelfServiceRequest(requestFor(crossPhone));
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" });
    expect(listingBodies.get(listingId)?.status).toBe("published");

    const edit = new FormData();
    edit.set("action", "seller_update");
    edit.set("phone", ownerPhone);
    edit.set("capability", ownerCapability);
    edit.set("listingId", listingId);
    edit.set("category", "vehicle");
    edit.set("condition", "used");
    edit.set("priceMode", "free");
    edit.set("price", "700000");
    edit.set("title", "Mercedes B 150 satılık");
    edit.set("description", "Sentetik seller management düzenleme testi açıklaması.");
    edit.set("province", "İstanbul");
    edit.set("district", "Kadıköy");
    edit.set("contactPreference", "phone_whatsapp");
    const edited = await handleStage1SelfServiceRequest(requestFor(edit));
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ ok: true, action: "seller_updated", listingId });
    expect(listingBodies.get(listingId)).toMatchObject({
      category: "vehicle",
      price_amount: 0,
      price_is_free: true,
      province: "İstanbul",
      district: "Kadıköy",
      status: "published",
    });

    const unpublish = new FormData();
    unpublish.set("action", "seller_unpublish");
    unpublish.set("phone", ownerPhone);
    unpublish.set("capability", ownerCapability);
    unpublish.set("listingId", listingId);
    const unpublished = await handleStage1SelfServiceRequest(requestFor(unpublish));
    expect(unpublished.status).toBe(200);
    expect(listingBodies.get(listingId)?.status).toBe("unpublished");

    const sold = new FormData();
    sold.set("action", "seller_sold");
    sold.set("phone", ownerPhone);
    sold.set("capability", ownerCapability);
    sold.set("listingId", listingId);
    const soldResponse = await handleStage1SelfServiceRequest(requestFor(sold));
    expect(soldResponse.status).toBe(200);
    expect(listingBodies.get(listingId)?.status).toBe("sold");

    const list = new FormData();
    list.set("action", "seller_list");
    list.set("phone", ownerPhone);
    list.set("capability", ownerCapability);
    const listed = await handleStage1SelfServiceRequest(requestFor(list));
    expect(listed.status).toBe(200);
    const listedPayload = (await listed.json()) as {
      ok: boolean;
      listings: Array<{ id: string; status: string; isFree: boolean }>;
    };
    expect(listedPayload.listings).toContainEqual(
      expect.objectContaining({ id: listingId, status: "sold", isFree: true }),
    );

    const remove = new FormData();
    remove.set("action", "seller_delete");
    remove.set("phone", ownerPhone);
    remove.set("capability", ownerCapability);
    remove.set("listingId", listingId);
    const deleted = await handleStage1SelfServiceRequest(requestFor(remove));
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toMatchObject({ ok: true, action: "seller_deleted", listingId });
    expect(listings.has(listingId)).toBe(false);
    expect(listingBodies.has(listingId)).toBe(false);
    expect(
      Array.from(photoMetadata).some((path) => path.startsWith(`listings/${listingId}/`)),
    ).toBe(false);
    expect(
      Array.from(storedObjects).some((path) => path.startsWith(`listings/${listingId}/`)),
    ).toBe(false);
  });

  test("trusted client-IP rate limit ignores arbitrary X-Forwarded-For", async () => {
    process.env.PILOT_PHONE_VERIFICATION_MODE = "disabled";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const form = new FormData();
      form.set("action", "start_verification");
      form.set("phone", "+12025550200");
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
    limitedForm.set("phone", "+12025550200");
    const limited = await handleStage1SelfServiceRequest(
      requestFor(limitedForm, {
        origin: "https://stage1.example.test",
        trustedIp: "198.51.100.40",
        xff: "203.0.113.250",
      }),
    );
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ ok: false, code: "RATE_LIMITED" });
    process.env.PILOT_PHONE_VERIFICATION_MODE = "synthetic";
  });
});
