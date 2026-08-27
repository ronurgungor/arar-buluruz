import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import type {
  Stage1ModerationListing,
  Stage1ModerationResponse,
} from "@/lib/stage1-moderation-contract";
import {
  STAGE1_CATEGORY_LABELS,
  STAGE1_CONDITION_LABELS,
  STAGE1_CONTACT_LABELS,
  type Stage1Category,
  type Stage1Condition,
  type Stage1ContactPreference,
} from "@/lib/stage1-self-service-contract";

const operatorUiEnabled = import.meta.env.VITE_PILOT_OPERATOR_UI === "enabled";

export const Route = createFileRoute("/kurucu")({
  beforeLoad: () => {
    if (!operatorUiEnabled) throw notFound();
  },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleStage1ModerationRequest } = await import("../lib/stage1-moderation-server");
        return handleStage1ModerationRequest(request);
      },
    },
  },
  head: () => ({
    meta: [
      { title: "İlan moderasyonu — Arar Buluruz" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: FounderModeration,
});

async function callModeration(form: FormData): Promise<Stage1ModerationResponse> {
  try {
    const response = await fetch("/kurucu", {
      method: "POST",
      body: form,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    return (await response.json()) as Stage1ModerationResponse;
  } catch {
    return { ok: false, code: "BACKEND_UNAVAILABLE", message: "Moderasyon servisine ulaşılamadı." };
  }
}

function statusLabel(status: Stage1ModerationListing["status"]) {
  if (status === "pending") return "İncelemede";
  if (status === "published") return "Yayında";
  if (status === "unpublished") return "Yayından kaldırıldı";
  if (status === "rejected") return "Reddedildi";
  if (status === "sold") return "Satıldı";
  return "Taslak";
}

function FounderModeration() {
  const [listings, setListings] = useState<Stage1ModerationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    const form = new FormData();
    form.set("action", "list");
    const result = await callModeration(form);
    if (result.ok) {
      setListings(result.listings ?? []);
      setError("");
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const runAction = async (action: "unpublish" | "delete", listingId: string) => {
    setBusyId(listingId);
    setMessage("");
    setError("");
    const form = new FormData();
    form.set("action", action);
    form.set("listingId", listingId);
    const result = await callModeration(form);
    if (result.ok) {
      setMessage(result.message);
      await refresh();
    } else {
      setError(result.message);
    }
    setBusyId(null);
  };

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 pb-16">
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h1 className="text-2xl font-extrabold tracking-tight">İlan moderasyonu</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Satıcı doğrulanmış ilanını doğrudan yayınlar. Bu yerel ve güvenilir yüzey sonradan
            moderasyon, şikâyet inceleme ve gerektiğinde yayından kaldırma içindir.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void refresh();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"
            >
              <RefreshCw aria-hidden className="h-4 w-4" /> Yenile
            </button>
          </div>
        </section>

        {(message || error) && (
          <p
            role={error ? "alert" : "status"}
            className={`mt-4 rounded-xl border p-3 text-sm ${error ? "border-destructive/40 text-destructive" : "border-border bg-accent/40"}`}
          >
            {error || message}
          </p>
        )}

        {loading ? (
          <p role="status" className="mt-6 text-sm text-muted-foreground">
            Moderasyon kuyruğu yükleniyor…
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {listings.map((listing) => (
              <li
                key={listing.id}
                data-testid={`moderation-listing-${listing.id}`}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <div>
                    {listing.photoUrls[0] ? (
                      <img
                        src={listing.photoUrls[0]}
                        alt={`${listing.title} moderasyon fotoğrafı`}
                        className="aspect-[4/3] w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
                        Fotoğraf yok
                      </div>
                    )}
                    {listing.photoUrls.length > 1 && (
                      <div className="mt-2 grid grid-cols-3 gap-1">
                        {listing.photoUrls.slice(1, 4).map((url, index) => (
                          <img
                            key={url}
                            src={url}
                            alt={`${listing.title} fotoğraf ${index + 2}`}
                            className="aspect-square rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-lg font-bold">{listing.title}</h2>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                        {statusLabel(listing.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-extrabold text-primary">
                      {listing.isFree
                        ? "Ücretsiz"
                        : new Intl.NumberFormat("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                            maximumFractionDigits: 0,
                          }).format(listing.price)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {STAGE1_CATEGORY_LABELS[listing.category as Stage1Category] ??
                        listing.category}{" "}
                      ·{" "}
                      {STAGE1_CONDITION_LABELS[listing.condition as Stage1Condition] ??
                        listing.condition}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed">{listing.description}</p>
                    <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                      <strong className="text-foreground">Satıcı:</strong>{" "}
                      {listing.sellerDisplayName}
                      <br />
                      <strong className="text-foreground">İletişim:</strong>{" "}
                      {listing.contactChannel
                        ? STAGE1_CONTACT_LABELS[listing.contactChannel as Stage1ContactPreference]
                        : "Yok"}{" "}
                      · {listing.contactE164 ?? "Yok"}
                      <br />
                      <strong className="text-foreground">Telefon kontrolü:</strong>{" "}
                      {listing.phoneVerified ? "Tamam" : "Eksik"} ·{" "}
                      <strong className="text-foreground">Yayın talimatı:</strong>{" "}
                      {listing.publicationInstructionRecorded ? "Kayıtlı" : "Eksik"}
                      <br />
                      <strong className="text-foreground">Özel satıcı beyanı:</strong>{" "}
                      {listing.privateSellerDeclarationRecorded ? "Kayıtlı" : "Eksik"} ·{" "}
                      <strong className="text-foreground">İçerik hakları beyanı:</strong>{" "}
                      {listing.contentRightsDeclarationRecorded ? "Kayıtlı" : "Eksik"}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {listing.status === "published" && (
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => void runAction("unpublish", listing.id)}
                          className="h-11 rounded-full border border-border px-5 text-sm font-semibold disabled:opacity-50"
                        >
                          Yayından kaldır
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void runAction("delete", listing.id)}
                        className="inline-flex h-11 items-center gap-2 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive disabled:opacity-50"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" /> Sil
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
