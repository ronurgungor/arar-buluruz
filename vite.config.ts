// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const buildProfiles = ["public-v0", "ci-disabled", "gate1-ephemeral-ci", "development"] as const;
type BuildProfile = (typeof buildProfiles)[number];

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

const buildProfile = resolveBuildProfile();
const isViteBuild = process.argv.includes("build");
const listingsSource = process.env.VITE_LISTINGS_SOURCE;

if (buildProfile === "public-v0") {
  if (!isViteBuild) {
    failBuildInvariant("The public-v0 profile may only be used with vite build.");
  }
  if (listingsSource !== "mock") {
    failBuildInvariant(
      `Public V0 requires VITE_LISTINGS_SOURCE=mock; received ${listingsSource ?? "unset"}.`,
    );
  }
  if (process.env.VITE_GATE1_TEST_OPERATIONS === "enabled") {
    failBuildInvariant("Public V0 must not enable Gate 1 test operations.");
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

  process.env.VITE_PUBLIC_V0_RUNTIME = "enabled";
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
  process.env.VITE_PUBLIC_V0_RUNTIME = "disabled";
} else if (buildProfile === "gate1-ephemeral-ci") {
  if (process.env.CI !== "true") {
    failBuildInvariant("The gate1-ephemeral-ci profile is restricted to CI.");
  }
  if (listingsSource !== "supabase") {
    failBuildInvariant(
      "The gate1-ephemeral-ci profile requires VITE_LISTINGS_SOURCE=supabase.",
    );
  }

  process.env.VITE_GATE1_TEST_OPERATIONS ??= "enabled";
  if (process.env.VITE_GATE1_TEST_OPERATIONS !== "enabled") {
    failBuildInvariant(
      "The gate1-ephemeral-ci profile requires VITE_GATE1_TEST_OPERATIONS=enabled.",
    );
  }
  process.env.VITE_PUBLIC_V0_RUNTIME = "disabled";
} else {
  const modeIndex = process.argv.indexOf("--mode");
  const isDevelopmentModeBuild = modeIndex >= 0 && process.argv[modeIndex + 1] === "development";
  if (isViteBuild && !isDevelopmentModeBuild) {
    failBuildInvariant("The development profile requires vite --mode development.");
  }
  process.env.VITE_LISTINGS_SOURCE ??= "mock";
  process.env.VITE_PUBLIC_V0_RUNTIME = "disabled";
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
