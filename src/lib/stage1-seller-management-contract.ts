import type { Stage1Category, Stage1Condition } from "./stage1-self-service-contract";

export type Stage1SellerListingStatus =
  | "pending"
  | "published"
  | "unpublished"
  | "rejected"
  | "sold";

export type Stage1SellerListing = {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  category: Stage1Category;
  condition: Stage1Condition | null;
  province: string;
  district: string;
  sellerDisplayName: string;
  status: Stage1SellerListingStatus;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  unpublishedAt: string | null;
  soldAt: string | null;
};

export type Stage1SellerManagementResponse =
  | {
      ok: true;
      action: "seller_list";
      listings: Stage1SellerListing[];
      message: string;
    }
  | {
      ok: true;
      action: "seller_updated" | "seller_unpublished" | "seller_sold" | "seller_deleted";
      listingId: string;
      message: string;
    }
  | {
      ok: false;
      code:
        | "NOT_ENABLED"
        | "VERIFICATION_REQUIRED"
        | "NOT_AUTHORIZED"
        | "INVALID_REQUEST"
        | "RATE_LIMITED"
        | "BACKEND_UNAVAILABLE"
        | "SUBMISSION_FAILED";
      message: string;
      retryAfterSeconds?: number;
    };
