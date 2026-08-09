import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  INDEXABLE_ROBOTS,
  PERMANENT_PUBLISHER_PATHS,
  PUBLIC_V0_ROBOTS,
  buildProductionSitemapUrls,
  normalizeCanonicalOrigin,
  renderSitemapXml,
  resolveDiscoveryProfile,
  robotsForDiscoverySurface,
  robotsForRequestPath,
} from "./discovery-contract";

describe("discovery readiness contract", () => {
  test("public V0 stays closed even when real-content is requested", () => {
    expect(
      resolveDiscoveryProfile({
        publicV0Runtime: true,
        configuredProfile: "real-content",
        listingsSource: "supabase",
      }),
    ).toBe("closed");

    expect(robotsForDiscoverySurface("closed", "home")).toBe(PUBLIC_V0_ROBOTS);
    expect(robotsForDiscoverySurface("closed", "listing-detail")).toBe(PUBLIC_V0_ROBOTS);
    expect(robotsForRequestPath("closed", "/")).toBe(PUBLIC_V0_ROBOTS);
    expect(robotsForRequestPath("closed", "/ilan/synthetic-demo")).toBe(PUBLIC_V0_ROBOTS);
  });

  test("real-content discovery requires the real listings source", () => {
    expect(
      resolveDiscoveryProfile({
        publicV0Runtime: false,
        configuredProfile: "real-content",
        listingsSource: "mock",
      }),
    ).toBe("closed");

    expect(
      resolveDiscoveryProfile({
        publicV0Runtime: false,
        configuredProfile: "real-content",
        listingsSource: "supabase",
      }),
    ).toBe("real-content");
  });

  test("only approved future surfaces become indexable", () => {
    expect(robotsForDiscoverySurface("real-content", "home")).toBe(INDEXABLE_ROBOTS);
    expect(robotsForDiscoverySurface("real-content", "publisher-info")).toBe(INDEXABLE_ROBOTS);
    expect(robotsForDiscoverySurface("real-content", "listing-detail")).toBe(INDEXABLE_ROBOTS);
    expect(robotsForDiscoverySurface("real-content", "search")).toBe(PUBLIC_V0_ROBOTS);
    expect(robotsForDiscoverySurface("real-content", "search", { usefulRealSearch: true })).toBe(
      INDEXABLE_ROBOTS,
    );
    expect(robotsForDiscoverySurface("real-content", "utility")).toBe(PUBLIC_V0_ROBOTS);

    expect(robotsForRequestPath("real-content", "/")).toBe(INDEXABLE_ROBOTS);
    expect(robotsForRequestPath("real-content", "/nasil-calisir")).toBe(INDEXABLE_ROBOTS);
    expect(robotsForRequestPath("real-content", "/ilan/real-id")).toBe(INDEXABLE_ROBOTS);
    expect(robotsForRequestPath("real-content", "/ara")).toBe(PUBLIC_V0_ROBOTS);
    expect(robotsForRequestPath("real-content", "/ilan-ver")).toBe(PUBLIC_V0_ROBOTS);
    expect(robotsForRequestPath("real-content", "/sikayet/real-id")).toBe(PUBLIC_V0_ROBOTS);
    expect(robotsForRequestPath("real-content", "/giris")).toBe(PUBLIC_V0_ROBOTS);
    expect(robotsForRequestPath("real-content", "/gizlilik")).toBe(PUBLIC_V0_ROBOTS);
  });

  test("production sitemap URLs are absolute and contain only approved static pages plus supplied real IDs", () => {
    const urls = buildProductionSitemapUrls("https://arar.example/preview", [
      "11111111-1111-4111-8111-111111111111",
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);

    expect(urls).toEqual([
      "https://arar.example/",
      ...PERMANENT_PUBLISHER_PATHS.map((route) => `https://arar.example${route}`),
      "https://arar.example/ilan/11111111-1111-4111-8111-111111111111",
      "https://arar.example/ilan/22222222-2222-4222-8222-222222222222",
    ]);
    expect(urls.some((url) => url.includes("/giris"))).toBe(false);
    expect(urls.some((url) => url.includes("/ilan-ver"))).toBe(false);
    expect(urls.some((url) => url.includes("/sikayet/"))).toBe(false);
  });

  test("canonical origin is HTTPS-only and closed on malformed values", () => {
    expect(normalizeCanonicalOrigin("https://arar.example/path?q=1")).toBe("https://arar.example");
    expect(normalizeCanonicalOrigin("http://arar.example")).toBeNull();
    expect(normalizeCanonicalOrigin("not-a-url")).toBeNull();
  });

  test("closed sitemap can be emitted without advertising mock inventory", () => {
    const xml = renderSitemapXml([]);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
    expect(xml).not.toContain("/ilan/");
  });

  test("runtime source and public assets contain no advertising, analytics or CMP integration markers", () => {
    const runtimeRoots = ["src", "public"];
    const forbidden = [
      "adsbygoogle",
      "pagead2.googlesyndication",
      "googlesyndication.com",
      "google-analytics.com",
      "googletagmanager.com",
      "fundingchoicesmessages.google.com",
      "googlefc",
    ];

    const files: string[] = [];
    const walk = (target: string) => {
      for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        const fullPath = path.join(target, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
        if (!/\.(html|js|ts|tsx|json|webmanifest|txt)$/.test(entry.name)) continue;
        files.push(fullPath);
      }
    };

    runtimeRoots.forEach(walk);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8").toLowerCase();
      for (const marker of forbidden) {
        expect(content.includes(marker), `${file} introduced runtime marker ${marker}`).toBe(false);
      }
    }

    expect(fs.existsSync("public/ads.txt")).toBe(false);
  });
});
