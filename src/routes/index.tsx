import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { cities } from "@/data/listings";
import { Wordmark } from "@/components/Wordmark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Arar Buluruz — V0 test sürümü" },
      {
        name: "description",
        content:
          "Arama ve ilan keşfi deneyimini doğrulayan Arar Buluruz V0 test sürümü. İlanlar örnektir.",
      },
      {
        property: "og:title",
        content: "Arar Buluruz — V0 test sürümü",
      },
      {
        property: "og:description",
        content:
          "Arama ve ilan keşfi deneyimini doğrulayan test sürümü. Gerçek hesap veya ilan işlemi bulunmaz.",
      },
    ],
  }),
  component: Home,
});

const exampleSearches = ["traktör", "kiralık daire", "ikinci el masa", "oto"] as const;

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Tüm Türkiye");

  return (
    <main className="flex min-h-screen flex-col px-4">
      <div className="mx-auto flex w-full max-w-xl justify-end gap-2 py-4">
        <Link
          to="/ilan-ver"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          İlan Ver (demo)
        </Link>
        <Link
          to="/giris"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Giriş
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center pb-24">
        <h1 className="text-center">
          <Wordmark size="lg" />
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
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ne arıyorsun?"
              aria-label="Ne arıyorsun?"
              className="h-16 w-full rounded-full border border-border bg-card pl-13 pr-5 text-lg shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Konum"
              className="h-12 w-full min-w-0 rounded-full border border-border bg-card px-4 text-sm font-medium outline-none focus:border-primary"
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

        <div
          aria-label="Örnek aramalar"
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-xs font-medium text-muted-foreground">Örnek:</span>
          {exampleSearches.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() =>
                navigate({
                  to: "/ara",
                  search: { q: example, il: city, sirala: "yeni" },
                })
              }
              className="min-h-11 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              {example}
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hedefimiz: ilan vermek her zaman ücretsiz.
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link
            to="/gizlilik"
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 underline underline-offset-4 hover:text-foreground"
          >
            Gizlilik
          </Link>
        </p>
      </div>
    </main>
  );
}
