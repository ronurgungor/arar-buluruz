import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { loadPilotListingsCollection } from "@/build-profiles/pilot/public-listings";
import { AdSlot } from "@/components/AdSlot";
import {
  ProductFindingFilterSheet,
  countProductFindingActiveFilters,
} from "@/components/search/ProductFindingFilterSheet";
import {
  PRODUCT_TYPE_REGISTRY,
  SEARCH_SORTS,
  parseSearchRequestV1,
  transitionSearchRequestScope,
  type ContextualFacetFilter,
  type SearchRequestV1,
  type SearchSort,
} from "@/lib/product-finding-contract";
import {
  formatProductFieldValue,
  getListingContextFacts,
  getProductFieldUiDefinition,
} from "@/lib/product-finding-ui-contract";
import {
  normalizeProductFindingSearchUrlState,
  parseSearchRequestV1FromUrl,
  serializeSearchRequestV1ToUrl,
  type ProductFindingSearchUrlState,
} from "@/lib/product-finding-search-url";
import { executeSearchRequestV1, getDefaultSearchSort } from "@/lib/listing-search";
import {
  LISTING_RESULTS_HISTORY_STATE,
  rememberListingResultsScroll,
  restoreListingResultsScroll,
} from "@/lib/listing-return";
import { STAGE1_CATEGORY_LABELS } from "@/lib/stage1-self-service-contract";

export const Route = createFileRoute("/ara")({
  validateSearch: (search: Record<string, unknown>): ProductFindingSearchUrlState =>
    normalizeProductFindingSearchUrlState(search),
  loader: () => loadPilotListingsCollection(),
  head: () => ({
    meta: [
      { title: "Arama sonuçları — Arar Buluruz" },
      {
        name: "description",
        content: "Aradığın ilanları konum, fiyat ve ürün özellikleriyle birlikte hızlıca gör.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: SearchPage,
});

const sortLabels: Record<SearchSort, string> = {
  relevance: "İlgili",
  newest: "En yeni",
  price_asc: "Fiyat: düşükten yükseğe",
  price_desc: "Fiyat: yüksekten düşüğe",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);

function facetFilterLabel(
  request: SearchRequestV1,
  key: string,
  filter: ContextualFacetFilter,
): string | null {
  if (!request.productType) return null;
  const field = getProductFieldUiDefinition(request.productType, key);
  if (!field) return null;
  if (Array.isArray(filter)) {
    const labels = filter.flatMap((value) => {
      const formatted = formatProductFieldValue(field, value);
      return formatted ? [formatted] : [];
    });
    if (labels.length === 0) return null;
    return `${field.label}: ${labels[0]}${labels.length > 1 ? ` +${labels.length - 1}` : ""}`;
  }
  const min = filter.min === null ? null : formatProductFieldValue(field, filter.min);
  const max = filter.max === null ? null : formatProductFieldValue(field, filter.max);
  if (min && max) return `${field.label} ${min}–${max}`;
  if (min) return `${field.label} ≥ ${min}`;
  if (max) return `${field.label} ≤ ${max}`;
  return null;
}

function ResultsSkeleton() {
  return (
    <ul className="mt-3 space-y-3" aria-label="İlanlar yükleniyor">
      {[0, 1, 2].map((item) => (
        <li
          key={item}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
        >
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-muted sm:h-28 sm:w-36" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-5 w-2/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-card pl-3 pr-1.5 text-sm font-medium">
      <span className="max-w-[13rem] truncate">{label}</span>
      <button
        type="button"
        aria-label={`${label} filtresini kaldır`}
        onClick={onRemove}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-accent"
      >
        <X aria-hidden className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function SearchPage() {
  const search = Route.useSearch();
  const listingData = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [term, setTerm] = useState(search.q ?? "");
  const [navigating, setNavigating] = useState(false);

  const parsedState = useMemo(() => {
    try {
      return { request: parseSearchRequestV1FromUrl(search), error: null } as const;
    } catch {
      return { request: null, error: "Arama bağlantısındaki filtrelerden biri geçersiz." } as const;
    }
  }, [search]);
  const request = parsedState.request;

  useEffect(() => setTerm(search.q ?? ""), [search.q]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    restoreListingResultsScroll(`${window.location.pathname}${window.location.search}`);
  }, [search]);

  const navigateRequest = (nextRequest: SearchRequestV1) => {
    setNavigating(true);
    void navigate({
      to: "/ara",
      search: serializeSearchRequestV1ToUrl(nextRequest),
    }).finally(() => setNavigating(false));
  };

  const results = useMemo(() => {
    if (!request || listingData.state !== "ready") return [];
    return executeSearchRequestV1(listingData.listings, request);
  }, [listingData.listings, listingData.state, request]);

  const clearAllFilters = () => {
    const q = request?.q ?? term;
    navigateRequest(
      parseSearchRequestV1({
        version: 1,
        q,
        sort: request?.sort ?? getDefaultSearchSort(q),
      }),
    );
  };

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <div className="pt-5">
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">İlan ara</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ne aradığını yaz; gerekiyorsa yalnız sana uyan özellikleri filtrele.
          </p>
        </div>

        <form
          className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const base = request ?? parseSearchRequestV1({ version: 1 });
            navigateRequest(
              parseSearchRequestV1({
                ...base,
                q: term,
                sort: getDefaultSearchSort(term),
              }),
            );
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
              className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-base shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <button
            type="submit"
            className="h-12 shrink-0 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Ara
          </button>
        </form>

        {request ? (
          <>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              <ProductFindingFilterSheet
                request={request}
                listings={listingData.listings}
                onApply={navigateRequest}
              />
              <select
                aria-label="Sıralama"
                value={request.sort}
                onChange={(event) =>
                  navigateRequest(
                    parseSearchRequestV1({
                      ...request,
                      sort: event.target.value as SearchSort,
                    }),
                  )
                }
                className="h-11 shrink-0 rounded-full border border-border bg-card px-4 text-sm font-semibold shadow-sm outline-none focus:border-primary"
              >
                {SEARCH_SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {sortLabels[sort]}
                  </option>
                ))}
              </select>
            </div>

            {countProductFindingActiveFilters(request) > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {request.location.province ? (
                  <FilterChip
                    label={
                      request.location.district
                        ? `${request.location.province} / ${request.location.district}`
                        : request.location.province
                    }
                    onRemove={() =>
                      navigateRequest(
                        parseSearchRequestV1({
                          ...request,
                          location: { province: null, district: null },
                        }),
                      )
                    }
                  />
                ) : null}
                {request.price.min !== null || request.price.max !== null ? (
                  <FilterChip
                    label={
                      request.price.min !== null && request.price.max !== null
                        ? `Fiyat ${formatPrice(request.price.min)}–${formatPrice(request.price.max)}`
                        : request.price.min !== null
                          ? `Fiyat ≥ ${formatPrice(request.price.min)}`
                          : `Fiyat ≤ ${formatPrice(request.price.max ?? 0)}`
                    }
                    onRemove={() =>
                      navigateRequest(parseSearchRequestV1({ ...request, price: { min: null, max: null } }))
                    }
                  />
                ) : null}
                {request.category ? (
                  <FilterChip
                    label={STAGE1_CATEGORY_LABELS[request.category]}
                    onRemove={() =>
                      navigateRequest(
                        transitionSearchRequestScope(request, { category: null, productType: null }),
                      )
                    }
                  />
                ) : null}
                {request.productType ? (
                  <FilterChip
                    label={PRODUCT_TYPE_REGISTRY[request.productType].label}
                    onRemove={() =>
                      navigateRequest(
                        transitionSearchRequestScope(request, {
                          category: request.category,
                          productType: null,
                        }),
                      )
                    }
                  />
                ) : null}
                {Object.entries(request.contextual).map(([key, filter]) => {
                  const label = facetFilterLabel(request, key, filter);
                  if (!label) return null;
                  return (
                    <FilterChip
                      key={key}
                      label={label}
                      onRemove={() => {
                        const contextual = { ...request.contextual };
                        delete contextual[key];
                        navigateRequest(parseSearchRequestV1({ ...request, contextual }));
                      }}
                    />
                  );
                })}
              </div>
            ) : null}
          </>
        ) : null}

        {parsedState.error ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-center"
          >
            <p className="font-semibold text-destructive">Filtreler uygulanamadı.</p>
            <p className="mt-1 text-sm text-muted-foreground">{parsedState.error}</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-4 h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              Filtreleri temizle
            </button>
          </div>
        ) : listingData.state !== "ready" ? (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-border bg-card p-5 text-center"
          >
            <p className="font-semibold text-foreground">İlanlar henüz gösterilemiyor.</p>
            <p className="mt-1 text-sm text-muted-foreground">{listingData.message}</p>
            <button
              type="button"
              onClick={() => router.invalidate()}
              className="mt-4 h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Tekrar dene
            </button>
          </div>
        ) : navigating ? (
          <ResultsSkeleton />
        ) : (
          <>
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-5 text-sm font-medium text-muted-foreground"
            >
              {results.length === 0 ? "Sonuç bulunamadı" : `${results.length} ilan bulundu`}
            </p>
            <ul className="mt-3 space-y-3">
              {results.map((listing, index) => {
                const facts = getListingContextFacts(
                  listing.productType,
                  listing.productAttributes,
                  3,
                );
                return (
                  <Fragment key={listing.id}>
                    <li className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                      <Link
                        to="/ilan/$id"
                        params={{ id: listing.id }}
                        state={(previous) => ({ ...previous, ...LISTING_RESULTS_HISTORY_STATE })}
                        onClick={() => {
                          if (typeof window === "undefined") return;
                          rememberListingResultsScroll(
                            `${window.location.pathname}${window.location.search}`,
                            window.scrollY,
                          );
                        }}
                        className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/40 sm:gap-4"
                      >
                        {listing.photos[0] ? (
                          <img
                            src={listing.photos[0]}
                            alt={listing.title}
                            width={800}
                            height={600}
                            loading="lazy"
                            className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-36"
                          />
                        ) : (
                          <div
                            aria-label="Fotoğraf bulunmuyor"
                            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-muted px-2 text-center text-xs text-muted-foreground sm:h-28 sm:w-36"
                          >
                            Fotoğraf yok
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h2 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
                            {listing.title}
                          </h2>
                          <p className="mt-2 text-lg font-extrabold text-primary">
                            {listing.isFree ? "Ücretsiz" : formatPrice(listing.price)}
                          </p>
                          {facts.length > 0 ? (
                            <p className="mt-1 truncate text-[13px] font-medium text-foreground/75">
                              {facts.join(" · ")}
                            </p>
                          ) : null}
                          <p className="mt-1 truncate text-[13px] font-medium text-muted-foreground">
                            {listing.city} / {listing.district}
                          </p>
                        </div>
                      </Link>
                    </li>
                    {index === 2 && results.length >= 4 ? (
                      <AdSlot placement="search_infeed_1" container="li" />
                    ) : null}
                  </Fragment>
                );
              })}
            </ul>
            {results.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
                <p className="font-semibold text-foreground">Aramana uygun ilan bulamadık.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Filtreleri kendin kaldırabilir veya konumu genişletebilirsin; hiçbir filtre otomatik gevşetilmez.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {countProductFindingActiveFilters(request!) > 0 ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground"
                    >
                      Filtreleri temizle
                    </button>
                  ) : null}
                  {request?.location.province ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigateRequest(
                          parseSearchRequestV1({
                            ...request,
                            location: { province: null, district: null },
                          }),
                        )
                      }
                      className="h-11 rounded-full border border-border px-6 text-sm font-semibold hover:bg-accent"
                    >
                      Tüm Türkiye'de ara
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
