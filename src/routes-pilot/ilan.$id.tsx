import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { loadPilotListingDetail } from "@/build-profiles/pilot/public-listings";
import { ALL_CITIES, ALL_DISTRICTS } from "@/lib/listing-search";
import { hasListingResultsHistory } from "@/lib/listing-return";

const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

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
          { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
        ],
      };
    const { listing } = loaderData;
    const description = `${listing.title} — ${formatPrice(listing.price)} · ${listing.city}/${listing.district}`;
    return {
      meta: [
        { title: `${listing.title} — Arar Buluruz` },
        { name: "description", content: description },
        { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
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
          <button
            type="button"
            data-testid="results-back"
            onClick={returnToResults}
            className="mt-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
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

  const phoneE164 =
    listing.publicContact?.channel === "phone" && E164_PATTERN.test(listing.publicContact.e164)
      ? listing.publicContact.e164
      : null;

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-2xl px-4 pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          data-testid="results-back"
          onClick={returnToResults}
          className="mt-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Sonuçlara dön
        </button>

        {listing.photos.length > 0 ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {listing.photos.map((photo, index) => (
              <img
                key={photo}
                src={photo}
                alt={`${listing.title} fotoğraf ${index + 1}`}
                width={800}
                height={600}
                className="aspect-[4/3] w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="mt-2 flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
            Bu pilot ilanında fotoğraf bulunmuyor.
          </div>
        )}

        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">{listing.title}</h1>
        <p className="mt-1 text-3xl font-black text-primary">{formatPrice(listing.price)}</p>
        <p className="mt-2 text-sm text-muted-foreground">{listing.city} / {listing.district}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{listing.seller}</p>
        <p className="mt-4 leading-relaxed text-foreground">{listing.description}</p>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <h2 className="font-bold">İletişim kullanım sınırı</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Bu iletişim bilgisi yalnız bu ilan hakkında iletişim için paylaşılmıştır; reklam,
            pazarlama veya ilgisiz amaçlarla kullanmayın.
          </p>
        </section>

        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <Link
            to="/sikayet/$id"
            params={{ id: listing.id }}
            className="font-semibold text-primary underline underline-offset-4"
          >
            Yanlış telefon / kişisel veri / ilan bildir
          </Link>
          <Link to="/iletisim" className="font-semibold text-primary underline underline-offset-4">
            İletişim ve kaldırma
          </Link>
        </div>
      </main>

      <div
        data-testid="detail-contact-bar"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto max-w-2xl px-4 py-3">
          {phoneE164 ? (
            <>
              <p className="mb-2 text-center text-xs text-muted-foreground">
                Arama cihazınızın telefon uygulaması üzerinden gerçekleşir. WhatsApp Stage 1–3
                pilotunda kapalıdır.
              </p>
              <a
                href={`tel:${phoneE164}`}
                className="flex h-12 min-h-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                Satıcıyı ara
              </a>
            </>
          ) : (
            <p className="rounded-xl border border-border bg-card p-3 text-center text-sm text-muted-foreground">
              Bu ilanda Stage 1–3 için uygun yayınlanmış telefon bilgisi bulunmuyor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
