import { PublicLayout } from "@/components/layout/PublicLayout";
import { Star, Quote, MapPin, Heart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TESTIMONIALS = [
  {
    id: 1, name: "Hj. Siti Rahayu", city: "Jakarta Selatan", year: 2025,
    rating: 5, package: "Paket Umroh Plus",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
    quote: "Alhamdulillah, perjalanan Umroh bersama Vinstour sangat berkesan. Pelayanan prima dari awal pendaftaran hingga pulang ke tanah air. Hotel dekat Masjidil Haram, pembimbing sabar dan berpengalaman. Sangat direkomendasikan!",
    verified: true,
  },
  {
    id: 2, name: "Bapak Rudi Hartono", city: "Surabaya", year: 2025,
    rating: 5, package: "Paket Umroh VIP",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80",
    quote: "Ini keberangkatan Umroh saya yang kedua bersama Vinstour. Konsistensi kualitas mereka luar biasa. Jadwal teratur, muthawif profesional, fasilitas hotel bintang 5. Insya Allah akan kembali lagi untuk Haji bersama mereka.",
    verified: true,
  },
  {
    id: 3, name: "Ibu Dewi Lestari", city: "Bandung", year: 2026,
    rating: 5, package: "Paket Umroh Reguler",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&q=80",
    quote: "Awalnya ragu karena pertama kali Umroh. Tapi tim Vinstour sangat membantu dari proses dokumen hingga manasik. Di Tanah Suci pun selalu ada pendamping yang siap membantu. Terima kasih Vinstour!",
    verified: true,
  },
  {
    id: 4, name: "Ust. Ahmad Fauzi", city: "Yogyakarta", year: 2025,
    rating: 5, package: "Paket Umroh Keluarga",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80",
    quote: "Membawa keluarga besar (8 orang) terasa mudah karena Vinstour sangat terorganisir. Anak-anak pun nyaman karena ada program khusus untuk anak. Ibadah lebih fokus karena semua kebutuhan sudah ditangani.",
    verified: true,
  },
  {
    id: 5, name: "Ibu Nurul Hidayah", city: "Medan", year: 2026,
    rating: 5, package: "Paket Umroh Plus Turki",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80",
    quote: "Paket Umroh Plus Turki benar-benar di luar ekspektasi. Ibadah khusyuk di Makkah-Madinah, ditambah wisata budaya di Istanbul yang indah. All-in dengan harga yang sangat terjangkau. Recommended banget!",
    verified: true,
  },
  {
    id: 6, name: "Bapak Hendri Kusuma", city: "Semarang", year: 2025,
    rating: 5, package: "Paket Umroh Reguler",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80",
    quote: "Responsif banget sejak pertama kontak. Proses visa dan dokumen dibantu penuh. Pembimbing di sana hafal nama-nama jamaah satu per satu. Terasa seperti pergi bersama keluarga, bukan rombongan tur biasa.",
    verified: true,
  },
  {
    id: 7, name: "Ibu Fatimah Zahra", city: "Makassar", year: 2026,
    rating: 5, package: "Paket Umroh VIP",
    photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&q=80",
    quote: "Layanan VIP benar-benar terasa beda. Kamar hotel premium view Ka'bah, transportasi private AC, pembimbing pribadi. Setiap detail diperhatikan. Ini investasi terbaik untuk perjalanan ibadah.",
    verified: true,
  },
  {
    id: 8, name: "Bapak Agus Santoso", city: "Malang", year: 2025,
    rating: 4, package: "Paket Umroh Reguler",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&q=80",
    quote: "Secara keseluruhan sangat puas. Jadwal perjalanan tepat waktu, hotel bersih dan nyaman. Sedikit kendala di awal keberangkatan tapi segera diselesaikan. Tim Vinstour sangat profesional dalam menangani masalah.",
    verified: true,
  },
  {
    id: 9, name: "Ibu Ratna Dewi", city: "Palembang", year: 2026,
    rating: 5, package: "Paket Umroh Plus",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80",
    quote: "Ini adalah perjalanan paling bermakna dalam hidup saya. Vinstour memberikan pengalaman ibadah yang luar biasa. Semoga bisa kembali lagi bersama mereka untuk Haji. Terima kasih telah membimbing dengan penuh kasih sayang.",
    verified: true,
  },
];

const STATS = [
  { value: "5.000+", label: "Jamaah Berangkat" },
  { value: "4.9/5", label: "Rating Kepuasan" },
  { value: "15+", label: "Tahun Pengalaman" },
  { value: "98%", label: "Rekomendasikan Kami" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [activePackage, setActivePackage] = useState("Semua");
  const packages = ["Semua", "Paket Umroh Reguler", "Paket Umroh Plus", "Paket Umroh VIP", "Paket Umroh Keluarga"];

  const filtered = activePackage === "Semua"
    ? TESTIMONIALS
    : TESTIMONIALS.filter((t) => t.package === activePackage);

  return (
    <PublicLayout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-50 via-background to-primary/5 py-20">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
            <Heart className="h-4 w-4 fill-amber-400" /> Kisah Jamaah Kami
          </div>
          <h1 className="text-4xl font-bold mb-3">Apa Kata Mereka?</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Ribuan jamaah telah mempercayakan perjalanan ibadah mereka kepada Vinstour Travel.
            Inilah pengalaman yang mereka bagikan.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-14">
        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {packages.map((p) => (
            <button
              key={p}
              onClick={() => setActivePackage(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activePackage === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Testimonial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-muted/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={t.photo}
                  alt={t.name}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                />
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t.city} · {t.year}</span>
                  </div>
                </div>
              </div>

              <StarRating rating={t.rating} />

              <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-4">
                "{t.quote}"
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-muted/40">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {t.package}
                </span>
                {t.verified && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    ✓ Terverifikasi
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-primary/10 to-emerald-50 rounded-3xl p-10">
          <h2 className="text-2xl font-bold mb-3">Jadilah Bagian dari Keluarga Besar Vinstour</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Lebih dari 5.000 jamaah telah membuktikan kualitas layanan kami.
            Giliran Anda untuk merasakan pengalaman ibadah yang tak terlupakan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild><Link to="/packages">Pilih Paket Umroh</Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/contact">Konsultasi Gratis</Link></Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
