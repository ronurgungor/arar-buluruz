import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/sikayet/$id")({
  head: () => ({
    meta: [
      { title: "Şikâyet demosu — Arar Buluruz" },
      {
        name: "description",
        content: "V0 test sürümünde gerçek şikâyet veya moderasyon işlemi yapılmaz.",
      },
      { property: "og:title", content: "Şikâyet demosu — Arar Buluruz" },
      {
        property: "og:description",
        content: "V0 test sürümünde moderasyon işlemi kapalıdır.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Report,
});

function Report() {
  const { id } = Route.useParams();

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Şikâyet demosu</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold text-foreground">Gerçek şikâyet işlemi bu fazda kapalı.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            V0 moderasyonun sürdürülebilirliğini doğrulamaz. İlan ID’si {id} için herhangi bir kayıt,
            WhatsApp bildirimi veya kişisel veri işleme yapılmaz.
          </p>
          <Link
            to="/ilan/$id"
            params={{ id }}
            className="mt-5 flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            İlana dön
          </Link>
        </div>
      </main>
    </div>
  );
}
