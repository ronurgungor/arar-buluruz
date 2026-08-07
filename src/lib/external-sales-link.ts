export const EXTERNAL_SALES_LINK_UI_COPY = {
  label: "Satış bağlantısı (isteğe bağlı)",
  helper:
    "Shopier gibi bir ödeme/kargo hizmetini veya kendi satış sayfanızı kullanıyorsanız bağlantısını ekleyebilirsiniz.",
  placeholder: "Örn. https://shopier.com/...",
} as const;

export const SHOPIER_EXACT_HOSTS = ["shopier.com", "www.shopier.com"] as const;

const MAX_EXTERNAL_SALES_URL_LENGTH = 2048;
const KNOWN_SHORTENER_HOSTS = new Set(["bit.ly", "goo.gl", "ow.ly", "t.co", "tinyurl.com"]);
const NON_PUBLIC_HOST_SUFFIXES = [
  "localhost",
  "localdomain",
  "local",
  "internal",
  "corp",
  "lan",
  "home",
  "home.arpa",
  "test",
  "invalid",
  "example",
  "onion",
  "arpa",
] as const;

export type ExternalSalesProviderId = "shopier";
export type ExternalSalesLinkClassification =
  | "INVALID"
  | "KNOWN_PROVIDER_CANDIDATE"
  | "CUSTOM_DOMAIN_REQUIRES_REVIEW";

export type ExternalSalesInvalidReason =
  | "EMPTY"
  | "URL_TOO_LONG"
  | "MALFORMED_URL"
  | "MALFORMED_PERCENT_ENCODING"
  | "HTTPS_REQUIRED"
  | "USERINFO_NOT_ALLOWED"
  | "ENCODED_AUTHORITY_NOT_ALLOWED"
  | "IP_LITERAL_NOT_ALLOWED"
  | "NON_PUBLIC_HOST_NOT_ALLOWED"
  | "CUSTOM_PORT_NOT_ALLOWED"
  | "IDNA_PROVIDER_ALIAS_NOT_ALLOWED"
  | "URL_SHORTENER_NOT_ALLOWED";

export type ExternalSalesReviewReason =
  | "CUSTOM_DOMAIN_REQUIRES_REVIEW"
  | "IDNA_HOST_REQUIRES_REVIEW";

export type ExternalSalesProviderCandidate = {
  id: ExternalSalesProviderId;
  canonicalHost: "shopier.com";
};

export type ExternalSalesLinkInvalid = {
  classification: "INVALID";
  reason: ExternalSalesInvalidReason;
  canonicalUrl: null;
  canonicalHost: null;
  provider: null;
  reviewReasons: readonly [];
};

export type ExternalSalesLinkValid = {
  classification: "KNOWN_PROVIDER_CANDIDATE" | "CUSTOM_DOMAIN_REQUIRES_REVIEW";
  canonicalUrl: string;
  canonicalHost: string;
  provider: ExternalSalesProviderCandidate | null;
  reviewReasons: readonly ExternalSalesReviewReason[];
};

export type ExternalSalesLinkValidation = ExternalSalesLinkInvalid | ExternalSalesLinkValid;

export type ExternalSalesOwnershipStatus = "not_checked" | "pending" | "confirmed" | "failed";
export type ExternalSalesListingMatchStatus = "not_checked" | "pending" | "matched" | "mismatch";
export type ExternalSalesModerationStatus = "pending" | "approved" | "rejected";
export type ExternalSalesComplaintStatus = "none" | "open" | "restricted";
export type ExternalSalesKillSwitchStatus = "enabled" | "disabled";

export type ExternalSalesFraudDimensions = {
  urlSyntaxSecurity: ExternalSalesLinkClassification;
  providerIdentification: "shopier_candidate" | "custom_domain";
  urlOwnership: ExternalSalesOwnershipStatus;
  listingProductMatch: ExternalSalesListingMatchStatus;
  moderationStatus: ExternalSalesModerationStatus;
  complaintStatus: ExternalSalesComplaintStatus;
  killSwitch: ExternalSalesKillSwitchStatus;
};

export type ExternalSalesCta = {
  label: string;
  helper: string;
  href: string;
};

const SHOPIER_PROVIDER: ExternalSalesProviderCandidate = {
  id: "shopier",
  canonicalHost: "shopier.com",
};

const PROVIDER_BY_EXACT_HOST = new Map<string, ExternalSalesProviderCandidate>(
  SHOPIER_EXACT_HOSTS.map((host): [string, ExternalSalesProviderCandidate] => [
    host,
    SHOPIER_PROVIDER,
  ]),
);

function invalid(reason: ExternalSalesInvalidReason): ExternalSalesLinkInvalid {
  return {
    classification: "INVALID",
    reason,
    canonicalUrl: null,
    canonicalHost: null,
    provider: null,
    reviewReasons: [],
  };
}

function normalizeHostname(hostname: string): string {
  let normalized = hostname.toLowerCase();
  while (normalized.endsWith(".")) normalized = normalized.slice(0, -1);
  return normalized;
}

function hasMalformedPercentEncoding(value: string): boolean {
  return /%(?![0-9a-f]{2})/i.test(value);
}

function containsNonAscii(value: string): boolean {
  return Array.from(value).some((character) => (character.codePointAt(0) ?? 0) > 0x7f);
}

function isIpv4Literal(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isIpLiteral(hostname: string): boolean {
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true;
  if (hostname.includes(":")) return true;
  return isIpv4Literal(hostname);
}

function isValidAsciiHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) return false;

  const labels = hostname.split(".");
  return labels.every((label) => {
    if (!label || label.length > 63) return false;
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
  });
}

function isNonPublicHostname(hostname: string): boolean {
  return NON_PUBLIC_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

function hasPunycodeLabel(hostname: string): boolean {
  return hostname.split(".").some((label) => label.startsWith("xn--"));
}

function createCanonicalUrl(url: URL, canonicalHost: string): string {
  const canonical = new URL(url.toString());
  canonical.hostname = canonicalHost;
  canonical.hash = "";
  return canonical.toString();
}

export function validateExternalSalesLink(rawInput: string): ExternalSalesLinkValidation {
  const input = rawInput.trim();
  if (!input) return invalid("EMPTY");
  if (input.length > MAX_EXTERNAL_SALES_URL_LENGTH) return invalid("URL_TOO_LONG");
  if (/\s/u.test(input) || input.includes("\\")) return invalid("MALFORMED_URL");
  if (hasMalformedPercentEncoding(input)) return invalid("MALFORMED_PERCENT_ENCODING");
  if (!/^https:\/\//i.test(input)) return invalid("HTTPS_REQUIRED");

  const authorityMatch = /^https:\/\/([^/?#]*)/i.exec(input);
  const rawAuthority = authorityMatch?.[1] ?? "";
  if (!rawAuthority) return invalid("MALFORMED_URL");
  if (rawAuthority.includes("%")) return invalid("ENCODED_AUTHORITY_NOT_ALLOWED");

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return invalid("MALFORMED_URL");
  }

  if (url.protocol !== "https:") return invalid("HTTPS_REQUIRED");
  if (url.username || url.password) return invalid("USERINFO_NOT_ALLOWED");
  if (url.port) return invalid("CUSTOM_PORT_NOT_ALLOWED");

  const normalizedHost = normalizeHostname(url.hostname);
  if (isIpLiteral(normalizedHost)) return invalid("IP_LITERAL_NOT_ALLOWED");
  if (!isValidAsciiHostname(normalizedHost) || isNonPublicHostname(normalizedHost)) {
    return invalid("NON_PUBLIC_HOST_NOT_ALLOWED");
  }
  if (KNOWN_SHORTENER_HOSTS.has(normalizedHost)) return invalid("URL_SHORTENER_NOT_ALLOWED");

  const provider = PROVIDER_BY_EXACT_HOST.get(normalizedHost) ?? null;
  const authorityHasNonAscii = containsNonAscii(rawAuthority);

  if (provider && authorityHasNonAscii) {
    return invalid("IDNA_PROVIDER_ALIAS_NOT_ALLOWED");
  }

  if (provider) {
    return {
      classification: "KNOWN_PROVIDER_CANDIDATE",
      canonicalUrl: createCanonicalUrl(url, provider.canonicalHost),
      canonicalHost: provider.canonicalHost,
      provider,
      reviewReasons: [],
    };
  }

  const reviewReasons: ExternalSalesReviewReason[] = ["CUSTOM_DOMAIN_REQUIRES_REVIEW"];
  if (authorityHasNonAscii || hasPunycodeLabel(normalizedHost)) {
    reviewReasons.push("IDNA_HOST_REQUIRES_REVIEW");
  }

  return {
    classification: "CUSTOM_DOMAIN_REQUIRES_REVIEW",
    canonicalUrl: createCanonicalUrl(url, normalizedHost),
    canonicalHost: normalizedHost,
    provider: null,
    reviewReasons,
  };
}

export function validateOptionalExternalSalesLink(
  rawInput: string | null | undefined,
): ExternalSalesLinkValidation | null {
  if (!rawInput?.trim()) return null;
  return validateExternalSalesLink(rawInput);
}

export function createPendingExternalSalesFraudDimensions(
  validation: ExternalSalesLinkValid,
): ExternalSalesFraudDimensions {
  return {
    urlSyntaxSecurity: validation.classification,
    providerIdentification: validation.provider ? "shopier_candidate" : "custom_domain",
    urlOwnership: "not_checked",
    listingProductMatch: "not_checked",
    moderationStatus: "pending",
    complaintStatus: "none",
    killSwitch: "enabled",
  };
}

export function getExternalSalesCta(
  validation: ExternalSalesLinkValid,
  moderationStatus: ExternalSalesModerationStatus,
): ExternalSalesCta | null {
  if (moderationStatus !== "approved") return null;

  if (validation.provider?.id === "shopier") {
    return {
      label: "Satıcının Shopier sayfasına git",
      helper: "Haricî site: shopier.com",
      href: validation.canonicalUrl,
    };
  }

  return {
    label: "Satıcının satış sayfasına git",
    helper: `Haricî site: ${validation.canonicalHost}`,
    href: validation.canonicalUrl,
  };
}
