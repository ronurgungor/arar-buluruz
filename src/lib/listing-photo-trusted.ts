import {
  LISTING_PHOTO_MAX_BYTES,
  LISTING_PHOTO_SANITIZED_MIME_TYPE,
  buildListingPhotoObjectPath,
  sanitizeListingPhoto,
} from "./listing-photo";

export const LISTING_PHOTO_SIGNED_URL_DEFAULT_SECONDS = 60;
export const LISTING_PHOTO_SIGNED_URL_MAX_SECONDS = 5 * 60;

export type StoredListingPhotoMetadata = {
  listingId: string;
  photoId: string;
  objectPath: string;
  mimeType: typeof LISTING_PHOTO_SANITIZED_MIME_TYPE;
  byteSize: number;
  sortOrder: number;
};

export type TrustedListingPhotoIngestionStore = {
  uploadSanitizedObject(input: {
    objectPath: string;
    mimeType: typeof LISTING_PHOTO_SANITIZED_MIME_TYPE;
    bytes: Uint8Array;
  }): Promise<void>;
  insertPhotoMetadata(metadata: StoredListingPhotoMetadata): Promise<void>;
  deleteObject(objectPath: string): Promise<void>;
};

export type TrustedListingPhotoDeliveryStore = {
  getDeliverablePhoto(
    listingId: string,
    photoId: string,
  ): Promise<StoredListingPhotoMetadata | null>;
  createSignedUrl(objectPath: string, expiresInSeconds: number): Promise<string>;
};

export type TrustedListingPhotoIngestionErrorStage =
  | "METADATA_PERSIST_FAILED"
  | "COMPENSATING_DELETE_FAILED";

export class TrustedListingPhotoIngestionError extends Error {
  readonly stage: TrustedListingPhotoIngestionErrorStage;
  readonly objectPath: string;
  readonly orphanedObjectPath: string | null;

  constructor(
    stage: TrustedListingPhotoIngestionErrorStage,
    objectPath: string,
    options?: ErrorOptions,
  ) {
    super(
      stage === "COMPENSATING_DELETE_FAILED"
        ? "Listing photo metadata persistence failed and compensating Storage cleanup also failed."
        : "Listing photo metadata persistence failed after sanitized Storage upload.",
      options,
    );
    this.name = "TrustedListingPhotoIngestionError";
    this.stage = stage;
    this.objectPath = objectPath;
    this.orphanedObjectPath = stage === "COMPENSATING_DELETE_FAILED" ? objectPath : null;
  }
}

function assertSortOrder(sortOrder: number): void {
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 32_767) {
    throw new Error("Listing photo sort order must be a non-negative small integer.");
  }
}

function assertSignedUrlTtl(expiresInSeconds: number): void {
  if (
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds <= 0 ||
    expiresInSeconds > LISTING_PHOTO_SIGNED_URL_MAX_SECONDS
  ) {
    throw new Error(
      `Listing photo signed URL TTL must be between 1 and ${LISTING_PHOTO_SIGNED_URL_MAX_SECONDS} seconds.`,
    );
  }
}

export async function ingestTrustedListingPhoto(
  input: {
    listingId: string;
    photoId: string;
    declaredMimeType: string;
    bytes: Uint8Array;
    sortOrder: number;
  },
  store: TrustedListingPhotoIngestionStore,
): Promise<StoredListingPhotoMetadata> {
  assertSortOrder(input.sortOrder);

  const sanitized = await sanitizeListingPhoto(input.declaredMimeType, input.bytes);
  const objectPath = buildListingPhotoObjectPath(
    input.listingId,
    input.photoId,
    LISTING_PHOTO_SANITIZED_MIME_TYPE,
  );
  const metadata: StoredListingPhotoMetadata = {
    listingId: input.listingId.toLowerCase(),
    photoId: input.photoId.toLowerCase(),
    objectPath,
    mimeType: LISTING_PHOTO_SANITIZED_MIME_TYPE,
    byteSize: sanitized.bytes.byteLength,
    sortOrder: input.sortOrder,
  };

  await store.uploadSanitizedObject({
    objectPath,
    mimeType: LISTING_PHOTO_SANITIZED_MIME_TYPE,
    bytes: sanitized.bytes,
  });

  try {
    await store.insertPhotoMetadata(metadata);
  } catch (metadataCause) {
    try {
      await store.deleteObject(objectPath);
    } catch (cleanupCause) {
      throw new TrustedListingPhotoIngestionError("COMPENSATING_DELETE_FAILED", objectPath, {
        cause: new AggregateError(
          [metadataCause, cleanupCause],
          "Metadata persistence and compensating Storage cleanup both failed.",
        ),
      });
    }

    throw new TrustedListingPhotoIngestionError("METADATA_PERSIST_FAILED", objectPath, {
      cause: metadataCause,
    });
  }

  return metadata;
}

export async function createActiveListingPhotoSignedUrl(
  input: {
    listingId: string;
    photoId: string;
    expiresInSeconds?: number;
  },
  store: TrustedListingPhotoDeliveryStore,
): Promise<string | null> {
  const expiresInSeconds = input.expiresInSeconds ?? LISTING_PHOTO_SIGNED_URL_DEFAULT_SECONDS;
  assertSignedUrlTtl(expiresInSeconds);

  const expectedObjectPath = buildListingPhotoObjectPath(
    input.listingId,
    input.photoId,
    LISTING_PHOTO_SANITIZED_MIME_TYPE,
  );
  const metadata = await store.getDeliverablePhoto(input.listingId, input.photoId);

  if (
    !metadata ||
    metadata.listingId.toLowerCase() !== input.listingId.toLowerCase() ||
    metadata.photoId.toLowerCase() !== input.photoId.toLowerCase() ||
    metadata.objectPath !== expectedObjectPath ||
    metadata.mimeType !== LISTING_PHOTO_SANITIZED_MIME_TYPE ||
    !Number.isInteger(metadata.byteSize) ||
    metadata.byteSize <= 0 ||
    metadata.byteSize > LISTING_PHOTO_MAX_BYTES
  ) {
    return null;
  }

  return await store.createSignedUrl(metadata.objectPath, expiresInSeconds);
}
