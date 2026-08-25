import { describe, expect, test } from "bun:test";
import {
  PLACE_PROVIDER_TRAFFIC_RETENTION_MIN_DAYS,
  createPlaceProviderTrafficLogRecord,
} from "./place-provider-traffic-log";

describe("5651 place-provider traffic log contract", () => {
  test("retention floor is one year", () => {
    expect(PLACE_PROVIDER_TRAFFIC_RETENTION_MIN_DAYS).toBe(365);
  });

  test("keeps only trusted ingress/request-result metadata and strips query content", () => {
    const record = createPlaceProviderTrafficLogRecord({
      trustedClientIp: "203.0.113.7",
      requestUrl:
        "https://arar.example/ara?q=%2B905551112233&token=secret-signed-token&description=private",
      method: "get",
      status: 200,
      service: "public-web",
      timestamp: new Date("2026-08-25T08:00:00.000Z"),
      durationMs: 12.4,
      responseBytes: 987.6,
    });

    expect(record).toEqual({
      clientIp: "203.0.113.7",
      timestamp: "2026-08-25T08:00:00.000Z",
      method: "GET",
      route: "/ara",
      service: "public-web",
      status: 200,
      durationMs: 12,
      responseBytes: 988,
    });
    expect(JSON.stringify(record)).not.toContain("905551112233");
    expect(JSON.stringify(record)).not.toContain("secret-signed-token");
    expect(JSON.stringify(record)).not.toContain("private");
  });

  test("redacts dynamic listing and complaint identifiers", () => {
    expect(
      createPlaceProviderTrafficLogRecord({
        trustedClientIp: "2001:db8::1",
        requestUrl: "https://arar.example/ilan/93000000-0000-4000-8000-000000000001",
        method: "GET",
        status: 200,
        service: "public-web",
      }).route,
    ).toBe("/ilan/:id");

    expect(
      createPlaceProviderTrafficLogRecord({
        trustedClientIp: "2001:db8::1",
        requestUrl: "https://arar.example/sikayet/+905551112233?details=private",
        method: "GET",
        status: 200,
        service: "public-web",
      }).route,
    ).toBe("/sikayet/:id");
  });

  test("unknown paths fail closed to a generic route class", () => {
    const record = createPlaceProviderTrafficLogRecord({
      trustedClientIp: "192.0.2.10",
      requestUrl: "https://arar.example/+905551112233/private-person-name?authorization=secret",
      method: "GET",
      status: 404,
      service: "public-web",
    });
    expect(record.route).toBe("/other");
    expect(JSON.stringify(record)).not.toContain("905551112233");
    expect(JSON.stringify(record)).not.toContain("private-person-name");
    expect(JSON.stringify(record)).not.toContain("authorization");
  });

  test("does not accept a missing or malformed trusted ingress IP", () => {
    expect(() =>
      createPlaceProviderTrafficLogRecord({
        trustedClientIp: "spoofed-forwarded-for",
        requestUrl: "https://arar.example/",
        method: "GET",
        status: 200,
        service: "public-web",
      }),
    ).toThrow(/trusted production ingress boundary/);
  });
});
