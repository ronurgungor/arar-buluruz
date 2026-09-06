import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { handleStage1SelfServiceRequest } from "./stage1-self-service-server";

const originalFetch = globalThis.fetch;
const originalEnv = {
  enabled: process.env.PILOT_SELF_SERVICE_ENABLED,
  url: process.env.PILOT_SUBMISSION_SUPABASE_URL,
  key: process.env.PILOT_SUBMISSION_SUPABASE_SERVICE_ROLE_KEY,
  synthetic: process.env.PILOT_SYNTHETIC_TEST_MODE,
};

function baseSubmission(category = "home"): FormData {
  const form = new FormData();
  form.set("action", "submit_listing");
  form.set("category", category);
  form.set("title", "Sentetik ürün sözleşmesi ilanı");
  form.set("priceMode", "priced");
  form.set("price", "1250");
  form.set("description", "");
  form.set("province", "Tekirdağ");
  form.set("district", "Çorlu");
  form.set("sellerDisplayName", "Synthetic Seller");
  form.set("phone", "+905551112233");
  form.set("idempotencyKey", crypto.randomUUID());
  form.append("photo", new File([new Uint8Array([1])], "fixture.png", { type: "image/png" }));
  return form;
}

function requestFor(form: FormData, options?: { cookie?: string; path?: string }): Request {
  return new Request(`http://127.0.0.1:3000${options?.path ?? "/ilan-ver"}`, {
    method: "POST",
    body: form,
    headers: {
      origin: "http://127.0.0.1:3000",
      "content-length": "4096",
      ...(options?.cookie ? { cookie: options.cookie } : {}),
    },
  });
}

beforeAll(() => {
  process.env.PILOT_SELF_SERVICE_ENABLED = "enabled";
  process.env.PILOT_SUBMISSION_SUPABASE_URL = "https://synthetic.example";
  process.env.PILOT_SUBMISSION_SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-role";
  process.env.PILOT_SYNTHETIC_TEST_MODE = "disabled";
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  process.env.PILOT_SELF_SERVICE_ENABLED = originalEnv.enabled;
  process.env.PILOT_SUBMISSION_SUPABASE_URL = originalEnv.url;
  process.env.PILOT_SUBMISSION_SUPABASE_SERVICE_ROLE_KEY = originalEnv.key;
  process.env.PILOT_SYNTHETIC_TEST_MODE = originalEnv.synthetic;
});

describe("Stage-1 product integrity server boundary", () => {
  test("legacy/null product type remains accepted and proceeds to normal session boundary", async () => {
    const response = await handleStage1SelfServiceRequest(requestFor(baseSubmission()));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, code: "SESSION_REQUIRED" });
  });

  test("valid structured product facts are accepted before the normal session boundary", async () => {
    const form = baseSubmission("electronics");
    form.set("productType", "phone");
    form.set("productAttributesVersion", "1");
    form.set(
      "productAttributes",
      JSON.stringify({ brand: "Apple", model: "iPhone 15", storage_gb: 256 }),
    );
    const response = await handleStage1SelfServiceRequest(requestFor(form));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, code: "SESSION_REQUIRED" });
  });

  test("invalid category/product type and arbitrary structured keys fail before backend writes", async () => {
    const mismatched = baseSubmission("fashion");
    mismatched.set("productType", "phone");
    const mismatchResponse = await handleStage1SelfServiceRequest(requestFor(mismatched));
    expect(mismatchResponse.status).toBe(400);
    expect(await mismatchResponse.json()).toMatchObject({ ok: false, code: "INVALID_REQUEST" });

    const arbitrary = baseSubmission("electronics");
    arbitrary.set("productType", "phone");
    arbitrary.set(
      "productAttributes",
      JSON.stringify({ brand: "Apple", seller_defined: "inject" }),
    );
    const arbitraryResponse = await handleStage1SelfServiceRequest(requestFor(arbitrary));
    expect(arbitraryResponse.status).toBe(400);
    expect(await arbitraryResponse.json()).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
  });

  test("seller cannot inject search keywords", async () => {
    for (const field of ["search_keywords", "searchKeywords"]) {
      const form = baseSubmission("electronics");
      form.set(field, "seller controlled keyword");
      const response = await handleStage1SelfServiceRequest(requestFor(form));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
    }
  });

  test("priced plus zero is rejected while Free remains canonical zero", async () => {
    const pricedZero = baseSubmission();
    pricedZero.set("price", "0");
    const pricedResponse = await handleStage1SelfServiceRequest(requestFor(pricedZero));
    expect(pricedResponse.status).toBe(400);
    expect(await pricedResponse.json()).toMatchObject({ ok: false, code: "INVALID_REQUEST" });

    const free = baseSubmission();
    free.set("priceMode", "free");
    free.set("price", "0");
    const freeResponse = await handleStage1SelfServiceRequest(requestFor(free));
    expect(freeResponse.status).toBe(401);
    expect(await freeResponse.json()).toMatchObject({ ok: false, code: "SESSION_REQUIRED" });
  });

  test("ordinary goods remain outside EIDS while Vehicle and Real Estate fail closed", async () => {
    const ordinary = await handleStage1SelfServiceRequest(
      requestFor(baseSubmission("electronics")),
    );
    expect(ordinary.status).toBe(401);
    expect(await ordinary.json()).toMatchObject({ ok: false, code: "SESSION_REQUIRED" });

    for (const category of ["vehicle", "real-estate"]) {
      const response = await handleStage1SelfServiceRequest(requestFor(baseSubmission(category)));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ ok: false, code: "NOT_ENABLED" });
    }
  });

  test("editing an ordinary listing into Vehicle or Real Estate reruns the EIDS gate before PATCH", async () => {
    const sellerId = "91000000-0000-4000-8000-000000000001";
    const listingId = "92000000-0000-4000-8000-000000000001";
    const token = "A".repeat(43);
    let patchCalls = 0;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input : input.url,
      );
      const method = init?.method ?? "GET";
      if (url.pathname === "/rest/v1/rpc/resolve_seller_session" && method === "POST") {
        return Response.json([
          { seller_id: sellerId, expires_at: new Date(Date.now() + 60_000).toISOString() },
        ]);
      }
      if (url.pathname === "/rest/v1/listings" && method === "GET") {
        return Response.json([
          {
            id: listingId,
            title: "Synthetic phone",
            description: "",
            price_amount: 1250,
            price_is_free: false,
            category: "electronics",
            product_type: "phone",
            product_attributes_version: 1,
            product_attributes: { brand: "Apple" },
            item_condition: null,
            province: "Tekirdağ",
            district: "Çorlu",
            seller_display_name: "Synthetic Seller",
            owner_user_id: sellerId,
            status: "published",
            contact_channel: "phone_whatsapp",
            contact_e164: "+905551112233",
            publication_instruction_at: new Date().toISOString(),
            private_seller_declaration_at: null,
            content_rights_declaration_at: null,
            listing_rules_version: "2026-08-28-v1",
            listing_rules_accepted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            unpublished_at: null,
            sold_at: null,
          },
        ]);
      }
      if (url.pathname === "/rest/v1/listings" && method === "PATCH") {
        patchCalls += 1;
        return Response.json([{ id: listingId }]);
      }
      throw new Error(`Unexpected backend request: ${method} ${url.pathname}`);
    }) as typeof fetch;

    try {
      for (const category of ["vehicle", "real-estate"]) {
        const edit = new FormData();
        edit.set("action", "seller_update");
        edit.set("listingId", listingId);
        edit.set("contactPhone", "+905551112233");
        edit.set("category", category);
        edit.set("condition", "good");
        edit.set("priceMode", "priced");
        edit.set("price", "1250");
        edit.set("title", "Synthetic regulated transition");
        edit.set("description", "");
        edit.set("province", "Tekirdağ");
        edit.set("district", "Çorlu");
        if (category === "vehicle") edit.set("productType", "automobile");
        if (category === "real-estate") edit.set("productType", "housing");

        const response = await handleStage1SelfServiceRequest(
          requestFor(edit, { cookie: `arar_seller_session=${token}`, path: "/ilanlarim" }),
        );
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ ok: false, code: "NOT_ENABLED" });
      }
      expect(patchCalls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
