import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import {
  PILOT_DISTRICT,
  PILOT_PROVINCE,
  type PilotOperatorListing,
  type PilotOperatorResponse,
} from "@/lib/pilot-operator-contract";

const operatorUiEnabled = import.meta.env.VITE_PILOT_OPERATOR_UI === "enabled";

export const Route = createFileRoute("/kurucu")({
  beforeLoad: () => {
    if (!operatorUiEnabled) throw notFound();
  },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handlePilotOperatorRequest } = await import("../lib/pilot-operator-server");
        return handlePilotOperatorRequest(request);
      },
    },
  },
  head: () => ({
    meta: [
      { title: "Kurucu pilot işlemleri — Arar Buluruz" },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: FounderPilotOperator,
});

const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary";

async function callOperator(formData: FormData): Promise<PilotOperatorResponse> {
  let response: Response;
  try {
    response = await fetch("/kurucu", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
  } catch {
    return {
      ok: false,
      code: "BACKEND_UNAVAILABLE",
      message: "Kurucu işlem servisine ulaşılamadı.",
    };
  }

  try {
    return (await response.json()) as PilotOperatorResponse;
  } catch {
    return {
      ok: false,
      code: "OPERATION_FAILED",
      message: "Kurucu işlem servisi geçerli bir yanıt vermedi.",
    };
  }
}

function statusLabel(status: PilotOperatorListing["status"]): string {
  switch (status) {
    case "draft":
      return "Taslak";
    case "pending":
      return "İncelemede";
    case "published":
      return "Yayında";
    case "unpublished":
      return "Yayından kaldırıldı";
    case "rejected":
      return "Reddedildi";
  }
}

function FounderPilotOperator() {
  const [listings, setListings] = useState<PilotOperatorListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [publicationConfirmed, setPublicationConfirmed] = useState(false);
  const [expiryDays, setExpiryDays] = useState("30");
  const [photoName, setPhotoName] = useState("");
  const createFormRef = useRef<HTMLFormElement | null>(null);

  const refresh = async () => {
    const form = new FormData();
    form.set("action", "list");
    const result = await callOperator(form);
    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return false;
    }
    setListings(result.listings ?? []);
    setError("");
    setLoading(false);
    return true;
  };

  useEffect(() => {
    void refresh();
  }, []);

  const runListingAction = async (
    action: "publish" | "unpublish" | "reject" | "delete",
    listingId: string,
  ) => {
    setBusyId(listingId);
    setMessage("");
    setError("");
    const form = new FormData();
    form.set("action", action);
    form.set("listingId", listingId);
    if (action === "publish") {
      form.set("expiresInDays", expiryDays);
      if (contactConfirmed) form.set("contactControlConfirmed", "confirmed");
      if (publicationConfirmed) form.set("publicationInstructionConfirmed", "confirmed");
    }

    const result = await callOperator(form);
    if (result.ok) {
      setMessage(result.message);
      await refresh();
    } else {
      setError(result.message);
    }
    setBusyId(null);
  };

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyId) return;
    setBusyId("create");
    setMessage("");
    setError("");
    const result = await callOperator(new FormData(event.currentTarget));
    if (result.ok) {
      setMessage(result.message);
      createFormRef.current?.reset();
      setPhotoName("");
      await refresh();
    } else {
      setError(result.message);
    }
    setBusyId(null);
  };

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h1 className="text-2xl font-extrabold tracking-tight">Kurucu pilot işlemleri</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Bu yüzey yalnız yerel ve güvenilir founder oturumunda çalışır. Tarayıcıya service-role
            anahtarı verilmez. İlanlar önce incelemeye alınır; yayın ayrı bir işlemdir.
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            Pilot konumu: {PILOT_PROVINCE} / {PILOT_DISTRICT}
          </p>
        </div>

        {(message || error) && (
          <div
            role={error ? "alert" : "status"}
            className={`mt-4 rounded-xl border p-3 text-sm ${
              error
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-border bg-accent/50 text-foreground"
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="mt-6">
          <h2 className="text-lg font-bold">Yeni pending ilan</h2>
          <form
            ref={createFormRef}
            className="mt-3 grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2"
            onSubmit={submitCreate}
          >
            <input type="hidden" name="action" value="create" />
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">İlanda görünecek ad</span>
              <input
                required
                name="sellerDisplayName"
                minLength={2}
                maxLength={80}
                className={`mt-1 ${fieldClass}`}
                placeholder="Ad veya işletme adı"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Başlık</span>
              <input
                required
                name="title"
                minLength={3}
                maxLength={120}
                className={`mt-1 ${fieldClass}`}
                placeholder="Kısa ve net ilan başlığı"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Fiyat (TL)</span>
              <input
                required
                name="price"
                inputMode="decimal"
                pattern="[0-9]+([,.][0-9]{1,2})?"
                className={`mt-1 ${fieldClass}`}
                placeholder="0"
              />
            </label>
            <div className="block">
              <label htmlFor="operator-contact-channel" className="text-sm font-medium">
                İletişim kanalı
              </label>
              <select
                id="operator-contact-channel"
                required
                name="contactChannel"
                className={`mt-1 ${fieldClass}`}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Telefon</option>
              </select>
            </div>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Satıcı telefonu (E.164)</span>
              <input
                required
                name="contactE164"
                inputMode="tel"
                pattern="\+[1-9][0-9]{7,14}"
                className={`mt-1 ${fieldClass}`}
                placeholder="+905xxxxxxxxx"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Bu alan yalnız founder işlem yüzeyindedir. Yayın öncesinde numara kontrolü ayrıca
                teyit edilir.
              </span>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Açıklama</span>
              <textarea
                required
                name="description"
                minLength={10}
                maxLength={5000}
                rows={5}
                className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
                placeholder="Ürünün durumu ve önemli ayrıntılar"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Fotoğraf</span>
              <span className="mt-1 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-4 text-center hover:bg-muted/60">
                <ImagePlus aria-hidden className="h-6 w-6 text-muted-foreground" />
                <span className="mt-2 text-sm font-semibold">
                  {photoName || "JPEG, PNG veya WebP seç"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">En fazla 8 MB</span>
                <input
                  required
                  data-testid="operator-photo-input"
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => setPhotoName(event.currentTarget.files?.[0]?.name ?? "")}
                />
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Seçilen ham dosya server tarafında decode/re-encode edilerek WebP’ye dönüştürülür;
                yalnız sanitize edilmiş çıktı private Storage’a yazılır.
              </span>
            </label>
            <button
              type="submit"
              disabled={busyId !== null}
              className="h-12 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:col-span-2"
            >
              {busyId === "create" ? "Kaydediliyor…" : "Pending ilan ve fotoğrafı kaydet"}
            </button>
          </form>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Pilot ilanları</h2>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void refresh();
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"
            >
              <RefreshCw aria-hidden className="h-4 w-4" />
              Yenile
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex items-start gap-2 text-sm sm:col-span-1">
                <input
                  type="checkbox"
                  checked={contactConfirmed}
                  onChange={(event) => setContactConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>İletişim kontrolü tamamlandı</span>
              </label>
              <label className="flex items-start gap-2 text-sm sm:col-span-1">
                <input
                  type="checkbox"
                  checked={publicationConfirmed}
                  onChange={(event) => setPublicationConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>Yayın talimatı teyit edildi</span>
              </label>
              <label className="block text-sm sm:col-span-1">
                <span className="font-medium">Yayın süresi (gün)</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={expiryDays}
                  onChange={(event) => setExpiryDays(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Yayın işlemi en az bir private fotoğraf ve iki ayrı operasyonel teyit olmadan fail
              closed kalır.
            </p>
          </div>

          {loading ? (
            <div role="status" className="mt-4 rounded-2xl border border-border p-5 text-sm">
              İlan envanteri yükleniyor…
            </div>
          ) : listings.length === 0 ? (
            <div role="status" className="mt-4 rounded-2xl border border-border p-5 text-sm">
              Henüz pilot ilanı yok.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {listings.map((listing) => (
                <li
                  key={listing.id}
                  data-testid={`operator-listing-${listing.id}`}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground">{listing.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {listing.sellerDisplayName} · {listing.photoCount} fotoğraf · {listing.id}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {listing.contactChannel ?? "iletişim yok"} · {listing.contactE164 ?? "—"}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                      {statusLabel(listing.status)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(listing.status === "pending" || listing.status === "unpublished") && (
                      <button
                        type="button"
                        disabled={busyId !== null || !contactConfirmed || !publicationConfirmed}
                        onClick={() => void runListingAction("publish", listing.id)}
                        className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40"
                      >
                        Yayınla
                      </button>
                    )}
                    {listing.status === "pending" && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void runListingAction("reject", listing.id)}
                        className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-40"
                      >
                        Reddet
                      </button>
                    )}
                    {listing.status === "published" && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void runListingAction("unpublish", listing.id)}
                        className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-40"
                      >
                        Yayından kaldır
                      </button>
                    )}
                    {listing.status !== "published" && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Bu ilanı ve ilişkili private Storage objelerini kalıcı olarak silmek istiyor musunuz?",
                            )
                          ) {
                            void runListingAction("delete", listing.id);
                          }
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive disabled:opacity-40"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                        Sil
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
