// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const buildProfiles = [
  "public-v0",
  "pilot-rc",
  "ci-disabled",
  "gate1-ephemeral-ci",
  "development",
] as const;
type BuildProfile = (typeof buildProfiles)[number];

const discoveryProfiles = ["closed", "real-content"] as const;
type DiscoveryProfile = (typeof discoveryProfiles)[number];

function failBuildInvariant(message: string): never {
  throw new Error(`[Arar Buluruz build invariant] ${message}`);
}

function resolveBuildProfile(): BuildProfile {
  const configuredProfile = process.env.ARAR_BUILD_PROFILE;
  if (configuredProfile) {
    if (!buildProfiles.includes(configuredProfile as BuildProfile)) {
      failBuildInvariant(`Unknown ARAR_BUILD_PROFILE: ${configuredProfile}`);
    }
    return configuredProfile as BuildProfile;
  }

  const isViteBuild = process.argv.includes("build");
  const modeIndex = process.argv.indexOf("--mode");
  const isDevelopmentModeBuild = modeIndex >= 0 && process.argv[modeIndex + 1] === "development";
  const listingsSource = process.env.VITE_LISTINGS_SOURCE;

  if (process.env.CI === "true" && listingsSource === "supabase") {
    return "gate1-ephemeral-ci";
  }
  if (isViteBuild && process.env.CI === "true" && listingsSource === "disabled") {
    return "ci-disabled";
  }
  if (!isViteBuild || isDevelopmentModeBuild) return "development";
  return "public-v0";
}

function resolveDiscoveryProfile(): DiscoveryProfile {
  const configuredProfile = process.env.VITE_DISCOVERY_PROFILE;
  if (!configuredProfile) return "closed";
  if (!discoveryProfiles.includes(configuredProfile as DiscoveryProfile)) {
    failBuildInvariant(`Unknown VITE_DISCOVERY_PROFILE: ${configuredProfile}`);
  }
  return configuredProfile as DiscoveryProfile;
}

function requireSupabasePublicConfig(): void {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const publicKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !publicKey) {
    failBuildInvariant("Pilot release-candidate runtime requires public Supabase URL and key.");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    failBuildInvariant("Pilot release-candidate Supabase URL is invalid.");
  }
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    failBuildInvariant("Pilot release-candidate Supabase URL must use HTTPS outside local CI.");
  }
}

const buildProfile = resolveBuildProfile();
const discoveryProfile = resolveDiscoveryProfile();
const isViteBuild = process.argv.includes("build");
const listingsSource = process.env.VITE_LISTINGS_SOURCE;
const pilotOperatorUiEnabled = process.env.VITE_PILOT_OPERATOR_UI === "enabled";

if (buildProfile === "public-v0") {
  if (!isViteBuild) {
    failBuildInvariant("The public-v0 profile may only be used with vite build.");
  }
  if (discoveryProfile !== "closed") {
    failBuildInvariant("Public V0 must keep the discovery profile closed.");
  }
  if (listingsSource === undefined) {
    process.env.VITE_LISTINGS_SOURCE = "mock";
  } else if (listingsSource !== "mock") {
    failBuildInvariant(`Public V0 requires VITE_LISTINGS_SOURCE=mock; received ${listingsSource}.`);
  }
  if (process.env.VITE_GATE1_TEST_OPERATIONS === "enabled") {
    failBuildInvariant("Public V0 must not enable Gate 1 test operations.");
  }
  if (pilotOperatorUiEnabled) {
    failBuildInvariant("Public V0 must not expose the founder operator UI.");
  }
  if (process.env.VITE_PILOT_INTAKE_E164?.trim()) {
    failBuildInvariant("Public V0 must not embed the superseded founder intake contact.");
  }

  const errorBoundaryProbeEnabled = process.env.VITE_V0_ERROR_BOUNDARY_TEST === "enabled";
  const trustedBrowserTest =
    process.env.CI === "true" &&
    process.env.ARAR_V0_BROWSER_TEST === "enabled" &&
    process.env.NITRO_PRESET === "node-server";

  if (errorBoundaryProbeEnabled && !trustedBrowserTest) {
    failBuildInvariant(
      "The controlled error-boundary probe is allowed only in the isolated CI browser artifact.",
    );
  }

  process.env.VITE_ARAR_PRODUCT_PHASE = "v0";
  process.env.VITE_PUBLIC_V0_RUNTIME = "enabled";
  process.env.VITE_ARAR_BUILD_SIGNATURE = "public-v0|listings=mock|gate1=off|operator=off";
} else if (buildProfile === "pilot-rc") {
  if (!isViteBuild) {
    failBuildInvariant("The pilot-rc profile is a release-candidate build profile.");
  }
  if (listingsSource !== "supabase") {
    failBuildInvariant("The pilot-rc profile requires VITE_LISTINGS_SOURCE=supabase.");
  }
  if (discoveryProfile !== "closed") {
    failBuildInvariant("Synthetic pilot RC keeps search-engine discovery closed until activation.");
  }
  if (process.env.VITE_GATE1_TEST_OPERATIONS === "enabled") {
    failBuildInvariant("The pilot-rc profile must not enable Gate 1 test operations.");
  }
  if (pilotOperatorUiEnabled) {
    failBuildInvariant(
      "The public pilot-rc artifact must not expose the local founder operator UI.",
    );
  }
  requireSupabasePublicConfig();
  process.env.VITE_ARAR_PRODUCT_PHASE = "pilot-rc";
  process.env.VITE_PUBLIC_V0_RUNTIME = "disabled";
  process.env.VITE_ARAR_BUILD_SIGNATURE = "pilot-rc|listings=supabase|gate1=off|operator=off";
} else if (buildProfile === "ci-disabled") {
  if (!isViteBuild || process.env.CI !== "true") {
    failBuildInvariant("The ci-disabled profile is restricted to CI builds.");
  }
  if (listingsSource !== "disabled") {
    failBuildInvariant("The ci-disabled profile requires VITE_LISTINGS_SOURCE=disabled.");
  }
  if (process.env.VITE_GATE1_TEST_OPERATIONS === "enabled") {
    failBuildInvariant("The ci-disabled profile must not enable Gate 1 test operations.");
  }
  if (pilotOperatorUiEnabled) {
    failBuildInvariant("The ci-disabled profile must not expose the founder operator UI.");
  }
  process.env.VITE_ARAR_PRODUCT_PHASE = "v0";
  process.env.VITE_PUBLIC_V0_RUNTIME = "disabled";
  process.env.VITE_ARAR_BUILD_SIGNATURE = "ci-disabled|listings=disabled|gate1=off|operator=off";
} else if (buildProfile === "gate1-ephemeral-ci") {
  if (process.env.CI !== "true") {
    failBuildInvariant("The gate1-ephemeral-ci profile is restricted to CI.");
  }
  if (listingsSource !== "supabase") {
    failBuildInvariant("The gate1-ephemeral-ci profile requires VITE_LISTINGS_SOURCE=supabase.");
  }
  requireSupabasePublicConfig();

  process.env.VITE_GATE1_TEST_OPERATIONS ??= "enabled";
  if (process.env.VITE_GATE1_TEST_OPERATIONS !== "enabled") {
    failBuildInvariant(
      "The gate1-ephemeral-ci profile requires VITE_GATE1_TEST_OPERATIONS=enabled.",
    );
  }
  process.env.VITE_ARAR_PRODUCT_PHASE = "pilot-rc";
  process.env.VITE_PUBLIC_V0_RUNTIME = "disabled";
  process.env.VITE_ARAR_BUILD_SIGNATURE = `gate1-ephemeral-ci|listings=supabase|gate1=on|operator=${pilotOperatorUiEnabled ? "on" : "off"}`;
} else {
  const modeIndex = process.argv.indexOf("--mode");
  const isDevelopmentModeBuild = modeIndex >= 0 && process.argv[modeIndex + 1] === "development";
  if (isViteBuild && !isDevelopmentModeBuild) {
    failBuildInvariant("The development profile requires vite --mode development.");
  }
  process.env.VITE_LISTINGS_SOURCE ??= "mock";
  if (pilotOperatorUiEnabled) {
    if (process.env.VITE_LISTINGS_SOURCE !== "supabase") {
      failBuildInvariant("Local founder operator UI requires VITE_LISTINGS_SOURCE=supabase.");
    }
    requireSupabasePublicConfig();
    process.env.VITE_ARAR_PRODUCT_PHASE = "pilot-rc";
  } else {
    process.env.VITE_ARAR_PRODUCT_PHASE = "v0";
  }
  process.env.VITE_PUBLIC_V0_RUNTIME = "disabled";
  process.env.VITE_ARAR_BUILD_SIGNATURE = `development|listings=${process.env.VITE_LISTINGS_SOURCE}|gate1=off|operator=${pilotOperatorUiEnabled ? "on" : "off"}`;
}

if (discoveryProfile === "real-content" && process.env.VITE_LISTINGS_SOURCE !== "supabase") {
  failBuildInvariant("The real-content discovery profile requires VITE_LISTINGS_SOURCE=supabase.");
}

process.env.VITE_DISCOVERY_PROFILE = discoveryProfile;

const isPilotRcBuild = buildProfile === "pilot-rc";

export default defineConfig({
  tanstackStart: {
    server: { entry: isPilotRcBuild ? "server.pilot" : "server" },
    ...(isPilotRcBuild
      ? {
          router: {
            entry: "router.pilot.tsx",
            routesDirectory: "routes-pilot",
            generatedRouteTree: "routeTree.pilot.gen.ts",
          },
        }
      : {}),
  },
});