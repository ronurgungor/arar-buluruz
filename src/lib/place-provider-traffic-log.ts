import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";

export const PLACE_PROVIDER_TRAFFIC_RETENTION_MIN_DAYS = 365;
export const PLACE_PROVIDER_TRAFFIC_LOG_SCHEMA_VERSION = 1 as const;
export const PLACE_PROVIDER_DAILY_ROTATION_TIMEZONE = "UTC" as const;
export const PLACE_PROVIDER_HASH_ALGORITHM = "sha256" as const;
export const PLACE_PROVIDER_TIMESTAMP_PROTOCOL = "RFC3161" as const;

export const PLACE_PROVIDER_LOG_STORE_POLICY = Object.freeze({
  residency: "TR" as const,
  encryptionAtRestRequired: true,
  publicAccess: "deny" as const,
  applicationRuntimeRead: "deny" as const,
  applicationRuntimeDelete: "deny" as const,
  closedLogOverwrite: "deny" as const,
  automaticExpiryAfterDays: PLACE_PROVIDER_TRAFFIC_RETENTION_MIN_DAYS,
  legalHoldException: "narrow-documented-only" as const,
});

export type PlaceProviderTrafficLogInput = {
  /** Socket peer observed by the authoritative outer HTTP/TLS producer. */
  socketPeerIp: string;
  /** Socket peer source port when the platform exposes it reliably. */
  socketPeerPort?: number;
  /** Destination/server address observed by the authoritative producer. */
  destinationServerIp: string;
  destinationPort: number;
  requestUrl: string;
  method: string;
  status: number;
  service: string;
  protocol: "http" | "https";
  timestamp: Date;
  endedAt?: Date;
  durationMs?: number;
  transferredBytes?: number;
  /** Explicitly untrusted. Kept only so tests can prove spoofing is ignored. */
  forwardedForHeader?: string;
};

export type PlaceProviderTrafficLogRecord = {
  schemaVersion: typeof PLACE_PROVIDER_TRAFFIC_LOG_SCHEMA_VERSION;
  timestamp: string;
  sourceIp: string;
  sourcePort?: number;
  destinationIp: string;
  destinationPort: number;
  method: string;
  requestPath: string;
  status: number;
  service: string;
  protocol: "http" | "https";
  endedAt?: string;
  durationMs?: number;
  transferredBytes?: number;
};

export type ClosedDailyTrafficLog = {
  dateUtc: string;
  fileName: string;
  mediaType: "application/x-ndjson";
  bytes: Uint8Array;
  recordCount: number;
  byteLength: number;
  sha256Hex: string;
  closedAt: string;
  retainUntil: string;
};

export type QualifiedTimestampRequest = {
  protocol: typeof PLACE_PROVIDER_TIMESTAMP_PROTOCOL;
  hashAlgorithm: typeof PLACE_PROVIDER_HASH_ALGORITHM;
  messageImprintHex: string;
  nonceHex: string;
  certReq: true;
};

export type QualifiedTimestampVerification = {
  signatureValid: boolean;
  certificateChainValid: boolean;
  providerAuthorizedUnder5070: boolean;
  messageImprintHex: string;
  nonceHex: string;
  generatedAt: string;
};

export interface QualifiedTimestampClient {
  requestTimestamp(request: QualifiedTimestampRequest): Promise<Uint8Array>;
}

export interface QualifiedTimestampVerifier {
  verifyTimestampToken(
    token: Uint8Array,
    request: QualifiedTimestampRequest,
  ): Promise<QualifiedTimestampVerification>;
}

export type QualifiedTimestampQueueEntry = {
  dailyLogSha256Hex: string;
  request: QualifiedTimestampRequest;
  queuedAt: string;
  attempts: number;
  reason: "provider-unavailable";
};

export type QualifiedTimestampResult =
  | {
      status: "verified";
      token: Uint8Array;
      verification: QualifiedTimestampVerification;
    }
  | {
      status: "queued";
      queueEntry: QualifiedTimestampQueueEntry;
    };

const SAFE_SERVICE_PATTERN = /^[a-z0-9._-]{1,80}$/;
const SAFE_METHOD_PATTERN = /^[A-Z]{3,12}$/;

function requireIp(value: string, label: string): string {
  const normalized = value.trim();
  if (isIP(normalized) === 0) {
    throw new Error(`${label} must be an IP address observed by the trusted outer producer.`);
  }
  return normalized;
}

function optionalPort(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${label} must be a valid TCP port.`);
  }
  return value;
}

function requiredPort(value: number, label: string): number {
  const normalized = optionalPort(value, label);
  if (normalized === undefined) throw new Error(`${label} is required.`);
  return normalized;
}

function normalizeRequestPath(requestUrl: string): string {
  let url: URL;
  try {
    url = new URL(requestUrl, "https://traffic.invalid");
  } catch {
    throw new Error("Traffic log request URL is invalid.");
  }

  if (!url.pathname.startsWith("/") || url.pathname.length > 2048) {
    throw new Error("Traffic log request path is invalid.");
  }

  // Query strings are deliberately discarded because search terms, signed URL tokens,
  // contact values or other personal material must not enter canonical 5651 evidence.
  return url.pathname;
}

function normalizeMethod(method: string): string {
  const normalized = method.trim().toUpperCase();
  return SAFE_METHOD_PATTERN.test(normalized) ? normalized : "OTHER";
}

function normalizeNonNegativeInteger(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value);
}

function requireTimestamp(value: Date, label: string): string {
  if (Number.isNaN(value.getTime())) throw new Error(`${label} is invalid.`);
  return value.toISOString();
}

export function createPlaceProviderTrafficLogRecord(
  input: PlaceProviderTrafficLogInput,
): PlaceProviderTrafficLogRecord {
  // X-Forwarded-For is intentionally never consulted. In the Gate B baseline topology
  // the canonical producer is the outer public HTTP/TLS listener and sourceIp comes from
  // the kernel socket peer. Adding an upstream proxy/CDN/LB reopens this trust decision.
  void input.forwardedForHeader;

  const sourceIp = requireIp(input.socketPeerIp, "Traffic log source IP");
  const destinationIp = requireIp(input.destinationServerIp, "Traffic log destination IP");
  const sourcePort = optionalPort(input.socketPeerPort, "Traffic log source port");
  const destinationPort = requiredPort(input.destinationPort, "Traffic log destination port");

  const service = input.service.trim().toLowerCase();
  if (!SAFE_SERVICE_PATTERN.test(service)) {
    throw new Error("Traffic log service identifier is invalid.");
  }

  if (!Number.isInteger(input.status) || input.status < 100 || input.status > 599) {
    throw new Error("Traffic log status must be a valid HTTP status code.");
  }

  const timestamp = requireTimestamp(input.timestamp, "Traffic log timestamp");
  const record: PlaceProviderTrafficLogRecord = {
    schemaVersion: PLACE_PROVIDER_TRAFFIC_LOG_SCHEMA_VERSION,
    timestamp,
    sourceIp,
    destinationIp,
    destinationPort,
    method: normalizeMethod(input.method),
    requestPath: normalizeRequestPath(input.requestUrl),
    status: input.status,
    service,
    protocol: input.protocol,
  };

  if (sourcePort !== undefined) record.sourcePort = sourcePort;

  if (input.endedAt !== undefined) {
    const endedAt = requireTimestamp(input.endedAt, "Traffic log end timestamp");
    if (input.endedAt.getTime() < input.timestamp.getTime()) {
      throw new Error("Traffic log end timestamp cannot precede its start timestamp.");
    }
    record.endedAt = endedAt;
  }

  const durationMs = normalizeNonNegativeInteger(input.durationMs);
  const transferredBytes = normalizeNonNegativeInteger(input.transferredBytes);
  if (durationMs !== undefined) record.durationMs = durationMs;
  if (transferredBytes !== undefined) record.transferredBytes = transferredBytes;

  return record;
}

function utcDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function addDays(timestamp: Date, days: number): Date {
  return new Date(timestamp.getTime() + days * 24 * 60 * 60 * 1000);
}

export function serializeTrafficLogRecord(record: PlaceProviderTrafficLogRecord): string {
  return `${JSON.stringify(record)}\n`;
}

export function closeDailyTrafficLog(
  records: readonly PlaceProviderTrafficLogRecord[],
  closedAt: Date,
): ClosedDailyTrafficLog {
  if (records.length === 0) throw new Error("Cannot close an empty daily traffic log.");

  const dateUtc = utcDate(records[0].timestamp);
  let previousTimestamp = "";
  for (const record of records) {
    if (utcDate(record.timestamp) !== dateUtc) {
      throw new Error("Daily traffic log rotation may not mix UTC calendar dates.");
    }
    if (previousTimestamp && record.timestamp < previousTimestamp) {
      throw new Error("Daily traffic log records must be ordered by timestamp.");
    }
    previousTimestamp = record.timestamp;
  }

  const closedAtIso = requireTimestamp(closedAt, "Daily traffic log close timestamp");
  if (closedAtIso < previousTimestamp) {
    throw new Error("Daily traffic log cannot close before its final record.");
  }

  const bytes = new TextEncoder().encode(records.map(serializeTrafficLogRecord).join(""));
  const sha256Hex = createHash("sha256").update(bytes).digest("hex");

  return {
    dateUtc,
    fileName: `traffic-${dateUtc}.ndjson`,
    mediaType: "application/x-ndjson",
    bytes,
    recordCount: records.length,
    byteLength: bytes.byteLength,
    sha256Hex,
    closedAt: closedAtIso,
    retainUntil: addDays(closedAt, PLACE_PROVIDER_TRAFFIC_RETENTION_MIN_DAYS).toISOString(),
  };
}

export function verifyClosedDailyTrafficLog(
  closedLog: Pick<ClosedDailyTrafficLog, "byteLength" | "sha256Hex">,
  candidateBytes: Uint8Array,
): boolean {
  if (candidateBytes.byteLength !== closedLog.byteLength) return false;
  const candidateHash = createHash("sha256").update(candidateBytes).digest("hex");
  return candidateHash === closedLog.sha256Hex;
}

export function buildQualifiedTimestampRequest(
  closedLog: Pick<ClosedDailyTrafficLog, "sha256Hex">,
  nonceHex = randomBytes(16).toString("hex"),
): QualifiedTimestampRequest {
  if (!/^[0-9a-f]{64}$/.test(closedLog.sha256Hex)) {
    throw new Error("Closed traffic log SHA-256 digest is invalid.");
  }
  if (!/^[0-9a-f]{16,128}$/.test(nonceHex)) {
    throw new Error("Qualified timestamp nonce is invalid.");
  }
  return {
    protocol: PLACE_PROVIDER_TIMESTAMP_PROTOCOL,
    hashAlgorithm: PLACE_PROVIDER_HASH_ALGORITHM,
    messageImprintHex: closedLog.sha256Hex,
    nonceHex,
    certReq: true,
  };
}

function assertQualifiedTimestampVerification(
  request: QualifiedTimestampRequest,
  verification: QualifiedTimestampVerification,
): void {
  if (!verification.signatureValid) throw new Error("Timestamp token signature is invalid.");
  if (!verification.certificateChainValid) {
    throw new Error("Timestamp token certificate chain is invalid.");
  }
  if (!verification.providerAuthorizedUnder5070) {
    throw new Error("Timestamp provider is not verified as an authorized Turkish ESHS.");
  }
  if (verification.messageImprintHex !== request.messageImprintHex) {
    throw new Error("Timestamp token message imprint does not match the closed traffic log hash.");
  }
  if (verification.nonceHex !== request.nonceHex) {
    throw new Error("Timestamp token nonce does not match the request.");
  }
  if (Number.isNaN(Date.parse(verification.generatedAt))) {
    throw new Error("Timestamp token generation time is invalid.");
  }
}

export async function timestampClosedDailyLog(
  closedLog: Pick<ClosedDailyTrafficLog, "sha256Hex">,
  client: QualifiedTimestampClient,
  verifier: QualifiedTimestampVerifier,
  now = new Date(),
  nonceHex?: string,
): Promise<QualifiedTimestampResult> {
  const request = buildQualifiedTimestampRequest(closedLog, nonceHex);
  let token: Uint8Array;

  try {
    token = await client.requestTimestamp(request);
  } catch {
    return {
      status: "queued",
      queueEntry: {
        dailyLogSha256Hex: closedLog.sha256Hex,
        request,
        queuedAt: requireTimestamp(now, "Timestamp queue time"),
        attempts: 1,
        reason: "provider-unavailable",
      },
    };
  }

  const verification = await verifier.verifyTimestampToken(token, request);
  assertQualifiedTimestampVerification(request, verification);
  return { status: "verified", token, verification };
}
