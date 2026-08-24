import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search as SearchIcon } from "lucide-react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { loadPilotListingsCollection } from "@/build-profiles/pilot/public-listings";
import { locationCities } from "@/data/turkiye-locations";
import {
  ALL_CITIES,
  ALL_DISTRICTS,
  clampListingLocation,
  getDistrictsForCity,
  listingMatchesQuery,
} from "@/lib/listing-search";
import { LISTING_RESULTS_HISTORY_STATE } from "@/lib/listing-return";

type Search = { q?: string; il?: string; ilce?: string; sirala?: "yeni" | "fiyat" };

export const Route = createFileRoute("/ara")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === "string" ? search.q : "",
    il: typeof search.il === "string" ? search.il : ALL_CITIES,
    ilce: typeof search.ilce === "string" ? search.ilce : ALL_DISTRICTS,
    sirala: search.sirala === "fiyat" ? "fiyat" : "yeni",
  }),
  loader: () => loadPilotListingsCollection(),
  head: () => ({
    meta: [
      { title: "Arama sonuçları — Arar Buluruz" },
      { name: "description", content: "Aradığın ilanları fiyat ve konumla birlikte hızlıca gör." },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: SearchPage,
});

const sortLabels = { yeni: "En yeni", fiyat: "Fiyat" } as const;
const locationSelectClass = "h-11 w-full appearance-none rounded-full border border-border bg-card pl-3 pr-9 text-sm font-medium outline-none focus:border-primary disabled:opacity-50";
const formatPrice = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

function SearchPage() {
  const { q, il, ilce, sirala } = Route.useSearch();
  const listingData = Route.useLoaderData();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");
  const { city: activeCity, district: activeDistrict } = clampListingLocation({ city: il, district: ilce, validCities: locationCities });
  const hasCity = activeCity !== ALL_CITIES;
  const districts = useMemo(() => getDistrictsForCity(activeCity), [activeCity]);

  useEffect(() => setTerm(q ?? ""), [q]);
  useEffect(() => {
    if (il === activeCity && ilce === activeDistrict) return;
    void navigate({
      to: "/ara",
      replace: true,
      search: (previous: Search) => ({ ...previous, il: activeCity, ilce: activeDistrict }),
    });
  }, [activeCity, activeDistrict, il, ilce, navigate]);

  const results = useMemo(() => {
    const list = listingData.listings.filter((listing) => {
      const matchesTerm = listingMatchesQuery(listing, q ?? "");
      const matchesCity = activeCity === ALL_CITIES || listing.city === activeCity;
      const matchesDistrict = activeDistrict === ALL_DISTRICTS || listing.district === activeDistrict;
      return matchesTerm && matchesCity && matchesDistrict;
    });
    if (sirala === "fiyat") return [...list].sort((a, b) => a.price - b.price);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [activeCity, activeDistrict, listingData.listings, q, sirala]);

  const setSearch = (patch: Partial<Search>) =>
    void navigate({
      to: "/ara",
      search: (previous: Search) => ({ ...previous, il: activeCity, ilce: activeDistrict, ...patch }),
    });

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-4" onSubmit={(event) => { event.preventDefault(); setSearch({ q: term }); }}>
          <div className="relative min-w-0">
            <SearchIcon aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Ne arıyorsun?" placeholder="Ne arıyorsun?" className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-base outline-none focus:border-primary" />
          </div>
          <button type="submit" className="h-12 shrink-0 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">Ara</button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 max-w-[45%]">
            <select value={activeCity} onChange={(event) => setSearch({ il: event.target.value, ilce: ALL_DISTRICTS })} aria-label="Konum" className={locationSelectClass}>
              {locationCities.map((city) => <option key={city}>{city}</option>)}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="relative min-w-0 max-w-[45%]">
            <select value={activeDistrict} disabled={!hasCity} onChange={(event) => setSearch({ ilce: event.target.value })} aria-label="İlçe" className={locationSelectClass}>
              <option>{ALL_DISTRICTS}</option>
              {districts.map((district) => <option key={district}>{district}</option>)}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {(Object.keys(sortLabels) as Array<keyof typeof sortLabels>).map((key) => (
            <button key={key} type="button" onClick={() => setSearch({ sirala: key })} className={`h-11 rounded-full border px-4 text-sm font-medium transition-colors ${sirala === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent"}`}>
              {sortLabels[key]}
            </button>
          ))}
        </div>

        {listingData.state !== "ready" ? (
          <div role="status" className="mt-8 rounded-2xl border border-border bg-card p-5 text-center">
            <p className="font-semibold text-foreground">İlanlar henüz gösterilemiyor.</p>
            <p className="mt-1 text-sm text-muted-foreground">{listingData.message}</p>
          </div>
        ) : (
          <>
            <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-sm text-muted-foreground">
              {results.length === 0 ? "Sonuç bulunamadı" : `${results.length} ilan bulundu`}
            </p>
            <ul className="mt-2 divide-y divide-border/70">
              {results.map((listing) => (
                <li key={listing.id} className="py-2">
                  <Link to="/ilan/$id" params={{ id: listing.id }} state={(previous) => ({ ...previous, ...LISTING_RESULTS_HISTORY_STATE })} className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-accent/40">
                    {listing.photos[0] ? (
                      <img src={listing.photos[0]} alt={listing.title} width={800} height={600} loading="lazy" className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-28" />
                    ) : (
                      <div aria-label="Fotoğraf bulunmuyor" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted px-2 text-center text-xs text-muted-foreground sm:h-24 sm:w-28">Fotoğraf yok</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{listing.title}</h2>
                      <p className="mt-0.5 text-base font-extrabold text-primary">{formatPrice(listing.price)}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{listing.city} / {listing.district}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {results.length === 0 && (
              <div className="mt-10 text-center">
                <p className="text-muted-foreground">Sonuç bulunamadı. Farklı bir kelime dene.</p>
                {activeCity !== ALL_CITIES && <button type="button" onClick={() => setSearch({ il: ALL_CITIES, ilce: ALL_DISTRICTS })} className="mt-4 h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">Tüm Türkiye'de ara</button>}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
