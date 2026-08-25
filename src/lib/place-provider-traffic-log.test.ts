import { describe, expect, test } from "bun:test";
import {
  PLACE_PROVIDER_DAILY_ROTATION_TIMEZONE,
  PLACE_PROVIDER_LOG_STORE_POLICY,
  PLACE_PROVIDER_TRAFFIC_RETENTION_MIN_DAYS,
  buildQualifiedTimestampRequest,
  closeDailyTrafficLog,
  createPlaceProviderTrafficLogRecord,
  timestampClosedDailyLog,
  verifyClosedDailyTrafficLog,
  type QualifiedTimestampClient,
  type QualifiedTimestampVerifier,
} from "./place-provider-traffic-log";

function sampleRecord(overrides: Partial<Parameters<typeof createPlaceProviderTrafficLogRecord>[0]> = {}) {
  return createPlaceProviderTrafficLogRecord({
    socketPeerIp: "203.0.113.7",
    socketPeerPort: 51_234,
    destinationServerIp: "192.0.2.10",
    destinationPort: 443,
    requestUrl: "https://arar.example/ilan/93000000-0000-4000-8000-000000000001?q=private",
    method: "get",
    status: 200,
    service: "public-web",
    protocol: "https",
    timestamp: new Date("2026-08-25T08:00:00.000Z"),
    endedAt: new Date("2026-08-25T08:00:00.025Z"),
    durationMs: 25.2,
    transferredBytes: 1_024.4,
    ...overrides,
  });
}

describe("5651 Gate B traffic evidence contract", () => {
  test("generates the required minimum traffic fields and no subscriber identity", () => {
    const record = sampleRecord();

    expect(record).toEqual({
      schemaVersion: 1,
      timestamp: "2026-08-25T08:00:00.000Z",
      sourceIp: "203.0.113.7",
      sourcePort: 51_234,
      destinationIp: "192.0.2.10",
      destinationPort: 443,
      method: "GET",
      requestPath: "/ilan/93000000-0000-4000-8000-000000000001",
      status: 200,
      service: "public-web",
      protocol: "https",
      endedAt: "2026-08-25T08:00:00.025Z",
      durationMs: 25,
      transferredBytes: 1_024,
    });
    expect(record).not.toHaveProperty("subscriberId");
  });

  test("drops query secrets and personal material from the canonical record", () => {
    const record = sampleRecord({
      requestUrl:
        "https://arar.example/ara?q=%2B905551112233&seller=Sibel&token=signed-secret&description=private",
    });
    const serialized = JSON.stringify(record);

    expect(record.requestPath).toBe("/ara");
    expect(serialized).not.toContain("905551112233");
    expect(serialized).not.toContain("Sibel");
    expect(serialized).not.toContain("signed-secret");
    expect(serialized).not.toContain("description");
    expect(serialized).not.toContain("authorization");
    expect(serialized).not.toContain("cookie");
  });

  test("ignores spoofed X-Forwarded-For and keeps the outer socket peer as source IP", () => {
    const record = sampleRecord({
      socketPeerIp: "203.0.113.7",
      forwardedForHeader: "198.51.100.200, 10.0.0.1",
    });

    expect(record.sourceIp).toBe("203.0.113.7");
    expect(JSON.stringify(record)).not.toContain("198.51.100.200");
  });

  test("rejects malformed trusted socket and destination network evidence", () => {
    expect(() => sampleRecord({ socketPeerIp: "spoofed-forwarded-for" })).toThrow(
      /trusted outer producer/,
    );
    expect(() => sampleRecord({ destinationServerIp: "not-an-ip" })).toThrow(
      /trusted outer producer/,
    );
    expect(() => sampleRecord({ destinationPort: 70_000 })).toThrow(/valid TCP port/);
  });

  test("rotates one immutable closed NDJSON evidence file per UTC date", () => {
    expect(PLACE_PROVIDER_DAILY_ROTATION_TIMEZONE).toBe("UTC");
    const first = sampleRecord({
      timestamp: new Date("2026-08-25T23:59:59.000Z"),
      endedAt: undefined,
    });
    const second = sampleRecord({
      timestamp: new Date("2026-08-26T00:00:01.000Z"),
      endedAt: undefined,
    });

    const closed = closeDailyTrafficLog([first], new Date("2026-08-26T00:00:00.000Z"));
    expect(closed.fileName).toBe("traffic-2026-08-25.ndjson");
    expect(closed.recordCount).toBe(1);
    expect(closed.byteLength).toBeGreaterThan(0);
    expect(closed.sha256Hex).toMatch(/^[0-9a-f]{64}$/);
    expect(new TextDecoder().decode(closed.bytes).endsWith("\n")).toBe(true);

    expect(() =>
      closeDailyTrafficLog([first, second], new Date("2026-08-26T00:00:02.000Z")),
    ).toThrow(/may not mix UTC calendar dates/);
  });

  test("SHA-256 validation detects any modification of a closed daily log", () => {
    const closed = closeDailyTrafficLog(
      [sampleRecord()],
      new Date("2026-08-26T00:00:00.000Z"),
    );
    expect(verifyClosedDailyTrafficLog(closed, closed.bytes)).toBe(true);

    const modified = new Uint8Array(closed.bytes);
    modified[modified.length - 2] ^= 1;
    expect(verifyClosedDailyTrafficLog(closed, modified)).toBe(false);
  });

  test("defines an RFC 3161 SHA-256 qualified timestamp request contract", () => {
    const closed = closeDailyTrafficLog(
      [sampleRecord()],
      new Date("2026-08-26T00:00:00.000Z"),
    );
    const request = buildQualifiedTimestampRequest(
      closed,
      "00112233445566778899aabbccddeeff",
    );

    expect(request).toEqual({
      protocol: "RFC3161",
      hashAlgorithm: "sha256",
      messageImprintHex: closed.sha256Hex,
      nonceHex: "00112233445566778899aabbccddeeff",
      certReq: true,
    });
  });

  test("requires verified imprint, nonce, signature, chain and 5070-authorized provider", async () => {
    const closed = closeDailyTrafficLog(
      [sampleRecord()],
      new Date("2026-08-26T00:00:00.000Z"),
    );
    const client: QualifiedTimestampClient = {
      requestTimestamp: async () => new Uint8Array([1, 2, 3]),
    };
    const verifier: QualifiedTimestampVerifier = {
      verifyTimestampToken: async (_token, request) => ({
        signatureValid: true,
        certificateChainValid: true,
        providerAuthorizedUnder5070: true,
        messageImprintHex: request.messageImprintHex,
        nonceHex: request.nonceHex,
        generatedAt: "2026-08-26T00:00:01.000Z",
      }),
    };

    const result = await timestampClosedDailyLog(
      closed,
      client,
      verifier,
      new Date("2026-08-26T00:00:01.000Z"),
      "00112233445566778899aabbccddeeff",
    );
    expect(result.status).toBe("verified");

    const wrongImprintVerifier: QualifiedTimestampVerifier = {
      verifyTimestampToken: async (_token, request) => ({
        signatureValid: true,
        certificateChainValid: true,
        providerAuthorizedUnder5070: true,
        messageImprintHex: "0".repeat(64),
        nonceHex: request.nonceHex,
        generatedAt: "2026-08-26T00:00:01.000Z",
      }),
    };
    await expect(
      timestampClosedDailyLog(
        closed,
        client,
        wrongImprintVerifier,
        new Date("2026-08-26T00:00:01.000Z"),
        "00112233445566778899aabbccddeeff",
      ),
    ).rejects.toThrow(/message imprint/);
  });

  test("queues only the closed hash when the external timestamp provider is unavailable", async () => {
    const closed = closeDailyTrafficLog(
      [sampleRecord()],
      new Date("2026-08-26T00:00:00.000Z"),
    );
    const unavailableClient: QualifiedTimestampClient = {
      requestTimestamp: async () => {
        throw new Error("synthetic provider outage");
      },
    };
    const verifier: QualifiedTimestampVerifier = {
      verifyTimestampToken: async () => {
        throw new Error("verifier must not run while provider is unavailable");
      },
    };

    const result = await timestampClosedDailyLog(
      closed,
      unavailableClient,
      verifier,
      new Date("2026-08-26T00:00:05.000Z"),
      "00112233445566778899aabbccddeeff",
    );

    expect(result.status).toBe("queued");
    if (result.status !== "queued") throw new Error("Expected queued timestamp result.");
    expect(result.queueEntry.dailyLogSha256Hex).toBe(closed.sha256Hex);
    expect(result.queueEntry.reason).toBe("provider-unavailable");
    expect(JSON.stringify(result.queueEntry)).not.toContain(new TextDecoder().decode(closed.bytes));

    // Request processing is not coupled to the timestamp provider path.
    expect(sampleRecord({ status: 204 }).status).toBe(204);
  });

  test("configures a private Türkiye-resident 365-day minimum lifecycle with no app access", () => {
    expect(PLACE_PROVIDER_TRAFFIC_RETENTION_MIN_DAYS).toBe(365);
    expect(PLACE_PROVIDER_LOG_STORE_POLICY).toEqual({
      residency: "TR",
      encryptionAtRestRequired: true,
      publicAccess: "deny",
      applicationRuntimeRead: "deny",
      applicationRuntimeDelete: "deny",
      closedLogOverwrite: "deny",
      automaticExpiryAfterDays: 365,
      legalHoldException: "narrow-documented-only",
    });
  });
});
