import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AdSlot } from "@/components/AdSlot";
import { cities, formatPrice } from "@/data/listings";
import { loadListingsCollection } from "@/lib/public-listings";

type Search = { q?: string; il?: string; ilce?: string; sirala?: "yeni" | "fiyat" | "yakin" };

const ALL_DISTRICTS = "Tüm ilçeler";

export const Route = createFileRoute("/ara")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === "string" ? search.q : "",
    il: typeof search.il === "string" ? search.il : "Tüm Türkiye",
    ilce: typeof search.ilce === "string" ? search.ilce : ALL_DISTRICTS,
    sirala: search.sirala === "fiyat" || search.sirala === "yakin" ? search.sirala : "yeni",
  }),
  loader: () => loadListingsCollection(),
  head: () => ({
    meta: [
      { title: "Arama sonuçları — Arar Buluruz" },
      {
        name: "description",
        content: "Aradığın ilanları fiyat ve konumla birlikte hızlıca gör.",
      },
      { property: "og:title", content: "Arama sonuçları — Arar Buluruz" },
      { property: "og:description", content: "Sade filtrelerle hızlı ilan arama." },
    ],
  }),
  component: SearchPage,
});

const sortLabels: Record<NonNullable<Search["sirala"]>, string> = {
  yeni: "En yeni",
  fiyat: "Fiyat",
  yakin: "Yakın (örnek)",
};

function SearchPage() {
  const { q, il, ilce, sirala } = Route.useSearch();
  const listingData = Route.useLoaderData();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");
  const isMockSource = listingData.source === "mock";
  const effectiveSort = sirala === "yakin" && !isMockSource ? "yeni" : sirala;
  const availableSorts: Array<keyof typeof sortLabels> = isMockSource
    ? ["yeni", "fiyat", "yakin"]
    : ["yeni", "fiyat"];

  useEffect(() => {
    setTerm(q ?? "");
  }, [q]);

  const hasCity = Boolean(il) && il !== "Tüm Türkiye";

  const districts = useMemo<string[]>(() => {
    if (!hasCity) return [];
    const unique = new Set<string>(
      listingData.listings
        .filter((listing: { city: string }) => listing.city === il)
        .map((listing: { district: string }) => listing.district)
        .filter(Boolean),
    );
    return [...unique].sort((a, b) => a.localeCompare(b, "tr"));
  }, [hasCity, il, listingData.listings]);

  const activeDistrict = hasCity && ilce && ilce !== ALL_DISTRICTS ? ilce : ALL_DISTRICTS;

  const results = useMemo(() => {
    const tokens: string[] = (q ?? "").trim().toLocaleLowerCase("tr").split(/\s+/).filter(Boolean);

    let list = listingData.listings.filter((listing) => {
      const searchableText = [listing.title, listing.description, ...listing.keywords]
        .join(" ")
        .toLocaleLowerCase("tr");
      const matchesTerm =
        tokens.length === 0 || tokens.every((token: string) => searchableText.includes(token));
      const matchesCity = !il || il === "Tüm Türkiye" || listing.city === il;
      const matchesDistrict =
        activeDistrict === ALL_DISTRICTS || listing.district === activeDistrict;
      return matchesTerm && matchesCity && matchesDistrict;
    });

    list = [...list];
    if (effectiveSort === "fiyat") list.sort((a, b) => a.price - b.price);
    else if (effectiveSort === "yakin") {
      list.sort(
        (a, b) =>
          (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
      );
    } else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [activeDistrict, effectiveSort, il, listingData.listings, q]);

  const setSearch = (patch: Partial<Search>) =>
    navigate({ to: "/ara", search: (prev: Search) => ({ ...prev, ...patch }) });


  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <form
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch({ q: term });
          }}
        >
          <div className="relative min-w-0">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              aria-label="Ne arıyorsun?"
              placeholder="Ne arıyorsun?"
              className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-base outline-none focus:border-primary"
            />
          </div>
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
            onChange={(event) => setSearch({ il: event.target.value, ilce: ALL_DISTRICTS })}
            aria-label="Konum"
            className="h-9 max-w-[45%] rounded-full border border-border bg-card px-3 text-sm font-medium outline-none focus:border-primary"
          >
            {cities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
          <select
            value={activeDistrict}
            disabled={!hasCity}
            onChange={(event) => setSearch({ ilce: event.target.value })}
            aria-label="İlçe"
            className="h-9 max-w-[45%] rounded-full border border-border bg-card px-3 text-sm font-medium outline-none focus:border-primary disabled:opacity-50"
          >
            <option>{ALL_DISTRICTS}</option>
            {districts.map((district) => (
              <option key={district}>{district}</option>
            ))}
          </select>

          {availableSorts.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSearch({ sirala: key })}
              className={`h-9 rounded-full border px-4 text-sm font-medium transition-colors ${
                effectiveSort === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              {sortLabels[key]}
            </button>
          ))}
        </div>

        {effectiveSort === "yakin" && isMockSource && (
          <p className="mt-2 text-xs text-muted-foreground">
            Mesafeler yalnız geliştirme prototipinde örnek veridir; gerçek konum kullanılmaz.
          </p>
        )}

        {listingData.state !== "ready" ? (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-border bg-card p-5 text-center"
          >
            <p className="font-semibold text-foreground">İlanlar henüz gösterilemiyor.</p>
            <p className="mt-1 text-sm text-muted-foreground">{listingData.message}</p>
          </div>
        ) : (
          <>
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-3 text-sm text-muted-foreground"
            >
              {results.length === 0 ? "Sonuç bulunamadı" : `${results.length} ilan bulundu`}
            </p>

            <ul className="mt-2 divide-y divide-border/70">
              {results.map((listing, index) => (
                <Fragment key={listing.id}>
                  <li className="py-2">
                    <Link
                      to="/ilan/$id"
                      params={{ id: listing.id }}
                      className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-accent/40"
                    >
                      {listing.photos[0] ? (
                        <img
                          src={listing.photos[0]}
                          alt={listing.title}
                          width={800}
                          height={600}
                          loading="lazy"
                          className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-28"
                        />
                      ) : (
                        <div
                          aria-label="Fotoğraf bulunmuyor"
                          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted px-2 text-center text-xs text-muted-foreground sm:h-24 sm:w-28"
                        >
                          Fotoğraf yok
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                          {listing.title}
                        </h2>
                        <p className="mt-0.5 text-base font-extrabold text-primary">
                          {formatPrice(listing.price)}
                        </p>
                        <p className="truncate text-[13px] text-muted-foreground">
                          {listing.city} / {listing.district}
                        </p>
                      </div>
                    </Link>
                  </li>
                  {isMockSource &&
                    (index + 1 === 4 || (index + 1 > 4 && (index + 1 - 4) % 6 === 0)) && (
                      <li className="py-4">
                        <AdSlot />
                      </li>
                    )}
                </Fragment>
              ))}
            </ul>

            {results.length === 0 && (
              <div className="mt-10 text-center">
                <p className="text-muted-foreground">Sonuç bulunamadı. Farklı bir kelime dene.</p>
                {il && il !== "Tüm Türkiye" && (
                  <button
                    type="button"
                    onClick={() => setSearch({ il: "Tüm Türkiye" })}
                    className="mt-4 h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    Tüm Türkiye'de ara
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
