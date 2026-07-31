// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// V0 is intentionally a synthetic/mock experience. Explicit CI or future approved
// environments may still override this with "disabled" or "supabase".
process.env.VITE_LISTINGS_SOURCE ??= "mock";

// Preserve the already-validated Gate 1 operational-flow checks only inside CI's
// ephemeral Supabase run. This flag is never enabled by the V0 build or publish path.
if (process.env.CI === "true" && process.env.VITE_LISTINGS_SOURCE === "supabase") {
  process.env.VITE_GATE1_TEST_OPERATIONS ??= "enabled";
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
