import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const CLOSED_ROBOTS = "noindex, nofollow, noarchive, nosnippet";
const buildSignature = import.meta.env.VITE_ARAR_BUILD_SIGNATURE ?? "unresolved";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Sayfa bulunamadı</h2>
        <p className="mt-2 text-sm text-muted-foreground">Aradığın sayfa yok ya da adresi değişmiş olabilir.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Bu sayfa yüklenemedi</h1>
        <p className="mt-2 text-sm text-muted-foreground">Bir sorun oluştu. Sayfayı yenilemeyi ya da ana sayfaya dönmeyi deneyebilirsin.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tekrar dene
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">
            Ana sayfaya dön
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#397a56" },
      { name: "application-name", content: "Arar Buluruz" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Arar Buluruz" },
      { name: "robots", content: CLOSED_ROBOTS },
      { name: "googlebot", content: CLOSED_ROBOTS },
      { title: "Arar Buluruz — Pilot sürümü" },
      { name: "description", content: "Çorlu pilotu için ilan keşfi ve satıcı iletişim akışının release-candidate sürümü." },
      { property: "og:title", content: "Arar Buluruz — Pilot sürümü" },
      { property: "og:description", content: "Çorlu pilotu için ilan keşfi ve satıcı iletişim akışının release-candidate sürümü." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png", sizes: "180x180" },
      { rel: "icon", href: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" data-arar-build-signature={buildSignature}>
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div role="note" className="border-b border-border bg-accent/70 px-4 py-2 text-center text-xs font-semibold text-accent-foreground">
        Pilot release candidate · Bu geliştirme ortamında yalnız sentetik test verisi kullanılır; gerçek veri girişi kapalıdır.
      </div>
      <Outlet />
    </QueryClientProvider>
  );
}
