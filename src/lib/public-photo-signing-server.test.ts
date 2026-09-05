import { describe, expect, test } from "bun:test";
import { LISTING_PHOTO_SIGNED_URL_DEFAULT_SECONDS } from "./listing-photo-trusted";
import {
  maybeHandlePublicListingPhotoRequest,
  type PublicPhotoSigningBackendConfig,
} from "./public-photo-signing-server";

const listingId = "70000000-0000-4000-8000-000000000001";
const photoId = "71000000-0000-4000-8000-000000000001";
const objectPath = `listings/${listingId}/${photoId}.webp`;
const config: PublicPhotoSigningBackendConfig = {
  baseUrl: "https://example.supabase.co",
  serviceRoleKey: "synthetic-service-role-key",
};

function activePhotoFetch(requests: Array<{ url: URL; init?: RequestInit }>): typeof fetch {
  return (async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    requests.push({ url, init });
    const headers = new Headers(init?.headers);
    expect(headers.get("apikey")).toBe(config.serviceRoleKey);
    expect(headers.get("authorization")).toBe(`Bearer ${config.serviceRoleKey}`);

    if (url.pathname === "/rest/v1/rpc/get_deliverable_listing_photo") {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        p_listing_id: listingId,
        p_photo_id: photoId,
      });
      return Response.json([
        {
          listing_id: listingId,
          photo_id: photoId,
          object_path: objectPath,
          mime_type: "image/webp",
          byte_size: 1234,
          sort_order: 0,
        },
      ]);
    }

    if (url.pathname === `/storage/v1/object/sign/listing_photos/${objectPath}`) {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({
        expiresIn: LISTING_PHOTO_SIGNED_URL_DEFAULT_SECONDS,
      });
      return Response.json({
        signedURL: `/object/sign/listing_photos/${objectPath}?token=synthetic`,
      });
    }

    throw new Error(`Unexpected public photo backend request: ${url.toString()}`);
  }) as typeof fetch;
}

describe("application-controlled public photo signing", () => {
  test("issues an active listing photo through the server with the fixed canonical TTL", async () => {
    const requests: Array<{ url: URL; init?: RequestInit }> = [];
    const response = await maybeHandlePublicListingPhotoRequest(
      new Request(
        `https://app.example/api/listing-photo/${listingId}/${photoId}?expiresIn=86400`,
      ),
      { config, fetchImpl: activePhotoFetch(requests) },
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(response?.headers.get("location")).toBe(
      `https://example.supabase.co/storage/v1/object/sign/listing_photos/${objectPath}?token=synthetic`,
    );
    expect(requests).toHaveLength(2);
    expect(requests[1]?.url.pathname).toBe(`/storage/v1/object/sign/listing_photos/${objectPath}`);
  });

  test("fails closed before Storage signing when the photo is not deliverable", async () => {
    let backendCalls = 0;
    const fetchMock = (async (input, init) => {
      backendCalls += 1;
      const url = new URL(input instanceof Request ? input.url : input.toString());
      expect(url.pathname).toBe("/rest/v1/rpc/get_deliverable_listing_photo");
      expect(init?.method).toBe("POST");
      return Response.json([]);
    }) as typeof fetch;

    const response = await maybeHandlePublicListingPhotoRequest(
      new Request(`https://app.example/api/listing-photo/${listingId}/${photoId}`),
      { config, fetchImpl: fetchMock },
    );

    expect(response?.status).toBe(404);
    expect(backendCalls).toBe(1);
  });

  test("rejects malformed photo identities without touching the backend", async () => {
    let backendCalls = 0;
    const response = await maybeHandlePublicListingPhotoRequest(
      new Request("https://app.example/api/listing-photo/not-a-listing/not-a-photo"),
      {
        config,
        fetchImpl: (async () => {
          backendCalls += 1;
          return new Response(null, { status: 500 });
        }) as typeof fetch,
      },
    );

    expect(response?.status).toBe(404);
    expect(backendCalls).toBe(0);
  });

  test("does not expose a signing handler for unrelated routes or non-GET mutation attempts", async () => {
    expect(
      await maybeHandlePublicListingPhotoRequest(new Request("https://app.example/ara"), { config }),
    ).toBeNull();

    const response = await maybeHandlePublicListingPhotoRequest(
      new Request(`https://app.example/api/listing-photo/${listingId}/${photoId}`, {
        method: "POST",
      }),
      { config },
    );
    expect(response?.status).toBe(405);
    expect(response?.headers.get("allow")).toBe("GET");
  });
});
