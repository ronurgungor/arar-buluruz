import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { cities } from "@/data/listings";

export const Route = createFileRoute("/ilan-ver")({
  head: () => ({
    meta: [
      { title: "Ücretsiz ilan ver — Arar Buluruz" },
      {
        name: "description",
        content: "Fotoğraf, başlık, fiyat ve konum ekle; ilanın dakikalar içinde yayında olsun.",
      },
      { property: "og:title", content: "Ücretsiz ilan ver — Arar Buluruz" },
      { property: "og:description", content: "Birkaç alan doldur, ilanını yayınla." },
    ],
  }),
  component: PostListing,
});

const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary";

function PostListing() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-xl px-4 pb-16">
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">İlan Ver</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ücretsiz. Birkaç alan yeterli.</p>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-primary/30 bg-accent/50 p-6">
            <p className="font-semibold text-foreground">İlanın hazır (önizleme).</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bu bir prototip; ilan henüz kaydedilmiyor.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 h-11 rounded-full border border-border px-5 text-sm font-semibold hover:bg-accent"
            >
              Yeni ilan
            </button>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <label className="block">
              <span className="text-sm font-medium">Fotoğraf</span>
              <div className="mt-1 flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-sm text-muted-foreground">
                Fotoğraf eklemek için dokun
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Başlık</span>
              <input required placeholder="Kısa ve net yaz" className={`mt-1 ${fieldClass}`} />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Fiyat (TL)</span>
              <input required inputMode="numeric" placeholder="0" className={`mt-1 ${fieldClass}`} />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Konum</span>
              <select className={`mt-1 ${fieldClass}`}>
                {cities.slice(1).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Açıklama</span>
              <textarea
                rows={5}
                placeholder="Ürünün durumu, teslim şekli..."
                className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground hover:bg-primary/90"
            >
              Yayınla
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
