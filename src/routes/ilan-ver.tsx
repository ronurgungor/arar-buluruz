import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/ilan-ver")({
  head: () => ({
    meta: [
      { title: "İlan verme demosu — Arar Buluruz" },
      {
        name: "description",
        content: "V0 test sürümünde gerçek ilan başvurusu veya kişisel veri girişi yapılmaz.",
      },
      { property: "og:title", content: "İlan verme demosu — Arar Buluruz" },
      {
        property: "og:description",
        content: "V0 test sürümünde ilan verme işlemi kapalıdır.",
      },
    ],
  }),
  component: PostListing,
});

function PostListing() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-8 text-2xl font-extrabold tracking-tight">İlan verme demosu</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold text-foreground">Gerçek ilan başvurusu bu fazda kapalı.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            V0 yalnız ürünün anlaşılmasını, arama ve ilan keşfi deneyimini doğrular. Bu ekranda
            kişisel bilgi veya ilan verisi girmeyin; hiçbir kayıt, WhatsApp başvurusu veya yayınlama
            işlemi yapılmaz.
          </p>
          <Link
            to="/"
            className="mt-5 flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Aramaya dön
          </Link>
        </div>
      </main>
    </div>
  );
}
