import type { ProductType } from "./product-finding-contract";
import { resolveProductComplianceScope } from "./product-finding-contract";
import type { Stage1Category } from "./stage1-self-service-contract";

export const SELLER_ROLES = [
  "unknown",
  "private_occasional",
  "professional",
  "regulated_business",
] as const;
export type SellerRole = (typeof SELLER_ROLES)[number];

export const LISTING_POLICY_SCOPES = [
  "ordinary",
  "eids_vehicle",
  "eids_real_estate",
  "review_required",
  "restricted",
] as const;
export type ListingPolicyScope = (typeof LISTING_POLICY_SCOPES)[number];

export const LISTING_LIFECYCLE_STATES = [
  "draft",
  "active",
  "sold",
  "withdrawn",
  "expired",
  "deleted",
] as const;
export type ListingLifecycleState = (typeof LISTING_LIFECYCLE_STATES)[number];

export const LISTING_ELIGIBILITY_STATES = [
  "eligible",
  "review_required",
  "regulated_verification_required",
  "blocked",
] as const;
export type ListingEligibilityState = (typeof LISTING_ELIGIBILITY_STATES)[number];

export const LISTING_ENFORCEMENT_STATES = ["clear", "held", "removed"] as const;
export type ListingEnforcementState = (typeof LISTING_ENFORCEMENT_STATES)[number];

export const LISTING_CONTACT_STATES = ["available", "suppressed"] as const;
export type ListingContactState = (typeof LISTING_CONTACT_STATES)[number];

export const INTENT_AUTHORITY = [
  "legal_publication_availability",
  "explicit_user_scope_and_filters",
  "high_confidence_inferred_intent",
  "free_text_relevance",
] as const;

export const FACT_AUTHORITY = [
  "regulatory_or_provider_verified",
  "validated_seller_structured",
  "deterministic_derived_or_external",
  "free_text_claim",
] as const;

export const PRODUCT_FINDING_EXECUTION_ORDER = [
  "eligibility",
  "product_role_scope",
  "hard_filters",
  "text_relevance",
  "sort",
] as const;

export type ListingCapabilityInput = Readonly<{
  lifecycle: ListingLifecycleState;
  eligibility: ListingEligibilityState;
  enforcement: ListingEnforcementState;
  contact: ListingContactState;
  policyScope: ListingPolicyScope;
  publicationReady: boolean;
  publicationInstructionPresent: boolean;
  notExpired: boolean;
}>;

export type ListingPublicCapabilities = Readonly<{
  searchIndex: boolean;
  detail: boolean;
  signedPhoto: boolean;
  publicContact: boolean;
  externalCta: boolean;
}>;

export function classifyListingPolicyScopeDeterministically(input: {
  category: Stage1Category;
  productType: ProductType | null;
}): ListingPolicyScope {
  if (input.category === "other" && input.productType === null) return "review_required";
  return resolveProductComplianceScope(input);
}

export function deriveListingPublicCapabilities(
  input: ListingCapabilityInput,
): ListingPublicCapabilities {
  const legalScopeResolved = input.policyScope !== "review_required" && input.policyScope !== "restricted";
  const publicBase =
    input.publicationReady &&
    input.publicationInstructionPresent &&
    input.notExpired &&
    input.lifecycle === "active" &&
    input.eligibility === "eligible" &&
    input.enforcement === "clear" &&
    legalScopeResolved;

  // Until contact is projected through a separate public row shape, suppression is deliberately
  // conservative: no public surface remains available that could expose the contact columns.
  const publicExposure = publicBase && input.contact === "available";

  return {
    searchIndex: publicExposure,
    detail: publicExposure,
    signedPhoto: publicExposure,
    publicContact: publicExposure,
    externalCta: publicExposure,
  };
}
