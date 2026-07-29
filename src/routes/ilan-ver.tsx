import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { cities, formatPrice } from "@/data/listings";

export const Route = createFileRoute("/ilan-ver")({
  head: () => ({
    meta: [
      { title: "Ücretsiz ilan ver — Arar Buluruz" },
      {
        name: "description",
        content: "Fotoğraf, başlık, fiyat ve konum ekle; ilanın dakikalar içinde yayında olsun.",
      },
      { property: "og:title", content: "Ücretsiz ilan ver — Arar Buluruz" },
      { property: "og:description", content: "Birkaç alanı doldur, ilanını yayınla." },
    ],
  }),
  component: PostListing,
});

const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary";

function PostListing() {
  const [sent, setSent] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(cities[1] ?? "");
  const [description, setDescription] = useState("");

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">İlan Ver</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ücretsiz. Birkaç alan yeterli.</p>

        {sent ? (
          <section
            aria-live="polite"
            className="mt-8 overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex aspect-[4/3] items-center justify-center bg-muted/60 text-sm text-muted-foreground">
              Fotoğraf önizlemesi
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                İlan önizlemesi
              </p>
              <h2 className="mt-2 text-xl font-extrabold leading-tight text-foreground">{title}</h2>
              <p className="mt-2 text-2xl font-black text-primary">{formatPrice(Number(price))}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{city}</p>
              {description.trim() && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {description}
                </p>
              )}

              <div className="mt-5 rounded-xl bg-muted px-3 py-2">
                <p className="text-sm font-semibold text-foreground">
                  Prototip — gerçek kayıt yapılmaz.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bu kart, ilanın yayınlandığında nasıl görüneceğini test etmek içindir.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-4 h-11 w-full rounded-full border border-border px-5 text-sm font-semibold hover:bg-accent"
              >
                İlanı düzenle
              </button>
            </div>
          </section>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <div>
              <span className="text-sm font-medium">Fotoğraflar</span>
              <div className="mt-1 grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${i + 1}. fotoğrafı ekle`}
                    className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-accent/50"
                  >
                    <Plus className="h-5 w-5" aria-hidden />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">En fazla 4 fotoğraf.</p>
            </div>

            <label className="block">
              <span className="text-sm font-medium">Başlık</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kısa ve net yaz"
                className={`mt-1 ${fieldClass}`}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Fiyat (TL)</span>
              <input
                required
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className={`mt-1 ${fieldClass}`}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Konum</span>
              <select
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`mt-1 ${fieldClass}`}
              >
                {cities.slice(1).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Açıklama</span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ürünün durumu, teslim şekli..."
                className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground hover:bg-primary/90"
            >
              Önizlemeyi göster
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Prototip — gerçek kayıt yapılmaz.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
