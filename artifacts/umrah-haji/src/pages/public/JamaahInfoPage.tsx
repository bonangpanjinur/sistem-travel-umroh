import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User, FileText, BookOpen, MapPin, Video, Star,
  Users, MessageSquare, Bell, CheckCircle2, ArrowRight,
  Shield, Smartphone, Clock, HeartHandshake,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = [
  {
    icon: User,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: "Portal Pribadi Jamaah",
    desc: "Lihat status booking, pembayaran, dan perjalanan Anda secara real-time kapan saja.",
    badge: "Tersedia",
  },
  {
    icon: FileText,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: "Manajemen Dokumen",
    desc: "Upload, kelola, dan pantau status verifikasi dokumen perjalanan Anda — paspor, visa, sertifikat vaksin.",
    badge: "Tersedia",
  },
  {
    icon: BookOpen,
    color: "text-green-600",
    bg: "bg-green-50",
    title: "Panduan Ibadah Digital",
    desc: "Panduan lengkap tata cara ibadah umroh & haji dalam genggaman. Termasuk doa-doa dan rukun ibadah.",
    badge: "Tersedia",
  },
  {
    icon: Video,
    color: "text-red-600",
    bg: "bg-red-50",
    title: "Manasik Digital",
    desc: "Video bimbingan manasik interaktif yang bisa diakses offline. Belajar kapan saja tanpa internet.",
    badge: "Tersedia",
  },
  {
    icon: MapPin,
    color: "text-orange-600",
    bg: "bg-orange-50",
    title: "Peta & Lokasi Suci",
    desc: "Peta interaktif lokasi-lokasi penting di Makkah dan Madinah: Masjidil Haram, Arafah, Mina, dan lainnya.",
    badge: "Tersedia",
  },
  {
    icon: Star,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    title: "Doa & Dzikir",
    desc: "Koleksi doa-doa perjalanan, doa di setiap maqam, dan dzikir harian yang lengkap dengan transliterasi.",
    badge: "Tersedia",
  },
  {
    icon: Clock,
    color: "text-teal-600",
    bg: "bg-teal-50",
    title: "Jadwal Waktu Sholat",
    desc: "Waktu sholat otomatis berdasarkan lokasi Anda, termasuk arah kiblat dan notifikasi adzan.",
    badge: "Tersedia",
  },
  {
    icon: Users,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    title: "Info Rombongan",
    desc: "Lihat daftar anggota rombongan, kontak muthawif, dan jadwal keberangkatan kelompok Anda.",
    badge: "Tersedia",
  },
];

const STEPS = [
  { num: "01", title: "Daftar / Masuk", desc: "Buat akun gratis atau masuk dengan akun yang sudah ada." },
  { num: "02", title: "Booking Paket", desc: "Pilih paket umroh atau haji yang sesuai dan lakukan pemesanan." },
  { num: "03", title: "Akses Portal", desc: "Portal jamaah Anda langsung aktif — semua fitur siap digunakan." },
  { num: "04", title: "Berangkat", desc: "Pantau persiapan, upload dokumen, dan berangkat dengan tenang." },
];

const TESTIMONIALS = [
  {
    name: "Bpk. Ahmad Fauzi",
    city: "Jakarta",
    text: "Sangat membantu! Semua informasi perjalanan tersedia di satu tempat. Dokumen saya bisa diupload langsung dari HP.",
    stars: 5,
  },
  {
    name: "Ibu Siti Rahayu",
    city: "Surabaya",
    text: "Panduan ibadahnya lengkap sekali. Saya bisa belajar manasik kapan saja bahkan tanpa koneksi internet.",
    stars: 5,
  },
  {
    name: "Bpk. Hendra Kusuma",
    city: "Bandung",
    text: "Notifikasi status pembayaran sangat berguna. Saya tidak perlu lagi telepon kantor untuk tanya-tanya.",
    stars: 5,
  },
];

export default function JamaahInfoPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center">
          <Badge className="bg-white/20 text-white border-0 mb-4 text-sm px-3 py-1">
            Portal Khusus Jamaah
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Semua yang Anda Butuhkan<br className="hidden md:block" />
            <span className="text-emerald-300"> dalam Satu Portal</span>
          </h1>
          <p className="text-green-100 text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Portal Jamaah Vinstour memberikan akses mudah ke semua informasi perjalanan ibadah Anda — dari dokumen hingga panduan ibadah, semua tersedia 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <Link to="/jamaah/portal">
                <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 font-semibold px-8">
                  Masuk ke Portal Saya <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth/register">
                  <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 font-semibold px-8">
                    Daftar Gratis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                    Sudah Punya Akun? Masuk
                  </Button>
                </Link>
              </>
            )}
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12 max-w-sm mx-auto">
            {[["10K+", "Jamaah"], ["15+", "Tahun"], ["99%", "Puas"]].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold">{val}</div>
                <div className="text-green-200 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">

        {/* Features Grid */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Fitur Lengkap untuk Jamaah</h2>
            <p className="text-muted-foreground">Semua yang Anda butuhkan sebelum, selama, dan setelah perjalanan ibadah</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex gap-4">
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center`}>
                    <f.icon className={`h-5 w-5 ${f.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{f.title}</h3>
                      <Badge variant="secondary" className="text-xs py-0">{f.badge}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-muted/40 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Cara Menggunakan Portal</h2>
            <p className="text-muted-foreground">Mulai dalam 4 langkah mudah</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.num} className="text-center relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-full h-px bg-border" />
                )}
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-3 relative z-10">
                  {s.num}
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, color: "text-blue-600", bg: "bg-blue-50", title: "Aman & Terpercaya", desc: "Data Anda dilindungi dengan enkripsi tingkat tinggi. Privasi adalah prioritas kami." },
              { icon: Smartphone, color: "text-green-600", bg: "bg-green-50", title: "Akses dari Mana Saja", desc: "Bisa diakses dari HP, tablet, atau komputer. Bahkan bisa diinstall sebagai aplikasi." },
              { icon: HeartHandshake, color: "text-red-600", bg: "bg-red-50", title: "Dukungan 24/7", desc: "Tim kami siap membantu Anda kapan saja melalui WhatsApp, email, atau telepon." },
            ].map((b) => (
              <Card key={b.title} className="text-center border">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-full ${b.bg} flex items-center justify-center mx-auto mb-4`}>
                    <b.icon className={`h-6 w-6 ${b.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Kata Jamaah Kami</h2>
            <p className="text-muted-foreground">Pengalaman nyata dari para jamaah</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border">
                <CardContent className="p-5">
                  <div className="flex mb-3">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.city}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-green-700 to-emerald-600 rounded-2xl p-8 text-white text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Siap Memulai Perjalanan Suci?</h2>
          <p className="text-green-100 mb-6 max-w-md mx-auto">
            Bergabung dengan ribuan jamaah yang telah mempercayakan perjalanan ibadah mereka kepada Vinstour.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/packages">
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 font-semibold px-8">
                Lihat Paket Umroh & Haji
              </Button>
            </Link>
            <Link to={user ? "/jamaah/portal" : "/auth/register"}>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                {user ? "Buka Portal Saya" : "Daftar Sekarang"}
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
