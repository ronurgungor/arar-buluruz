export const PILOT_PROVINCE = "Tekirdağ" as const;
export const PILOT_DISTRICT = "Çorlu" as const;

export const PILOT_LISTING_STATUSES = [
  "draft",
  "pending",
  "published",
  "unpublished",
  "rejected",
  "sold",
] as const;

export type PilotListingStatus = (typeof PILOT_LISTING_STATUSES)[number];
export type PilotContactChannel = "whatsapp" | "phone" | "phone_whatsapp";

export type PilotOperatorListing = {
  id: string;
  title: string;
  sellerDisplayName: string;
  status: PilotListingStatus;
  contactChannel: PilotContactChannel | null;
  contactE164: string | null;
  photoCount: number;
  createdAt: string;
  publishedAt: string | null;
  expiresAt: string | null;
  unpublishedAt: string | null;
};

export type PilotOperatorSuccess = {
  ok: true;
  message: string;
  listingId?: string;
  listings?: PilotOperatorListing[];
};

export type PilotOperatorFailure = {
  ok: false;
  message: string;
  code:
    | "NOT_ENABLED"
    | "LOCAL_ONLY"
    | "INVALID_REQUEST"
    | "INVALID_STATE"
    | "BACKEND_UNAVAILABLE"
    | "OPERATION_FAILED";
};

export type PilotOperatorResponse = PilotOperatorSuccess | PilotOperatorFailure;

export function isPilotListingStatus(value: unknown): value is PilotListingStatus {
  return typeof value === "string" && (PILOT_LISTING_STATUSES as readonly string[]).includes(value);
}
