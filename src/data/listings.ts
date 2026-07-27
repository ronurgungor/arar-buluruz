import ilan1 from "@/assets/ilan-1.jpg";
import ilan2 from "@/assets/ilan-2.jpg";
import ilan3 from "@/assets/ilan-3.jpg";
import ilan4 from "@/assets/ilan-4.jpg";
import ilan6 from "@/assets/ilan-6.jpg";

export type Listing = {
  id: string;
  title: string;
  price: number;
  city: string;
  district: string;
  seller: string;
  phone: string;
  description: string;
  photos: string[];
  createdAt: string;
  distanceKm: number;
};

export const listings: Listing[] = [
  {
    id: "1",
    title: "Sahibinden temiz bahçe traktörü",
    price: 285000,
    city: "Konya",
    district: "Çumra",
    seller: "Mehmet Tarım Makine",
    phone: "+905001112233",
    description:
      "Bakımları zamanında yapılmış, tek elden, hazır çalışır durumda. Görmeden karar vermeyin.",
    photos: [ilan1, ilan6],
    createdAt: "2026-07-26",
    distanceKm: 4,
  },
  {
    id: "2",
    title: "Ahşap yemek masası ve 4 sandalye",
    price: 6500,
    city: "İzmir",
    district: "Karşıyaka",
    seller: "Ayşe K.",
    phone: "+905002223344",
    description: "Az kullanıldı, çizik yok. Adresten teslim.",
    photos: [ilan2],
    createdAt: "2026-07-25",
    distanceKm: 2,
  },
  {
    id: "3",
    title: "2016 model sedan otomobil, düşük km",
    price: 615000,
    city: "Ankara",
    district: "Çankaya",
    seller: "Yıldız Oto",
    phone: "+905003334455",
    description: "Boyasız, ilk sahibinden. Takas olabilir.",
    photos: [ilan3],
    createdAt: "2026-07-24",
    distanceKm: 11,
  },
  {
    id: "4",
    title: "2+1 kiralık daire, asansörlü",
    price: 18000,
    city: "İstanbul",
    district: "Kadıköy",
    seller: "Deniz Emlak",
    phone: "+905004445566",
    description: "Metroya yürüme mesafesi, güneyi açık, aidat dahil.",
    photos: [ilan4],
    createdAt: "2026-07-23",
    distanceKm: 7,
  },
  {
    id: "5",
    title: "Su motoru, 1.5 HP, garantili",
    price: 3400,
    city: "Bursa",
    district: "İnegöl",
    seller: "Öz Pompa",
    phone: "+905005556677",
    description: "Sıfır ürün, faturalı. Kargo alıcıya ait.",
    photos: [ilan6],
    createdAt: "2026-07-22",
    distanceKm: 25,
  },
  {
    id: "6",
    title: "İkinci el ofis masası",
    price: 1800,
    city: "Antalya",
    district: "Muratpaşa",
    seller: "Kemal B.",
    phone: "+905006667788",
    description: "Sağlam, temiz. Nakit ödemede pazarlık payı var.",
    photos: [ilan2],
    createdAt: "2026-07-21",
    distanceKm: 3,
  },
  {
    id: "7",
    title: "Bahçe sulama ekipmanı seti",
    price: 2250,
    city: "Adana",
    district: "Seyhan",
    seller: "Toprak Ticaret",
    phone: "+905007778899",
    description: "Hortum, bağlantı ve fıskiyeler dahil komple set.",
    photos: [ilan6],
    createdAt: "2026-07-20",
    distanceKm: 40,
  },
  {
    id: "8",
    title: "Kiralık dükkân, cadde üzeri",
    price: 27000,
    city: "Gaziantep",
    district: "Şahinbey",
    seller: "Anadolu Gayrimenkul",
    phone: "+905008889900",
    description: "Yoğun yaya trafiği, 60 m², vitrinli.",
    photos: [ilan4],
    createdAt: "2026-07-19",
    distanceKm: 15,
  },
  {
    id: "9",
    title: "Kullanılmış lastik takımı",
    price: 4200,
    city: "Kayseri",
    district: "Melikgazi",
    seller: "Nuri Lastik",
    phone: "+905009990011",
    description: "Dört adet, diş derinliği iyi durumda.",
    photos: [ilan3],
    createdAt: "2026-07-18",
    distanceKm: 9,
  },
  {
    id: "10",
    title: "El yapımı ahşap sehpa",
    price: 950,
    city: "Trabzon",
    district: "Ortahisar",
    seller: "Karadeniz Ahşap",
    phone: "+905001010202",
    description: "Masif ağaç, istenilen ölçüde üretilir.",
    photos: [ilan2],
    createdAt: "2026-07-17",
    distanceKm: 60,
  },
  {
    id: "11",
    title: "Traktör römorku, 5 ton",
    price: 145000,
    city: "Şanlıurfa",
    district: "Haliliye",
    seller: "Fırat Makine",
    phone: "+905002020303",
    description: "Yeni boyalı, damperli, hazır çalışır.",
    photos: [ilan1],
    createdAt: "2026-07-16",
    distanceKm: 33,
  },
  {
    id: "12",
    title: "Satılık arsa, imarlı",
    price: 890000,
    city: "Muğla",
    district: "Milas",
    seller: "Ege Arsa",
    phone: "+905003030404",
    description: "Yola cepheli, tapusu temiz, kredi kullanılabilir.",
    photos: [ilan4],
    createdAt: "2026-07-15",
    distanceKm: 80,
  },
];

export const cities = [
  "Tüm Türkiye",
  "Adana",
  "Ankara",
  "Antalya",
  "Bursa",
  "Gaziantep",
  "İstanbul",
  "İzmir",
  "Kayseri",
  "Konya",
  "Muğla",
  "Şanlıurfa",
  "Trabzon",
];

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
