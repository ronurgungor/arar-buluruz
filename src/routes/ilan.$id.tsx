import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { formatPrice } from "@/data/listings";
import { ALL_CITIES, ALL_DISTRICTS } from "@/lib/listing-search";
import { hasListingResultsHistory } from "@/lib/listing-return";
import { loadListingDetail } from "@/lib/public-listings";
import {
  PUBLIC_V0_DISABLED_CONTACT_HREF,
  TEST_ONLY_CONTACT,
  buildControlledWhatsAppHref,
} from "@/lib/prototype-contact";
import { buildPublicSellerContactActions } from "@/lib/public-seller-contact";

export const Route = createFileRoute("/ilan/$id")({
  loader: async ({ params }) => {
    const result = await loadListingDetail(params.id);
    if (result.state === "ready" && !result.listing) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.listing) {
      return {
        meta: [{ title: "İlan bulunamadı — Arar Buluruz" }, { name: "robots", content: "noindex" }],
      };
    }

    const { listing } = loaderData;
    const description = `${listing.title} — ${formatPrice(listing.price)} · ${listing.city}/${listing.district}`;
    return {
      meta: [
        { title: `${listing.title} — Arar Buluruz` },
        { name: "description", content: description },
        { property: "og:title", content: listing.title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ListingDetail,
});

const gate1TestOperationsEnabled = import.meta.env.VITE_GATE1_TEST_OPERATIONS === "enabled";

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
      search: {
        q: "",
        il: ALL_CITIES,
        ilce: ALL_DISTRICTS,
        sirala: "yeni",
      },
    });
  };

  if (!listing) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-2xl px-4 pb-16">
          <button
            type="button"
            data-testid="results-back"
            onClick={returnToResults}
            className="mt-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Sonuçlara dön
          </button>
          <div
            role="status"
            className="mt-8 rounded-2xl border border-border bg-card p-6 text-center"
          >
            <h1 className="text-lg font-bold text-foreground">İlan şu anda gösterilemiyor.</h1>
            <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
          </div>
        </main>
      </div>
    );
  }

  const publicContact = listing.publicContact;
  const publicContactActions = publicContact ? buildPublicSellerContactActions(publicContact) : [];

  const publicContactDisabled = !gate1TestOperationsEnabled;
  const fallbackWhatsAppHref = gate1TestOperationsEnabled
    ? buildControlledWhatsAppHref(
        `Merhaba, Arar Buluruz ilanı hakkında bilgi almak istiyorum. İlan ID: ${listing.id}`,
      )
    : PUBLIC_V0_DISABLED_CONTACT_HREF;
  const fallbackPhoneHref = gate1TestOperationsEnabled
    ? TEST_ONLY_CONTACT.phoneHref
    : PUBLIC_V0_DISABLED_CONTACT_HREF;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          data-testid="results-back"
          onClick={returnToResults}
          className="mt-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Sonuçlara dön
        </button>

        {listing.photos.length > 0 ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {listing.photos.map((photo: string, index: number) => (
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

        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">
          {listing.title}
        </h1>
        <p className="mt-1 text-3xl font-black text-primary">{formatPrice(listing.price)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {listing.city} / {listing.district}
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{listing.seller}</p>
        <p className="mt-4 leading-relaxed text-foreground">{listing.description}</p>

        <div className="mt-6">
          <Link
            to="/sikayet/$id"
            params={{ id: listing.id }}
            className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Şikâyet Et
          </Link>
        </div>
      </main>

      <div
        data-testid="detail-contact-bar"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto max-w-2xl px-4 py-3">
          {publicContactActions.length > 0 ? (
            <>
              <p className="mb-2 text-center text-xs text-muted-foreground">
                Satıcıyla doğrudan telefon veya WhatsApp üzerinden iletişim kurabilirsiniz.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {publicContactActions.map((action) => (
                  <a
                    key={action.kind}
                    href={action.href}
                    target={action.kind === "whatsapp" ? "_blank" : undefined}
                    rel={action.kind === "whatsapp" ? "noopener noreferrer" : undefined}
                    className="flex h-12 min-h-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-2 text-center text-xs text-muted-foreground">
                {gate1TestOperationsEnabled
                  ? "İletişim yalnız sentetik Gate 1 test hedefine yönlendirilir."
                  : "Demo sürümünde gerçek telefon ve WhatsApp iletişimi kapalıdır."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={fallbackPhoneHref}
                  aria-disabled={publicContactDisabled || undefined}
                  onClick={publicContactDisabled ? (event) => event.preventDefault() : undefined}
                  className="flex h-12 min-h-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Ara
                </a>
                <a
                  href={fallbackWhatsAppHref}
                  target={gate1TestOperationsEnabled ? "_blank" : undefined}
                  rel={gate1TestOperationsEnabled ? "noopener noreferrer" : undefined}
                  aria-disabled={publicContactDisabled || undefined}
                  onClick={publicContactDisabled ? (event) => event.preventDefault() : undefined}
                  className="flex h-12 min-h-12 items-center justify-center rounded-full border border-primary text-sm font-bold text-primary hover:bg-accent"
                >
                  WhatsApp
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
