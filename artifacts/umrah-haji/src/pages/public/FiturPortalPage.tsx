import { Link } from "react-router-dom";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import {
  Package, Calendar, Calculator, BookOpen, MessageCircle,
  Star, Search, CreditCard, Bell, Shield, Users, Map,
  FileText, HeartHandshake, Wallet, Phone, ArrowRight,
  CheckCircle2, Plane, Hotel, UserCheck, BookMarked, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  label?: string;
  badge?: string;
}

const mainFeatures: Feature[] = [
  {
    icon: <Package className="h-7 w-7" />,
    title: "Paket Umroh & Haji",
    description: "Jelajahi ratusan pilihan paket dari program reguler, plus, VIP, hingga haji khusus. Bandingkan harga, fasilitas, dan jadwal secara transparan.",
    href: "/packages",
    label: "Lihat Paket",
    badge: "Terpopuler",
  },
  {
    icon: <Calendar className="h-7 w-7" />,
    title: "Jadwal Keberangkatan",
    description: "Pantau slot keberangkatan yang tersedia secara real-time, lengkap dengan informasi sisa kursi dan harga terkini.",
    href: "/departures",
    label: "Cek Jadwal",
  },
  {
    icon: <Search className="h-7 w-7" />,
    title: "Cek Status Booking",
    description: "Lacak status pendaftaran, pembayaran, dan perkembangan perjalanan Anda hanya dengan memasukkan kode booking.",
    href: "/cek-booking",
    label: "Cek Sekarang",
  },
  {
    icon: <Calculator className="h-7 w-7" />,
    title: "Kalkulator Biaya",
    description: "Estimasi total biaya perjalanan Anda secara instan. Pilih tipe kamar, jumlah peserta, dan tambahan layanan.",
    href: "/kalkulator",
    label: "Hitung Biaya",
  },
  {
    icon: <Wallet className="h-7 w-7" />,
    title: "Program Tabungan",
    description: "Mulai menabung untuk biaya Umroh Anda dari sekarang. Daftar program tabungan dengan setoran fleksibel tanpa bunga.",
    href: "/savings",
    label: "Mulai Menabung",
    badge: "Tanpa Bunga",
  },
  {
    icon: <Star className="h-7 w-7" />,
    title: "Ulasan & Testimoni",
    description: "Baca pengalaman nyata dari ratusan jamaah yang telah berangkat bersama kami. Ulasan jujur dan terverifikasi.",
    href: "/testimonials",
    label: "Baca Ulasan",
  },
];

const jamaahFeatures: Feature[] = [
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Notifikasi Real-Time",
    description: "Terima update status pembayaran, visa, dan keberangkatan langsung di ponsel Anda.",
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Dokumen Digital",
    description: "Akses dokumen perjalanan seperti itinerary, manifest, dan voucher hotel dari mana saja.",
  },
  {
    icon: <Map className="h-6 w-6" />,
    title: "Panduan Perjalanan",
    description: "Panduan lengkap ibadah, lokasi penting di Tanah Suci, dan informasi darurat yang bisa diakses offline.",
  },
  {
    icon: <HeartHandshake className="h-6 w-6" />,
    title: "Program Manasik",
    description: "Ikuti sesi manasik online dan offline, dilengkapi materi, video panduan, dan absensi digital.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Tombol SOS Darurat",
    description: "Fitur SOS untuk situasi darurat selama di Tanah Suci. Langsung terhubung ke tim pendamping.",
  },
  {
    icon: <BookMarked className="h-6 w-6" />,
    title: "Jurnal & Dzikir Digital",
    description: "Catat momen spiritual perjalanan, lacak ibadah harian, dan hitung dzikir dengan aplikasi bawaan.",
  },
];

const agentFeatures: Feature[] = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "Dashboard Agen",
    description: "Kelola jamaah, pantau komisi, dan lacak performa penjualan Anda dalam satu dashboard.",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Komisi Transparan",
    description: "Sistem komisi otomatis yang langsung tercatat setiap kali jamaah Anda booking paket.",
  },
  {
    icon: <UserCheck className="h-6 w-6" />,
    title: "Website Agen Gratis",
    description: "Dapatkan website khusus dengan URL unik untuk mempromosikan paket atas nama Anda.",
  },
  {
    icon: <Plane className="h-6 w-6" />,
    title: "Daftarkan Jamaah",
    description: "Proses pendaftaran jamaah langsung dari aplikasi, lengkap dengan validasi data otomatis.",
  },
  {
    icon: <Hotel className="h-6 w-6" />,
    title: "Akses Paket Lengkap",
    description: "Lihat detail semua paket tersedia beserta harga, kuota, dan ketersediaan real-time.",
  },
  {
    icon: <Landmark className="h-6 w-6" />,
    title: "Pelatihan Produk",
    description: "Akses modul pelatihan dan quiz produk untuk meningkatkan kemampuan penjualan Anda.",
  },
];

const steps = [
  { num: "01", title: "Pilih Paket", desc: "Jelajahi dan pilih paket Umroh atau Haji yang sesuai budget dan jadwal Anda." },
  { num: "02", title: "Daftar / Masuk", desc: "Buat akun gratis atau masuk jika sudah punya akun." },
  { num: "03", title: "Lengkapi Data", desc: "Isi data jamaah, unggah dokumen yang diperlukan." },
  { num: "04", title: "Bayar DP", desc: "Lakukan pembayaran DP untuk konfirmasi booking Anda." },
  { num: "05", title: "Proses Visa", desc: "Tim kami memproses visa dan dokumen perjalanan Anda." },
  { num: "06", title: "Berangkat", desc: "Perjalanan suci Anda dimulai. Tim pendamping siap 24 jam." },
];

export default function FiturPortalPage() {
  return (
    <DynamicPublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-teal-600 py-20 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container mx-auto px-4 text-center relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium mb-5 backdrop-blur-sm">
            <CheckCircle2 className="h-4 w-4" />
            Portal Layanan Lengkap Jamaah & Agen
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Semua Fitur untuk<br />Perjalanan Ibadah Anda
          </h1>
          <p className="text-lg md:text-xl text-green-100 max-w-2xl mx-auto mb-8">
            Dari perencanaan hingga kepulangan, platform kami hadir mendampingi setiap langkah perjalanan suci Anda.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-green-700 hover:bg-green-50 font-bold">
              <Link to="/packages">Lihat Paket <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link to="/auth/register">Daftar Gratis</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Fitur Utama Publik */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Layanan Publik</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Fitur-fitur ini dapat diakses tanpa perlu login — tersedia untuk semua calon jamaah.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mainFeatures.map((f) => (
              <div key={f.title} className="group relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                {f.badge && (
                  <span className="absolute top-4 right-4 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                    {f.badge}
                  </span>
                )}
                <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{f.description}</p>
                {f.href && (
                  <Link
                    to={f.href}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700"
                  >
                    {f.label} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alur Booking */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Cara Mendaftar</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Proses pendaftaran mudah dan transparan, selesai dalam beberapa menit.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.num} className="relative flex gap-4 items-start bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                  {s.num}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fitur Portal Jamaah (Login) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-4 py-1.5 text-sm font-medium mb-4">
              <UserCheck className="h-4 w-4" />
              Setelah Login — Portal Jamaah
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Fitur Eksklusif Jamaah</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Daftarkan akun gratis untuk mengakses fitur-fitur pendukung perjalanan ibadah Anda.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {jamaahFeatures.map((f) => (
              <div key={f.title} className="flex gap-4 items-start rounded-xl border border-gray-100 bg-gray-50 p-5 hover:bg-blue-50/50 transition-colors">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link to="/auth/register">Buat Akun Gratis <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Fitur Portal Agen */}
      <section className="py-20 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 px-4 py-1.5 text-sm font-medium mb-4">
              <HeartHandshake className="h-4 w-4" />
              Program Kemitraan Agen
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Bergabung Sebagai Agen</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Dapatkan penghasilan tambahan dengan menjadi mitra agen kami. Komisi kompetitif, tools lengkap, pelatihan tersedia.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {agentFeatures.map((f) => (
              <div key={f.title} className="flex gap-4 items-start rounded-xl bg-white p-5 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
              <Link to="/contact">Hubungi Kami untuk Bergabung <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Akhir */}
      <section className="py-20 bg-green-700 text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Siap Wujudkan Perjalanan Suci Anda?</h2>
          <p className="text-green-100 max-w-xl mx-auto mb-8 text-lg">
            Ribuan jamaah telah mempercayakan perjalanan ibadah mereka bersama kami. Giliran Anda!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-green-700 hover:bg-green-50 font-bold">
              <Link to="/packages">Pilih Paket Sekarang</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link to="/contact">
                <Phone className="mr-2 h-4 w-4" />
                Konsultasi Gratis
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </DynamicPublicLayout>
  );
}
