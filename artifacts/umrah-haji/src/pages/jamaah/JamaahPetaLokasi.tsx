import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, MapPin, Navigation, Star, Info, ExternalLink,
  Hotel, Plane, Building2, Mountain, Moon,
} from "lucide-react";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";

interface Location {
  id: string;
  name: string;
  arabicName: string;
  category: "masjid" | "masyair" | "hotel" | "transport";
  description: string;
  tips: string[];
  distance?: string;
  importance: "wajib" | "sunnah" | "info";
  city: "makkah" | "madinah";
  x: number;
  y: number;
  color: string;
  lat: number;
  lng: number;
}

const LOCATIONS: Location[] = [
  {
    id: "masjidil-haram",
    name: "Masjidil Haram",
    arabicName: "المسجد الحرام",
    category: "masjid",
    description: "Masjid terbesar di dunia, tempat Ka'bah berada. Pusat ibadah Umroh dan Haji.",
    tips: [
      "Kenali pintu masuk terdekat dari hotel Anda",
      "Simpan foto pintu masuk untuk memudahkan kembali",
      "Jam sibuk: Subuh, Maghrib, Isya — datang lebih awal",
    ],
    importance: "wajib",
    city: "makkah",
    x: 50, y: 45,
    lat: 21.4225, lng: 39.8262,
    color: "#10b981",
  },
  {
    id: "kabah",
    name: "Ka'bah",
    arabicName: "الكعبة المشرفة",
    category: "masjid",
    description: "Bangunan kubus di tengah Masjidil Haram, arah kiblat seluruh umat Islam.",
    tips: [
      "Tawaf dimulai dari Hajar Aswad (sudut timur Ka'bah)",
      "Putaran berlawanan arah jarum jam, 7 kali",
      "Jaga wudhu selama Tawaf",
    ],
    importance: "wajib",
    city: "makkah",
    x: 50, y: 44,
    lat: 21.4225, lng: 39.8262,
    color: "#10b981",
  },
  {
    id: "bukit-safa",
    name: "Bukit Safa & Marwah",
    arabicName: "الصفا والمروة",
    category: "masjid",
    description: "Lokasi Sa'i — berlari-lari kecil 7 kali antara Safa dan Marwah.",
    tips: [
      "Jalur khusus lansia dan disabilitas tersedia",
      "Lampu hijau menandai area berlari-lari kecil (untuk pria)",
      "AC tersedia di dalam koridor Sa'i",
    ],
    importance: "wajib",
    city: "makkah",
    x: 52, y: 48,
    lat: 21.4230, lng: 39.8268,
    color: "#10b981",
  },
  {
    id: "mina",
    name: "Mina",
    arabicName: "منى",
    category: "masyair",
    description: "Kota tenda tempat jamaah bermalam selama hari Tasyriq (8-13 Dzulhijjah).",
    tips: [
      "Jangan meninggalkan tenda tanpa membawa tanda pengenal",
      "Simpan nomor pembimbing dan ketua regu",
      "Fasilitas MCK tersedia di setiap zona",
    ],
    importance: "wajib",
    city: "makkah",
    x: 72, y: 35,
    lat: 21.4134, lng: 39.8934,
    color: "#f59e0b",
  },
  {
    id: "arafah",
    name: "Padang Arafah",
    arabicName: "عرفات",
    category: "masyair",
    description: "Puncak ibadah Haji — wukuf di Arafah pada 9 Dzulhijjah. 'Haji adalah Arafah'.",
    tips: [
      "Wukuf: 9 Dzulhijjah setelah Zhuhur hingga Maghrib",
      "Perbanyak doa, istighfar, dan dzikir",
      "Jangan sampai meninggalkan Arafah sebelum Maghrib",
    ],
    importance: "wajib",
    city: "makkah",
    x: 85, y: 55,
    lat: 21.3553, lng: 39.9844,
    color: "#f59e0b",
  },
  {
    id: "muzdalifah",
    name: "Muzdalifah",
    arabicName: "مزدلفة",
    category: "masyair",
    description: "Tempat mabit (bermalam) setelah wukuf Arafah. Ambil batu kerikil di sini.",
    tips: [
      "Ambil 49 atau 70 batu kerikil sebesar kacang",
      "Mabit minimal hingga setelah tengah malam",
      "Sholat Maghrib & Isya dijamak di sini",
    ],
    importance: "wajib",
    city: "makkah",
    x: 78, y: 42,
    lat: 21.3788, lng: 39.9249,
    color: "#f59e0b",
  },
  {
    id: "jamarat",
    name: "Jamarat (Lempar Jumrah)",
    arabicName: "الجمرات",
    category: "masyair",
    description: "Lokasi lempar jumrah — melempar kerikil ke tiga tiang sebagai ritual Haji.",
    tips: [
      "Jumrah Aqabah (besar) pada 10 Dzulhijjah — 7 batu",
      "Tiga jumrah pada 11-13 Dzulhijjah — total 21 batu/hari",
      "Hindari jam sibuk: 08.00-14.00. Pilih malam atau dini hari",
    ],
    importance: "wajib",
    city: "makkah",
    x: 68, y: 38,
    lat: 21.4205, lng: 39.8743,
    color: "#ef4444",
  },
  {
    id: "jabal-nur",
    name: "Jabal Nur (Gua Hira)",
    arabicName: "جبل النور",
    category: "masyair",
    description: "Gunung tempat Nabi Muhammad SAW menerima wahyu pertama (Al-Alaq).",
    tips: [
      "Membutuhkan sekitar 1-1,5 jam pendakian",
      "Bawa air minum yang cukup",
      "Kunjungi di luar waktu puncak panas (pagi/sore)",
    ],
    importance: "sunnah",
    city: "makkah",
    x: 32, y: 22,
    lat: 21.4571, lng: 39.8647,
    color: "#8b5cf6",
  },
  {
    id: "jabal-tsur",
    name: "Jabal Tsur",
    arabicName: "جبل ثور",
    category: "masyair",
    description: "Gua tempat Nabi dan Abu Bakar bersembunyi saat hijrah ke Madinah.",
    tips: [
      "Pendakian lebih berat dari Jabal Nur",
      "Tidak dianjurkan bagi yang punya masalah jantung/lutut",
    ],
    importance: "sunnah",
    city: "makkah",
    x: 38, y: 72,
    lat: 21.3968, lng: 39.8333,
    color: "#8b5cf6",
  },
  {
    id: "masjid-nabawi",
    name: "Masjid Nabawi",
    arabicName: "المسجد النبوي",
    category: "masjid",
    description: "Masjid Nabi di Madinah. Di sini terdapat makam Rasulullah SAW dan Raudhah.",
    tips: [
      "Raudhah (taman surga): antre dengan sabar, terutama waktu sholat",
      "Ziarah makam Nabi: ucapkan salam dengan khidmat",
      "Area wanita dan pria terpisah untuk Raudhah",
    ],
    importance: "wajib",
    city: "madinah",
    x: 50, y: 45,
    lat: 24.4672, lng: 39.6112,
    color: "#10b981",
  },
  {
    id: "raudhah",
    name: "Raudhah",
    arabicName: "الروضة الشريفة",
    category: "masjid",
    description: "'Taman Surga' — area antara mimbar dan makam Rasulullah SAW.",
    tips: [
      "Bagi wanita: waktu khusus biasanya dini hari dan sore",
      "Gunakan tasreh (izin) yang disediakan panitia haji/umroh",
      "Perbanyak doa dan sholawat",
    ],
    importance: "sunnah",
    city: "madinah",
    x: 49, y: 44,
    lat: 24.4672, lng: 39.6112,
    color: "#10b981",
  },
  {
    id: "masjid-quba",
    name: "Masjid Quba",
    arabicName: "مسجد قباء",
    category: "masjid",
    description: "Masjid pertama yang dibangun dalam Islam. Sholat 2 rakaat = pahala umroh.",
    tips: [
      "Sholat Dhuha 2 rakaat di sini setara pahala umroh",
      "Tempat parkir tersedia",
      "Buka 24 jam",
    ],
    importance: "sunnah",
    city: "madinah",
    x: 35, y: 65,
    lat: 24.4397, lng: 39.6174,
    color: "#8b5cf6",
  },
  {
    id: "masjid-qiblatayn",
    name: "Masjid Qiblatayn",
    arabicName: "مسجد القبلتين",
    category: "masjid",
    description: "Masjid dua kiblat — tempat perintah pindah kiblat dari Baitul Maqdis ke Ka'bah.",
    tips: [
      "Sejarah penting perpindahan arah kiblat",
      "Tersedia area parkir",
    ],
    importance: "sunnah",
    city: "madinah",
    x: 28, y: 30,
    lat: 24.4739, lng: 39.5922,
    color: "#8b5cf6",
  },
  {
    id: "jabal-uhud",
    name: "Jabal Uhud & Makam Syuhada",
    arabicName: "جبل أحد",
    category: "masyair",
    description: "Lokasi Perang Uhud. Di sini dimakamkan Sayyidina Hamzah dan para syuhada.",
    tips: [
      "Ziarah dengan khidmat dan tidak berlebihan",
      "Baca doa ziarah kubur",
      "Jaga adab di area pemakaman",
    ],
    importance: "sunnah",
    city: "madinah",
    x: 65, y: 20,
    lat: 24.4950, lng: 39.6121,
    color: "#8b5cf6",
  },
];

const CATEGORY_ICONS = {
  masjid: Building2,
  masyair: Mountain,
  hotel: Hotel,
  transport: Plane,
};

const IMPORTANCE_COLORS = {
  wajib: "bg-green-100 text-green-800 border-green-200",
  sunnah: "bg-purple-100 text-purple-800 border-purple-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

const IMPORTANCE_LABELS = {
  wajib: "Wajib / Rukun",
  sunnah: "Sunnah / Ziarah",
  info: "Informasi",
};

function CityMap({ city, locations, onSelect, selected }: {
  city: "makkah" | "madinah";
  locations: Location[];
  onSelect: (loc: Location) => void;
  selected: Location | null;
}) {
  const filtered = locations.filter(l => l.city === city);
  const bgGradient = city === "makkah"
    ? "from-amber-50 to-orange-50"
    : "from-green-50 to-emerald-50";
  const centerLabel = city === "makkah" ? "Makkah Al-Mukarramah" : "Madinah Al-Munawwarah";

  return (
    <div className={`relative w-full rounded-2xl bg-gradient-to-br ${bgGradient} border border-border overflow-hidden`} style={{ paddingBottom: "70%" }}>
      <div className="absolute inset-0">
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          {[20, 40, 60, 80].map(v => (
            <g key={v}>
              <line x1={v} y1="0" x2={v} y2="100" stroke="currentColor" strokeWidth="0.5" />
              <line x1="0" y1={v} x2="100" y2={v} stroke="currentColor" strokeWidth="0.5" />
            </g>
          ))}
        </svg>

        {/* City label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-medium opacity-60">{centerLabel}</div>

        {/* Location pins */}
        {filtered.map(loc => (
          <button
            key={loc.id}
            onClick={() => onSelect(loc)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 group"
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 transition-transform group-hover:scale-125 ${selected?.id === loc.id ? "scale-125 ring-2 ring-offset-1" : ""}`}
              style={{ backgroundColor: loc.color, borderColor: "white", boxShadow: selected?.id === loc.id ? `0 0 0 3px ${loc.color}40` : undefined }}
            >
              <MapPin className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[9px] font-semibold bg-white/90 px-1 rounded shadow leading-tight max-w-[60px] text-center line-clamp-1">{loc.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function JamaahPetaLokasi() {
  const navigate = useNavigate();
  const [activeCity, setActiveCity] = useState<"makkah" | "madinah">("makkah");
  const [selected, setSelected] = useState<Location | null>(LOCATIONS[0]);
  const [filterImportance, setFilterImportance] = useState<"all" | "wajib" | "sunnah">("all");

  const filtered = LOCATIONS.filter(l =>
    l.city === activeCity &&
    (filterImportance === "all" || l.importance === filterImportance)
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/jamaah")} className="h-8 w-8">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-bold text-base leading-tight">Peta Lokasi Ibadah</h1>
          <p className="text-xs text-muted-foreground">Makkah & Madinah</p>
        </div>
        <div className="ml-auto">
          <Navigation className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* City Tabs */}
        <Tabs value={activeCity} onValueChange={(v) => { setActiveCity(v as "makkah" | "madinah"); setSelected(null); }}>
          <TabsList className="w-full">
            <TabsTrigger value="makkah" className="flex-1">🕋 Makkah</TabsTrigger>
            <TabsTrigger value="madinah" className="flex-1">🕌 Madinah</TabsTrigger>
          </TabsList>

          <TabsContent value="makkah" className="mt-3">
            <CityMap city="makkah" locations={LOCATIONS} onSelect={setSelected} selected={selected} />
          </TabsContent>
          <TabsContent value="madinah" className="mt-3">
            <CityMap city="madinah" locations={LOCATIONS} onSelect={setSelected} selected={selected} />
          </TabsContent>
        </Tabs>

        {/* Selected Location Detail */}
        {selected && selected.city === activeCity && (
          <Card className="border-2" style={{ borderColor: selected.color + "60" }}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base">{selected.name}</CardTitle>
                  <p className="text-sm text-muted-foreground font-arabic mt-0.5">{selected.arabicName}</p>
                </div>
                <Badge className={IMPORTANCE_COLORS[selected.importance]} variant="outline">
                  {IMPORTANCE_LABELS[selected.importance]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{selected.description}</p>

              {/* Navigation Buttons */}
              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg py-2 px-3 hover:bg-blue-100 transition-colors font-medium"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Google Maps
                </a>
                <a
                  href={`https://waze.com/ul?ll=${selected.lat},${selected.lng}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-lg py-2 px-3 hover:bg-teal-100 transition-colors font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Waze
                </a>
              </div>

              {/* OSM Iframe embed */}
              <div className="w-full rounded-xl overflow-hidden border" style={{ height: 180 }}>
                <iframe
                  width="100%"
                  height="180"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.008},${selected.lat - 0.006},${selected.lng + 0.008},${selected.lat + 0.006}&layer=mapnik&marker=${selected.lat},${selected.lng}`}
                  style={{ border: 0 }}
                  title={`Peta ${selected.name}`}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Tips & Panduan
                </p>
                <ul className="space-y-1.5">
                  {selected.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <Star className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "wajib", "sunnah"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filterImportance === f ? "default" : "outline"}
              onClick={() => setFilterImportance(f)}
              className="text-xs"
            >
              {f === "all" ? "Semua" : f === "wajib" ? "Wajib" : "Sunnah"}
            </Button>
          ))}
        </div>

        {/* Location List */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">
            Daftar Lokasi — {activeCity === "makkah" ? "Makkah" : "Madinah"} ({filtered.length})
          </h2>
          {filtered.map(loc => {
            const Icon = CATEGORY_ICONS[loc.category];
            return (
              <button
                key={loc.id}
                onClick={() => setSelected(loc)}
                className={`w-full text-left rounded-xl border p-3 flex gap-3 items-start transition-colors ${selected?.id === loc.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"}`}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: loc.color + "20" }}>
                  <Icon className="h-4 w-4" style={{ color: loc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{loc.name}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${IMPORTANCE_COLORS[loc.importance]}`} variant="outline">
                      {loc.importance}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{loc.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Legenda Peta</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { color: "#10b981", label: "Masjid / Tempat Ibadah" },
              { color: "#f59e0b", label: "Masyair (Manasik Haji)" },
              { color: "#8b5cf6", label: "Ziarah / Sunnah" },
              { color: "#3b82f6", label: "Fasilitas / Transport" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground pb-2">
          Peta bersifat ilustratif. Lokasi aktual mungkin berbeda. Ikuti pembimbing rombongan Anda.
        </p>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
