import { describe, expect, test } from "bun:test";
import { listingMatchesQuery, normalizeSearchText } from "./listing-search";

const listing = (title: string) => ({
  title,
  description: "Temiz kullanılmış ürün.",
  keywords: [] as string[],
});

describe("listing search compact model normalization", () => {
  test("normalizes letter-number and number-letter boundaries deterministically", () => {
    expect(normalizeSearchText("Mercedes B150")).toBe("mercedes b 150");
    expect(normalizeSearchText("iPhone15")).toBe("iphone 15");
    expect(normalizeSearchText("BMW 320d")).toBe("bmw 320 d");
    expect(normalizeSearchText("S23 Ultra")).toBe("s 23 ultra");
  });

  test("matches compact and spaced model variants both directions", () => {
    expect(listingMatchesQuery(listing("Mercedes B 150"), "mercedes b150")).toBe(true);
    expect(listingMatchesQuery(listing("Mercedes B150"), "mercedes b 150")).toBe(true);
    expect(listingMatchesQuery(listing("iPhone 15 Pro"), "iphone15")).toBe(true);
    expect(listingMatchesQuery(listing("BMW 320 d"), "320d")).toBe(true);
    expect(listingMatchesQuery(listing("Samsung S23 Ultra"), "s 23 ultra")).toBe(true);
  });

  test("preserves Turkish folding, prefixes and rejects unrelated compact tokens", () => {
    expect(listingMatchesQuery(listing("Çizgisiz çalışma masası"), "calisma mas")).toBe(true);
    expect(listingMatchesQuery(listing("Mercedes B 150"), "b250")).toBe(false);
  });
});
