import { z } from "zod";

export const STAGE1_MAX_PHOTOS = 8;
export const STAGE1_MAX_TOTAL_UPLOAD_BYTES = 32 * 1024 * 1024;
export const STAGE1_CAPABILITY_TTL_SECONDS = 30 * 60;

export const STAGE1_CATEGORIES = [
  "vehicle",
  "real-estate",
  "electronics",
  "home",
  "fashion",
  "hobby-sports",
  "baby-kids",
  "other",
] as const;

export const STAGE1_CONDITIONS = ["like_new", "good", "used", "needs_repair"] as const;
export const STAGE1_CONTACT_PREFERENCES = ["phone", "whatsapp", "phone_whatsapp"] as const;

export const stage1CategorySchema = z.enum(STAGE1_CATEGORIES);
export const stage1ConditionSchema = z.enum(STAGE1_CONDITIONS);
export const stage1ContactPreferenceSchema = z.enum(STAGE1_CONTACT_PREFERENCES);
export const stage1E164Schema = z.string().regex(/^\+[1-9][0-9]{7,14}$/);

export type Stage1Category = z.infer<typeof stage1CategorySchema>;
export type Stage1Condition = z.infer<typeof stage1ConditionSchema>;
export type Stage1ContactPreference = z.infer<typeof stage1ContactPreferenceSchema>;

export const STAGE1_CATEGORY_LABELS: Record<Stage1Category, string> = {
  vehicle: "Vasıta / Araç",
  "real-estate": "Emlak",
  electronics: "Elektronik",
  home: "Ev ve Yaşam",
  fashion: "Giyim / Aksesuar",
  "hobby-sports": "Hobi / Spor",
  "baby-kids": "Bebek / Çocuk",
  other: "Diğer",
};

export const STAGE1_CONDITION_LABELS: Record<Stage1Condition, string> = {
  like_new: "Yeni gibi",
  good: "İyi durumda",
  used: "Kullanılmış",
  needs_repair: "Onarım gerekli",
};

export const STAGE1_CONTACT_LABELS: Record<Stage1ContactPreference, string> = {
  phone: "Telefon",
  whatsapp: "WhatsApp",
  phone_whatsapp: "Telefon + WhatsApp",
};

export type Stage1SubmissionResponse =
  | {
      ok: true;
      action: "verification_started";
      challengeId: string;
      message: string;
    }
  | {
      ok: true;
      action: "phone_verified";
      capability: string;
      capabilityExpiresAt: string;
      message: string;
    }
  | {
      ok: true;
      action: "submitted";
      listingId: string;
      message: string;
    }
  | {
      ok: false;
      code:
        | "NOT_ENABLED"
        | "VERIFICATION_UNAVAILABLE"
        | "VERIFICATION_REQUIRED"
        | "NOT_AUTHORIZED"
        | "INVALID_REQUEST"
        | "RATE_LIMITED"
        | "IN_PROGRESS"
        | "BACKEND_UNAVAILABLE"
        | "SUBMISSION_FAILED";
      message: string;
      retryAfterSeconds?: number;
    };
