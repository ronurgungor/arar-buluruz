import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { handleStage1ModerationRequest } from "./stage1-moderation-server";

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const listingId = "98000000-0000-4000-8000-000000000001";

let currentRow: Record<string, unknown>;
let patchCalls = 0;
let photoCalls = 0;

function readyRow(): Record<string, unknown> {
  return {
    id: listingId,
    title: "Moderasyon readiness fixture",
    description: "",
    price_amount: 100,
    price_is_free: false,
    category: "home",
    item_condition: null,
    seller_display_name: "Sentetik Satıcı",
    status: "pending",
    contact_channel: "phone_whatsapp",
    contact_e164: "+12025550188",
    contact_verified_at: "2026-08-28T10:00:00.000Z",
    publication_instruction_at: "2026-08-28T10:01:00.000Z",
    private_seller_declaration_at: null,
    content_rights_declaration_at: null,
    listing_rules_version: "2026-08-28-v1",
    listing_rules_accepted_at: "2026-08-28T10:01:00.000Z",
    created_at: "2026-08-28T09:00:00.000Z",
    published_at: null,
    expires_at: null,
    unpublished_at: null,
  };
}

function requestForPublish(): Request {
  const form = new FormData();
  form.set("action", "publish");
  form.set("listingId", listingId);
  form.set("expiresInDays", "30");
  return new Request("http://127.0.0.1:4173/kurucu", {
    method: "POST",
    body: form,
    headers: {
      Origin: "http://127.0.0.1:4173",
      "Sec-Fetch-Site": "same-origin",
    },
  });
}

beforeAll(() => {
  process.env.PILOT_OPERATOR_ENABLED = "enabled";
  process.env.PILOT_OPERATOR_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-role-key";
  console.error = () => {};

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input : input.url,
    );
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    if (url.pathname === "/rest/v1/listings" && method === "GET") {
      return Response.json([currentRow]);
    }
    if (url.pathname === "/rest/v1/rpc/get_listing_photo_inventory" && method === "POST") {
      photoCalls += 1;
      return Response.json([
        {
          photo_id: "98100000-0000-4000-8000-000000000001",
          object_path: `listings/${listingId}/98100000-0000-4000-8000-000000000001.webp`,
          mime_type: "image/webp",
          byte_size: 72,
          sort_order: 0,
        },
      ]);
    }
    if (url.pathname === "/rest/v1/listings" && method === "PATCH") {
      patchCalls += 1;
      return Response.json([{ id: listingId }]);
    }
    throw new Error(`Unexpected moderation backend request: ${method} ${url.pathname}`);
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
});

describe("founder exceptional publish readiness", () => {
  test("ordinary-goods exceptional publish does not require phone verification", async () => {
    currentRow = { ...readyRow(), contact_verified_at: null };
    patchCalls = 0;
    photoCalls = 0;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, listingId });
    expect(patchCalls).toBe(1);
    expect(photoCalls).toBe(1);
  });

  test("vehicle and real-estate production publication fail closed without EIDS", async () => {
    const priorUrl = process.env.PILOT_OPERATOR_SUPABASE_URL;
    process.env.PILOT_OPERATOR_SUPABASE_URL = "https://synthetic.example";
    try {
      for (const category of ["vehicle", "real-estate"]) {
        currentRow = { ...readyRow(), category, contact_verified_at: null };
        patchCalls = 0;
        photoCalls = 0;
        const response = await handleStage1ModerationRequest(requestForPublish());
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
        expect(patchCalls).toBe(0);
        expect(photoCalls).toBe(0);
      }
    } finally {
      process.env.PILOT_OPERATOR_SUPABASE_URL = priorUrl;
    }
  });

  test("rejects missing publication instruction", async () => {
    currentRow = { ...readyRow(), publication_instruction_at: null };
    patchCalls = 0;
    photoCalls = 0;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("rejects missing versioned listing rules evidence", async () => {
    currentRow = { ...readyRow(), listing_rules_accepted_at: null };
    patchCalls = 0;
    photoCalls = 0;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_STATE" });
    expect(patchCalls).toBe(0);
    expect(photoCalls).toBe(0);
  });

  test("publishes exceptional pending state without fabricating obsolete declarations", async () => {
    currentRow = readyRow();
    patchCalls = 0;
    photoCalls = 0;
    const response = await handleStage1ModerationRequest(requestForPublish());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, listingId });
    expect(patchCalls).toBe(1);
    expect(photoCalls).toBe(1);
  });
});
