import type { PilotContactChannel, PilotListingStatus } from "./pilot-operator-contract";

export type Stage1ModerationListing = {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  category: string;
  condition: string;
  sellerDisplayName: string;
  status: PilotListingStatus;
  contactChannel: PilotContactChannel | null;
  contactE164: string | null;
  phoneVerified: boolean;
  publicationInstructionRecorded: boolean;
  privateSellerDeclarationRecorded: boolean;
  contentRightsDeclarationRecorded: boolean;
  photoUrls: string[];
  createdAt: string;
  publishedAt: string | null;
  expiresAt: string | null;
  unpublishedAt: string | null;
};

export type Stage1ModerationResponse =
  | { ok: true; message: string; listings?: Stage1ModerationListing[]; listingId?: string }
  | {
      ok: false;
      code:
        | "NOT_ENABLED"
        | "LOCAL_ONLY"
        | "INVALID_REQUEST"
        | "INVALID_STATE"
        | "BACKEND_UNAVAILABLE"
        | "OPERATION_FAILED";
      message: string;
    };
