import { describe, expect, test } from "bun:test";
import { renderErrorPage } from "./error-page";
import {
  ALL_CITIES,
  ALL_DISTRICTS,
  clampListingLocation,
  listingMatchesQuery,
  normalizeSearchText,
} from "./listing-search";
import {
  LISTING_RESULTS_HISTORY_STATE,
  hasListingResultsHistory,
} from "./listing-return";
import {
  PublicListingsError,
  fetchPublicListing,
  fetchPublicListings,
  resolveListingsSource,
  type PublicSupabaseConfig,
} from "./public-listings";

const config: PublicSupabaseConfig = {
  url: "https://example.supabase.co",
  publicKey: "sb_publishable_public-test-key",
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

const searchListings = [
  {
    title: "2016 model sedan otomobil, düşük km",
    description: "Boyasız ve bakımlı araç.",
    keywords: ["otomobil", "araba", "vasıta"],
    city: "Ankara",
    district: "Çankaya",
  },
  {
    title: "Su motoru, 1.5 HP",
    description: "Tarla sulaması için güçlü motoru vardır.",
    keywords: ["pompa", "sulama"],
    city: "Bursa",
    district: "İnegöl",
  },
  {
    title: "Sahibinden temiz bahçe traktörü",
    description: "Hazır çalışır tarım makinesi.",
    keywords: ["traktör", "tarım"],
    city: "Konya",
    district: "Çumra",
  },
  {
    title: "2+1 kiralık daire",
    description: "Metroya yakın kiralık konut.",
    keywords: ["kiralık", "emlak"],
    city: "İstanbul",
    district: "Kadıköy",
  },
  {
    title: "Kiralık dükkân, cadde üzeri",
    description: "Vitrinli ticari işyeri.",
    keywords: ["dükkan", "dükkân"],
    city: "Gaziantep",
    district: "Şahinbey",
  },
];

const validCities = [ALL_CITIES, "Ankara", "Bursa", "Gaziantep", "İstanbul", "İzmir", "Konya"];

describe("search normalization and prefix matching", () => {
  test("folds Turkish characters, case and repeated whitespace consistently", () => {
    expect(normalizeSearchText("  ÇORLU   ŞİŞLİ  ")).toBe("corlu sisli");
    expect(normalizeSearchText("ÇORLU")).toBe(normalizeSearchText("corlu"));
  });

  test("matches accentless Turkish queries", () => {
    expect(listingMatchesQuery(searchListings[2], "traktor")).toBe(true);
    expect(listingMatchesQuery(searchListings[3], "kiralik")).toBe(true);
    expect(listingMatchesQuery(searchListings[4], "dukkan")).toBe(true);
  });

  test("matches word prefixes without matching inside another word", () => {
    expect(listingMatchesQuery(searchListings[0], "oto")).toBe(true);
    expect(listingMatchesQuery(searchListings[1], "oto")).toBe(false);
  });

  test("requires every query token but does not require query order", () => {
    expect(listingMatchesQuery(searchListings[0], "dusuk otomobil")).toBe(true);
    expect(listingMatchesQuery(searchListings[0], "otomobil dusuk")).toBe(true);
    expect(listingMatchesQuery(searchListings[0], "otomobil traktör")).toBe(false);
  });

  test("preserves the all-listings behavior for an empty query", () => {
    expect(searchListings.every((listing) => listingMatchesQuery(listing, "   "))).toBe(true);
  });
});

describe("listing location URL clamp", () => {
  test("clamps an invalid city to the nationwide state", () => {
    expect(
      clampListingLocation({
        city: "Atlantis",
        district: "Merkez",
        validCities,
        listings: searchListings,
      }),
    ).toEqual({ city: ALL_CITIES, district: ALL_DISTRICTS });
  });

  test("clamps an invalid district for a valid city", () => {
    expect(
      clampListingLocation({
        city: "Konya",
        district: "Merkez",
        validCities,
        listings: searchListings,
      }),
    ).toEqual({ city: "Konya", district: ALL_DISTRICTS });
  });

  test("clamps a district that belongs to another city", () => {
    expect(
      clampListingLocation({
        city: "Konya",
        district: "Çankaya",
        validCities,
        listings: searchListings,
      }),
    ).toEqual({ city: "Konya", district: ALL_DISTRICTS });
  });

  test("preserves a valid city and district combination", () => {
    expect(
      clampListingLocation({
        city: "Konya",
        district: "Çumra",
        validCities,
        listings: searchListings,
      }),
    ).toEqual({ city: "Konya", district: "Çumra" });
  });
});

describe("listing detail return guard", () => {
  test("recognizes only the explicit in-app results marker", () => {
    expect(hasListingResultsHistory(LISTING_RESULTS_HISTORY_STATE)).toBe(true);
    expect(hasListingResultsHistory({ fromListingResults: false })).toBe(false);
    expect(hasListingResultsHistory({ __TSR_index: 4 })).toBe(false);
    expect(hasListingResultsHistory(null)).toBe(false);
  });
});

describe("static SSR 500 page", () => {
  test("renders a safe Turkish recovery page without technical detail", () => {
    const html = renderErrorPage();

    expect(html).toContain('<html lang="tr">');
    expect(html).toContain("Bu sayfa yüklenemedi");
    expect(html).toContain("Tekrar dene");
    expect(html).toContain("Ana sayfaya dön");
    expect(html).not.toContain("This page didn't load");
    expect(html).not.toContain("Something went wrong");
    expect(html).not.toContain("Error:");
    expect(html).not.toContain("stack");
  });
});

describe("resolveListingsSource", () => {
  test("honors an explicit mock source in development and production", () => {
    expect(resolveListingsSource({ isDevelopment: true })).toBe("mock");
    expect(resolveListingsSource({ isDevelopment: false, configuredSource: "mock" })).toBe("mock");
  });

  test("keeps unconfigured production disabled and requires an explicit Supabase source", () => {
    expect(resolveListingsSource({ isDevelopment: false })).toBe("disabled");
    expect(resolveListingsSource({ isDevelopment: false, configuredSource: "disabled" })).toBe(
      "disabled",
    );
    expect(resolveListingsSource({ isDevelopment: false, configuredSource: "supabase" })).toBe(
      "supabase",
    );
  });
});

describe("public Supabase REST reader", () => {
  test("selects only approved public columns and uses only the apikey header", async () => {
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

    expect(requestedHeaders?.get("apikey")).toBe(config.publicKey);
    expect(requestedHeaders?.has("authorization")).toBe(false);

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
