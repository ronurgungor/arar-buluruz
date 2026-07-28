import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { AdSlot } from "@/components/AdSlot";
import { formatPrice, listings } from "@/data/listings";

export const Route = createFileRoute("/ilan/$id")({
  loader: ({ params }) => {
    const listing = listings.find((l) => l.id === params.id);
    if (!listing) throw notFound();
    return { listing };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "İlan bulunamadı — Arar Buluruz" }, { name: "robots", content: "noindex" }],
      };
    }
    const { listing } = loaderData;
    const desc = `${listing.title} — ${formatPrice(listing.price)} · ${listing.city}/${listing.district}`;
    return {
      meta: [
        { title: `${listing.title} — Arar Buluruz` },
        { name: "description", content: desc },
        { property: "og:title", content: listing.title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: ListingDetail,
});

function ListingDetail() {
  const { listing } = Route.useLoaderData();
  const [notice, setNotice] = useState(false);

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {listing.photos.map((p: string, i: number) => (
            <img
              key={i}
              src={p}
              alt={`${listing.title} fotoğraf ${i + 1}`}
              width={800}
              height={600}
              className="aspect-[4/3] w-full rounded-2xl object-cover"
            />
          ))}
        </div>

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
          <AdSlot />
        </div>

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
          {notice && (
            <p
              role="status"
              className="mb-2 rounded-xl bg-muted px-3 py-2 text-center text-xs text-muted-foreground"
            >
              Bu prototipte gerçek iletişim kapalıdır.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNotice(true)}
              className="flex h-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Ara
            </button>
            <button
              type="button"
              onClick={() => setNotice(true)}
              className="flex h-12 items-center justify-center rounded-full border border-primary text-sm font-bold text-primary hover:bg-accent"
            >
              WhatsApp
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
