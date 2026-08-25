export const PLACE_PROVIDER_TRAFFIC_RETENTION_MIN_DAYS = 365;

export type PlaceProviderTrafficLogInput = {
  trustedClientIp: string;
  requestUrl: string;
  method: string;
  status: number;
  service: string;
  timestamp?: Date;
  durationMs?: number;
  responseBytes?: number;
};

export type PlaceProviderTrafficLogRecord = {
  clientIp: string;
  timestamp: string;
  method: string;
  route: string;
  service: string;
  status: number;
  durationMs?: number;
  responseBytes?: number;
};

const SAFE_SERVICE_PATTERN = /^[a-z0-9._-]{1,80}$/;
const SAFE_IP_PATTERN = /^[0-9a-fA-F:.]{2,64}$/;

function routeTemplate(pathname: string): string {
  if (pathname === "/") return "/";
  if (pathname === "/ara") return "/ara";
  if (pathname === "/ilan-ver") return "/ilan-ver";
  if (pathname === "/gizlilik") return "/gizlilik";
  if (pathname === "/iletisim") return "/iletisim";
  if (pathname === "/ilan-kurallari") return "/ilan-kurallari";
  if (pathname === "/guvenli-kullanim") return "/guvenli-kullanim";
  if (pathname === "/nasil-calisir") return "/nasil-calisir";
  if (pathname === "/manifest.webmanifest") return "/manifest.webmanifest";
  if (pathname === "/sw.js") return "/sw.js";
  if (pathname === "/offline.html") return "/offline.html";
  if (pathname.startsWith("/assets/")) return "/assets/*";
  if (pathname.startsWith("/icons/")) return "/icons/*";
  if (/^\/ilan\/[^/]+$/.test(pathname)) return "/ilan/:id";
  if (/^\/sikayet\/[^/]+$/.test(pathname)) return "/sikayet/:id";
  return "/other";
}

function normalizeRoute(requestUrl: string): string {
  try {
    const url = new URL(requestUrl, "https://traffic.invalid");
    return routeTemplate(url.pathname);
  } catch {
    return "/other";
  }
}

function normalizeMethod(method: string): string {
  const normalized = method.trim().toUpperCase();
  return /^[A-Z]{3,12}$/.test(normalized) ? normalized : "OTHER";
}

function normalizeNonNegativeInteger(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value);
}

export function createPlaceProviderTrafficLogRecord(
  input: PlaceProviderTrafficLogInput,
): PlaceProviderTrafficLogRecord {
  const clientIp = input.trustedClientIp.trim();
  if (!SAFE_IP_PATTERN.test(clientIp)) {
    throw new Error(
      "Traffic log requires an IP supplied by the trusted production ingress boundary.",
    );
  }

  const service = input.service.trim().toLowerCase();
  if (!SAFE_SERVICE_PATTERN.test(service)) {
    throw new Error("Traffic log service identifier is invalid.");
  }

  if (!Number.isInteger(input.status) || input.status < 100 || input.status > 599) {
    throw new Error("Traffic log status must be a valid HTTP status code.");
  }

  const timestamp = input.timestamp ?? new Date();
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Traffic log timestamp is invalid.");
  }

  const record: PlaceProviderTrafficLogRecord = {
    clientIp,
    timestamp: timestamp.toISOString(),
    method: normalizeMethod(input.method),
    route: normalizeRoute(input.requestUrl),
    service,
    status: input.status,
  };

  const durationMs = normalizeNonNegativeInteger(input.durationMs);
  const responseBytes = normalizeNonNegativeInteger(input.responseBytes);
  if (durationMs !== undefined) record.durationMs = durationMs;
  if (responseBytes !== undefined) record.responseBytes = responseBytes;

  return record;
}
