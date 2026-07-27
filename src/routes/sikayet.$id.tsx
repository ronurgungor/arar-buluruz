import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/sikayet/$id")({
  head: () => ({
    meta: [
      { title: "İlanı şikâyet et — Arar Buluruz" },
      { name: "description", content: "Kurallara aykırı ilanları bize bildir." },
      { property: "og:title", content: "İlanı şikâyet et — Arar Buluruz" },
      { property: "og:description", content: "Kurallara aykırı ilanları bildir." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Report,
});

const reasons = ["Yanıltıcı ilan", "Yasak ürün", "Yanlış fiyat", "Sahte satıcı", "Diğer"];

function Report() {
  const { id } = Route.useParams();
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Şikâyet Et</h1>
        {sent ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <p className="font-semibold">Bildirimin alındı.</p>
            <Link
              to="/ilan/$id"
              params={{ id }}
              className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4"
            >
              İlana dön
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Sebep</legend>
              {reasons.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <input type="radio" name="reason" defaultChecked={r === reasons[0]} />
                  {r}
                </label>
              ))}
            </fieldset>
            <textarea
              rows={4}
              placeholder="Kısa açıklama (isteğe bağlı)"
              className="w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
            />
            <button className="h-12 w-full rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Gönder
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
