import { describe, expect, test } from "bun:test";
import {
  LISTING_PHOTO_MAX_BYTES,
  buildListingPhotoObjectPath,
  validateListingPhoto,
  validateListingPhotoContentSignature,
} from "./listing-photo";

const listingId = "10000000-0000-4000-8000-000000000001";
const photoId = "20000000-0000-4000-8000-000000000001";

describe("real-pilot listing photo contract", () => {
  test("allows only JPEG, PNG and WebP within the 8 MiB boundary", () => {
    expect(validateListingPhoto("image/jpeg", 1)).toBeNull();
    expect(validateListingPhoto("image/png", LISTING_PHOTO_MAX_BYTES)).toBeNull();
    expect(validateListingPhoto("image/webp", 1024)).toBeNull();

    expect(validateListingPhoto("image/svg+xml", 1024)).toBe("UNSUPPORTED_MIME_TYPE");
    expect(validateListingPhoto("application/javascript", 1024)).toBe("UNSUPPORTED_MIME_TYPE");
    expect(validateListingPhoto("image/jpeg", 0)).toBe("EMPTY_FILE");
    expect(validateListingPhoto("image/jpeg", LISTING_PHOTO_MAX_BYTES + 1)).toBe("FILE_TOO_LARGE");
  });

  test("checks basic file signatures instead of trusting Content-Type alone", () => {
    expect(
      validateListingPhotoContentSignature(
        "image/jpeg",
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]),
      ),
    ).toBeNull();
    expect(
      validateListingPhotoContentSignature(
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBeNull();
    expect(
      validateListingPhotoContentSignature(
        "image/webp",
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBeNull();
    expect(
      validateListingPhotoContentSignature(
        "image/jpeg",
        new TextEncoder().encode("<script>alert(1)</script>"),
      ),
    ).toBe("CONTENT_SIGNATURE_MISMATCH");
  });

  test("discards original filenames by generating an opaque listing-owned path", () => {
    expect(buildListingPhotoObjectPath(listingId, photoId, "image/jpeg")).toBe(
      `listings/${listingId}/${photoId}.jpg`,
    );
    expect(buildListingPhotoObjectPath(listingId, photoId, "image/png")).toBe(
      `listings/${listingId}/${photoId}.png`,
    );
    expect(buildListingPhotoObjectPath(listingId, photoId, "image/webp")).toBe(
      `listings/${listingId}/${photoId}.webp`,
    );
  });

  test("rejects non-UUID path ownership inputs", () => {
    expect(() => buildListingPhotoObjectPath("../../escape", photoId, "image/jpeg")).toThrow();
    expect(() => buildListingPhotoObjectPath(listingId, "not-a-uuid", "image/jpeg")).toThrow();
  });
});
