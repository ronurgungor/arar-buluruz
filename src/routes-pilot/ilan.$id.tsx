import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { CLOSED_ROBOTS, robotsContent } from "@/build-profiles/pilot/public-discovery";
import { loadPilotListingDetail } from "@/build-profiles/pilot/public-listings";
import { AdSlot } from "@/components/AdSlot";
import { ALL_CITIES, ALL_DISTRICTS } from "@/lib/listing-search";
import { hasListingResultsHistory } from "@/lib/listing-return";
import { buildPublicSellerContactActions } from "@/lib/public-seller-contact";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);

export const Route = createFileRoute("/ilan/$id")({
  loader: async ({ params }) => {
    const result = await loadPilotListingDetail(params.id);
    if (result.state === "ready" && !result.listing) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.listing)
      return {
        meta: [
          { title: "İlan bulunamadı — Arar Buluruz" },
          { name: "robots", content: CLOSED_ROBOTS },
        ],
      };
    const { listing } = loaderData;
    const description = `${listing.title} — ${formatPrice(listing.price)} · ${listing.city}/${listing.district}`;
    const robots = robotsContent(true);
    return {
      meta: [
        { title: `${listing.title} — Arar Buluruz` },
        { name: "description", content: description },
        ...(robots ? [{ name: "robots", content: robots }] : []),
      ],
    };
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
    void navigate({
      to: "/ara",
      replace: true,
      search: { q: "", il: ALL_CITIES, ilce: ALL_DISTRICTS, sirala: "yeni" },
    });
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
            <button type="button" onClick={() => router.invalidate()} className="mt-4 h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90">Tekrar dene</button>
          </div>
        </main>
      </div>
    );
  }

  const contactActions = listing.publicContact ? buildPublicSellerContactActions(listing.publicContact) : [];
  const [heroPhoto, ...additionalPhotos] = listing.photos;

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-2xl px-4 pb-[calc(11rem+env(safe-area-inset-bottom))]">
        <button type="button" data-testid="results-back" onClick={returnToResults} className="mt-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Sonuçlara dön
        </button>

        {heroPhoto ? (
          <div className="mt-2">
            <img src={heroPhoto} alt={`${listing.title} fotoğraf 1`} width={800} height={600} className="aspect-[4/3] w-full rounded-2xl object-cover" />
            {additionalPhotos.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {additionalPhotos.map((photo, index) => (
                  <img key={photo} src={photo} alt={`${listing.title} fotoğraf ${index + 2}`} width={800} height={600} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">Bu ilanda fotoğraf bulunmuyor.</div>
        )}

        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">{listing.title}</h1>
        <p className="mt-1 text-3xl font-black text-primary">{formatPrice(listing.price)}</p>
        <p className="mt-2 text-sm text-muted-foreground">{listing.city} / {listing.district}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{listing.seller}</p>
        <p className="mt-4 leading-relaxed text-foreground">{listing.description}</p>

        <AdSlot placement="detail_after_description" className="mt-6" />

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Satıcı iletişim bilgisi yalnız bu ilan hakkında iletişim kurmanız için paylaşılmıştır; reklam, pazarlama veya ilgisiz amaçlarla kullanmayın.
        </p>

        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <Link to="/sikayet/$id" params={{ id: listing.id }} className="font-semibold text-primary underline underline-offset-4">Yanlış telefon / kişisel veri / ilan bildir</Link>
          <Link to="/iletisim" className="font-semibold text-primary underline underline-offset-4">İletişim ve kaldırma</Link>
        </div>
      </main>

      <div data-testid="detail-contact-bar" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {contactActions.length > 0 ? (
            <div className={`grid gap-2 ${contactActions.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {contactActions.map((action) => (
                <a key={action.kind} href={action.href} rel={action.kind === "whatsapp" ? "noopener noreferrer" : undefined} className="flex h-12 min-h-12 items-center justify-center rounded-full bg-primary px-3 text-center text-sm font-bold text-primary-foreground hover:bg-primary/90">
                  {action.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card p-3 text-center text-sm text-muted-foreground">Bu ilanda yayınlanmış iletişim bilgisi bulunmuyor.</p>
          )}
        </div>
      </div>
    </div>
  );
}
