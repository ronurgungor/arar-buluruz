import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";
import { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";
import { LISTING_PHOTO_ALLOWED_MIME_TYPES, LISTING_PHOTO_MAX_BYTES } from "@/lib/listing-photo";
import {
  STAGE1_CATEGORIES,
  STAGE1_CATEGORY_LABELS,
  STAGE1_CONDITIONS,
  STAGE1_CONDITION_LABELS,
  STAGE1_MAX_PHOTOS,
  STAGE1_MAX_TOTAL_UPLOAD_BYTES,
  type Stage1Category,
  type Stage1Condition,
  type Stage1SubmissionResponse,
} from "@/lib/stage1-self-service-contract";

export const Route = createFileRoute("/ilan-ver")({
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
      { title: "İlan Ver — Arar Buluruz" },
      {
        name: "description",
        content:
          "Fotoğraflarını ekle, ilanını birkaç adımda oluştur ve Türkiye'deki alıcılara ulaş.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive, nosnippet" },
    ],
  }),
  component: Stage1ListingWizard,
});

type PhotoDraft = { id: string; file: File; previewUrl: string };
type SessionSubmitResult = "submitted" | "verification_required" | "failed";
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const PRICE_PATTERN = /^\d{1,10}(?:[.,]\d{1,2})?$/;
const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const selectClass = `${fieldClass} appearance-none pr-10`;
const stepTitles = ["Fotoğraflar", "Ürün", "Detaylar ve konum", "Satıcı ve iletişim"] as const;

function RequiredMark() {
  return (
    <span aria-hidden className="ml-1 text-xs font-bold text-primary">
      *
    </span>
  );
}

function OptionalMark() {
  return (
    <span aria-hidden className="ml-1 text-xs font-normal text-muted-foreground">
      (isteğe bağlı)
    </span>
  );
}

async function postSelfService(form: FormData): Promise<Stage1SubmissionResponse> {
  try {
    const response = await fetch("/ilan-ver", {
      method: "POST",
      body: form,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    return (await response.json()) as Stage1SubmissionResponse;
  } catch {
    return {
      ok: false,
      code: "BACKEND_UNAVAILABLE",
      message: "İlan gönderim servisine ulaşılamadı. Lütfen tekrar deneyin.",
    };
  }
}

function formatPricePreview(price: string, isFree: boolean): string {
  if (isFree) return "Ücretsiz";
  const number = Number(price.replace(",", "."));
  if (!Number.isFinite(number)) return "Fiyat girilmedi";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(number);
}

function Stage1ListingWizard() {
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [category, setCategory] = useState<Stage1Category | "">("");
  const [title, setTitle] = useState("");
  const [condition, setCondition] = useState<Stage1Condition | "">("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [sellerDisplayName, setSellerDisplayName] = useState("");
  const [phone, setPhone] = useState("+90");
  const [verificationChallengeId, setVerificationChallengeId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<PhotoDraft[]>([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) URL.revokeObjectURL(photo.previewUrl);
    };
  }, []);

  const clearError = () => setError("");

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    clearError();
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= STAGE1_MAX_PHOTOS) {
        setError(`En fazla ${STAGE1_MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
        break;
      }
      if (!(LISTING_PHOTO_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
        setError("Fotoğraflar JPEG, PNG veya WebP olmalıdır.");
        continue;
      }
      if (file.size < 1 || file.size > LISTING_PHOTO_MAX_BYTES) {
        setError("Her fotoğraf en fazla 8 MB olabilir.");
        continue;
      }
      if (
        next.reduce((sum, item) => sum + item.file.size, 0) + file.size >
        STAGE1_MAX_TOTAL_UPLOAD_BYTES
      ) {
        setError("Toplam fotoğraf boyutu 32 MB sınırını aşamaz.");
        break;
      }
      next.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
    }
    setPhotos(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    setPhotos((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validateCurrentStep = (): boolean => {
    clearError();
    if (step === 1 && photos.length < 1) {
      setError("Devam etmek için en az bir fotoğraf ekleyin.");
      return false;
    }
    if (step === 2) {
      if (!category) {
        setError("Kategori seçin.");
        return false;
      }
      if (title.trim().length < 3) {
        setError("İlan başlığı en az 3 karakter olmalıdır.");
        return false;
      }
      if (!isFree && (!PRICE_PATTERN.test(price.trim()) || Number(price.replace(",", ".")) < 0)) {
        setError("Geçerli bir fiyat girin veya Ücretsiz seçeneğini işaretleyin.");
        return false;
      }
    }
    if (step === 3 && (!province || !district)) {
      setError("İl ve ilçe seçin.");
      return false;
    }
    return true;
  };

  const buildSubmissionForm = () => {
    const form = new FormData();
    form.set("action", "submit_listing");
    form.set("category", category);
    form.set("title", title.trim());
    if (condition) form.set("condition", condition);
    form.set("priceMode", isFree ? "free" : "priced");
    form.set("price", isFree ? "0" : price.trim());
    form.set("description", description.trim());
    form.set("province", province);
    form.set("district", district);
    form.set("sellerDisplayName", sellerDisplayName.trim());
    form.set("phone", phone.trim());
    form.set("idempotencyKey", idempotencyKeyRef.current);
    for (const photo of photos) form.append("photo", photo.file, photo.file.name);
    return form;
  };

  const submitWithSession = async (): Promise<SessionSubmitResult> => {
    const result = await postSelfService(buildSubmissionForm());
    if (result.ok && result.action === "submitted") {
      setSuccessId(result.listingId);
      setVerificationChallengeId(null);
      return "submitted";
    }
    if (!result.ok) {
      if (result.code === "VERIFICATION_REQUIRED") return "verification_required";
      setError(result.message);
    }
    return "failed";
  };

  const startVerification = async () => {
    const form = new FormData();
    form.set("action", "start_verification");
    form.set("phone", phone.trim());
    const result = await postSelfService(form);
    if (result.ok && result.action === "verification_started") {
      setVerificationChallengeId(result.challengeId);
      setVerificationCode("");
      return;
    }
    if (!result.ok) setError(result.message);
  };

  const beginFinalSubmit = async () => {
    clearError();
    if (sellerDisplayName.trim().length < 2 || !E164_PATTERN.test(phone.trim())) {
      setError("Satıcı adı ve telefon numarasını kontrol edin.");
      return;
    }

    setBusy(true);
    const result = await submitWithSession();
    if (result === "verification_required") {
      clearError();
      await startVerification();
    }
    setBusy(false);
  };

  const confirmVerification = async () => {
    if (!verificationChallengeId || !/^\d{6}$/.test(verificationCode)) {
      setError("6 haneli doğrulama kodunu girin.");
      return;
    }
    setBusy(true);
    clearError();
    const form = new FormData();
    form.set("action", "verify_phone");
    form.set("phone", phone.trim());
    form.set("challengeId", verificationChallengeId);
    form.set("code", verificationCode);
    const result = await postSelfService(form);
    if (result.ok && result.action === "phone_verified") {
      await submitWithSession();
    } else if (!result.ok) {
      setError(result.message);
    }
    setBusy(false);
  };

  if (successId) {
    return (
      <div className="min-h-screen">
        <PilotTopBar hidePostAction />
        <main className="mx-auto max-w-xl px-4 pb-16">
          <section
            data-testid="listing-published-success"
            data-listing-id={successId}
            className="mt-10 rounded-3xl border border-border bg-card p-6 text-center shadow-sm sm:p-8"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
              <CheckCircle2 aria-hidden className="h-9 w-9 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight">İlanın yayınlandı</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              İlanın artık yayında. İstersen hemen görüntüleyebilir veya İlanlarım'dan
              yönetebilirsin.
            </p>
            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              <a
                href={`/ilan/${successId}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                İlanı görüntüle
              </a>
              <a
                href="/ilanlarim"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-bold text-foreground transition-colors hover:bg-accent"
              >
                İlanlarım
              </a>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              İlanını dilediğin zaman İlanlarım sayfasından düzenleyebilir veya yayından
              kaldırabilirsin.
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PilotTopBar hidePostAction />
      <main className="mx-auto max-w-xl px-4 pb-32">
        <header className="mt-5">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight">İlan Ver</h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                Adım {step}/4 · {stepTitles[step - 1]}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              {step}/4
            </span>
          </div>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  item <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium leading-relaxed text-destructive"
          >
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">{error}</span>
          </p>
        )}

        {step === 1 && (
          <section className="mt-6">
            <h2 className="text-lg font-bold">
              Fotoğraflar
              <RequiredMark />
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              En az 1, en fazla {STAGE1_MAX_PHOTOS} fotoğraf. İlk fotoğraf kapak olarak görünür;
              okları kullanarak sırayı değiştirebilirsin.
            </p>
            <input
              ref={fileInputRef}
              data-testid="stage1-photo-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => addPhotos(event.currentTarget.files)}
            />
            <button
              type="button"
              disabled={photos.length >= STAGE1_MAX_PHOTOS}
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex min-h-32 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-4 text-center transition-colors hover:border-primary/50 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ImagePlus aria-hidden className="h-6 w-6 text-primary" />
              </span>
              <span className="mt-2 text-sm font-bold">Fotoğraf ekle</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Telefonundan veya bilgisayarından seç · JPEG, PNG, WebP
              </span>
            </button>
            {photos.length > 0 && (
              <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <li
                    key={photo.id}
                    className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                  >
                    <div className="relative">
                      <img
                        src={photo.previewUrl}
                        alt={`Seçilen fotoğraf ${index + 1}`}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
                          Kapak
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        aria-label={`${index + 1}. fotoğrafı kaldır`}
                        className="absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm transition-colors hover:bg-accent"
                      >
                        <X aria-hidden className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-2">
                      <span className="block truncate text-xs font-semibold text-muted-foreground">
                        {index === 0 ? "Kapak fotoğrafı" : `${index + 1}. fotoğraf`}
                      </span>
                      {photos.length > 1 && (
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => movePhoto(index, -1)}
                            aria-label="Fotoğrafı öne al"
                            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent disabled:opacity-30"
                          >
                            <ChevronLeft aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index === photos.length - 1}
                            onClick={() => movePhoto(index, 1)}
                            aria-label="Fotoğrafı geriye al"
                            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent disabled:opacity-30"
                          >
                            <ChevronRight aria-hidden className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              {photos.length}/{STAGE1_MAX_PHOTOS} fotoğraf
            </p>
          </section>
        )}

        {step === 2 && (
          <section className="mt-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">Ürün</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Alıcının ürünü hızlıca anlaması için temel bilgiler yeterli.
              </p>
            </div>
            <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
              <div className="block">
                <label htmlFor="stage1-category" className="text-sm font-semibold">
                  Kategori
                </label>
                <RequiredMark />
                <div className="relative mt-1.5">
                  <select
                    id="stage1-category"
                    aria-label="Kategori"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as Stage1Category)}
                    className={selectClass}
                  >
                    <option value="">Kategori seçin</option>
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
              </div>
              <div className="block">
                <label htmlFor="stage1-title" className="text-sm font-semibold">
                  Başlık
                </label>
                <RequiredMark />
                <input
                  id="stage1-title"
                  aria-label="Başlık"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  minLength={3}
                  maxLength={120}
                  placeholder="Örn. IKEA çalışma masası"
                  className={`mt-1.5 ${fieldClass}`}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  En az 3 karakter. Kısa ve net başlıklar daha çok tıklanır.
                </span>
              </div>
              <div className="block">
                <label htmlFor="stage1-condition" className="text-sm font-semibold">
                  Durum
                </label>
                <OptionalMark />
                <div className="relative mt-1.5">
                  <select
                    id="stage1-condition"
                    aria-label="Durum"
                    value={condition}
                    onChange={(event) => setCondition(event.target.value as Stage1Condition)}
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
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <label htmlFor="stage1-price" className="text-sm font-semibold">
                  Fiyat (TL)
                </label>
                {!isFree && <RequiredMark />}
                <div className="relative mt-1.5">
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${
                      isFree ? "text-muted-foreground/50" : "text-muted-foreground"
                    }`}
                  >
                    ₺
                  </span>
                  <input
                    id="stage1-price"
                    aria-label="Fiyat (TL)"
                    disabled={isFree}
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    inputMode="decimal"
                    placeholder={isFree ? "Ücretsiz" : "Örn. 12.500"}
                    className={`${fieldClass} pl-9 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-muted disabled:text-muted-foreground`}
                  />
                </div>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {isFree
                    ? "Fiyat alanı kapalı. İlan Ücretsiz olarak yayınlanacak."
                    : "Sadece rakam yaz; ₺0 yerine Ücretsiz seçeneğini kullan."}
                </span>
              </div>
              <label
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                  isFree
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background"
                }`}
              >
                <input
                  type="checkbox"
                  aria-label="Ücretsiz veriyorum"
                  className="h-5 w-5 shrink-0 accent-primary"
                  checked={isFree}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setIsFree(checked);
                    if (checked) setPrice("");
                  }}
                />
                Ücretsiz veriyorum
              </label>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="mt-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">Detaylar ve konum</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                İstersen kısa bir açıklama ekle. Açık adres istemiyoruz.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <label htmlFor="stage1-description" className="text-sm font-semibold">
                Açıklama
              </label>
              <OptionalMark />
              <textarea
                id="stage1-description"
                aria-label="Açıklama"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                rows={6}
                placeholder="Ürünün durumu, ölçüsü, varsa kusurları..."
                className="mt-1.5 w-full rounded-xl border border-border bg-background p-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <span className="mt-1 block text-right text-xs text-muted-foreground">
                {description.length}/5000
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">
                Konum
                <RequiredMark />
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">İl</span>
                  <select
                    aria-label="İl"
                    value={province}
                    onChange={(event) => {
                      setProvince(event.target.value);
                      setDistrict("");
                    }}
                    className={`mt-1 ${selectClass}`}
                  >
                    <option value="">İl seçin</option>
                    {locationCities.slice(1).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">İlçe</span>
                  <select
                    aria-label="İlçe"
                    value={district}
                    disabled={!province}
                    onChange={(event) => setDistrict(event.target.value)}
                    className={`mt-1 ${selectClass} disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground`}
                  >
                    <option value="">İlçe seçin</option>
                    {getDistrictsForCity(province).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Yalnızca il ve ilçe bilgisi alınır; açık adres istemiyoruz.
              </p>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="mt-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">Satıcı ve iletişim</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                İlanı yayınlamadan önce telefonunu doğrulayacağız. Doğrulama bir süre hatırlanır;
                her ilanda yeniden kod istemeyiz.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-accent/35 p-4 text-sm leading-relaxed">
              <p className="font-semibold text-foreground">
                Telefon numaran ilanda herkese açık görünür.
              </p>
              <p className="mt-1 text-muted-foreground">
                Alıcılar aynı numarayla seni arayabilir veya WhatsApp üzerinden yazabilir.{" "}
                <Link
                  to="/gizlilik"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  Gizlilik ve Aydınlatma
                </Link>
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
              <div className="block">
                <label htmlFor="stage1-seller-name" className="text-sm font-semibold">
                  İlanda görünecek ad
                </label>
                <RequiredMark />
                <input
                  id="stage1-seller-name"
                  aria-label="İlanda görünecek ad"
                  value={sellerDisplayName}
                  onChange={(event) => setSellerDisplayName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Adınız"
                  className={`mt-1.5 ${fieldClass}`}
                />
              </div>

              <div className="block">
                <label htmlFor="stage1-phone" className="text-sm font-semibold">
                  Telefon
                </label>
                <RequiredMark />
                <input
                  id="stage1-phone"
                  aria-label="Telefon numarası"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setVerificationChallengeId(null);
                  }}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+905xxxxxxxxx"
                  className={`mt-1.5 ${fieldClass}`}
                />
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  +90 ile başlayan numaranı yaz. Kod yalnız gerektiğinde istenir; hesap veya şifre
                  gerekmez.
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                İlan önizlemesi
              </p>
              <div className="flex gap-3 p-3">
                {photos[0] ? (
                  <img
                    src={photos[0].previewUrl}
                    alt="İlan kapak önizlemesi"
                    className="h-24 w-28 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-24 w-28 shrink-0 rounded-xl bg-muted" aria-hidden />
                )}
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="line-clamp-2 font-bold text-foreground">
                    {title || "İlan başlığı"}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-primary">
                    {formatPricePreview(price, isFree)}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {province || "İl"} / {district || "İlçe"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-foreground">Ara + WhatsApp</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
              <p className="text-foreground">
                İlanı yayınlayarak{" "}
                <Link
                  to="/ilan-kurallari"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  İlan Kuralları
                </Link>
                'nı kabul etmiş olursun.
              </p>
            </div>

            {verificationChallengeId && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Son adım</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Telefonunu doğrula</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {phone.trim()} numarasına gönderilen 6 haneli kodu gir.
                </p>
                <input
                  id="stage1-verification-code"
                  aria-label="6 haneli doğrulama kodu"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className={`mt-3 ${fieldClass} text-center text-xl font-bold tracking-[0.4em]`}
                />
                <button
                  type="button"
                  disabled={busy}
                  aria-busy={busy}
                  onClick={() => void confirmVerification()}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                  {busy ? "Doğrulanıyor…" : "Doğrula ve yayınla"}
                </button>
              </div>
            )}
          </section>
        )}

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            {step > 1 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  clearError();
                  setVerificationChallengeId(null);
                  setStep((current) => current - 1);
                }}
                className="inline-flex h-12 min-w-12 items-center justify-center gap-1 rounded-full border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" /> Geri
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (validateCurrentStep()) setStep((current) => current + 1);
                }}
                className="ml-auto inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Devam <ChevronRight aria-hidden className="h-4 w-4" />
              </button>
            ) : !verificationChallengeId ? (
              <button
                type="button"
                disabled={busy}
                aria-busy={busy}
                onClick={() => void beginFinalSubmit()}
                className="ml-auto inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                {busy ? "Hazırlanıyor…" : "İlanı yayınla"}
              </button>
            ) : (
              <p className="ml-auto flex-1 text-center text-xs font-medium text-muted-foreground">
                Yayınlamak için doğrulama kodunu gir.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}