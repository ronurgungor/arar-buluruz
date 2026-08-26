import { describe, expect, test } from "bun:test";
import { CLOSED_ROBOTS, createPilotSitemapXml, robotsContent } from "./public-discovery";

describe("pilot public discovery contract", () => {
  test("synthetic/preview builds stay closed even for potentially public pages", () => {
    expect(robotsContent(true, false)).toBe(CLOSED_ROBOTS);
    expect(robotsContent(false, false)).toBe(CLOSED_ROBOTS);
  });

  test("explicit public validation indexes only pages selected by the route", () => {
    expect(robotsContent(true, true)).toBeNull();
    expect(robotsContent(false, true)).toBe(CLOSED_ROBOTS);
  });

  test("sitemap contains only home and supplied published-listing paths", () => {
    const xml = createPilotSitemapXml("https://arar.example", [
      {
        id: "93000000-0000-4000-8000-000000000001",
        createdAt: "2026-08-26T07:00:00.000Z",
      },
      {
        id: "93000000-0000-4000-8000-000000000002",
        createdAt: "2026-08-26T08:00:00.000Z",
      },
    ]);

    expect(xml).toContain("<loc>https://arar.example/</loc>");
    expect(xml).toContain(
      "<loc>https://arar.example/ilan/93000000-0000-4000-8000-000000000001</loc>",
    );
    expect(xml).toContain("<lastmod>2026-08-26T07:00:00.000Z</lastmod>");
    expect(xml).not.toContain("/ara?");
    expect(xml).not.toContain("/ilan-ver");
    expect(xml).not.toContain("/kurucu");
  });

  test("sitemap escapes the public origin and never serializes query parameters", () => {
    const xml = createPilotSitemapXml("https://arar.example/?ignored=1&other=2", []);
    expect(xml).toContain("<loc>https://arar.example/</loc>");
    expect(xml).not.toContain("ignored");
    expect(xml).not.toContain("other=2");
  });
});
