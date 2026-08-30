import { describe, expect, test } from "bun:test";
import {
  STAGE1_MAX_PHOTOS,
  STAGE1_MAX_TOTAL_UPLOAD_BYTES,
  STAGE1_SELLER_SESSION_TTL_SECONDS,
  stage1CategorySchema,
  stage1ConditionSchema,
  stage1E164Schema,
} from "./stage1-self-service-contract";

describe("Stage 1 self-service product contract", () => {
  test("keeps photo limits bounded and seller recognition time-limited", () => {
    expect(STAGE1_MAX_PHOTOS).toBe(8);
    expect(STAGE1_MAX_TOTAL_UPLOAD_BYTES).toBe(32 * 1024 * 1024);
    expect(STAGE1_SELLER_SESSION_TTL_SECONDS).toBe(7 * 24 * 60 * 60);
  });

  test("keeps broad product values without making condition universal", () => {
    expect(stage1CategorySchema.safeParse("home").success).toBe(true);
    expect(stage1CategorySchema.safeParse("vehicle").success).toBe(true);
    expect(stage1CategorySchema.safeParse("vehicle-engine-size").success).toBe(false);
    expect(stage1ConditionSchema.safeParse("good").success).toBe(true);
    expect(stage1ConditionSchema.safeParse("").success).toBe(false);
  });

  test("requires canonical E.164 seller phone values", () => {
    expect(stage1E164Schema.safeParse("+905551112233").success).toBe(true);
    expect(stage1E164Schema.safeParse("05551112233").success).toBe(false);
  });
});
