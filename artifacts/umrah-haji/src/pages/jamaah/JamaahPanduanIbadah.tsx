import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronLeft, ChevronDown, Search, Star, WifiOff, Wifi,
  BookOpen, Compass, MapPin, Lightbulb, Download, Check,
  BookMarked,
} from "lucide-react";
import { toast } from "sonner";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";

const FAVORITES_KEY = "panduan-ibadah-favorites";
const PWA_SAVED_KEY = "panduan-ibadah-saved-offline";

interface ContentItem {
  id: string;
  title: string;
  arabic?: string;
  latin?: string;
  translation?: string;
  content?: string;
  steps?: { no: number; title: string; desc: string }[];
}

const DOA_UMROH: ContentItem[] = [
  {
    id: "niat-umroh",
    title: "Niat Ihram Umroh",
    arabic: "لَبَّيْكَ اللَّهُمَّ عُمْرَةً",
    latin: "Labbaika Allāhumma 'umratan",
    translation: "Ya Allah, aku penuhi panggilan-Mu untuk menunaikan umroh.",
    content: "Dibaca saat memakai ihram, sebelum atau bersamaan dengan melewati miqat.",
  },
  {
    id: "talbiyah",
    title: "Talbiyah",
    arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ لَا شَرِيكَ لَكَ",
    latin: "Labbaika Allāhumma labbaik, labbaika lā syarīka laka labbaik, innal ḥamda wan-ni'mata laka wal-mulk, lā syarīka lak",
    translation: "Aku penuhi panggilan-Mu ya Allah, aku penuhi panggilan-Mu. Tidak ada sekutu bagi-Mu, aku penuhi panggilan-Mu. Sesungguhnya segala puji, nikmat, dan kekuasaan hanyalah milik-Mu.",
    content: "Dibaca berulang sejak memakai ihram hingga memulai thawaf. Dianjurkan dibaca keras bagi laki-laki.",
  },
  {
    id: "masuk-masjidil-haram",
    title: "Doa Masuk Masjidil Haram",
    arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، فَحَيِّنَا رَبَّنَا بِالسَّلَامِ",
    latin: "Allāhumma antas-salāmu wa minkas-salām, faḥayyanā rabbanā bis-salām",
    translation: "Ya Allah, Engkau adalah sumber keselamatan dan dari-Mu lah keselamatan. Maka hidupkanlah kami wahai Rabb kami dengan keselamatan.",
    content: "Dibaca ketika memasuki Masjidil Haram, masuk dengan kaki kanan.",
  },
  {
    id: "melihat-kabah",
    title: "Doa Melihat Ka'bah Pertama Kali",
    arabic: "اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَعْظِيمًا وَتَشْرِيفًا وَتَكْرِيمًا وَمَهَابَةً",
    latin: "Allāhumma zid hādzal-baita ta'ẓīman wa tasyrifan wa takrīman wa mahābatan",
    translation: "Ya Allah, tambahkanlah keagungan, kemuliaan, kehormatan, dan wibawa bagi rumah ini (Ka'bah).",
    content: "Dibaca saat pertama kali melihat Ka'bah. Saat ini adalah waktu mustajab untuk berdoa.",
  },
  {
    id: "thawaf-start",
    title: "Doa Memulai Thawaf",
    arabic: "بِسْمِ اللهِ وَاللهُ أَكْبَرُ",
    latin: "Bismillāhi wallāhu akbar",
    translation: "Dengan nama Allah, Allah Maha Besar.",
    content: "Dibaca saat memulai thawaf, tepat di Hajar Aswad atau sejajar dengannya, menghadap ke Ka'bah.",
  },
  {
    id: "antara-rukun-yamani",
    title: "Doa Antara Rukun Yamani dan Hajar Aswad",
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    latin: "Rabbanā ātinā fid-dunyā ḥasanatan wa fil-ākhirati ḥasanatan wa qinā 'adzāban-nār",
    translation: "Ya Rabb kami, berikanlah kepada kami kebaikan di dunia dan kebaikan di akhirat, serta lindungilah kami dari azab neraka.",
    content: "Doa yang dianjurkan dibaca antara Rukun Yamani dan Hajar Aswad pada setiap putaran thawaf.",
  },
  {
    id: "sai",
    title: "Doa di Bukit Shafa",
    arabic: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ",
    latin: "Innaṣ-ṣafā wal-marwata min sya'āirillāh",
    translation: "Sesungguhnya Shafa dan Marwa adalah sebagian dari syiar-syiar (ibadah) Allah.",
    content: "Dibaca saat pertama kali mendaki bukit Shafa, sebelum memulai sa'i.",
  },
  {
    id: "doa-minum-zamzam",
    title: "Doa Minum Air Zamzam",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا وَاسِعًا وَشِفَاءً مِنْ كُلِّ دَاءٍ",
    latin: "Allāhumma innī as'aluka 'ilman nāfi'an wa rizqan wāsi'an wa syifā'an min kulli dā'",
    translation: "Ya Allah, aku meminta kepada-Mu ilmu yang bermanfaat, rezeki yang luas, dan kesembuhan dari segala penyakit.",
    content: "Dibaca sebelum minum air Zamzam, menghadap kiblat. Minum dengan tiga tegukan.",
  },
  {
    id: "tahallul",
    title: "Doa Tahallul (Cukur/Potong Rambut)",
    arabic: "اللَّهُمَّ اغْفِرْ لِلْمُحَلِّقِينَ",
    latin: "Allāhummaghfir lil-muḥalliqīn",
    translation: "Ya Allah, ampunilah orang-orang yang mencukur rambutnya.",
    content: "Dibaca saat mencukur atau memotong rambut sebagai tanda selesainya umroh. Laki-laki dianjurkan mencukur gundul.",
  },
  {
    id: "keluar-masjid",
    title: "Doa Keluar Masjid",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    latin: "Allāhumma innī as'aluka min faḍlik",
    translation: "Ya Allah, sesungguhnya aku memohon kepada-Mu dari karunia-Mu.",
    content: "Dibaca saat keluar masjid, keluar dengan kaki kiri terlebih dahulu.",
  },
];

const MANASIK_UMROH: ContentItem[] = [
  {
    id: "ihram",
    title: "1. Miqat & Ihram",
    content: "Tahap pertama: niat dan mengenakan pakaian ihram di miqat.",
    steps: [
      { no: 1, title: "Mandi Sebelum Ihram", desc: "Mandi sunnah (ghusl) untuk bersuci sebelum memakai ihram." },
      { no: 2, title: "Pakai Pakaian Ihram", desc: "Laki-laki: 2 helai kain putih tanpa jahitan. Perempuan: pakaian biasa yang menutup aurat." },
      { no: 3, title: "Shalat Sunnah Ihram", desc: "2 rakaat shalat sunnah ihram (bila memungkinkan)." },
      { no: 4, title: "Niat Ihram", desc: "Baca niat umroh: 'Labbaika Allāhumma umratan' saat berada di miqat atau melewatinya." },
      { no: 5, title: "Larangan Ihram", desc: "Hindari: memotong rambut/kuku, memakai parfum, berhubungan suami-istri, berburu, bertengkar, berkata kotor." },
    ],
  },
  {
    id: "thawaf",
    title: "2. Thawaf",
    content: "Mengelilingi Ka'bah 7 kali putaran berlawanan arah jarum jam.",
    steps: [
      { no: 1, title: "Bersuci (Wudhu)", desc: "Pastikan dalam keadaan suci (wudhu/tayammum) sebelum thawaf." },
      { no: 2, title: "Mulai di Hajar Aswad", desc: "Mulai dari Hajar Aswad (pojok Ka'bah yang ada batu hitam). Menghadap Ka'bah, istilam (cium/usap/isyarat)." },
      { no: 3, title: "Ka'bah di Sebelah Kiri", desc: "Berjalan berlawanan arah jarum jam, Ka'bah selalu di sebelah kiri." },
      { no: 4, title: "7 Putaran", desc: "Selesaikan 7 putaran penuh. Setiap melewati Hajar Aswad, ucap 'Bismillāhi wallāhu akbar'." },
      { no: 5, title: "Raml (Putaran 1-3)", desc: "Bagi laki-laki, 3 putaran pertama berjalan cepat (raml) dan terbuka bahu kanan (idhtibā')." },
      { no: 6, title: "Shalat 2 Rakaat", desc: "Selesai thawaf, shalat 2 rakaat di dekat Maqam Ibrahim (bila memungkinkan)." },
      { no: 7, title: "Minum Air Zamzam", desc: "Minum air Zamzam sambil berdoa. Hadap kiblat, teguk 3 kali." },
    ],
  },
  {
    id: "sai",
    title: "3. Sa'i",
    content: "Berjalan/berlari kecil antara Bukit Shafa dan Marwa sebanyak 7 kali.",
    steps: [
      { no: 1, title: "Menuju Bukit Shafa", desc: "Setelah thawaf, menuju Bukit Shafa melalui pintu Shafa." },
      { no: 2, title: "Doa di Shafa", desc: "Naiki Shafa, hadap Ka'bah, baca doa pembuka sa'i, baca takbir 3x, baca doa." },
      { no: 3, title: "Berjalan ke Marwa", desc: "Turun dari Shafa, berjalan ke Marwa. Ini dihitung 1 perjalanan." },
      { no: 4, title: "Berlari di Tanda Hijau", desc: "Di antara 2 tanda lampu hijau, laki-laki berlari kecil (sunnah)." },
      { no: 5, title: "Doa di Marwa", desc: "Naiki Marwa, hadap Ka'bah, baca doa yang sama seperti di Shafa." },
      { no: 6, title: "7 Kali Perjalanan", desc: "Shafa→Marwa = 1, Marwa→Shafa = 2. Selesai di Marwa pada perjalanan ke-7." },
    ],
  },
  {
    id: "tahallul",
    title: "4. Tahallul",
    content: "Mencukur atau memotong rambut sebagai tanda selesainya ibadah umroh.",
    steps: [
      { no: 1, title: "Cukur Gundul (Laki-laki)", desc: "Dianjurkan mencukur semua rambut kepala (gundul). Atau minimal memotong dari seluruh bagian kepala." },
      { no: 2, title: "Potong Rambut (Perempuan)", desc: "Perempuan cukup memotong rambut minimal sebesar jari (1-2 cm)." },
      { no: 3, title: "Selesai Umroh", desc: "Setelah tahallul, semua larangan ihram sudah tidak berlaku. Umroh selesai." },
    ],
  },
];

const PANDUAN_HAJI: ContentItem[] = [
  {
    id: "ihram-haji",
    title: "1. Ihram Haji dari Miqat",
    content: "Niat ihram haji pada tanggal 8 Dzulhijjah (hari Tarwiyah).",
    steps: [
      { no: 1, title: "Ihram dari Makkah", desc: "Bagi jamaah yang sudah di Makkah (haji tamattu), ihram dari hotel/penginapan." },
      { no: 2, title: "Niat Haji", desc: "Baca: 'Labbaika Allāhumma hajjan' — Ya Allah, aku penuhi panggilan-Mu untuk menunaikan haji." },
      { no: 3, title: "Berangkat ke Mina", desc: "Tanggal 8 Dzulhijjah: berangkat ke Mina, bermalam di sana (mabit)." },
    ],
  },
  {
    id: "wukuf-arafah",
    title: "2. Wukuf di Arafah",
    content: "Rukun terpenting haji — harus dilakukan pada 9 Dzulhijjah.",
    steps: [
      { no: 1, title: "Berangkat ke Arafah", desc: "Setelah Subuh tanggal 9 Dzulhijjah, berangkat dari Mina ke Arafah." },
      { no: 2, title: "Waktu Wukuf", desc: "Wukuf dimulai setelah matahari tergelincir (waktu Dzuhur) hingga terbenam." },
      { no: 3, title: "Khutbah & Shalat Jamak", desc: "Shalat Dzuhur dan Ashar dijamak qashar (di waktu Dzuhur)." },
      { no: 4, title: "Perbanyak Doa & Dzikir", desc: "Inti wukuf: memperbanyak doa, dzikir, taubat, dan istighfar. Ini waktu paling mustajab." },
      { no: 5, title: "Berangkat ke Muzdalifah", desc: "Setelah Maghrib, berangkat ke Muzdalifah. Jangan terburu-buru." },
    ],
  },
  {
    id: "muzdalifah",
    title: "3. Mabit di Muzdalifah",
    content: "Bermalam di Muzdalifah malam 10 Dzulhijjah (malam Idul Adha).",
    steps: [
      { no: 1, title: "Shalat Maghrib & Isya Jamak", desc: "Shalat Maghrib dan Isya dijamak ta'khir qashar (di waktu Isya)." },
      { no: 2, title: "Ambil Batu Jumrah", desc: "Kumpulkan 49 (minimal) atau 70 batu kerikil kecil untuk melempar jumrah." },
      { no: 3, title: "Istirahat Malam", desc: "Istirahat di Muzdalifah. Wajib mabit hingga lewat tengah malam." },
      { no: 4, title: "Berangkat ke Mina", desc: "Setelah tengah malam, berangkat ke Mina untuk melempar jumrah." },
    ],
  },
  {
    id: "jumrah",
    title: "4. Melempar Jumrah Aqabah",
    content: "Tanggal 10 Dzulhijjah: lempar Jumrah Aqabah 7 batu.",
    steps: [
      { no: 1, title: "Lempar Jumrah Aqabah", desc: "Lempar Jumrah Aqabah dengan 7 batu, tiap lemparan baca 'Allāhu Akbar'." },
      { no: 2, title: "Penyembelihan Hewan", desc: "Potong hewan kurban (dam) — dilakukan jamaah atau diwakili." },
      { no: 3, title: "Cukur Rambut (Tahallul Awal)", desc: "Cukur/potong rambut: tahallul awal — larangan ihram sebagian gugur." },
      { no: 4, title: "Thawaf Ifadah", desc: "Kembali ke Makkah untuk thawaf ifadah (thawaf haji) — rukun haji." },
      { no: 5, title: "Sa'i Haji", desc: "Sa'i 7 kali antara Shafa dan Marwa (bila belum dilakukan saat tamattu)." },
      { no: 6, title: "Tahallul Tsani", desc: "Setelah thawaf ifadah dan sa'i: tahallul kedua — semua larangan gugur." },
    ],
  },
  {
    id: "hari-tasyriq",
    title: "5. Hari Tasyriq (11-13 Dzulhijjah)",
    content: "Mabit di Mina dan melempar tiga jumrah setiap hari.",
    steps: [
      { no: 1, title: "Mabit di Mina", desc: "Wajib bermalam di Mina pada malam 11 dan 12 Dzulhijjah (minimal)." },
      { no: 2, title: "Lempar 3 Jumrah", desc: "Setiap hari (11, 12, 13 Dzulhijjah) lempar Jumrah Ula, Wustha, dan Aqabah — masing-masing 7 batu." },
      { no: 3, title: "Waktu Lempar", desc: "Dianjurkan setelah matahari tergelincir. Waktu terakhir sebelum tengah malam." },
      { no: 4, title: "Nafar Awal / Tsani", desc: "Nafar Awal: keluar Mina tanggal 12. Nafar Tsani: keluar tanggal 13 (lebih afdhal)." },
    ],
  },
  {
    id: "thawaf-wada",
    title: "6. Thawaf Wada' (Perpisahan)",
    content: "Thawaf perpisahan sebelum meninggalkan Makkah — wajib bagi jamaah luar Makkah.",
    steps: [
      { no: 1, title: "Wajib Dilakukan", desc: "Setiap jamaah yang akan meninggalkan Makkah wajib thawaf wada' (7 putaran)." },
      { no: 2, title: "Doa Perpisahan", desc: "Berdoa khusuk, karena ini saat terakhir berada di depan Ka'bah." },
      { no: 3, title: "Keluar Berjalan Mundur", desc: "Sebagian ulama menganjurkan keluar dari masjid dengan menghadap Ka'bah (berjalan mundur)." },
    ],
  },
];

const TIPS_PERJALANAN: ContentItem[] = [
  {
    id: "kesehatan",
    title: "Menjaga Kesehatan Selama Ibadah",
    content: "Tips menjaga stamina dan kesehatan sepanjang perjalanan ibadah.",
    steps: [
      { no: 1, title: "Minum Air Cukup", desc: "Minum minimal 8 gelas/hari. Bawa botol air selalu. Cuaca Makkah sangat panas (40-50°C)." },
      { no: 2, title: "Istirahat Cukup", desc: "Tidur minimal 6 jam/hari. Jangan forsir ibadah hingga kelelahan." },
      { no: 3, title: "Pakai Sandal Nyaman", desc: "Gunakan sandal yang nyaman dan tidak mudah lepas — banyak berjalan kaki." },
      { no: 4, title: "Bawa Payung/Topi", desc: "Lindungi dari panas matahari dengan payung atau topi (di luar masjid)." },
      { no: 5, title: "Obat Pribadi", desc: "Bawa obat rutin, paracetamol, antidiare, plester, dan vitamin." },
    ],
  },
  {
    id: "keamanan",
    title: "Keamanan & Anti Tersesat",
    content: "Tips agar tidak tersesat dan tetap aman selama ibadah.",
    steps: [
      { no: 1, title: "Hafal Hotel Anda", desc: "Catat nama hotel, nomor kamar, dan nomor telepon pembimbing. Simpan di dompet dan HP." },
      { no: 2, title: "Tetap Bersama Rombongan", desc: "Jangan pisah dari kelompok, terutama saat thawaf dan sa'i yang penuh sesak." },
      { no: 3, title: "Kenali Tanda Masjidil Haram", desc: "Hafalkan pintu masuk/keluar yang biasa Anda gunakan." },
      { no: 4, title: "Nomor Darurat", desc: "Simpan nomor pembimbing, KJRI (+966-12-221-7000), dan ambulan Makkah (911)." },
      { no: 5, title: "Gelang Identitas", desc: "Kenakan gelang identitas berisi nama, kelompok, dan nomor kontak darurat." },
    ],
  },
  {
    id: "etika",
    title: "Etika & Adab di Tanah Suci",
    content: "Adab penting yang harus dijaga selama berada di Makkah dan Madinah.",
    steps: [
      { no: 1, title: "Jaga Lisan", desc: "Hindari perdebatan, gossip, atau perkataan buruk. Perbanyak dzikir dan doa." },
      { no: 2, title: "Hormati Jamaah Lain", desc: "Bersabar, tidak dorong-dorongan, dan bantu jamaah lansia atau yang membutuhkan." },
      { no: 3, title: "Jaga Kebersihan", desc: "Buang sampah pada tempatnya. Jaga kebersihan Masjidil Haram dan lingkungan." },
      { no: 4, title: "Berpakaian Sopan", desc: "Di luar ihram, tetap berpakaian sopan dan menutup aurat sesuai syariat." },
      { no: 5, title: "Matikan HP di Dalam Masjid", desc: "Atau set ke mode diam/senyap saat berada di dalam masjid." },
    ],
  },
  {
    id: "perlengkapan",
    title: "Checklist Perlengkapan Wajib",
    content: "Barang-barang yang wajib dan penting dibawa selama ibadah.",
    steps: [
      { no: 1, title: "Dokumen", desc: "Paspor, visa, tiket, asuransi, kartu BPJS, KTP, foto 4x6 (10 lembar)." },
      { no: 2, title: "Pakaian Ihram", desc: "2 set ihram (laki-laki). Pakaian ihram perempuan. Sabuk uang." },
      { no: 3, title: "Pakaian Sehari-hari", desc: "Baju untuk 10-15 hari, jaket/sweater untuk AC masjid yang dingin." },
      { no: 4, title: "Perlengkapan Ibadah", desc: "Al-Qur'an mini, buku doa, tasbih, sajadah travel, kompas kiblat." },
      { no: 5, title: "Elektronik", desc: "HP + charger, power bank (min 10.000 mAh), adaptor colokan Saudi Arabia (tipe G)." },
      { no: 6, title: "Kesehatan", desc: "Krim tabir surya, lip balm, obat-obatan pribadi, masker, hand sanitizer." },
    ],
  },
];

const TABS = [
  { value: "doa", label: "Doa Umroh", icon: BookOpen, data: DOA_UMROH },
  { value: "manasik", label: "Manasik Umroh", icon: Compass, data: MANASIK_UMROH },
  { value: "haji", label: "Panduan Haji", icon: MapPin, data: PANDUAN_HAJI },
  { value: "tips", label: "Tips & Info", icon: Lightbulb, data: TIPS_PERJALANAN },
];

export default function JamaahPanduanIbadah() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("doa");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSaved, setIsSaved] = useState(() => !!localStorage.getItem(PWA_SAVED_KEY));
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const handleSaveOffline = () => {
    localStorage.setItem(PWA_SAVED_KEY, new Date().toISOString());
    setIsSaved(true);
    toast.success("Panduan ibadah tersimpan untuk akses offline");
  };

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const currentData = TABS.find(t => t.value === activeTab)?.data || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return currentData;
    const q = search.toLowerCase();
    return currentData.filter(item =>
      item.title.toLowerCase().includes(q) ||
      (item.content || "").toLowerCase().includes(q) ||
      (item.translation || "").toLowerCase().includes(q)
    );
  }, [currentData, search]);

  const savedAt = localStorage.getItem(PWA_SAVED_KEY);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50 shadow">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
              onClick={() => navigate("/jamaah")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold leading-tight">Panduan Ibadah</h1>
              <div className="flex items-center gap-1.5 text-xs opacity-75">
                {isOnline
                  ? <><Wifi className="h-3 w-3" /> Online</>
                  : <><WifiOff className="h-3 w-3" /> Offline {isSaved && "• Tersedia"}</>
                }
              </div>
            </div>
          </div>
          <Button
            variant="ghost" size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10 gap-1.5 h-8 text-xs"
            onClick={isSaved ? undefined : handleSaveOffline}
          >
            {isSaved
              ? <><Check className="h-3.5 w-3.5" /> Tersimpan</>
              : <><Download className="h-3.5 w-3.5" /> Simpan Offline</>
            }
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Offline notice */}
        {!isOnline && (
          <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Mode offline — konten panduan tetap tersedia sepenuhnya</span>
          </div>
        )}

        {/* PWA install banner */}
        {isSaved && savedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>Tersimpan sejak {new Date(savedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long" })} — dapat diakses tanpa internet</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Cari di ${TABS.find(t => t.value === activeTab)?.label}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSearch(""); setExpandedId(null); }}>
          <TabsList className="grid grid-cols-4 w-full h-auto gap-0.5 p-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.value} value={t.value} className="flex-col gap-0.5 py-2 h-auto text-[10px] leading-tight">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.split(" ")[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TABS.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-3">
              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Tidak ada hasil untuk "<strong>{search}</strong>"
                  </CardContent>
                </Card>
              ) : filtered.map(item => (
                <Collapsible
                  key={item.id}
                  open={expandedId === item.id}
                  onOpenChange={open => setExpandedId(open ? item.id : null)}
                >
                  <Card className={`overflow-hidden transition-all ${expandedId === item.id ? "border-primary/30 shadow-sm" : ""}`}>
                    <CollapsibleTrigger className="w-full text-left">
                      <CardHeader className="py-3 px-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <BookMarked className="h-4 w-4 text-primary shrink-0" />
                            <CardTitle className="text-sm font-semibold truncate">{item.title}</CardTitle>
                            {favorites.includes(item.id) && (
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expandedId === item.id ? "rotate-180" : ""}`} />
                        </div>
                        {item.content && (
                          <p className="text-xs text-muted-foreground mt-0.5 text-left pl-6 line-clamp-1">{item.content}</p>
                        )}
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4 space-y-4">
                        {/* Arabic text */}
                        {item.arabic && (
                          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                            <p className="text-2xl leading-loose text-right font-arabic text-foreground" dir="rtl">
                              {item.arabic}
                            </p>
                          </div>
                        )}
                        {/* Latin */}
                        {item.latin && (
                          <div>
                            <Badge variant="outline" className="mb-1.5 text-[10px]">Latin</Badge>
                            <p className="text-sm italic text-muted-foreground">{item.latin}</p>
                          </div>
                        )}
                        {/* Translation */}
                        {item.translation && (
                          <div>
                            <Badge variant="outline" className="mb-1.5 text-[10px]">Terjemahan</Badge>
                            <p className="text-sm">{item.translation}</p>
                          </div>
                        )}
                        {/* Content note */}
                        {item.content && !item.steps && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">{item.content}</p>
                          </div>
                        )}
                        {/* Steps */}
                        {item.steps && (
                          <div className="space-y-2">
                            {item.steps.map(s => (
                              <div key={s.no} className="flex gap-3 items-start">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                  {s.no}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">{s.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Favorite button */}
                        <Button
                          variant="ghost" size="sm"
                          className="text-xs gap-1.5 h-7 mt-1"
                          onClick={() => toggleFavorite(item.id)}
                        >
                          <Star className={`h-3.5 w-3.5 ${favorites.includes(item.id) ? "text-amber-500 fill-amber-500" : ""}`} />
                          {favorites.includes(item.id) ? "Hapus dari Favorit" : "Simpan ke Favorit"}
                        </Button>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        {/* Stats footer */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground py-2">
          <span>{DOA_UMROH.length} doa umroh</span>
          <span>•</span>
          <span>{MANASIK_UMROH.length} tahap manasik</span>
          <span>•</span>
          <span>{PANDUAN_HAJI.length} tahap haji</span>
          <span>•</span>
          <span>{favorites.length} favorit</span>
        </div>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
