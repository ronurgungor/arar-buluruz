export const LISTING_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const LISTING_PHOTO_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ListingPhotoMimeType = (typeof LISTING_PHOTO_ALLOWED_MIME_TYPES)[number];
export type ListingPhotoValidationError =
  | "UNSUPPORTED_MIME_TYPE"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "CONTENT_SIGNATURE_MISMATCH";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXTENSION_BY_MIME: Record<ListingPhotoMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isListingPhotoMimeType(value: string): value is ListingPhotoMimeType {
  return (LISTING_PHOTO_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function validateListingPhoto(
  mimeType: string,
  byteSize: number,
): ListingPhotoValidationError | null {
  if (!isListingPhotoMimeType(mimeType)) return "UNSUPPORTED_MIME_TYPE";
  if (!Number.isInteger(byteSize) || byteSize <= 0) return "EMPTY_FILE";
  if (byteSize > LISTING_PHOTO_MAX_BYTES) return "FILE_TOO_LARGE";
  return null;
}

function startsWithBytes(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

export function validateListingPhotoContentSignature(
  mimeType: ListingPhotoMimeType,
  bytes: Uint8Array,
): ListingPhotoValidationError | null {
  const sizeError = validateListingPhoto(mimeType, bytes.byteLength);
  if (sizeError) return sizeError;

  const matches =
    mimeType === "image/jpeg"
      ? startsWithBytes(bytes, [0xff, 0xd8, 0xff])
      : mimeType === "image/png"
        ? startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        : bytes.byteLength >= 12 &&
          startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
          startsWithBytes(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]);

  return matches ? null : "CONTENT_SIGNATURE_MISMATCH";
}

export function buildListingPhotoObjectPath(
  listingId: string,
  photoId: string,
  mimeType: ListingPhotoMimeType,
): string {
  if (!UUID_PATTERN.test(listingId) || !UUID_PATTERN.test(photoId)) {
    throw new Error("Listing photo paths require canonical UUID identifiers.");
  }

  return `listings/${listingId.toLowerCase()}/${photoId.toLowerCase()}.${EXTENSION_BY_MIME[mimeType]}`;
}
