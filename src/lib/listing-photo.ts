export const LISTING_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const LISTING_PHOTO_MAX_PIXELS = 50_000_000;
export const LISTING_PHOTO_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const LISTING_PHOTO_SANITIZED_MIME_TYPE = "image/webp" as const;

export type ListingPhotoMimeType = (typeof LISTING_PHOTO_ALLOWED_MIME_TYPES)[number];
export type ListingPhotoValidationError =
  | "UNSUPPORTED_MIME_TYPE"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "CONTENT_SIGNATURE_MISMATCH";

export type ListingPhotoSanitizationErrorCode =
  | ListingPhotoValidationError
  | "DECODER_UNAVAILABLE"
  | "DECODE_FAILED"
  | "DECODED_FORMAT_MISMATCH"
  | "ENCODE_FAILED"
  | "UNSAFE_OUTPUT";

export type SanitizedListingPhoto = {
  bytes: Uint8Array;
  mimeType: typeof LISTING_PHOTO_SANITIZED_MIME_TYPE;
  width: number;
  height: number;
};

type TrustedImageMetadata = {
  format: string;
  width: number;
  height: number;
};

type TrustedImagePipeline = {
  metadata(): Promise<TrustedImageMetadata>;
  webp(options: { lossless: boolean; quality: number }): TrustedImagePipeline;
  bytes(): Promise<Uint8Array>;
};

type TrustedImageConstructor = new (
  input: Uint8Array,
  options?: { autoOrient?: boolean; maxPixels?: number },
) => TrustedImagePipeline;

type BunRuntimeWithImage = {
  Image?: TrustedImageConstructor;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXTENSION_BY_MIME: Record<ListingPhotoMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DECODER_FORMAT_BY_MIME: Record<ListingPhotoMimeType, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const SANITIZATION_ERROR_MESSAGE: Record<ListingPhotoSanitizationErrorCode, string> = {
  UNSUPPORTED_MIME_TYPE: "Listing photo MIME type is not supported.",
  EMPTY_FILE: "Listing photo is empty.",
  FILE_TOO_LARGE: "Listing photo exceeds the input byte limit.",
  CONTENT_SIGNATURE_MISMATCH: "Listing photo content does not match its declared MIME type.",
  DECODER_UNAVAILABLE: "Trusted image decoder is unavailable in this runtime.",
  DECODE_FAILED: "Listing photo could not be decoded safely.",
  DECODED_FORMAT_MISMATCH: "Decoded listing photo format does not match its declared MIME type.",
  ENCODE_FAILED: "Listing photo could not be re-encoded safely.",
  UNSAFE_OUTPUT: "Sanitized listing photo output failed safety validation.",
};

export class ListingPhotoSanitizationError extends Error {
  readonly code: ListingPhotoSanitizationErrorCode;

  constructor(code: ListingPhotoSanitizationErrorCode, options?: ErrorOptions) {
    super(SANITIZATION_ERROR_MESSAGE[code], options);
    this.name = "ListingPhotoSanitizationError";
    this.code = code;
  }
}

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

function getTrustedImageConstructor(): TrustedImageConstructor {
  const runtime = (globalThis as typeof globalThis & { Bun?: BunRuntimeWithImage }).Bun;
  if (!runtime?.Image) throw new ListingPhotoSanitizationError("DECODER_UNAVAILABLE");
  return runtime.Image;
}

function isSafeImageMetadata(metadata: TrustedImageMetadata): boolean {
  return (
    Number.isInteger(metadata.width) &&
    Number.isInteger(metadata.height) &&
    metadata.width > 0 &&
    metadata.height > 0 &&
    metadata.width * metadata.height <= LISTING_PHOTO_MAX_PIXELS
  );
}

export async function sanitizeListingPhoto(
  mimeType: string,
  bytes: Uint8Array,
): Promise<SanitizedListingPhoto> {
  const inputError = validateListingPhoto(mimeType, bytes.byteLength);
  if (inputError) throw new ListingPhotoSanitizationError(inputError);
  if (!isListingPhotoMimeType(mimeType)) {
    throw new ListingPhotoSanitizationError("UNSUPPORTED_MIME_TYPE");
  }

  const signatureError = validateListingPhotoContentSignature(mimeType, bytes);
  if (signatureError) throw new ListingPhotoSanitizationError(signatureError);

  const ImageDecoder = getTrustedImageConstructor();
  const stableInput = bytes.slice();
  const options = { autoOrient: true, maxPixels: LISTING_PHOTO_MAX_PIXELS } as const;

  let inputMetadata: TrustedImageMetadata;
  try {
    inputMetadata = await new ImageDecoder(stableInput, options).metadata();
  } catch (cause) {
    throw new ListingPhotoSanitizationError("DECODE_FAILED", { cause });
  }

  if (inputMetadata.format !== DECODER_FORMAT_BY_MIME[mimeType]) {
    throw new ListingPhotoSanitizationError("DECODED_FORMAT_MISMATCH");
  }
  if (!isSafeImageMetadata(inputMetadata)) {
    throw new ListingPhotoSanitizationError("DECODE_FAILED");
  }

  let sanitizedBytes: Uint8Array;
  try {
    sanitizedBytes = await new ImageDecoder(stableInput, options)
      .webp({ lossless: false, quality: 85 })
      .bytes();
  } catch (cause) {
    throw new ListingPhotoSanitizationError("ENCODE_FAILED", { cause });
  }

  if (
    validateListingPhoto(LISTING_PHOTO_SANITIZED_MIME_TYPE, sanitizedBytes.byteLength) !== null ||
    validateListingPhotoContentSignature(LISTING_PHOTO_SANITIZED_MIME_TYPE, sanitizedBytes) !== null
  ) {
    throw new ListingPhotoSanitizationError("UNSAFE_OUTPUT");
  }

  let outputMetadata: TrustedImageMetadata;
  try {
    outputMetadata = await new ImageDecoder(sanitizedBytes, {
      maxPixels: LISTING_PHOTO_MAX_PIXELS,
    }).metadata();
  } catch (cause) {
    throw new ListingPhotoSanitizationError("UNSAFE_OUTPUT", { cause });
  }

  if (outputMetadata.format !== "webp" || !isSafeImageMetadata(outputMetadata)) {
    throw new ListingPhotoSanitizationError("UNSAFE_OUTPUT");
  }

  return {
    bytes: sanitizedBytes,
    mimeType: LISTING_PHOTO_SANITIZED_MIME_TYPE,
    width: outputMetadata.width,
    height: outputMetadata.height,
  };
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
