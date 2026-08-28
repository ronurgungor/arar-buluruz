import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 aria-hidden className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight">İlanın yayınlandı</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              İlanın artık yayında. İstersen hemen görüntüleyebilir veya telefonunu doğrulayarak
              İlanlarım'dan yönetebilirsin.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <a
                href={`/ilan/${successId}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
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
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PilotTopBar hidePostAction />
      <main className="mx-auto max-w-xl px-4 pb-20">
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">İlan Ver</h1>
            <p className="mt-1 text-sm text-muted-foreground">Birkaç dakikada yayına hazırla</p>
          </div>
          <span className="text-sm font-semibold text-primary">{step}/4</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${step * 25}%` }}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {step === 1 && (
          <section className="mt-6">
            <h2 className="text-lg font-bold">Fotoğraflar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              En az 1, en fazla 8 fotoğraf. İlk fotoğraf kapak olarak görünür.
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
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-4 text-center hover:bg-accent/40"
            >
              <ImagePlus aria-hidden className="h-7 w-7 text-primary" />
              <span className="mt-2 text-sm font-bold">Fotoğraf ekle</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Telefonundan veya bilgisayarından seç
              </span>
            </button>
            {photos.length > 0 && (
              <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <li
                    key={photo.id}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={`Seçilen fotoğraf ${index + 1}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold">
                          {index === 0 ? "Kapak" : `${index + 1}. fotoğraf`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          aria-label={`${index + 1}. fotoğrafı kaldır`}
                          className="rounded-full p-2 hover:bg-accent"
                        >
                          <X aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                      {photos.length > 1 && (
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => movePhoto(index, -1)}
                            aria-label="Fotoğrafı öne al"
                            className="min-h-9 flex-1 rounded-lg border border-border transition-colors hover:bg-accent disabled:opacity-30"
                          >
                            <ChevronLeft aria-hidden className="mx-auto h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index === photos.length - 1}
                            onClick={() => movePhoto(index, 1)}
                            aria-label="Fotoğrafı geriye al"
                            className="min-h-9 flex-1 rounded-lg border border-border transition-colors hover:bg-accent disabled:opacity-30"
                          >
                            <ChevronRight aria-hidden className="mx-auto h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {photos.length}/{STAGE1_MAX_PHOTOS} fotoğraf
            </p>
          </section>
        )}

        {step === 2 && (
          <section className="mt-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold">Ürün</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Alıcının ürünü hızlıca anlaması için temel bilgiler yeterli.
              </p>
            </div>
            <div className="block">
              <label htmlFor="stage1-category" className="text-sm font-medium">
                Kategori
              </label>
              <div className="relative mt-1">
                <select
                  id="stage1-category"
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
            <label className="block">
              <span className="text-sm font-medium">Başlık</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={120}
                placeholder="Örn. IKEA çalışma masası"
                className={`mt-1 ${fieldClass}`}
              />
            </label>
            <div className="block">
              <label htmlFor="stage1-condition" className="text-sm font-medium">
                Durum
              </label>
              <div className="relative mt-1">
                <select
                  id="stage1-condition"
                  value={condition}
                  onChange={(event) => setCondition(event.target.value as Stage1Condition)}
                  className={selectClass}
                >
                  <option value="">Durum seçin</option>
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
            <div>
              <label htmlFor="stage1-price" className="text-sm font-medium">
                Fiyat (TL)
              </label>
              <div className="relative mt-1">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground"
                >
                  ₺
                </span>
                <input
                  id="stage1-price"
                  disabled={isFree}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder={isFree ? "" : "Örn. 12.500"}
                  className={`${fieldClass} pl-9 disabled:bg-muted disabled:text-muted-foreground`}
                />
              </div>
              {isFree && (
                <span className="mt-1 block text-xs font-medium text-primary">
                  Bu ilan Ücretsiz olarak görünecek.
                </span>
              )}
            </div>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setIsFree(checked);
                  if (checked) setPrice("");
                }}
              />
              Ücretsiz veriyorum
            </label>
          </section>
        )}

        {step === 3 && (
          <section className="mt-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold">Detaylar ve konum</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ürünün durumu ve önemli ayrıntıları yazın. Açık adres istemiyoruz.
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Açıklama</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={10}
                maxLength={5000}
                rows={6}
                placeholder="Ürünün durumu, ölçüsü, varsa kusurları..."
                className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">İl</span>
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
                <span className="text-sm font-medium">İlçe</span>
                <select
                  aria-label="İlçe"
                  value={district}
                  disabled={!province}
                  onChange={(event) => setDistrict(event.target.value)}
                  className={`mt-1 ${selectClass} disabled:bg-muted`}
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
            <p className="text-xs text-muted-foreground">
              Yalnızca il ve ilçe bilgisi alınır; açık adres istemiyoruz.
            </p>
          </section>
        )}

        {step === 4 && (
          <section className="mt-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold">Satıcı ve iletişim</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                İlanı yayınlamadan önce telefonunu doğrulayacağız. Sonrasında alıcılar seçtiğin
                yöntemle sana doğrudan ulaşabilir.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-accent/35 p-3 text-sm leading-relaxed text-muted-foreground">
              İlan oluşturmak için verdiğiniz bilgiler ilanı yayınlamak ve kötüye kullanımı önlemek
              amacıyla işlenir. Telefonunuz yalnız seçtiğiniz iletişim yöntemlerinde görünür.{" "}
              <Link
                to="/gizlilik"
                className="font-semibold text-primary underline underline-offset-4"
              >
                Gizlilik ve Aydınlatma
              </Link>
            </div>
            <label className="block">
              <span className="text-sm font-medium">İlanda görünecek ad</span>
              <input
                value={sellerDisplayName}
                onChange={(event) => setSellerDisplayName(event.target.value)}
                minLength={2}
                maxLength={80}
                autoComplete="name"
                placeholder="Adınız"
                className={`mt-1 ${fieldClass}`}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Telefon</span>
              <input
                aria-label="Telefon numarası"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setVerificationChallengeId(null);
                }}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+905xxxxxxxxx"
                className={`mt-1 ${fieldClass}`}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Tek kullanımlık kodla doğrulayacağız; hesap açman gerekmez.
              </span>
            </label>
            <fieldset>
              <legend className="text-sm font-medium">İletişim tercihi</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {STAGE1_CONTACT_PREFERENCES.map((value) => (
                  <label
                    key={value}
                    className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                      contactPreference === value
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <input
                      type="radio"
                      name="contact-preference"
                      value={value}
                      checked={contactPreference === value}
                      onChange={() => setContactPreference(value)}
                    />
                    {STAGE1_CONTACT_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <div>
                <p className="font-semibold text-foreground">Yayınlamadan önce kısa onaylar</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  İlanın doğru kişiden geldiğini ve paylaşım hakkını doğrulamak için.
                </p>
              </div>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={privateSellerConfirmed}
                  onChange={(event) => setPrivateSellerConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>Özel kişi olarak ara sıra ilan veriyorum; bu ilan kendi eşyam için.</span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={contentRightsConfirmed}
                  onChange={(event) => setContentRightsConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  Fotoğraf ve metni paylaşmaya yetkim var; gereksiz üçüncü kişi veya hassas bilgi
                  eklemedim.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={publicationConfirmed}
                  onChange={(event) => setPublicationConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  Bu telefon bana ait; ilan yayınlandığında seçtiğim iletişim yöntemleri için kamuya
                  açık gösterilmesini istiyorum.
                </span>
              </label>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                <div className="min-w-0 flex-1 py-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    İlan önizlemesi
                  </p>
                  <p className="mt-1 line-clamp-2 font-bold text-foreground">
                    {title || "İlan başlığı"}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-primary">
                    {formatPricePreview(price, isFree)}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {province || "İl"} / {district || "İlçe"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-foreground">
                    {STAGE1_CONTACT_LABELS[contactPreference]}
                  </p>
                </div>
              </div>
            </div>
            {verificationChallengeId && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  Son adım: telefonunu doğrula
                </p>
                <label className="block">
                  <span className="text-sm font-semibold">6 haneli doğrulama kodu</span>
                  <input
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className={`mt-2 ${fieldClass}`}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmVerification()}
                  className="mt-3 h-12 w-full rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Doğrulanıyor…" : "Doğrula ve yayınla"}
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              İlan Kuralları'nı okuyabilirsiniz:{" "}
              <Link
                to="/ilan-kurallari"
                className="font-semibold text-primary underline underline-offset-4"
              >
                İlan Kuralları
              </Link>
            </p>
          </section>
        )}

        <div className="mt-8 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                clearError();
                setVerificationChallengeId(null);
                setStep((current) => current - 1);
              }}
              className="inline-flex h-12 min-w-12 items-center justify-center gap-1 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50"
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
              className="ml-auto inline-flex h-12 flex-1 items-center justify-center gap-1 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              Devam <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          ) : !verificationChallengeId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void beginFinalSubmit()}
              className="ml-auto h-12 flex-1 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Hazırlanıyor…" : "İlanı yayınla"}
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}
