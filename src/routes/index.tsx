import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { cities } from "@/data/listings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arar Buluruz — Ücretsiz ilan ver, aradığını hemen bul" },
      {
        name: "description",
        content:
          "Türkiye geneli ücretsiz ilan servisi. Ne aradığını yaz, kategori gezmeden bul. İlan vermek ücretsiz.",
      },
      { property: "og:title", content: "Arar Buluruz" },
      {
        property: "og:description",
        content: "Ne aradığını yaz, hemen bul. Ücretsiz ilan ver.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Tüm Türkiye");

  return (
    <main className="flex min-h-screen flex-col px-4">
      <div className="mx-auto flex w-full max-w-xl justify-end gap-2 py-4">
        <Link
          to="/ilan-ver"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          İlan Ver
        </Link>
        <Link
          to="/giris"
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Giriş
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center pb-24">
        <h1 className="text-center text-5xl font-black tracking-tight text-foreground sm:text-6xl">
          Arar Buluruz
        </h1>
        <p className="mt-3 text-center text-base text-muted-foreground">
          Ne arıyorsan yaz, gerisini biz bulalım.
        </p>

        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/ara", search: { q, il: city, sirala: "yeni" } });
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Örn. ikinci el traktör"
            aria-label="Ne arıyorsun?"
            className="h-16 w-full rounded-full border border-border bg-card px-6 text-lg shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Konum"
              className="h-12 w-full rounded-full border border-border bg-card px-4 text-sm font-medium outline-none focus:border-primary"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ara
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          İlan vermek her zaman ücretsiz.
        </p>
      </div>
    </main>
  );
}
