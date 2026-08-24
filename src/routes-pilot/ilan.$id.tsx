import { createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { loadPilotListingDetail } from "@/build-profiles/pilot/public-listings";
import { ALL_CITIES, ALL_DISTRICTS } from "@/lib/listing-search";
import { hasListingResultsHistory } from "@/lib/listing-return";
import { buildPublicSellerContactHref, getPublicSellerContactLabel } from "@/lib/public-seller-contact";

const formatPrice = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

export const Route = createFileRoute("/ilan/$id")({
  loader: async ({ params }) => {
    const result = await loadPilotListingDetail(params.id);
    if (result.state === "ready" && !result.listing) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.listing) return { meta: [{ title: "İlan bulunamadı — Arar Buluruz" }, { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" }] };
    const { listing } = loaderData;
    const description = `${listing.title} — ${formatPrice(listing.price)} · ${listing.city}/${listing.district}`;
    return { meta: [{ title: `${listing.title} — Arar Buluruz` }, { name: "description", content: description }, { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" }] };
  },
  component: ListingDetail,
});

function ListingDetail() {
  const result = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const listing = result.listing;

  const returnToResults = () => {
    if (hasListingResultsHistory(router.state.location.state)) {
      router.history.back();
      return;
    }
    void navigate({ to: "/ara", replace: true, search: { q: "", il: ALL_CITIES, ilce: ALL_DISTRICTS, sirala: "yeni" } });
  };

  if (!listing) {
    return (
      <div className="min-h-screen">
        <PilotTopBar />
        <main className="mx-auto max-w-2xl px-4 pb-16">
          <button type="button" data-testid="results-back" onClick={returnToResults} className="mt-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-4 w-4" aria-hidden /> Sonuçlara dön
          </button>
          <div role="status" className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <h1 className="text-lg font-bold text-foreground">İlan şu anda gösterilemiyor.</h1>
            <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
          </div>
        </main>
      </div>
    );
  }

  const publicContactHref = listing.publicContact ? buildPublicSellerContactHref(listing.publicContact) : null;
  const publicContactLabel = listing.publicContact ? getPublicSellerContactLabel(listing.publicContact) : null;

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-2xl px-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <button type="button" data-testid="results-back" onClick={returnToResults} className="mt-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Sonuçlara dön
        </button>
        {listing.photos.length > 0 ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {listing.photos.map((photo, index) => <img key={photo} src={photo} alt={`${listing.title} fotoğraf ${index + 1}`} width={800} height={600} className="aspect-[4/3] w-full rounded-2xl object-cover" />)}
          </div>
        ) : (
          <div className="mt-2 flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">Bu pilot ilanında fotoğraf bulunmuyor.</div>
        )}
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">{listing.title}</h1>
        <p className="mt-1 text-3xl font-black text-primary">{formatPrice(listing.price)}</p>
        <p className="mt-2 text-sm text-muted-foreground">{listing.city} / {listing.district}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{listing.seller}</p>
        <p className="mt-4 leading-relaxed text-foreground">{listing.description}</p>
      </main>

      <div data-testid="detail-contact-bar" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {listing.publicContact && publicContactHref && publicContactLabel ? (
            <>
              <p className="mb-2 text-center text-xs text-muted-foreground">
                {listing.publicContact.channel === "whatsapp" ? "WhatsApp’a yönlendirileceksiniz; görüşme Arar Buluruz dışında gerçekleşir." : "Arama cihazınızın telefon uygulaması üzerinden gerçekleşir."}
              </p>
              <a href={publicContactHref} target={listing.publicContact.channel === "whatsapp" ? "_blank" : undefined} rel={listing.publicContact.channel === "whatsapp" ? "noopener noreferrer" : undefined} className="flex h-12 min-h-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90">
                {publicContactLabel}
              </a>
            </>
          ) : (
            <p className="rounded-xl border border-border bg-card p-3 text-center text-sm text-muted-foreground">Bu ilanda yayınlanmış satıcı iletişim bilgisi bulunmuyor.</p>
          )}
        </div>
      </div>
    </div>
  );
}
