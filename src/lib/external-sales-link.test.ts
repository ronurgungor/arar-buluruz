import { describe, expect, test } from "bun:test";
import {
  EXTERNAL_SALES_LINK_UI_COPY,
  areEquivalentExternalSalesLinks,
  createPendingExternalSalesFraudDimensions,
  getExternalSalesCta,
  isExternalSalesCtaEligible,
  resetExternalSalesReviewForLinkChange,
  validateExternalSalesLink,
  validateOptionalExternalSalesLink,
  type ExternalSalesFraudDimensions,
  type ExternalSalesInvalidReason,
} from "./external-sales-link";

function expectInvalid(input: string, reason?: ExternalSalesInvalidReason) {
  const result = validateExternalSalesLink(input);
  expect(result.classification).toBe("INVALID");
  if (reason && result.classification === "INVALID") expect(result.reason).toBe(reason);
  expect(result.provider).toBeNull();
  expect(result.canonicalUrl).toBeNull();
}

function fullyApprovedState(canonicalUrl: string): ExternalSalesFraudDimensions {
  return {
    canonicalUrl,
    urlSyntaxSecurity: "KNOWN_PROVIDER_CANDIDATE",
    providerIdentification: "shopier_candidate",
    urlOwnership: "confirmed",
    listingProductMatch: "matched",
    moderationStatus: "approved",
    complaintStatus: "clear",
    publicCtaDecision: "allow_public_cta",
  };
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

  test("treats normalized equivalents as the same canonical URL without globally banning reuse", () => {
    expect(
      areEquivalentExternalSalesLinks(
        "https://WWW.SHOPIER.COM.:443/item#section",
        "https://shopier.com/item",
      ),
    ).toBe(true);
    expect(
      areEquivalentExternalSalesLinks(
        "https://shopier.com/item?id=1",
        "https://shopier.com/item?id=2",
      ),
    ).toBe(false);
    expect(areEquivalentExternalSalesLinks("javascript:alert(1)", "https://shopier.com/item")).toBe(
      false,
    );
  });
});

describe("external sales public CTA fail-closed policy", () => {
  test("pending state blocks CTA and uses semantically explicit public control naming", () => {
    const result = validateExternalSalesLink("https://shopier.com/store/item");
    if (result.classification === "INVALID") throw new Error("Expected a valid candidate.");

    const pending = createPendingExternalSalesFraudDimensions(result);
    expect(pending).toEqual({
      canonicalUrl: "https://shopier.com/store/item",
      urlSyntaxSecurity: "KNOWN_PROVIDER_CANDIDATE",
      providerIdentification: "shopier_candidate",
      urlOwnership: "not_checked",
      listingProductMatch: "not_checked",
      moderationStatus: "pending",
      complaintStatus: "clear",
      publicCtaDecision: "block_public_cta",
    });
    expect(JSON.stringify(pending)).not.toContain('"killSwitch"');
    expect(getExternalSalesCta(result, pending)).toBeNull();
  });

  test("requires every eligibility dimension before producing a Shopier CTA", () => {
    const result = validateExternalSalesLink("https://shopier.com/store/item");
    if (result.classification === "INVALID") throw new Error("Expected a valid candidate.");

    const approved = fullyApprovedState(result.canonicalUrl);
    expect(isExternalSalesCtaEligible(result, approved)).toBe(true);
    expect(getExternalSalesCta(result, approved)).toEqual({
      label: "Satıcının Shopier sayfasına git",
      helper: "Haricî site: shopier.com",
      href: "https://shopier.com/store/item",
    });

    const blockedStates: ExternalSalesFraudDimensions[] = [
      { ...approved, canonicalUrl: "https://shopier.com/other" },
      { ...approved, providerIdentification: "custom_domain" },
      { ...approved, urlOwnership: "pending" },
      { ...approved, listingProductMatch: "mismatch" },
      { ...approved, moderationStatus: "pending" },
      { ...approved, complaintStatus: "open" },
      { ...approved, complaintStatus: "restricted" },
      { ...approved, publicCtaDecision: "block_public_cta" },
    ];

    for (const state of blockedStates) {
      expect(isExternalSalesCtaEligible(result, state)).toBe(false);
      expect(getExternalSalesCta(result, state)).toBeNull();
    }
  });

  test("requires the same full-state policy for a generic seller page", () => {
    const result = validateExternalSalesLink("https://seller.example.org/product/42");
    if (result.classification === "INVALID") throw new Error("Expected a valid candidate.");

    const approved: ExternalSalesFraudDimensions = {
      canonicalUrl: result.canonicalUrl,
      urlSyntaxSecurity: result.classification,
      providerIdentification: "custom_domain",
      urlOwnership: "confirmed",
      listingProductMatch: "matched",
      moderationStatus: "approved",
      complaintStatus: "clear",
      publicCtaDecision: "allow_public_cta",
    };

    expect(getExternalSalesCta(result, approved)).toEqual({
      label: "Satıcının satış sayfasına git",
      helper: "Haricî site: seller.example.org",
      href: "https://seller.example.org/product/42",
    });
  });

  test("link change resets every review dimension back to fail-closed", () => {
    const first = validateExternalSalesLink("https://shopier.com/store/item-a");
    const changed = validateExternalSalesLink("https://shopier.com/store/item-b");
    if (first.classification === "INVALID" || changed.classification === "INVALID") {
      throw new Error("Expected valid candidates.");
    }

    const oldApproved = fullyApprovedState(first.canonicalUrl);
    expect(getExternalSalesCta(first, oldApproved)).not.toBeNull();

    const reset = resetExternalSalesReviewForLinkChange(changed);
    expect(reset.canonicalUrl).toBe(changed.canonicalUrl);
    expect(reset.urlOwnership).toBe("not_checked");
    expect(reset.listingProductMatch).toBe("not_checked");
    expect(reset.moderationStatus).toBe("pending");
    expect(reset.complaintStatus).toBe("clear");
    expect(reset.publicCtaDecision).toBe("block_public_cta");
    expect(getExternalSalesCta(changed, reset)).toBeNull();
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
