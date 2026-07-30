import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AdSlot } from "@/components/AdSlot";
import { formatPrice } from "@/data/listings";
import { loadListingDetail } from "@/lib/public-listings";
import { PROTOTYPE_CONTACT, buildControlledWhatsAppHref } from "@/lib/prototype-contact";

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

function ListingDetail() {
  const result = Route.useLoaderData();
  const router = useRouter();
  const listing = result.listing;

  if (!listing) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-2xl px-4 pb-16">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="mt-3 -ml-1 inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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

  const isMockSource = result.source === "mock";
  const whatsappHref = buildControlledWhatsAppHref(
    `Merhaba, Arar Buluruz ilanı hakkında bilgi almak istiyorum. İlan ID: ${listing.id}`,
  );

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => router.history.back()}
          className="mt-3 -ml-1 inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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

        {isMockSource && (
          <div className="mt-6">
            <AdSlot />
          </div>
        )}

        <div className="mt-6">
          <Link
            to="/sikayet/$id"
            params={{ id: listing.id }}
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Şikâyet Et
          </Link>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <p className="mb-2 text-center text-xs text-muted-foreground">
            İletişim, kontrollü merkezi Arar Buluruz hattına yönlendirilir.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={PROTOTYPE_CONTACT.phoneHref}
              className="flex h-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Ara
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center rounded-full border border-primary text-sm font-bold text-primary hover:bg-accent"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
