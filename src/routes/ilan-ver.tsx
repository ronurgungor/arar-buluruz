import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ImagePlus, Plus, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";
import { parseDemoPrice, validateDemoPhoto } from "@/lib/demo-listing";
import { buildControlledWhatsAppHref } from "@/lib/prototype-contact";

export const Route = createFileRoute("/ilan-ver")({
  head: () => ({
    meta: [
      { title: "Demo ilan oluşturma — Arar Buluruz" },
      {
        name: "description",
        content:
          "V0 test sürümünde ilan oluşturma akışı yalnız demo olarak çalışır; girilen bilgiler kaydedilmez veya yayınlanmaz.",
      },
      { property: "og:title", content: "Demo ilan oluşturma — Arar Buluruz" },
      {
        property: "og:description",
        content: "Demo ilan bilgileri kaydedilmez, gönderilmez veya yayınlanmaz.",
      },
    ],
  }),
  component: PostListing,
});

const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary";
const selectClass = `${fieldClass} appearance-none pr-10`;
const gate1TestOperationsEnabled = import.meta.env.VITE_GATE1_TEST_OPERATIONS === "enabled";

function PostListing() {
  if (gate1TestOperationsEnabled) return <Gate1ApplicationForm />;
  return <DemoListingForm />;
}

function DemoListingForm() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [priceError, setPriceError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const submissionLockedRef = useRef(false);
  const districts = city ? getDistrictsForCity(city) : [];

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const clearPhoto = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPhotoPreviewUrl(null);
    setPhotoName("");
    setPhotoError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const clearEnteredValues = () => {
    clearPhoto();
    setTitle("");
    setPrice("");
    setCity("");
    setDistrict("");
    setDescription("");
    setPriceError("");
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-md px-4 pb-16">
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">Demo ilan oluşturuldu.</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Bu testte bilgileriniz kaydedilmedi veya yayınlanmadı.
            </p>
            <button
              type="button"
              onClick={() => {
                submissionLockedRef.current = false;
                setSubmitted(false);
              }}
              className="mt-6 h-12 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Yeni demo ilan oluştur
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-8 text-2xl font-extrabold tracking-tight">Demo ilan oluşturma</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Bu alan yalnızca uygulama deneyimini test etmek içindir. Girdiğiniz bilgiler kaydedilmez
          veya yayınlanmaz.
        </p>

        <form
          className="mt-6 space-y-4"
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            if (submissionLockedRef.current) return;

            if (parseDemoPrice(price) === null) {
              setPriceError("Geçerli bir fiyat girin.");
              return;
            }

            submissionLockedRef.current = true;
            clearEnteredValues();
            setSubmitted(true);
          }}
        >
          <div>
            <label htmlFor="demo-photo" className="text-sm font-medium">
              Fotoğraf
            </label>
            <input
              ref={photoInputRef}
              id="demo-photo"
              data-testid="demo-photo-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) {
                  clearPhoto();
                  return;
                }

                if (previewUrlRef.current) {
                  URL.revokeObjectURL(previewUrlRef.current);
                  previewUrlRef.current = null;
                }

                const error = validateDemoPhoto(file);
                if (error) {
                  setPhotoPreviewUrl(null);
                  setPhotoName("");
                  setPhotoError(error);
                  event.currentTarget.value = "";
                  return;
                }

                const localUrl = URL.createObjectURL(file);
                previewUrlRef.current = localUrl;
                setPhotoPreviewUrl(localUrl);
                setPhotoName(file.name);
                setPhotoError("");
              }}
            />

            {photoPreviewUrl ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card">
                <img
                  src={photoPreviewUrl}
                  alt="Seçilen demo fotoğraf önizlemesi"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {photoName}
                  </span>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary"
                  >
                    <X aria-hidden className="h-3.5 w-3.5" />
                    Kaldır
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="demo-photo"
                className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-4 text-center hover:bg-muted/60"
              >
                <ImagePlus aria-hidden className="h-6 w-6 text-muted-foreground" />
                <span className="mt-2 text-sm font-semibold">Fotoğraf seç</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG veya WebP · en fazla 8 MB
                </span>
              </label>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Fotoğraf yalnız bu sayfada yerel önizleme için kullanılır; sunucuya yüklenmez.
            </p>
            {photoError && (
              <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                {photoError}
              </p>
            )}
          </div>

          <label className="block">
            <span className="text-sm font-medium">Başlık</span>
            <input
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Kısa ve net yaz"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Fiyat (TL)</span>
            <input
              required
              inputMode="decimal"
              value={price}
              onChange={(event) => {
                setPrice(event.target.value);
                if (priceError) setPriceError("");
              }}
              aria-invalid={priceError ? true : undefined}
              placeholder="0"
              className={`mt-1 ${fieldClass}`}
            />
            {priceError && (
              <span role="alert" className="mt-1 block text-xs font-medium text-destructive">
                {priceError}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium">İl</span>
            <span className="relative mt-1 block">
              <select
                required
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setDistrict("");
                }}
                className={selectClass}
              >
                <option value="" disabled>
                  İl seçin
                </option>
                {locationCities.slice(1).map((province) => (
                  <option key={province}>{province}</option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">İlçe</span>
            <span className="relative mt-1 block">
              <select
                required
                value={district}
                disabled={!city}
                onChange={(event) => setDistrict(event.target.value)}
                className={selectClass}
              >
                <option value="" disabled>
                  İlçe seçin
                </option>
                {districts.map((districtOption) => (
                  <option key={districtOption}>{districtOption}</option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">Açıklama</span>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ürünün durumu ve önemli ayrıntılar"
              className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground hover:bg-primary/90"
          >
            Demo ilan oluştur
          </button>
        </form>
      </main>
    </div>
  );
}

function Gate1ApplicationForm() {
  const [sellerDisplayName, setSellerDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("Tekirdağ");
  const [district, setDistrict] = useState("Çorlu");
  const [description, setDescription] = useState("");

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pb-16">
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">İlan Başvurusu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilot sürecinde başvurular merkezi WhatsApp hattında incelenir. Bu form veritabanına kayıt
          yazmaz.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            const message = [
              "Merhaba, Arar Buluruz için ilan başvurusu yapmak istiyorum.",
              "",
              `İlanda görünecek ad: ${sellerDisplayName.trim()}`,
              `Başlık: ${title.trim()}`,
              `Fiyat: ${price.trim()} TL`,
              `Konum: ${city} / ${district.trim()}`,
              `Açıklama: ${description.trim()}`,
            ].join("\n");

            window.location.href = buildControlledWhatsAppHref(message);
          }}
        >
          <div>
            <span className="text-sm font-medium">Fotoğraflar</span>
            <div className="mt-1 grid grid-cols-4 gap-2" aria-hidden>
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 text-muted-foreground"
                >
                  <Plus className="h-5 w-5" />
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Fotoğraf yükleme ilk pilotta kapalıdır; başvuru mesajına fotoğraf eklemeyin.
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium">İlanda görünecek ad</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={sellerDisplayName}
              onChange={(event) => setSellerDisplayName(event.target.value)}
              placeholder="Ad veya işletme adı"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Başlık</span>
            <input
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Kısa ve net yaz"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Fiyat (TL)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">İl</span>
            <select
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={`mt-1 ${fieldClass}`}
            >
              {locationCities.slice(1).map((province) => (
                <option key={province}>{province}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium">İlçe</span>
            <input
              required
              minLength={2}
              maxLength={64}
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Çorlu"
              className={`mt-1 ${fieldClass}`}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Açıklama</span>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ürünün durumu, teslim şekli ve önemli ayrıntılar"
              className="mt-1 w-full rounded-xl border border-border bg-card p-4 text-base outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground hover:bg-primary/90"
          >
            WhatsApp ile başvur
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Gönderimden sonra ilan otomatik yayınlanmaz; kurallara uygunluğu manuel olarak
            incelenir.
          </p>
        </form>
      </main>
    </div>
  );
}
