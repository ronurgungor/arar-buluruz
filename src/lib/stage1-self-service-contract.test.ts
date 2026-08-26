import { describe, expect, test } from "bun:test";
import {
  STAGE1_CAPABILITY_TTL_SECONDS,
  STAGE1_CONTACT_PREFERENCES,
  STAGE1_MAX_PHOTOS,
  STAGE1_MAX_TOTAL_UPLOAD_BYTES,
  stage1CategorySchema,
  stage1ConditionSchema,
  stage1ContactPreferenceSchema,
  stage1E164Schema,
} from "./stage1-self-service-contract";

describe("Stage 1 self-service product contract", () => {
  test("keeps the accountless pilot photo and capability limits bounded", () => {
    expect(STAGE1_MAX_PHOTOS).toBe(8);
    expect(STAGE1_MAX_TOTAL_UPLOAD_BYTES).toBe(32 * 1024 * 1024);
    expect(STAGE1_CAPABILITY_TTL_SECONDS).toBe(30 * 60);
  });

  test("supports phone, WhatsApp and the combined preference", () => {
    expect(STAGE1_CONTACT_PREFERENCES).toEqual(["phone", "whatsapp", "phone_whatsapp"]);
    for (const value of STAGE1_CONTACT_PREFERENCES) {
      expect(stage1ContactPreferenceSchema.safeParse(value).success).toBe(true);
    }
  });

  test("keeps product fields broad rather than category-specific", () => {
    expect(stage1CategorySchema.safeParse("home").success).toBe(true);
    expect(stage1CategorySchema.safeParse("vehicle-engine-size").success).toBe(false);
    expect(stage1ConditionSchema.safeParse("good").success).toBe(true);
  });

  test("requires canonical E.164 seller phone values", () => {
    expect(stage1E164Schema.safeParse("+905551112233").success).toBe(true);
    expect(stage1E164Schema.safeParse("05551112233").success).toBe(false);
  });
});