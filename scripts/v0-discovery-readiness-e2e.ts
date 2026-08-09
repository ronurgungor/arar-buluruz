import { chromium, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const publicV0Robots = "noindex, nofollow, noarchive, nosnippet";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertPublicNoindex(page: Page, route: string) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  assert(response?.ok() === true, `${route} returned HTTP ${response?.status() ?? "unknown"}.`);
  assert(
    response.headers()["x-robots-tag"] === publicV0Robots,
    `${route} lost the public-V0 X-Robots-Tag boundary.`,
  );

  const directives = await page.evaluate(() => ({
    robots: Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="robots"]')).map(
      (meta) => meta.content,
    ),
    googlebot: Array.from(
      document.querySelectorAll<HTMLMetaElement>('meta[name="googlebot"]'),
    ).map((meta) => meta.content),
  }));

  assert(directives.robots.length > 0, `${route} has no robots meta directive.`);
  assert(
    directives.robots.every((directive) => directive === publicV0Robots),
    `${route} exposed a non-V0 robots directive: ${JSON.stringify(directives.robots)}`,
  );
  assert(directives.googlebot.length > 0, `${route} has no googlebot meta directive.`);
  assert(
    directives.googlebot.every((directive) => directive === publicV0Robots),
    `${route} exposed a non-V0 googlebot directive: ${JSON.stringify(directives.googlebot)}`,
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(15_000);

try {
  console.log("V0 discovery: validating global noindex on current mock surfaces");
  await assertPublicNoindex(page, "/");
  await assertPublicNoindex(page, "/ara?q=trakt%C3%B6r&il=T%C3%BCm+T%C3%BCrkiye&sirala=yeni");
  await assertPublicNoindex(page, "/ilan/1");

  console.log("V0 discovery: validating permanent publisher pages stay nonindexed in V0");
  for (const [route, heading] of [
    ["/nasil-calisir", "Nasıl Çalışır"],
    ["/ilan-kurallari", "İlan Kuralları"],
    ["/guvenli-kullanim", "Güvenli Kullanım / Şikâyet"],
  ] as const) {
    await assertPublicNoindex(page, route);
    await page.getByRole("heading", { level: 1, name: heading }).waitFor();
  }

  console.log("V0 discovery: validating fail-closed sitemap");
  const sitemap = await context.request.get(`${baseUrl}/sitemap.xml`);
  assert(sitemap.ok(), `V0 sitemap returned HTTP ${sitemap.status()}.`);
  assert(
    sitemap.headers()["x-robots-tag"] === publicV0Robots,
    "V0 sitemap lost its noindex header.",
  );
  const sitemapXml = await sitemap.text();
  assert(sitemapXml.includes("<urlset"), "V0 sitemap is not valid XML sitemap output.");
  assert(!sitemapXml.includes("<url>"), "V0 sitemap exposed an indexable URL entry.");
  assert(!sitemapXml.includes("/ilan/"), "V0 sitemap exposed mock listing inventory.");
} finally {
  await context.close();
  await browser.close();
}

console.log("V0 discovery readiness browser validation passed.");
