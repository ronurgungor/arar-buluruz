import { describe, expect, test } from "bun:test";
import {
  PublicListingsError,
  fetchPublicListing,
  fetchPublicListings,
  resolveListingsSource,
  type PublicSupabaseConfig,
} from "./public-listings";

const config: PublicSupabaseConfig = {
  url: "https://example.supabase.co",
  anonKey: "public-anon-test-key",
};

const publicRow = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Visible pilot listing",
  description: "A valid public listing returned through the approved read-only API.",
  price_amount: "1250.00",
  province: "Tekirdag",
  district: "Corlu",
  seller_display_name: "Pilot Seller",
  search_keywords: ["pilot", "visible"],
  created_at: "2026-07-30T10:00:00+00:00",
  published_at: "2026-07-30T11:00:00+00:00",
};

describe("resolveListingsSource", () => {
  test("uses mock data only in development", () => {
    expect(resolveListingsSource({ isDevelopment: true })).toBe("mock");
    expect(resolveListingsSource({ isDevelopment: false, configuredSource: "mock" })).toBe(
      "disabled",
    );
  });

  test("requires an explicit Supabase source", () => {
    expect(resolveListingsSource({ isDevelopment: false, configuredSource: "supabase" })).toBe(
      "supabase",
    );
    expect(resolveListingsSource({ isDevelopment: false })).toBe("disabled");
  });
});

describe("public Supabase REST reader", () => {
  test("selects only approved public columns and maps the response", async () => {
    let requestedUrl: URL | undefined;
    let requestedHeaders: Headers | undefined;

    const fetchMock: typeof fetch = async (input, init) => {
      requestedUrl = new URL(input instanceof Request ? input.url : input.toString());
      requestedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify([publicRow]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const listings = await fetchPublicListings(config, fetchMock);

    expect(requestedUrl?.pathname).toBe("/rest/v1/listings");
    expect(requestedUrl?.searchParams.get("order")).toBe("published_at.desc,id.desc");

    const selectedColumns = requestedUrl?.searchParams.get("select") ?? "";
    expect(selectedColumns).toContain("seller_display_name");
    expect(selectedColumns).not.toContain("status");
    expect(selectedColumns).not.toContain("expires_at");
    expect(selectedColumns).not.toContain("phone");

    expect(requestedHeaders?.get("apikey")).toBe(config.anonKey);
    expect(requestedHeaders?.get("authorization")).toBe(`Bearer ${config.anonKey}`);

    expect(listings).toEqual([
      {
        id: publicRow.id,
        title: publicRow.title,
        price: 1250,
        city: publicRow.province,
        district: publicRow.district,
        seller: publicRow.seller_display_name,
        description: publicRow.description,
        photos: [],
        createdAt: publicRow.published_at,
        distanceKm: null,
        keywords: publicRow.search_keywords,
      },
    ]);
  });

  test("loads one row by validated UUID and treats an empty RLS result as not found", async () => {
    let requestedUrl: URL | undefined;

    const fetchMock: typeof fetch = async (input) => {
      requestedUrl = new URL(input instanceof Request ? input.url : input.toString());
      return new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const listing = await fetchPublicListing(publicRow.id, config, fetchMock);

    expect(listing).toBeNull();
    expect(requestedUrl?.searchParams.get("id")).toBe(`eq.${publicRow.id}`);
    expect(requestedUrl?.searchParams.get("limit")).toBe("1");
  });

  test("rejects malformed public responses", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify([{ ...publicRow, seller_phone: "+905000000000", id: "bad" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    await expect(fetchPublicListings(config, fetchMock)).rejects.toBeInstanceOf(
      PublicListingsError,
    );
  });

  test("rejects insecure non-local Supabase URLs", async () => {
    const insecureConfig = { ...config, url: "http://example.supabase.co" };
    const fetchMock: typeof fetch = async () => new Response("[]", { status: 200 });

    await expect(fetchPublicListings(insecureConfig, fetchMock)).rejects.toBeInstanceOf(
      PublicListingsError,
    );
  });

  test("fails safely on non-success API responses", async () => {
    const fetchMock: typeof fetch = async () => new Response("denied", { status: 403 });

    await expect(fetchPublicListings(config, fetchMock)).rejects.toThrow(
      "Public listings request failed with status 403.",
    );
  });
});
