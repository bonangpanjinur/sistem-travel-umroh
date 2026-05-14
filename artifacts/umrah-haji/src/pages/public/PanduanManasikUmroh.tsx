import { useState, useEffect } from "react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  RotateCcw, BookOpen, AlertTriangle, Lightbulb,
  Star, ArrowRight, Heart,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CheckItem {
  id: string;
  text: string;
  arabic?: string;
  transliteration?: string;
  note?: string;
}

interface Tahap {
  id: string;
  no: number;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
  description: string;
  items: CheckItem[];
  tips: string[];
  warning?: string;
  doaArabic?: string;
  doaLatin?: string;
  doaArtinya?: string;
}

// ─── Data per tahapan ────────────────────────────────────────────────────────
const TAHAPAN: Tahap[] = [
  {
    id: "niat",
    no: 1,
    icon: "🤲",
    title: "Niat & Persiapan",
    subtitle: "Miqat — Titik Awal Ihram",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    ringColor: "ring-emerald-400",
    description:
      "Niat adalah pondasi seluruh ibadah. Sebelum memasuki miqat, persiapkan diri lahir dan batin. Pastikan niat tulus hanya karena Allah Subhanahu wa Ta'ala.",
    doaArabic: "لَبَّيْكَ اللَّهُمَّ عُمْرَةً",
    doaLatin: "Labbaik Allāhumma umratan",
    doaArtinya: "Aku penuhi panggilanmu ya Allah untuk umroh",
    items: [
      { id: "niat-1", text: "Bersihkan diri — mandi sunnah ihram (junub atau mandi biasa)" },
      {
        id: "niat-2",
        text: "Kenakan kain ihram dengan benar",
        note: "Laki-laki: 2 lembar kain putih tanpa jahitan. Perempuan: pakaian menutup aurat biasa.",
      },
      { id: "niat-3", text: "Shalat sunnah ihram 2 rakaat (rakaat 1: Al-Kafirun, rakaat 2: Al-Ikhlas)" },
      {
        id: "niat-4",
        text: "Ucapkan niat ihram umroh",
        arabic: "لَبَّيْكَ اللَّهُمَّ عُمْرَةً",
        transliteration: "Labbaik Allāhumma umratan",
      },
      { id: "niat-5", text: "Mulai membaca Talbiyah dengan lantang (laki-laki) atau pelan (perempuan)" },
      {
        id: "niat-6",
        text: "Hindari semua larangan ihram sejak saat ini",
        note: "Larangan: memotong rambut/kuku, memakai wewangian, berhubungan suami-istri, berburu, menikah.",
      },
    ],
    tips: [
      "Mandi sunnah ihram bisa dilakukan di hotel sebelum berangkat ke miqat",
      "Perbanyak talbiyah sepanjang perjalanan menuju Makkah",
      "Jaga ketenangan hati, hindari pertengkaran dan perkataan kotor",
    ],
    warning: "Jika melewati miqat tanpa berniat ihram, wajib kembali ke miqat atau membayar dam (denda).",
  },
  {
    id: "ihram",
    no: 2,
    icon: "🕌",
    title: "Ihram & Talbiyah",
    subtitle: "Menjaga Kesucian Selama Perjalanan",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    ringColor: "ring-blue-400",
    description:
      "Ihram bukan sekadar pakaian — ia adalah simbol kesetaraan di hadapan Allah. Semua jamaah tampil sama, tak ada perbedaan kaya dan miskin. Jaga kondisi ihram hingga tahallul.",
    doaArabic:
      "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ",
    doaLatin:
      "Labbaik Allāhumma labbaik, labbaik lā syarīka laka labbaik, innal-hamda wan-ni'mata laka wal-mulk, lā syarīka lak",
    doaArtinya:
      "Aku penuhi panggilan-Mu ya Allah, aku penuhi. Aku penuhi, tiada sekutu bagi-Mu, aku penuhi. Sesungguhnya segala puji, nikmat, dan kerajaan adalah milik-Mu. Tiada sekutu bagi-Mu.",
    items: [
      { id: "ihram-1", text: "Perbanyak talbiyah sepanjang perjalanan Miqat → Masjidil Haram" },
      { id: "ihram-2", text: "Tidak memakai wewangian/parfum apapun" },
      { id: "ihram-3", text: "Tidak memotong rambut, kuku, atau bulu tubuh" },
      { id: "ihram-4", text: "Tidak menutup kepala (bagi laki-laki)" },
      { id: "ihram-5", text: "Tidak mengenakan pakaian berjahit (bagi laki-laki)" },
      { id: "ihram-6", text: "Tidak berbicara kotor atau bertengkar", note: "Jagalah lisan dan hati agar umroh mabrur." },
      { id: "ihram-7", text: "Sesampai di Makkah, hentikan talbiyah saat melihat Ka'bah" },
    ],
    tips: [
      "Gunakan sabuk (kantong uang) di balik kain ihram agar aman",
      "Bawa sandal jepit sederhana — tidak menutup mata kaki",
      "Simpan obat-obatan di tas kecil yang mudah dijangkau",
    ],
  },
  {
    id: "tawaf",
    no: 3,
    icon: "🕋",
    title: "Tawaf",
    subtitle: "7 Putaran Mengelilingi Ka'bah",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    ringColor: "ring-purple-400",
    description:
      "Tawaf adalah mengelilingi Ka'bah sebanyak 7 putaran berlawanan arah jarum jam. Dimulai dan diakhiri di garis Hajar Aswad. Rasakan keagungan Allah saat ribuan umat berthawaf bersama.",
    doaArabic: "بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ",
    doaLatin: "Bismillāhi, Allāhu akbar",
    doaArtinya: "Dengan nama Allah, Allah Maha Besar",
    items: [
      {
        id: "tawaf-1",
        text: "Pastikan dalam keadaan suci (berwudhu) sebelum tawaf",
        note: "Jika batal wudhu saat tawaf, ambil wudhu dan lanjutkan dari putaran yang terputus.",
      },
      { id: "tawaf-2", text: "Masuki Masjidil Haram dengan kaki kanan, baca basmalah dan doa masuk masjid" },
      { id: "tawaf-3", text: "Posisikan bahu kiri menghadap Ka'bah, mulai dari garis Hajar Aswad" },
      {
        id: "tawaf-4",
        text: "Cium/sentuh/isyaratkan tangan ke Hajar Aswad sambil baca: Bismillāhi, Allāhu akbar",
        note: "Jika penuh sesak, cukup isyarat tangan dari jauh. Tidak boleh menyakiti orang lain.",
      },
      {
        id: "tawaf-5",
        text: "Lakukan Raml (berjalan cepat langkah pendek) di 3 putaran pertama — khusus laki-laki",
      },
      { id: "tawaf-6", text: "4 putaran berikutnya berjalan normal, perbanyak doa dan dzikir" },
      {
        id: "tawaf-7",
        text: "Selesai 7 putaran, tutup bahu kanan (idhtiba selesai bagi laki-laki)",
      },
      { id: "tawaf-8", text: "Shalat 2 rakaat di belakang Maqam Ibrahim (atau di tempat lain jika penuh)" },
      { id: "tawaf-9", text: "Minum air Zamzam sambil berdoa" },
    ],
    tips: [
      "Banyak berdoa di antara Rukun Yamani dan Hajar Aswad — doa di sini tidak tertolak",
      "Boleh berdoa dengan bahasa apapun, Allah Maha Mendengar",
      "Waktu terbaik tawaf: setelah Subuh atau larut malam saat lebih lengang",
    ],
    warning:
      "Tawaf harus dilakukan 7 putaran penuh. Jika ragu jumlah putaran, ambil angka yang lebih kecil (lebih aman).",
  },
  {
    id: "sai",
    no: 4,
    icon: "🏃",
    title: "Sa'i",
    subtitle: "7 Kali Antara Shafa dan Marwah",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    ringColor: "ring-orange-400",
    description:
      "Sa'i mengenang perjuangan Siti Hajar yang berlari-lari mencari air untuk anaknya, Ismail. 7 kali perjalanan antara Shafa dan Marwah ini adalah simbol kegigihan dan tawakal kepada Allah.",
    doaArabic: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ",
    doaLatin: "Innash-Shafā wal-Marwata min sya'ā'irillāh",
    doaArtinya: "Sesungguhnya Shafa dan Marwah adalah sebagian syiar-syiar Allah",
    items: [
      { id: "sai-1", text: "Menuju Bukit Shafa setelah selesai tawaf dan minum Zamzam" },
      {
        id: "sai-2",
        text: "Naiki Shafa, menghadap Ka'bah, ucapkan doa pembuka sa'i",
        arabic: "إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ",
      },
      { id: "sai-3", text: "Berjalan dari Shafa menuju Marwah — ini 1 kali perjalanan (putaran 1)" },
      {
        id: "sai-4",
        text: "Berlari kecil (harwala) di antara dua tanda lampu hijau — khusus laki-laki",
        note: "Perempuan berjalan biasa, tidak melakukan harwala.",
      },
      { id: "sai-5", text: "Tiba di Marwah, naiki, menghadap Ka'bah, berdoa (selesai putaran 1)" },
      { id: "sai-6", text: "Kembali ke Shafa (putaran 2) → Marwah (putaran 3) … hingga 7 kali" },
      {
        id: "sai-7",
        text: "Sa'i berakhir di Marwah (putaran ke-7 berakhir di Marwah)",
        note: "Shafa ke Marwah = 1 kali. Marwah ke Shafa = 1 kali. Total 7 kali perjalanan.",
      },
    ],
    tips: [
      "Boleh sa'i sambil duduk di kursi roda jika tidak sanggup berjalan",
      "Tidak ada syarat wudhu untuk sa'i, tapi dianjurkan",
      "Perbanyak doa dan dzikir, tidak ada bacaan khusus yang wajib di setiap putaran",
    ],
    warning:
      "Pastikan hitungan sa'i benar: dimulai dari Shafa dan diakhiri di Marwah. Jika salah hitungan, harus diulang.",
  },
  {
    id: "tahallul",
    no: 5,
    icon: "✂️",
    title: "Tahallul",
    subtitle: "Penutup Sempurna Umroh",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    ringColor: "ring-rose-400",
    description:
      "Tahallul adalah proses mengakhiri ihram dengan mencukur atau memendekkan rambut. Setelah tahallul, semua larangan ihram gugur dan umroh Anda dinyatakan sempurna.",
    doaArabic: "اللَّهُمَّ اغْفِرْ لِلْمُحَلِّقِينَ",
    doaLatin: "Allāhummagh-fir lil-muḥalliqīn",
    doaArtinya: "Ya Allah, ampunilah orang-orang yang mencukur rambutnya",
    items: [
      { id: "tahallul-1", text: "Selesaikan sa'i (berakhir di Marwah)" },
      {
        id: "tahallul-2",
        text: "Cukur seluruh rambut kepala (afdhal) atau potong minimal 3 helai dari setiap bagian",
        note: "Mencukur seluruh rambut lebih utama bagi laki-laki.",
      },
      {
        id: "tahallul-3",
        text: "Bagi perempuan: potong ujung rambut sepanjang ujung jari (ruas terakhir)",
        note: "Perempuan tidak dianjurkan mencukur gundul.",
      },
      { id: "tahallul-4", text: "Baca doa tahallul sambil atau setelah memotong rambut" },
      {
        id: "tahallul-5",
        text: "Semua larangan ihram telah gugur setelah tahallul",
        note: "Boleh kembali memakai pakaian biasa, parfum, dan semua yang sebelumnya dilarang.",
      },
      { id: "tahallul-6", text: "Berdoa syukur — umroh Anda telah sempurna!" },
      {
        id: "tahallul-7",
        text: "Sempatkan kembali ke Masjidil Haram untuk shalat, berdoa, dan beri'tikaf",
      },
    ],
    tips: [
      "Jasa cukur tersedia di dalam dan sekitar Masjidil Haram",
      "Simpan rambut yang dipotong — beberapa ulama menganjurkan untuk tidak dibuang sembarangan",
      "Setelah tahallul, lakukan shalat sunnah tawadhu sebagai rasa syukur",
    ],
  },
];

// ─── Storage key ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "manasik-umroh-checklist";

// ─── Helper ───────────────────────────────────────────────────────────────────
function loadChecked(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveChecked(data: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Komponen utama ───────────────────────────────────────────────────────────
export default function PanduanManasikUmroh() {
  const [activeTahap, setActiveTahap] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>(loadChecked);
  const [expandedDoa, setExpandedDoa] = useState<Record<string, boolean>>({});
  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});

  // total checklist items across all tahapan
  const totalItems = TAHAPAN.reduce((acc, t) => acc + t.items.length, 0);
  const totalChecked = Object.values(checked).filter(Boolean).length;
  const overallProgress = Math.round((totalChecked / totalItems) * 100);

  useEffect(() => {
    saveChecked(checked);
  }, [checked]);

  function toggleCheck(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function resetAll() {
    setChecked({});
    saveChecked({});
  }

  const tahap = TAHAPAN[activeTahap];
  const tahapChecked = tahap.items.filter((item) => checked[item.id]).length;
  const tahapProgress = Math.round((tahapChecked / tahap.items.length) * 100);
  const tahapDone = tahapChecked === tahap.items.length;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 text-white">
          <div className="container mx-auto px-4 py-14 max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <BookOpen className="h-3.5 w-3.5" />
              Panduan Ibadah Umroh
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
              Panduan Manasik Umroh
            </h1>
            <p className="text-emerald-100 text-base md:text-lg max-w-xl mx-auto mb-6">
              Langkah-demi-langkah interaktif dengan checklist per tahapan — dari niat hingga tahallul
            </p>

            {/* Overall Progress */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-emerald-50">Progress keseluruhan</span>
                <span className="text-sm font-bold">{totalChecked}/{totalItems} langkah</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-white rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-emerald-100">{overallProgress}% selesai</span>
                <button
                  onClick={resetAll}
                  className="text-xs text-emerald-200 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset semua
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* ── Timeline Navigation ─────────────────────────────────────────── */}
          <div className="mb-8">
            {/* Desktop: horizontal stepper */}
            <div className="hidden md:flex items-center justify-center gap-0">
              {TAHAPAN.map((t, idx) => {
                const done = t.items.every((item) => checked[item.id]);
                const active = idx === activeTahap;
                return (
                  <div key={t.id} className="flex items-center">
                    <button
                      onClick={() => setActiveTahap(idx)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 group transition-all",
                        active ? "opacity-100" : "opacity-60 hover:opacity-90",
                      )}
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-xl border-3 transition-all",
                          active
                            ? `${t.bgColor} ${t.borderColor} border-2 ring-2 ${t.ringColor} shadow-lg scale-110`
                            : done
                              ? "bg-emerald-100 border-emerald-400 border-2"
                              : "bg-white border-gray-200 border-2",
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <span>{t.icon}</span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold text-center leading-tight max-w-[72px]",
                          active ? t.color : "text-gray-500",
                        )}
                      >
                        {t.title}
                      </span>
                    </button>
                    {idx < TAHAPAN.length - 1 && (
                      <div
                        className={cn(
                          "w-12 h-0.5 mb-5 transition-colors",
                          TAHAPAN[idx].items.every((item) => checked[item.id])
                            ? "bg-emerald-400"
                            : "bg-gray-200",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile: scrollable chips */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {TAHAPAN.map((t, idx) => {
                const done = t.items.every((item) => checked[item.id]);
                const active = idx === activeTahap;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTahap(idx)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border transition-all",
                      active
                        ? `${t.bgColor} ${t.borderColor} ${t.color}`
                        : done
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-gray-200 text-gray-500",
                    )}
                  >
                    <span>{done ? "✓" : t.icon}</span>
                    {t.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main Content ────────────────────────────────────────────────── */}
          <div className="grid md:grid-cols-5 gap-6">
            {/* Left: Checklist (3 cols) */}
            <div className="md:col-span-3 space-y-4">
              {/* Tahap header */}
              <div className={cn("rounded-2xl p-5 border", tahap.bgColor, tahap.borderColor)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{tahap.icon}</span>
                      <Badge
                        className={cn(
                          "border-0 text-xs font-bold",
                          tahap.bgColor,
                          tahap.color,
                          "opacity-80",
                        )}
                      >
                        Tahap {tahap.no} / {TAHAPAN.length}
                      </Badge>
                      {tahapDone && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" /> Selesai!
                        </Badge>
                      )}
                    </div>
                    <h2 className={cn("text-xl font-bold", tahap.color)}>{tahap.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{tahap.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn("text-2xl font-bold", tahap.color)}>
                      {tahapChecked}/{tahap.items.length}
                    </div>
                    <div className="text-xs text-muted-foreground">langkah</div>
                  </div>
                </div>

                {/* Progress bar per tahap */}
                <div className="mt-3">
                  <Progress value={tahapProgress} className="h-2" />
                </div>
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                {tahap.items.map((item) => {
                  const isChecked = !!checked[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-all duration-200",
                        isChecked
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium leading-snug",
                              isChecked ? "text-emerald-800 line-through opacity-70" : "text-foreground",
                            )}
                          >
                            {item.text}
                          </p>
                          {item.arabic && (
                            <p className="text-sm font-arabic text-right text-gray-700 mt-2 leading-loose">
                              {item.arabic}
                            </p>
                          )}
                          {item.transliteration && (
                            <p className="text-xs italic text-muted-foreground mt-0.5">
                              {item.transliteration}
                            </p>
                          )}
                          {item.note && (
                            <div className="flex items-start gap-1.5 mt-2">
                              <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700 leading-snug">{item.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={activeTahap === 0}
                  onClick={() => setActiveTahap((v) => v - 1)}
                >
                  ← Sebelumnya
                </Button>
                <Button
                  className={cn("flex-1", tahap.bgColor, tahap.color, "border", tahap.borderColor, "hover:opacity-90")}
                  disabled={activeTahap === TAHAPAN.length - 1}
                  onClick={() => setActiveTahap((v) => v + 1)}
                  style={{ background: "" }}
                >
                  Berikutnya <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Right: Info Panel (2 cols) */}
            <div className="md:col-span-2 space-y-4">
              {/* Deskripsi */}
              <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
                <h3 className={cn("text-sm font-bold mb-2", tahap.color)}>Tentang Tahap Ini</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tahap.description}</p>
              </div>

              {/* Doa / Dzikir */}
              {tahap.doaArabic && (
                <div className={cn("rounded-2xl border p-4", tahap.bgColor, tahap.borderColor)}>
                  <button
                    className="w-full flex items-center justify-between"
                    onClick={() =>
                      setExpandedDoa((prev) => ({ ...prev, [tahap.id]: !prev[tahap.id] }))
                    }
                  >
                    <span className={cn("text-sm font-bold flex items-center gap-1.5", tahap.color)}>
                      <Heart className="h-3.5 w-3.5" /> Doa / Bacaan Utama
                    </span>
                    {expandedDoa[tahap.id] ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {expandedDoa[tahap.id] && (
                    <div className="mt-3 space-y-2">
                      <p className="text-right text-base leading-loose font-arabic text-gray-800">
                        {tahap.doaArabic}
                      </p>
                      <p className="text-xs italic text-muted-foreground leading-relaxed">
                        {tahap.doaLatin}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed border-t pt-2 mt-2">
                        <em>"{tahap.doaArtinya}"</em>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tips */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() =>
                    setExpandedTips((prev) => ({ ...prev, [tahap.id]: !prev[tahap.id] }))
                  }
                >
                  <span className="text-sm font-bold flex items-center gap-1.5 text-amber-700">
                    <Star className="h-3.5 w-3.5" /> Tips Praktis
                  </span>
                  {expandedTips[tahap.id] ? (
                    <ChevronUp className="h-4 w-4 text-amber-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-amber-500" />
                  )}
                </button>
                {expandedTips[tahap.id] && (
                  <ul className="mt-3 space-y-2">
                    {tahap.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                        <span className="mt-0.5 text-amber-500 shrink-0">✦</span>
                        <span className="leading-snug">{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Warning */}
              {tahap.warning && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-snug">{tahap.warning}</p>
                </div>
              )}

              {/* Overall stats */}
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Progress Per Tahap
                </p>
                <div className="space-y-2">
                  {TAHAPAN.map((t, idx) => {
                    const done = t.items.filter((item) => checked[item.id]).length;
                    const pct = Math.round((done / t.items.length) * 100);
                    return (
                      <button
                        key={t.id}
                        className="w-full"
                        onClick={() => setActiveTahap(idx)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{t.icon}</span>
                          <span
                            className={cn(
                              "text-xs font-medium flex-1 text-left",
                              idx === activeTahap ? t.color : "text-gray-600",
                            )}
                          >
                            {t.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {done}/{t.items.length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              pct === 100 ? "bg-emerald-500" : "bg-primary",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Completion Banner ──────────────────────────────────────────── */}
          {overallProgress === 100 && (
            <div className="mt-8 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-8 text-center shadow-xl">
              <div className="text-4xl mb-3">🕋</div>
              <h3 className="text-xl font-bold mb-2">Alhamdulillah!</h3>
              <p className="text-emerald-50 text-sm max-w-sm mx-auto">
                Anda telah menyelesaikan semua checklist panduan manasik umroh.
                Semoga Allah menerima ibadah Anda dan menjadikannya umroh yang mabrur.
              </p>
              <p className="text-emerald-200 text-lg mt-4 font-arabic">
                آمِيْن يَا رَبَّ الْعَالَمِيْن
              </p>
              <button
                onClick={resetAll}
                className="mt-5 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full px-5 py-2 text-sm font-medium transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Mulai Ulang Checklist
              </button>
            </div>
          )}

          {/* ── Disclaimer ────────────────────────────────────────────────── */}
          <div className="mt-8 rounded-xl bg-slate-100 border border-slate-200 p-5 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-700">Catatan:</strong> Panduan ini disusun berdasarkan
            fiqih umroh menurut mayoritas ulama. Untuk kondisi khusus atau pertanyaan lebih
            lanjut, konsultasikan dengan pembimbing ibadah atau muthawif Anda.
            Progress checklist tersimpan di perangkat Anda secara lokal.
          </div>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
