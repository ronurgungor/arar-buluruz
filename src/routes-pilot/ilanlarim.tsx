import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";
import {
  STAGE1_CATEGORIES,
  STAGE1_CATEGORY_LABELS,
  STAGE1_CONDITIONS,
  STAGE1_CONDITION_LABELS,
  STAGE1_CONTACT_LABELS,
  STAGE1_CONTACT_PREFERENCES,
  type Stage1Category,
  type Stage1Condition,
  type Stage1ContactPreference,
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
type CachedCapability = { phone: string; token: string; expiresAt: string };

const CAPABILITY_STORAGE_KEY = "arar-buluruz:stage1-phone-capability";
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const selectClass = `${fieldClass} appearance-none`;

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

function readCapability(phone: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(CAPABILITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCapability;
    if (parsed.phone !== phone || Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return parsed.token;
  } catch {
    return null;
  }
}

function storeCapability(phone: string, token: string, expiresAt: string): void {
  try {
    window.sessionStorage.setItem(
      CAPABILITY_STORAGE_KEY,
      JSON.stringify({ phone, token, expiresAt } satisfies CachedCapability),
    );
  } catch {
    // Capability persistence is only a convenience; the verified in-memory value still works.
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
  const [capability, setCapability] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [listings, setListings] = useState<Stage1SellerListing[]>([]);
  const [editing, setEditing] = useState<Stage1SellerListing | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const districts = useMemo(
    () => (editing ? getDistrictsForCity(editing.province) : []),
    [editing],
  );

  const loadListings = async (activeCapability: string) => {
    const form = new FormData();
    form.set("action", "seller_list");
    form.set("phone", phone.trim());
    form.set("capability", activeCapability);
    const result = await postSeller(form);
    if (result.ok && result.action === "seller_list") {
      setListings(result.listings);
      setCapability(activeCapability);
      setNotice(result.message);
      return true;
    }
    if (!result.ok) setError(result.message);
    return false;
  };

  const begin = async () => {
    setError("");
    setNotice("");
    if (!E164_PATTERN.test(phone.trim())) {
      setError("Telefon numarasını +90 ile başlayan uluslararası biçimde girin.");
      return;
    }
    const cached = readCapability(phone.trim());
    if (cached) {
      setBusy(true);
      const loaded = await loadListings(cached);
      setBusy(false);
      if (loaded) return;
    }

    setBusy(true);
    const form = new FormData();
    form.set("action", "start_verification");
    form.set("phone", phone.trim());
    const result = await postSeller(form);
    if (result.ok && result.action === "verification_started") {
      setChallengeId(result.challengeId);
      setCode("");
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
      storeCapability(phone.trim(), result.capability, result.capabilityExpiresAt);
      setChallengeId("");
      await loadListings(result.capability);
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
    form.set("capability", capability);
    form.set("listingId", listingId);
    const result = await postSeller(form);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    setDeleteConfirmId("");
    await loadListings(capability);
    setNotice(result.message);
    setBusy(false);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("action", "seller_update");
    form.set("phone", phone.trim());
    form.set("capability", capability);
    form.set("listingId", editing.id);
    form.set("category", editing.category);
    form.set("condition", editing.condition);
    form.set("priceMode", editing.isFree ? "free" : "priced");
    form.set("price", editing.isFree ? "0" : String(editing.price));
    form.set("title", editing.title);
    form.set("description", editing.description);
    form.set("province", editing.province);
    form.set("district", editing.district);
    form.set("contactPreference", editing.contactPreference);
    const result = await postSeller(form);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    setEditing(null);
    await loadListings(capability);
    setNotice(result.message);
    setBusy(false);
  };

  return (
    <div className="min-h-screen">
      <PilotTopBar />
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <div className="mt-6">
          <h1 className="text-2xl font-extrabold tracking-tight">İlanlarım</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hesap açmadan, ilan verdiğin telefonu doğrulayarak ilanlarını yönet.
          </p>
        </div>

        {!capability && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-4">
            <label className="block">
              <span className="text-sm font-medium">İlan verdiğin telefon</span>
              <input
                aria-label="İlanlarım telefon numarası"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
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
                {busy ? "Kontrol ediliyor…" : "Telefonumu doğrula"}
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
            className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 rounded-xl border border-border bg-card p-3 text-sm">
            {notice}
          </p>
        )}

        {capability && !editing && (
          <section className="mt-6">
            {listings.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <p className="font-semibold">Bu telefonla yönetilen ilan bulunamadı.</p>
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
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex gap-3">
                      {listing.photoUrls[0] ? (
                        <img
                          src={listing.photoUrls[0]}
                          alt={`${listing.title} yönetim fotoğrafı`}
                          className="h-20 w-24 shrink-0 rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-bold">{listing.title}</p>
                        <p className="mt-1 font-extrabold text-primary">{formatPrice(listing)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {listing.province} / {listing.district} · {statusLabels[listing.status]}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(listing.status === "published" || listing.status === "unpublished") && (
                        <button
                          type="button"
                          onClick={() => setEditing({ ...listing })}
                          className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold"
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
          <section className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4">
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
                <select
                  aria-label="İlanlarım kategori"
                  value={editing.category}
                  onChange={(event) =>
                    setEditing({ ...editing, category: event.target.value as Stage1Category })
                  }
                  className={`mt-1 ${selectClass}`}
                >
                  {STAGE1_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {STAGE1_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Durum</span>
                <select
                  aria-label="İlanlarım durum"
                  value={editing.condition}
                  onChange={(event) =>
                    setEditing({ ...editing, condition: event.target.value as Stage1Condition })
                  }
                  className={`mt-1 ${selectClass}`}
                >
                  {STAGE1_CONDITIONS.map((value) => (
                    <option key={value} value={value}>
                      {STAGE1_CONDITION_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Fiyat (TL)</span>
              <input
                aria-label="İlanlarım fiyat"
                disabled={editing.isFree}
                value={editing.isFree ? "" : String(editing.price)}
                onChange={(event) =>
                  setEditing({ ...editing, price: Number(event.target.value || 0) })
                }
                inputMode="decimal"
                className={`mt-1 ${fieldClass} disabled:bg-muted`}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={editing.isFree}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    isFree: event.target.checked,
                    price: event.target.checked ? 0 : editing.price,
                  })
                }
              />
              Ücretsiz veriyorum
            </label>
            <label className="block">
              <span className="text-sm font-medium">Açıklama</span>
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
                <select
                  aria-label="İlanlarım il"
                  value={editing.province}
                  onChange={(event) =>
                    setEditing({ ...editing, province: event.target.value, district: "" })
                  }
                  className={`mt-1 ${selectClass}`}
                >
                  {locationCities.slice(1).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">İlçe</span>
                <select
                  aria-label="İlanlarım ilçe"
                  value={editing.district}
                  onChange={(event) => setEditing({ ...editing, district: event.target.value })}
                  className={`mt-1 ${selectClass}`}
                >
                  <option value="">İlçe seçin</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">İletişim tercihi</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {STAGE1_CONTACT_PREFERENCES.map((value) => (
                  <label
                    key={value}
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3"
                  >
                    <input
                      type="radio"
                      checked={editing.contactPreference === value}
                      onChange={() =>
                        setEditing({
                          ...editing,
                          contactPreference: value as Stage1ContactPreference,
                        })
                      }
                    />
                    {STAGE1_CONTACT_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>
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
