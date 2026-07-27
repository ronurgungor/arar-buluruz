import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { AdSlot } from "@/components/AdSlot";
import { cities, formatPrice, listings } from "@/data/listings";

type Search = { q?: string; il?: string; sirala?: "yeni" | "fiyat" | "yakin" };

export const Route = createFileRoute("/ara")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === "string" ? search.q : "",
    il: typeof search.il === "string" ? search.il : "Tüm Türkiye",
    sirala:
      search.sirala === "fiyat" || search.sirala === "yakin"
        ? search.sirala
        : "yeni",
  }),
  head: () => ({
    meta: [
      { title: "İlan arama sonuçları — Arar Buluruz" },
      {
        name: "description",
        content: "Aradığın ilanları fotoğraf, fiyat ve konumla birlikte hızlıca gör.",
      },
      { property: "og:title", content: "İlan arama sonuçları — Arar Buluruz" },
      { property: "og:description", content: "Sade filtrelerle hızlı ilan arama." },
    ],
  }),
  component: SearchPage,
});

const sortLabels: Record<NonNullable<Search["sirala"]>, string> = {
  yeni: "En yeni",
  fiyat: "Fiyat",
  yakin: "Yakınımda",
};

function SearchPage() {
  const { q, il, sirala } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");

  const results = useMemo(() => {
    const needle = (q ?? "").trim().toLocaleLowerCase("tr");
    let list = listings.filter((l) => {
      const matchesTerm =
        !needle ||
        l.title.toLocaleLowerCase("tr").includes(needle) ||
        l.description.toLocaleLowerCase("tr").includes(needle);
      const matchesCity = !il || il === "Tüm Türkiye" || l.city === il;
      return matchesTerm && matchesCity;
    });
    list = [...list];
    if (sirala === "fiyat") list.sort((a, b) => a.price - b.price);
    else if (sirala === "yakin") list.sort((a, b) => a.distanceKm - b.distanceKm);
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [q, il, sirala]);

  const setSearch = (patch: Partial<Search>) =>
    navigate({ to: "/ara", search: (prev: Search) => ({ ...prev, ...patch }) });

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <form
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch({ q: term });
          }}
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Ne arıyorsun?"
            placeholder="Ne arıyorsun?"
            className="h-12 w-full rounded-full border border-border bg-card px-5 text-base outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="h-12 shrink-0 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Ara
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={il}
            onChange={(e) => setSearch({ il: e.target.value })}
            aria-label="Konum"
            className="h-9 rounded-full border border-border bg-card px-3 text-sm font-medium outline-none focus:border-primary"
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {(Object.keys(sortLabels) as Array<keyof typeof sortLabels>).map((key) => (
            <button
              key={key}
              onClick={() => setSearch({ sirala: key })}
              className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors ${
                sirala === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {sortLabels[key]}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {results.length} ilan bulundu
        </p>

        <ul className="mt-3 space-y-3">
          {results.map((l, i) => (
            <li key={l.id}>
              <Link
                to="/ilan/$id"
                params={{ id: l.id }}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md"
              >
                <img
                  src={l.photos[0]}
                  alt={l.title}
                  width={800}
                  height={600}
                  loading="lazy"
                  className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-32"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-base font-semibold text-foreground">
                    {l.title}
                  </h2>
                  <p className="mt-1 text-lg font-extrabold text-primary">
                    {formatPrice(l.price)}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {l.city} / {l.district}
                  </p>
                </div>
              </Link>
              {(i + 1 === 4 || (i + 1 > 4 && (i + 1 - 4) % 6 === 0)) && (
                <div className="mt-3">
                  <AdSlot />
                </div>
              )}
            </li>
          ))}
        </ul>

        {results.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            Sonuç bulunamadı. Farklı bir kelime deneyin.
          </p>
        )}
      </main>
    </div>
  );
}
