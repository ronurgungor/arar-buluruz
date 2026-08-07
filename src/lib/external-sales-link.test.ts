import { describe, expect, test } from "bun:test";
import {
  EXTERNAL_SALES_LINK_UI_COPY,
  createPendingExternalSalesFraudDimensions,
  getExternalSalesCta,
  validateExternalSalesLink,
  validateOptionalExternalSalesLink,
} from "./external-sales-link";

function expectInvalid(input: string, reason?: string) {
  const result = validateExternalSalesLink(input);
  expect(result.classification).toBe("INVALID");
  if (reason && result.classification === "INVALID") expect(result.reason).toBe(reason);
  expect(result.provider).toBeNull();
  expect(result.canonicalUrl).toBeNull();
}

describe("external sales UX contract", () => {
  test("keeps the founder-approved single-field copy exact", () => {
    expect(EXTERNAL_SALES_LINK_UI_COPY).toEqual({
      label: "Satış bağlantısı (isteğe bağlı)",
      helper:
        "Shopier gibi bir ödeme/kargo hizmetini veya kendi satış sayfanızı kullanıyorsanız bağlantısını ekleyebilirsiniz.",
      placeholder: "Örn. https://shopier.com/...",
    });
  });

  test("treats an empty optional field as absent instead of a URL decision", () => {
    expect(validateOptionalExternalSalesLink(undefined)).toBeNull();
    expect(validateOptionalExternalSalesLink("   ")).toBeNull();
  });
});

describe("external sales provider classification and canonicalization", () => {
  test("recognizes only the verified exact Shopier hosts as provider candidates", () => {
    const apex = validateExternalSalesLink("https://shopier.com/store/item");
    const www = validateExternalSalesLink("https://www.shopier.com/store/item");

    expect(apex).toMatchObject({
      classification: "KNOWN_PROVIDER_CANDIDATE",
      canonicalHost: "shopier.com",
      canonicalUrl: "https://shopier.com/store/item",
      provider: { id: "shopier", canonicalHost: "shopier.com" },
    });
    expect(www).toMatchObject({
      classification: "KNOWN_PROVIDER_CANDIDATE",
      canonicalHost: "shopier.com",
      canonicalUrl: "https://shopier.com/store/item",
      provider: { id: "shopier", canonicalHost: "shopier.com" },
    });
  });

  test("normalizes case, a trailing dot, the default HTTPS port and fragments", () => {
    const result = validateExternalSalesLink("https://WWW.SHOPIER.COM.:443/item?id=7#details");
    expect(result).toMatchObject({
      classification: "KNOWN_PROVIDER_CANDIDATE",
      canonicalHost: "shopier.com",
      canonicalUrl: "https://shopier.com/item?id=7",
    });
  });

  test("creates a reusable canonical representation for custom domains", () => {
    const result = validateExternalSalesLink("https://Sales.ExampleSeller.COM./urun/42#section");
    expect(result).toMatchObject({
      classification: "CUSTOM_DOMAIN_REQUIRES_REVIEW",
      canonicalHost: "sales.exampleseller.com",
      canonicalUrl: "https://sales.exampleseller.com/urun/42",
      provider: null,
      reviewReasons: ["CUSTOM_DOMAIN_REQUIRES_REVIEW"],
    });
  });

  test("never exposes an external CTA before moderation approval", () => {
    const result = validateExternalSalesLink("https://shopier.com/store/item");
    expect(result.classification).toBe("KNOWN_PROVIDER_CANDIDATE");
    if (result.classification === "INVALID") throw new Error("Expected a valid candidate.");

    expect(getExternalSalesCta(result, "pending")).toBeNull();
    expect(getExternalSalesCta(result, "rejected")).toBeNull();
    expect(getExternalSalesCta(result, "approved")).toEqual({
      label: "Satıcının Shopier sayfasına git",
      helper: "Haricî site: shopier.com",
      href: "https://shopier.com/store/item",
    });
  });

  test("keeps fraud dimensions separate instead of producing a verified boolean", () => {
    const result = validateExternalSalesLink("https://seller.example.com/item");
    expect(result.classification).toBe("CUSTOM_DOMAIN_REQUIRES_REVIEW");
    if (result.classification === "INVALID") throw new Error("Expected a review candidate.");

    expect(createPendingExternalSalesFraudDimensions(result)).toEqual({
      urlSyntaxSecurity: "CUSTOM_DOMAIN_REQUIRES_REVIEW",
      providerIdentification: "custom_domain",
      urlOwnership: "not_checked",
      listingProductMatch: "not_checked",
      moderationStatus: "pending",
      complaintStatus: "none",
      killSwitch: "enabled",
    });
  });
});

describe("external sales URL red-team baseline", () => {
  test("rejects non-HTTPS and protocol confusion", () => {
    expectInvalid("http://shopier.com/item", "HTTPS_REQUIRED");
    expectInvalid("ftp://shopier.com/item", "HTTPS_REQUIRED");
    expectInvalid("javascript:alert(1)", "HTTPS_REQUIRED");
    expectInvalid("https:////shopier.com/item", "MALFORMED_URL");
    expectInvalid("https:\\shopier.com\\item", "MALFORMED_URL");
  });

  test("does not recognize provider substrings or attacker-controlled suffixes", () => {
    const substring = validateExternalSalesLink("https://evilshopier.com/item");
    expect(substring.classification).toBe("CUSTOM_DOMAIN_REQUIRES_REVIEW");
    expect(substring.provider).toBeNull();

    expectInvalid("https://shopier.com.evil.example/item", "NON_PUBLIC_HOST_NOT_ALLOWED");
  });

  test("rejects userinfo and encoded-authority tricks", () => {
    expectInvalid("https://shopier.com@evil.example/item", "USERINFO_NOT_ALLOWED");
    expectInvalid("https://user:pass@shopier.com/item", "USERINFO_NOT_ALLOWED");
    expectInvalid("https://%73hopier.com/item", "ENCODED_AUTHORITY_NOT_ALLOWED");
    expectInvalid("https://shopier%2ecom/item", "ENCODED_AUTHORITY_NOT_ALLOWED");
  });

  test("keeps Unicode lookalikes and punycode out of known-provider classification", () => {
    const dotless = validateExternalSalesLink("https://shopıer.com/item");
    expect(dotless.classification).toBe("CUSTOM_DOMAIN_REQUIRES_REVIEW");
    expect(dotless.provider).toBeNull();
    if (dotless.classification !== "INVALID") {
      expect(dotless.canonicalHost).toBe("xn--shoper-s9a.com");
      expect(dotless.reviewReasons).toContain("IDNA_HOST_REQUIRES_REVIEW");
    }

    expectInvalid("https://ｓｈｏｐｉｅｒ.com/item", "IDNA_PROVIDER_ALIAS_NOT_ALLOWED");

    const explicitPunycode = validateExternalSalesLink("https://xn--shoper-s9a.com/item");
    expect(explicitPunycode.classification).toBe("CUSTOM_DOMAIN_REQUIRES_REVIEW");
    expect(explicitPunycode.provider).toBeNull();
    if (explicitPunycode.classification !== "INVALID") {
      expect(explicitPunycode.reviewReasons).toContain("IDNA_HOST_REQUIRES_REVIEW");
    }
  });

  test("rejects IPv4, alternate IPv4 spellings, IPv6 and localhost/internal hosts", () => {
    expectInvalid("https://8.8.8.8/item", "IP_LITERAL_NOT_ALLOWED");
    expectInvalid("https://192.168.1.10/item", "IP_LITERAL_NOT_ALLOWED");
    expectInvalid("https://2130706433/item", "IP_LITERAL_NOT_ALLOWED");
    expectInvalid("https://0177.0.0.1/item", "IP_LITERAL_NOT_ALLOWED");
    expectInvalid("https://[::1]/item", "IP_LITERAL_NOT_ALLOWED");
    expectInvalid("https://localhost/item", "NON_PUBLIC_HOST_NOT_ALLOWED");
    expectInvalid("https://seller.internal/item", "NON_PUBLIC_HOST_NOT_ALLOWED");
    expectInvalid("https://seller.local/item", "NON_PUBLIC_HOST_NOT_ALLOWED");
  });

  test("rejects non-default ports while accepting the normalized HTTPS default", () => {
    expectInvalid("https://shopier.com:444/item", "CUSTOM_PORT_NOT_ALLOWED");
    expect(validateExternalSalesLink("https://shopier.com:443/item")).toMatchObject({
      classification: "KNOWN_PROVIDER_CANDIDATE",
      canonicalUrl: "https://shopier.com/item",
    });
  });

  test("rejects malformed percent encoding and overlong input", () => {
    expectInvalid("https://seller.example.com/%ZZ", "MALFORMED_PERCENT_ENCODING");
    expectInvalid("https://seller.example.com/%", "MALFORMED_PERCENT_ENCODING");
    expectInvalid(`https://seller.example.com/${"a".repeat(2100)}`, "URL_TOO_LONG");
  });

  test("rejects exact known URL shorteners", () => {
    expectInvalid("https://bit.ly/example", "URL_SHORTENER_NOT_ALLOWED");
    expectInvalid("https://tinyurl.com/example", "URL_SHORTENER_NOT_ALLOWED");
    expectInvalid("https://t.co/example", "URL_SHORTENER_NOT_ALLOWED");
  });

  test("does not call a custom domain safe or verified", () => {
    const result = validateExternalSalesLink("https://merchant.example.org/product/1");
    expect(result.classification).toBe("CUSTOM_DOMAIN_REQUIRES_REVIEW");
    expect(result.provider).toBeNull();
    expect(JSON.stringify(result).toLowerCase()).not.toContain("verified");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("safe");
  });
});
