import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Eye, Trash2 } from "lucide-react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";
import {
  STAGE1_CATEGORIES,
  STAGE1_CATEGORY_LABELS,
  STAGE1_CONDITIONS,
  STAGE1_CONDITION_LABELS,
  type Stage1Category,
  type Stage1Condition,
  type Stage1SubmissionResponse,
} from "@/lib/stage1-self-service-contract";
import type {
  Stage1SellerListing,
  Stage1SellerManagementResponse,
} from "@/lib/stage1-seller-management-contract";

export const Route = createFileRoute("/ilanlarim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleStage1SelfServiceRequest } =
          await import("../lib/stage1-self-service-server");
        return handleStage1SelfServiceRequest(request);
      },
    },
  },
  head: () => ({
    meta: [
      { title: "İlanlarım — Arar Buluruz" },
      {
        name: "description",
        content: "Telefonunu doğrula; ilanlarını gör, düzenle veya yayından kaldır.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: SellerListings,
});

type SellerApiResponse = Stage1SubmissionResponse | Stage1SellerManagementResponse;
type EditingListing = Stage1SellerListing & { priceText: string };

const SELLER_PHONE_STORAGE_KEY = "arar-buluruz:last-seller-phone";
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const selectClass = `${fieldClass} appearance-none pr-10`;

async function postSeller(form: FormData): Promise<SellerApiResponse> {
  try {
    const response = await fetch("/ilanlarim", {
      method: "POST",
      body: form,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    return (await response.json()) as SellerApiResponse;
  } catch {
    return {
      ok: false,
      code: "BACKEND_UNAVAILABLE",
      message: "İlan yönetim servisine ulaşılamadı. Lütfen tekrar deneyin.",
    };
  }
}

function formatPrice(listing: Stage1SellerListing): string {
  if (listing.isFree) return "Ücretsiz";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(listing.price);
}

const statusLabels: Record<Stage1SellerListing["status"], string> = {
  pending: "Hazırlanıyor",
  published: "Yayında",
  unpublished: "Yayından kaldırıldı",
  rejected: "Kaldırıldı",
  sold: "Satıldı",
};

function SellerListings() {
  const [phone, setPhone] = useState("+90");
  const [hasAccess, setHasAccess] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [listings, setListings] = useState<Stage1SellerListing[]>([]);
  const [editing, setEditing] = useState<EditingListing | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const districts = useMemo(
    () => (editing ? getDistrictsForCity(editing.province) : []),
    [editing],
  );

  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem(SELLER_PHONE_STORAGE_KEY);
      if (remembered && E164_PATTERN.test(remembered)) setPhone(remembered);
    } catch {
      // Remembering the non-secret phone value is optional.
    }
  }, []);

  const rememberPhone = () => {
    try {
      window.localStorage.setItem(SELLER_PHONE_STORAGE_KEY, phone.trim());
    } catch {
      // The HttpOnly seller session remains authoritative even without this convenience value.
    }
  };

  const loadListings = async (): Promise<"loaded" | "verification_required" | "failed"> => {
    const form = new FormData();
    form.set("action", "seller_list");
    form.set("phone", phone.trim());
    const result = await postSeller(form);
    if (result.ok && result.action === "seller_list") {
      setListings(result.listings);
      setHasAccess(true);
      rememberPhone();
      return "loaded";
    }
    if (!result.ok && result.code === "VERIFICATION_REQUIRED") return "verification_required";
    if (!result.ok) setError(result.message);
    return "failed";
  };

  const begin = async () => {
    setError("");
    setNotice("");
    if (!E164_PATTERN.test(phone.trim())) {
      setError("Telefon numarasını +90 ile başlayan uluslararası biçimde girin.");
      return;
    }

    setBusy(true);
    const existing = await loadListings();
    if (existing === "loaded" || existing === "failed") {
      setBusy(false);
      return;
    }

    const form = new FormData();
    form.set("action", "start_verification");
    form.set("phone", phone.trim());
    const result = await postSeller(form);
    if (result.ok && result.action === "verification_started") {
      setChallengeId(result.challengeId);
      setCode("");
      setError("");
    } else if (!result.ok) {
      setError(result.message);
    }
    setBusy(false);
  };

  const verify = async () => {
    if (!challengeId || !/^\d{6}$/.test(code)) {
      setError("6 haneli doğrulama kodunu girin.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("action", "verify_phone");
    form.set("phone", phone.trim());
    form.set("challengeId", challengeId);
    form.set("code", code);
    const result = await postSeller(form);
    if (result.ok && result.action === "phone_verified") {
      setChallengeId("");
      await loadListings();
    } else if (!result.ok) {
      setError(result.message);
    }
    setBusy(false);
  };

  const mutate = async (
    action: "seller_unpublish" | "seller_sold" | "seller_delete",
    listingId: string,
  ) => {
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData();
    form.set("action", action);
    form.set("phone", phone.trim());
    form.set("listingId", listingId);
    const result = await postSeller(form);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    setDeleteConfirmId("");
    await loadListings();
    setNotice(result.message);
    setBusy(false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const normalizedPrice = Number(editing.priceText.replace(",", "."));
    if (
      !editing.isFree &&
      (!editing.priceText.trim() || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0)
    ) {
      setError("Geçerli bir fiyat girin veya Ücretsiz seçeneğini işaretleyin.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("action", "seller_update");
    form.set("phone", phone.trim());
    form.set("listingId", editing.id);
    form.set("category", editing.category);
    if (editing.condition) form.set("condition", editing.condition);
    form.set("priceMode", editing.isFree ? "free" : "priced");
    form.set("price", editing.isFree ? "0" : editing.priceText.trim());
    form.set("title", editing.title);
    form.set("description", editing.description);
    form.set("province", editing.province);
    form.set("district", editing.district);
    const result = await postSeller(form);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    setEditing(null);
    await loadListings();
    setNotice(result.message);
    setBusy(false);
  };

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <div className="mt-6">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">İlanlarım</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            İlan verdiğin telefonu doğrula; yayınlarını tek yerden yönet.
          </p>
        </div>

        {!hasAccess && (
          <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4">
              <h2 className="font-bold text-foreground">Telefonunla devam et</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Hesap veya şifre gerekmez. Bu cihazda doğrulaman hâlâ geçerliyse kod istemeden
                ilanlarını gösteririz.
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-medium">İlan verdiğin telefon</span>
              <input
                aria-label="İlanlarım telefon numarası"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setHasAccess(false);
                  setChallengeId("");
                  setError("");
                }}
                inputMode="tel"
                autoComplete="tel"
                className={`mt-1 ${fieldClass}`}
              />
            </label>
            {!challengeId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void begin()}
                className="mt-3 h-12 w-full rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Kontrol ediliyor…" : "İlanlarımı göster"}
              </button>
            ) : (
              <div className="mt-4">
                <label className="block">
                  <span className="text-sm font-medium">6 haneli doğrulama kodu</span>
                  <input
                    aria-label="İlanlarım doğrulama kodu"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={`mt-1 ${fieldClass}`}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void verify()}
                  className="mt-3 h-12 w-full rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Doğrulanıyor…" : "Doğrula ve ilanlarımı göster"}
                </button>
              </div>
            )}
          </section>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm"
          >
            {notice}
          </p>
        )}

        {hasAccess && !editing && (
          <section className="mt-6">
            {listings.length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
                <p className="font-bold">Bu telefonla yönetilen ilan bulunamadı.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Yeni bir ilan yayınladığında burada görünecek.
                </p>
                <Link
                  to="/ilan-ver"
                  className="mt-4 inline-flex text-sm font-semibold text-primary underline"
                >
                  Yeni ilan ver
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {listings.map((listing) => (
                  <li
                    key={listing.id}
                    data-testid={`seller-listing-${listing.id}`}
                    className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      {listing.photoUrls[0] ? (
                        <img
                          src={listing.photoUrls[0]}
                          alt={`${listing.title} yönetim fotoğrafı`}
                          className="h-24 w-28 shrink-0 rounded-xl object-cover sm:h-28 sm:w-36"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="line-clamp-2 min-w-0 flex-1 font-bold">{listing.title}</p>
                          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                            {statusLabels[listing.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-lg font-extrabold text-primary">
                          {formatPrice(listing)}
                        </p>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                          {listing.province} / {listing.district}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {listing.status === "published" && (
                        <a
                          href={`/ilan/${listing.id}`}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent"
                        >
                          <Eye aria-hidden className="h-4 w-4" />
                          Görüntüle
                        </a>
                      )}
                      {(listing.status === "published" || listing.status === "unpublished") && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              ...listing,
                              priceText: listing.isFree ? "" : String(listing.price),
                            })
                          }
                          className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent"
                        >
                          Düzenle
                        </button>
                      )}
                      {listing.status === "published" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void mutate("seller_unpublish", listing.id)}
                          className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold"
                        >
                          Yayından kaldır
                        </button>
                      )}
                      {(listing.status === "published" || listing.status === "unpublished") && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void mutate("seller_sold", listing.id)}
                          className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold"
                        >
                          Satıldı
                        </button>
                      )}
                      {deleteConfirmId !== listing.id ? (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(listing.id)}
                          className="min-h-11 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive"
                        >
                          Sil
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void mutate("seller_delete", listing.id)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden /> Evet, sil
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {editing && (
          <section className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="text-lg font-bold">İlanı düzenle</h2>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Başlık</span>
              <input
                aria-label="İlanlarım başlık"
                value={editing.title}
                onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                className={`mt-1 ${fieldClass}`}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Kategori</span>
                <div className="relative mt-1">
                  <select
                    aria-label="İlanlarım kategori"
                    value={editing.category}
                    onChange={(event) =>
                      setEditing({ ...editing, category: event.target.value as Stage1Category })
                    }
                    className={selectClass}
                  >
                    {STAGE1_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {STAGE1_CATEGORY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium">
                  Durum <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
                </span>
                <div className="relative mt-1">
                  <select
                    aria-label="İlanlarım durum"
                    value={editing.condition ?? ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        condition: event.target.value
                          ? (event.target.value as Stage1Condition)
                          : null,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="">Durum belirtme</option>
                    {STAGE1_CONDITIONS.map((value) => (
                      <option key={value} value={value}>
                        {STAGE1_CONDITION_LABELS[value]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Fiyat (TL)</span>
              <div className="relative mt-1">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground"
                >
                  ₺
                </span>
                <input
                  aria-label="İlanlarım fiyat"
                  disabled={editing.isFree}
                  value={editing.isFree ? "" : editing.priceText}
                  onChange={(event) => setEditing({ ...editing, priceText: event.target.value })}
                  inputMode="decimal"
                  placeholder={editing.isFree ? "" : "Örn. 12.500"}
                  className={`${fieldClass} pl-9 disabled:bg-muted`}
                />
              </div>
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={editing.isFree}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    isFree: event.target.checked,
                    priceText: "",
                  })
                }
              />
              Ücretsiz veriyorum
            </label>
            <label className="block">
              <span className="text-sm font-medium">
                Açıklama <span className="font-normal text-muted-foreground">(isteğe bağlı)</span>
              </span>
              <textarea
                aria-label="İlanlarım açıklama"
                rows={5}
                value={editing.description}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">İl</span>
                <div className="relative mt-1">
                  <select
                    aria-label="İlanlarım il"
                    value={editing.province}
                    onChange={(event) =>
                      setEditing({ ...editing, province: event.target.value, district: "" })
                    }
                    className={selectClass}
                  >
                    {locationCities.slice(1).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium">İlçe</span>
                <div className="relative mt-1">
                  <select
                    aria-label="İlanlarım ilçe"
                    value={editing.district}
                    onChange={(event) => setEditing({ ...editing, district: event.target.value })}
                    className={selectClass}
                  >
                    <option value="">İlçe seçin</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-12 rounded-full border border-border px-5 text-sm font-semibold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={busy || !editing.district}
                onClick={() => void saveEdit()}
                className="h-12 flex-1 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
