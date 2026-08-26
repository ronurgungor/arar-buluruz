import "./lib/error-capture";
import {
  CLOSED_ROBOTS,
  createPilotSitemapXml,
  publicValidationIndexingEnabled,
} from "./build-profiles/pilot/public-discovery";
import { loadPilotListingsCollection } from "./build-profiles/pilot/public-listings";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (module) => (module.default ?? module) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function withRobotsHeader(response: Response): Response {
  const headers = new Headers(response.headers);
  const htmlResponse = (headers.get("content-type") ?? "").includes("text/html");
  if (htmlResponse && (!publicValidationIndexingEnabled || response.status >= 400)) {
    headers.set("X-Robots-Tag", CLOSED_ROBOTS);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createStaticErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return createStaticErrorResponse();
}

async function handleSitemap(request: Request): Promise<Response> {
  if (!publicValidationIndexingEnabled) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const listingData = await loadPilotListingsCollection();
  if (listingData.state !== "ready") {
    return new Response("Sitemap is temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(
    createPilotSitemapXml(new URL(request.url).origin, listingData.listings),
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": "application/xml; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (new URL(request.url).pathname === "/sitemap.xml") {
        return await handleSitemap(request);
      }
      const handler = await getServerEntry();
      return withRobotsHeader(
        await normalizeCatastrophicSsrResponse(await handler.fetch(request, env, ctx)),
      );
    } catch (error) {
      console.error(error);
      return withRobotsHeader(createStaticErrorResponse());
    }
  },
};
