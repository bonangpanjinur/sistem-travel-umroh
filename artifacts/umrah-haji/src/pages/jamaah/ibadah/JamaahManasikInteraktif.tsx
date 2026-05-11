import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, MapPin, Navigation } from "lucide-react";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { cn } from "@/lib/utils";

interface Step {
  no: number;
  title: string;
  description: string;
  detail: string;
  icon: string;
  tip?: string;
}

const TAWAF_STEPS: Step[] = [
  {
    no: 1, icon: "🕋",
    title: "Niat & Ihram",
    description: "Pastikan dalam keadaan suci, pakai ihram, niatkan tawaf.",
    detail: "Tawaf dimulai dari Hajar Aswad. Posisikan bahu kanan menghadap Ka'bah. Ucapkan: بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ (Bismillah, Allahu Akbar).",
    tip: "Jika penuh sesak, cukup isyarat dengan tangan ke arah Hajar Aswad."
  },
  {
    no: 2, icon: "↩️",
    title: "Putaran 1 — Raml (Laki-laki)",
    description: "Laki-laki berlari kecil (raml) pada 3 putaran pertama.",
    detail: "Raml adalah berjalan cepat dengan langkah pendek dan dada membusung. Perempuan tidak melakukan raml. Terus baca doa dan dzikir sepanjang tawaf.",
    tip: "Selalu jaga Ka'bah di sisi kiri Anda selama tawaf."
  },
  {
    no: 3, icon: "🟢",
    title: "Putaran 2–3",
    description: "Lanjutkan raml sambil banyak berdoa dan berdzikir.",
    detail: "Di setiap putaran, ketika sampai di Rukun Yamani (pojok selatan), usap dengan tangan kanan atau isyaratkan jika tidak bisa. Baca doa: رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.",
    tip: "Jangan memaksakan menyentuh Hajar Aswad jika sesak — isyarat sudah cukup."
  },
  {
    no: 4, icon: "🚶",
    title: "Putaran 4–7 — Jalan Biasa",
    description: "4 putaran terakhir berjalan normal, perbanyak doa.",
    detail: "Tidak ada lagi raml di putaran 4–7. Gunakan waktu ini untuk berdoa dengan khusyuk. Perbanyak istighfar, shalawat, dan doa pribadi.",
    tip: "Boleh berdoa dengan bahasa apapun, Allah Maha Mendengar."
  },
  {
    no: 5, icon: "🕌",
    title: "Shalat 2 Rakaat di Maqam Ibrahim",
    description: "Setelah 7 putaran, shalat 2 rakaat di belakang Maqam Ibrahim.",
    detail: "Selesai 7 putaran, menuju Maqam Ibrahim dan shalat 2 rakaat. Rakaat 1: baca Al-Kafirun. Rakaat 2: baca Al-Ikhlas. Jika penuh, boleh di tempat lain di Masjidil Haram.",
    tip: "Ini sunnah, bukan wajib, namun sangat dianjurkan."
  },
  {
    no: 6, icon: "💧",
    title: "Minum Air Zamzam",
    description: "Minum air Zamzam sambil berdoa.",
    detail: "Setelah shalat, minum air Zamzam dengan niat dan doa: اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا وَاسِعًا وَشِفَاءً مِنْ كُلِّ دَاءٍ. Minum 3 teguk menghadap Ka'bah.",
    tip: "Air Zamzam tersedia di berbagai titik di Masjidil Haram."
  },
  {
    no: 7, icon: "✅",
    title: "Tawaf Selesai",
    description: "Tawaf Anda telah sempurna — dilanjutkan dengan Sa'i.",
    detail: "Setelah tawaf dan minum zamzam, bersiaplah untuk Sa'i (berjalan antara Shafa dan Marwah sebanyak 7 kali). Menuju pintu Shafa untuk memulai Sa'i.",
    tip: "Tawaf adalah ibadah yang sangat agung — semoga diterima Allah SWT."
  },
];

const SAI_STEPS: Step[] = [
  {
    no: 1, icon: "🏔️",
    title: "Menuju Bukit Shafa",
    description: "Berjalan dari Masjidil Haram menuju pintu Shafa.",
    detail: "Sa'i dimulai dari Bukit Shafa. Ketika mendekati Shafa, baca: إِنَّ الصَّفَا وَالمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ (dibaca hanya di putaran pertama). Naik ke Shafa hingga bisa melihat Ka'bah.",
    tip: "Sa'i mengingat perjuangan Siti Hajar mencari air untuk Nabi Ismail."
  },
  {
    no: 2, icon: "🤲",
    title: "Doa di Bukit Shafa",
    description: "Berdoa dan bertakbir menghadap Ka'bah di atas Shafa.",
    detail: "Di atas Shafa, hadap Ka'bah, angkat tangan, baca takbir 3x: اللَّهُ أَكْبَرُ. Kemudian baca: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ... (3x). Lanjutkan dengan doa pribadi.",
    tip: "Ulangi doa ini di setiap bukit (Shafa dan Marwah)."
  },
  {
    no: 3, icon: "🏃",
    title: "Perjalanan 1: Shafa → Marwah",
    description: "Berjalan dari Shafa menuju Marwah (1 trip = 1 hitungan).",
    detail: "Berjalan normal sambil berdoa. Ketika melewati lampu hijau (khusus laki-laki): berlari kecil antara dua tanda hijau. Perempuan tetap berjalan normal. Perbanyak dzikir dan doa.",
    tip: "Jarak Shafa-Marwah ±400 meter. Sa'i dilakukan di lantai 1, 2, atau 3."
  },
  {
    no: 4, icon: "🏔️",
    title: "Doa di Bukit Marwah",
    description: "Sampai di Marwah, lakukan doa yang sama seperti di Shafa.",
    detail: "Di Marwah, naik, hadap Ka'bah, baca doa yang sama seperti di Shafa. Ini menyelesaikan 1 putaran. Sa'i harus 7 kali total (Shafa→Marwah = 1, Marwah→Shafa = 2, dst.)",
    tip: "Sa'i berakhir di Marwah (putaran 7 = Shafa→Marwah)."
  },
  {
    no: 5, icon: "↔️",
    title: "Putaran 2–6",
    description: "Bolak-balik antara Shafa dan Marwah, berdoa di setiap bukit.",
    detail: "Lanjutkan berjalan bolak-balik. Setiap kali tiba di Shafa atau Marwah, hadap Ka'bah dan berdoa. Laki-laki berlari kecil di zona hijau setiap arah. Perempuan berjalan normal.",
    tip: "Hitung dengan teliti menggunakan tasbih atau hafal: ganjil di Shafa, genap di Marwah."
  },
  {
    no: 6, icon: "🏁",
    title: "Putaran 7 — Shafa → Marwah (Terakhir)",
    description: "Putaran ke-7 berakhir di Marwah.",
    detail: "Putaran terakhir dimulai dari Shafa dan berakhir di Marwah. Sesampai di Marwah, lakukan doa terakhir. Sa'i Anda telah selesai.",
    tip: "Pastikan 7 putaran genap dan berakhir di Marwah."
  },
  {
    no: 7, icon: "✂️",
    title: "Tahallul — Potong Rambut",
    description: "Cukur/potong rambut untuk menyelesaikan umroh.",
    detail: "Setelah Sa'i, lakukan tahallul: laki-laki mencukur semua rambut (afdhal) atau memotong sebagian. Perempuan memotong rambut sepanjang ruas jari dari ujung. Dengan ini umroh Anda SEMPURNA.",
    tip: "Setelah tahallul, semua larangan ihram telah dibebaskan."
  },
];

const WUKUF_STEPS: Step[] = [
  {
    no: 1, icon: "🌄",
    title: "Berangkat ke Arafah (8 Dzulhijjah)",
    description: "Hari Tarwiyah: menuju Mina terlebih dahulu, lalu Arafah.",
    detail: "Tanggal 8 Dzulhijjah (hari Tarwiyah), jamaah haji berangkat ke Mina. Shalat Dzuhur, Ashar, Maghrib, Isya, dan Subuh di Mina. Kemudian 9 Dzulhijjah pagi menuju Arafah.",
    tip: "Wukuf adalah rukun haji terpenting — 'Al-Haj 'Arafat'."
  },
  {
    no: 2, icon: "🕌",
    title: "Tiba di Arafah (9 Dzulhijjah Pagi)",
    description: "Persiapan wukuf: mandi, bersuci, kenakan ihram.",
    detail: "Setibanya di Arafah, perbanyak dzikir, doa, dan membaca Al-Quran. Wukuf dimulai setelah zawal (matahari condong barat / waktu Dzuhur) hingga terbenam matahari.",
    tip: "Batas Arafah ditandai dengan tiang-tiang putih — pastikan berada di dalamnya."
  },
  {
    no: 3, icon: "🤲",
    title: "Wukuf: Dzikir & Doa",
    description: "Inti wukuf — berdoa dari Dzuhur hingga Maghrib.",
    detail: "Shalat Dzuhur dan Ashar dijamak (qasar) berjamaah. Setelah itu perbanyak: talbiyah, takbir, tahmid, tahlil, istighfar, shalawat, dan doa pribadi dengan khusyuk. Ini saat paling mustajab.",
    tip: "Nabi SAW bersabda: 'Sebaik-baik doa adalah doa di hari Arafah.'"
  },
  {
    no: 4, icon: "🌙",
    title: "Mabit di Muzdalifah",
    description: "Setelah matahari terbenam, berangkat ke Muzdalifah.",
    detail: "Setelah matahari terbenam (tanpa shalat Maghrib dulu), langsung menuju Muzdalifah. Di sana shalat Maghrib + Isya dijamak. Bermalam dan kumpulkan kerikil 7 (minimal) atau 70 butir untuk jumrah.",
    tip: "Kumpulkan kerikil sebesar biji kacang — bukan batu besar."
  },
  {
    no: 5, icon: "🪨",
    title: "Lempar Jumrah Aqabah (10 Dzulhijjah)",
    description: "Setelah Subuh, berangkat ke Mina untuk melempar Jumrah Aqabah.",
    detail: "Setelah shalat Subuh di Muzdalifah, berangkat ke Mina. Lempar 7 kerikil ke Jumrah Aqabah (jumrah besar) sambil membaca 'Allahu Akbar' setiap lemparan. Kemudian sembelih hewan kurban.",
    tip: "Waktu melempar: setelah tengah malam (afdhal: setelah Subuh)."
  },
  {
    no: 6, icon: "✂️",
    title: "Tahallul Awal & Tawaf Ifadhah",
    description: "Cukur rambut, tahallul awal, lanjut tawaf ifadhah ke Makkah.",
    detail: "Setelah lempar Jumrah Aqabah: cukur/potong rambut (tahallul awal). Boleh ganti pakaian biasa. Menuju Makkah untuk Tawaf Ifadhah (rukun haji) + Sa'i (jika belum dilakukan setelah tawaf qudum).",
    tip: "Setelah tahallul awal, larangan ihram (kecuali berhubungan suami-istri) sudah bebas."
  },
  {
    no: 7, icon: "🎉",
    title: "Hari Tasyrik & Lempar 3 Jumrah",
    description: "11–13 Dzulhijjah: mabit di Mina dan lempar 3 jumrah tiap hari.",
    detail: "Hari Tasyrik (11, 12, 13 Dzulhijjah): mabit di Mina dan melempar 3 jumrah (Ula, Wustha, Aqabah) masing-masing 7 batu setelah matahari condong (Dzuhur). Nafar Awal: boleh pulang 12 Dzulhijjah. Nafar Tsani: 13 Dzulhijjah.",
    tip: "Haji Anda sempurna! Lanjutkan dengan Tawaf Wada' sebelum meninggalkan Makkah."
  },
];

type GuideType = "tawaf" | "sai" | "wukuf";

const GUIDES: Record<GuideType, { title: string; steps: Step[]; color: string; emoji: string }> = {
  tawaf: { title: "Tawaf", steps: TAWAF_STEPS, color: "emerald", emoji: "🕋" },
  sai: { title: "Sa'i", steps: SAI_STEPS, color: "amber", emoji: "🏃" },
  wukuf: { title: "Wukuf Arafah", steps: WUKUF_STEPS, color: "blue", emoji: "🌄" },
};

function StepCard({ step, isActive, isCompleted, onClick }: {
  step: Step; isActive: boolean; isCompleted: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border-2 p-4 transition-all duration-300",
        isActive
          ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
          : isCompleted
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          isCompleted
            ? "bg-emerald-500 text-white"
            : isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}>
          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.no}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{step.icon}</span>
            <p className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>
              {step.title}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{step.description}</p>
        </div>
      </div>
    </button>
  );
}

function ActiveStepDetail({ step, total, onPrev, onNext, onToggleDone, isDone }: {
  step: Step; total: number; onPrev: () => void; onNext: () => void;
  onToggleDone: () => void; isDone: boolean;
}) {
  return (
    <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline" className="text-xs">
          Langkah {step.no} / {total}
        </Badge>
        <span className="text-3xl">{step.icon}</span>
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{step.description}</p>

      <div className="rounded-lg bg-background/80 p-4 mb-3 border border-border">
        <p className="text-sm leading-relaxed text-foreground">{step.detail}</p>
      </div>

      {step.tip && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-4">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <span className="font-semibold">💡 Tips: </span>{step.tip}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={step.no === 1}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Sebelumnya
        </Button>
        <Button
          size="sm"
          onClick={onToggleDone}
          variant={isDone ? "secondary" : "default"}
          className="shrink-0"
        >
          {isDone ? "↩ Ulangi" : "✓ Selesai"}
        </Button>
        <Button
          size="sm"
          onClick={onNext}
          disabled={step.no === total}
          className="flex-1"
        >
          Berikutnya
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function GuideTab({ guide }: { guide: { title: string; steps: Step[]; color: string; emoji: string } }) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = guide.steps[activeStep];
  const progress = (completedSteps.size / guide.steps.length) * 100;

  const toggleDone = () => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(activeStep)) next.delete(activeStep);
      else {
        next.add(activeStep);
        if (activeStep < guide.steps.length - 1) setActiveStep(activeStep + 1);
      }
      return next;
    });
  };

  const reset = () => {
    setActiveStep(0);
    setCompletedSteps(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-foreground">
            {guide.emoji} Progres {guide.title}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {completedSteps.size}/{guide.steps.length} langkah
            </span>
            {completedSteps.size > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="h-6 px-2 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                Ulang
              </Button>
            )}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        {completedSteps.size === guide.steps.length && (
          <p className="mt-2 text-xs text-center text-emerald-600 font-semibold animate-bounce">
            🎉 Alhamdulillah! {guide.title} selesai!
          </p>
        )}
      </div>

      {/* Active Step Detail */}
      <ActiveStepDetail
        step={step}
        total={guide.steps.length}
        onPrev={() => setActiveStep((p) => Math.max(0, p - 1))}
        onNext={() => setActiveStep((p) => Math.min(guide.steps.length - 1, p + 1))}
        onToggleDone={toggleDone}
        isDone={completedSteps.has(activeStep)}
      />

      {/* Step List */}
      <div className="space-y-2">
        {guide.steps.map((s, idx) => (
          <StepCard
            key={s.no}
            step={s}
            isActive={idx === activeStep}
            isCompleted={completedSteps.has(idx)}
            onClick={() => setActiveStep(idx)}
          />
        ))}
      </div>
    </div>
  );
}

export default function JamaahManasikInteraktif() {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white px-4 pt-10 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-emerald-300" />
            <span className="text-xs text-emerald-200">Panduan Manasik Interaktif</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Panduan Ibadah</h1>
          <p className="text-sm text-emerald-200">
            Ikuti langkah-langkah tawaf, sa'i, dan wukuf secara interaktif — tandai tiap langkah saat selesai.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <Tabs defaultValue="tawaf">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="tawaf">🕋 Tawaf</TabsTrigger>
            <TabsTrigger value="sai">🏃 Sa'i</TabsTrigger>
            <TabsTrigger value="wukuf">🌄 Wukuf</TabsTrigger>
          </TabsList>

          <TabsContent value="tawaf">
            <GuideTab guide={GUIDES.tawaf} />
          </TabsContent>
          <TabsContent value="sai">
            <GuideTab guide={GUIDES.sai} />
          </TabsContent>
          <TabsContent value="wukuf">
            <GuideTab guide={GUIDES.wukuf} />
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="mt-4 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-500" />
              Catatan Penting
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>• Panduan ini berdasarkan tata cara umroh/haji sesuai sunnah Nabi SAW.</p>
            <p>• Selalu ikuti arahan pembimbing (muthawif) rombongan Anda.</p>
            <p>• Kondisi di lapangan bisa berbeda, utamakan keselamatan dan ketertiban.</p>
            <p>• Doa dan niat yang tulus lebih utama dari kesempurnaan teknis.</p>
          </CardContent>
        </Card>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
