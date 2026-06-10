import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { BookOpen, Search, Heart, Play, Pause } from "lucide-react";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { JamaahPageHeader } from "@/components/jamaah/shell/JamaahPageHeader";

// Data surah lengkap: populer + seluruh Juz 30 (S18-06: offline support)
const SURAH_LIST = [
  // ── Populer ────────────────────────────────────────────────────────────────
  { id: 1,   name: "Al-Fatihah",   arabic: "الفاتحة",  verses: 7,   category: "Makkiyah",  meaning: "Pembuka",            juz: 1  },
  { id: 2,   name: "Al-Baqarah",   arabic: "البقرة",   verses: 286, category: "Madaniyah", meaning: "Sapi Betina",        juz: 1  },
  { id: 18,  name: "Al-Kahf",      arabic: "الكهف",    verses: 110, category: "Makkiyah",  meaning: "Gua",                juz: 15 },
  { id: 32,  name: "As-Sajdah",    arabic: "السجدة",   verses: 30,  category: "Makkiyah",  meaning: "Sujud",              juz: 21 },
  { id: 36,  name: "Yasin",        arabic: "يس",       verses: 83,  category: "Makkiyah",  meaning: "Yasin",              juz: 22 },
  { id: 55,  name: "Ar-Rahman",    arabic: "الرحمن",   verses: 78,  category: "Makkiyah",  meaning: "Yang Maha Pengasih", juz: 27 },
  { id: 67,  name: "Al-Mulk",      arabic: "الملك",    verses: 30,  category: "Makkiyah",  meaning: "Kerajaan",           juz: 29 },
  // ── Juz 30 — lengkap (S18-06) ─────────────────────────────────────────────
  { id: 78,  name: "An-Naba",      arabic: "النبأ",    verses: 40,  category: "Makkiyah",  meaning: "Berita Besar",       juz: 30 },
  { id: 79,  name: "An-Nazi'at",   arabic: "النازعات", verses: 46,  category: "Makkiyah",  meaning: "Malaikat Pencabut",  juz: 30 },
  { id: 80,  name: "'Abasa",       arabic: "عبس",      verses: 42,  category: "Makkiyah",  meaning: "Dia Bermuka Masam",  juz: 30 },
  { id: 81,  name: "At-Takwir",    arabic: "التكوير",  verses: 29,  category: "Makkiyah",  meaning: "Menggulung",         juz: 30 },
  { id: 82,  name: "Al-Infitar",   arabic: "الانفطار", verses: 19,  category: "Makkiyah",  meaning: "Terbelah",           juz: 30 },
  { id: 83,  name: "Al-Mutaffifin",arabic: "المطففين", verses: 36,  category: "Makkiyah",  meaning: "Orang Curang",       juz: 30 },
  { id: 84,  name: "Al-Insyiqaq",  arabic: "الانشقاق", verses: 25,  category: "Makkiyah",  meaning: "Terbelah",           juz: 30 },
  { id: 85,  name: "Al-Buruj",     arabic: "البروج",   verses: 22,  category: "Makkiyah",  meaning: "Gugusan Bintang",    juz: 30 },
  { id: 86,  name: "At-Tariq",     arabic: "الطارق",   verses: 17,  category: "Makkiyah",  meaning: "Yang Datang Malam",  juz: 30 },
  { id: 87,  name: "Al-A'la",      arabic: "الأعلى",   verses: 19,  category: "Makkiyah",  meaning: "Yang Paling Tinggi", juz: 30 },
  { id: 88,  name: "Al-Ghasyiyah", arabic: "الغاشية",  verses: 26,  category: "Makkiyah",  meaning: "Hari Pembalasan",    juz: 30 },
  { id: 89,  name: "Al-Fajr",      arabic: "الفجر",    verses: 30,  category: "Makkiyah",  meaning: "Fajar",              juz: 30 },
  { id: 90,  name: "Al-Balad",     arabic: "البلد",    verses: 20,  category: "Makkiyah",  meaning: "Negeri",             juz: 30 },
  { id: 91,  name: "Asy-Syams",    arabic: "الشمس",    verses: 15,  category: "Makkiyah",  meaning: "Matahari",           juz: 30 },
  { id: 92,  name: "Al-Lail",      arabic: "الليل",    verses: 21,  category: "Makkiyah",  meaning: "Malam",              juz: 30 },
  { id: 93,  name: "Adh-Dhuha",    arabic: "الضحى",    verses: 11,  category: "Makkiyah",  meaning: "Waktu Dhuha",        juz: 30 },
  { id: 94,  name: "Al-Insyirah",  arabic: "الشرح",    verses: 8,   category: "Makkiyah",  meaning: "Kelapangan",         juz: 30 },
  { id: 95,  name: "At-Tin",       arabic: "التين",    verses: 8,   category: "Makkiyah",  meaning: "Buah Tin",           juz: 30 },
  { id: 96,  name: "Al-'Alaq",     arabic: "العلق",    verses: 19,  category: "Makkiyah",  meaning: "Segumpal Darah",     juz: 30 },
  { id: 97,  name: "Al-Qadr",      arabic: "القدر",    verses: 5,   category: "Makkiyah",  meaning: "Kemuliaan",          juz: 30 },
  { id: 98,  name: "Al-Bayyinah",  arabic: "البينة",   verses: 8,   category: "Madaniyah", meaning: "Bukti Nyata",        juz: 30 },
  { id: 99,  name: "Az-Zalzalah",  arabic: "الزلزلة",  verses: 8,   category: "Madaniyah", meaning: "Kegoncangan",        juz: 30 },
  { id: 100, name: "Al-'Adiyat",   arabic: "العاديات", verses: 11,  category: "Makkiyah",  meaning: "Kuda Perang",        juz: 30 },
  { id: 101, name: "Al-Qari'ah",   arabic: "القارعة",  verses: 11,  category: "Makkiyah",  meaning: "Hari Kiamat",        juz: 30 },
  { id: 102, name: "At-Takatsur",  arabic: "التكاثر",  verses: 8,   category: "Makkiyah",  meaning: "Bermegah-megahan",   juz: 30 },
  { id: 103, name: "Al-'Ashr",     arabic: "العصر",    verses: 3,   category: "Makkiyah",  meaning: "Masa",               juz: 30 },
  { id: 104, name: "Al-Humazah",   arabic: "الهمزة",   verses: 9,   category: "Makkiyah",  meaning: "Pengumpat",          juz: 30 },
  { id: 105, name: "Al-Fil",       arabic: "الفيل",    verses: 5,   category: "Makkiyah",  meaning: "Gajah",              juz: 30 },
  { id: 106, name: "Quraisy",      arabic: "قريش",     verses: 4,   category: "Makkiyah",  meaning: "Suku Quraisy",       juz: 30 },
  { id: 107, name: "Al-Ma'un",     arabic: "الماعون",  verses: 7,   category: "Makkiyah",  meaning: "Barang Berguna",     juz: 30 },
  { id: 108, name: "Al-Kautsar",   arabic: "الكوثر",   verses: 3,   category: "Makkiyah",  meaning: "Nikmat yang Banyak", juz: 30 },
  { id: 109, name: "Al-Kafirun",   arabic: "الكافرون", verses: 6,   category: "Makkiyah",  meaning: "Orang Kafir",        juz: 30 },
  { id: 110, name: "An-Nasr",      arabic: "النصر",    verses: 3,   category: "Madaniyah", meaning: "Pertolongan",        juz: 30 },
  { id: 111, name: "Al-Masad",     arabic: "المسد",    verses: 5,   category: "Makkiyah",  meaning: "Gaz Sabut",          juz: 30 },
  { id: 112, name: "Al-Ikhlas",    arabic: "الإخلاص",  verses: 4,   category: "Makkiyah",  meaning: "Ikhlas",             juz: 30 },
  { id: 113, name: "Al-Falaq",     arabic: "الفلق",    verses: 5,   category: "Makkiyah",  meaning: "Waktu Shubuh",       juz: 30 },
  { id: 114, name: "An-Nas",       arabic: "الناس",    verses: 6,   category: "Makkiyah",  meaning: "Manusia",            juz: 30 },
];

// Ayat-ayat untuk surah-surah pendek (demo data)
const VERSE_DATA: Record<number, { arabic: string; latin: string; translation: string }[]> = {
  1: [
    { arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", latin: "Bismillāhir-raḥmānir-raḥīm", translation: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang." },
    { arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", latin: "Al-ḥamdu lillāhi rabbil-ʿālamīn", translation: "Segala puji bagi Allah, Tuhan semesta alam." },
    { arabic: "الرَّحْمَٰنِ الرَّحِيمِ", latin: "Ar-raḥmānir-raḥīm", translation: "Yang Maha Pengasih, Maha Penyayang." },
    { arabic: "مَالِكِ يَوْمِ الدِّينِ", latin: "Māliki yaumid-dīn", translation: "Pemilik hari pembalasan." },
    { arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", latin: "Iyyāka naʿbudu wa iyyāka nastaʿīn", translation: "Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami memohon pertolongan." },
    { arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", latin: "Ihdināṣ-ṣirāṭal-mustaqīm", translation: "Tunjukilah kami jalan yang lurus." },
    { arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", latin: "Ṣirāṭallażīna anʿamta ʿalaihim gairil-magḍūbi ʿalaihim wa laḍ-ḍāllīn", translation: "(Yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat." },
  ],
  112: [
    { arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", latin: "Bismillāhir-raḥmānir-raḥīm", translation: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang." },
    { arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ", latin: "Qul huwallāhu aḥad", translation: "Katakanlah (Muhammad), \"Dialah Allah, Yang Maha Esa.\"" },
    { arabic: "اللَّهُ الصَّمَدُ", latin: "Allāhuṣ-ṣamad", translation: "Allah tempat meminta segala sesuatu." },
    { arabic: "لَمْ يَلِدْ وَلَمْ يُولَدْ", latin: "Lam yalid wa lam yūlad", translation: "(Allah) tidak beranak dan tidak diperanakkan." },
    { arabic: "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ", latin: "Wa lam yakul lahū kufuwan aḥad", translation: "Dan tidak ada sesuatu yang setara dengan Dia." },
  ],
  113: [
    { arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", latin: "Bismillāhir-raḥmānir-raḥīm", translation: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang." },
    { arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", latin: "Qul aʿūżu birabbil-falaq", translation: "Katakanlah (Muhammad), \"Aku berlindung kepada Tuhan yang (menjaga) fajar (subuh).\"" },
    { arabic: "مِنْ شَرِّ مَا خَلَقَ", latin: "Min syarri mā khalaq", translation: "Dari kejahatan makhluk-Nya." },
    { arabic: "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ", latin: "Wa min syarri gāsiqin iżā waqab", translation: "Dan dari kejahatan malam yang gelap gulita apabila telah datang." },
    { arabic: "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ", latin: "Wa min syarrin-naffāṡāti fil-ʿuqad", translation: "Dan dari kejahatan wanita-wanita (tukang sihir) yang meniup pada buhul-buhul (tali)." },
    { arabic: "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ", latin: "Wa min syarri ḥāsidin iżā ḥasad", translation: "Dan dari kejahatan orang yang dengki apabila dia dengki." },
  ],
  114: [
    { arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", latin: "Bismillāhir-raḥmānir-raḥīm", translation: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang." },
    { arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ", latin: "Qul aʿūżu birabbin-nās", translation: "Katakanlah (Muhammad), \"Aku berlindung kepada Tuhan manusia.\"" },
    { arabic: "مَلِكِ النَّاسِ", latin: "Malikin-nās", translation: "Raja manusia." },
    { arabic: "إِلَٰهِ النَّاسِ", latin: "Ilāhin-nās", translation: "Sembahan manusia." },
    { arabic: "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ", latin: "Min syarril-waswāsil-khannās", translation: "Dari kejahatan (setan) yang membisikkan kejahatan yang tersembunyi." },
    { arabic: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ", latin: "Allażī yuwaswisu fī ṣudūrin-nās", translation: "Yang membisikkan kejahatan ke dalam dada manusia." },
    { arabic: "مِنَ الْجِنَّةِ وَالنَّاسِ", latin: "Minal-jinnati wan-nās", translation: "Dari (golongan) jin dan manusia." },
  ],
};

type FilterTab = "all" | "juz30" | "favorites";

export default function JamaahAlQuran() {
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [favorites, setFavorites] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("quran_favorites") || "[]"); } catch { return []; }
  });
  const [readingProgress, setReadingProgress] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem("quran_progress") || "{}"); } catch { return {}; }
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const filteredSurah = SURAH_LIST.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.meaning.toLowerCase().includes(search.toLowerCase()) ||
      s.arabic.includes(search);
    if (!matchSearch) return false;
    if (filterTab === "juz30") return (s as any).juz === 30;
    if (filterTab === "favorites") return favorites.includes(s.id);
    return true;
  });

  const toggleFavorite = (id: number) => {
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("quran_favorites", JSON.stringify(next));
    toast.success(favorites.includes(id) ? "Dihapus dari favorit" : "Ditambahkan ke favorit");
  };

  const surah = selectedSurah ? SURAH_LIST.find((s) => s.id === selectedSurah) : null;
  const verses = selectedSurah ? VERSE_DATA[selectedSurah] || [] : [];

  // Text-to-speech helper
  const speak = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-SA";
      utterance.rate = 0.8;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } else {
      toast.error("Browser tidak mendukung text-to-speech.");
    }
  }, []);

  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  // Mark progress when reading
  const markVerseRead = (surahId: number, verseIndex: number) => {
    const next = { ...readingProgress, [surahId]: Math.max(verseIndex + 1, readingProgress[surahId] || 0) };
    setReadingProgress(next);
    localStorage.setItem("quran_progress", JSON.stringify(next));
  };

  if (selectedSurah) {
    return (
      <JamaahAppShell>
        <JamaahPageHeader
          title={surah?.name ?? "Surah"}
          arabic={surah?.arabic}
          subtitle={`${surah?.verses ?? "-"} ayat`}
          back={false}
          right={
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10" onClick={() => setSelectedSurah(null)}>
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10" onClick={() => toggleFavorite(selectedSurah)}>
                <Heart className={`h-5 w-5 ${favorites.includes(selectedSurah) ? "fill-current text-red-400" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10"
                onClick={() => { if (isPlaying) stopSpeech(); else if (verses.length) speak(verses.map((v) => v.arabic).join(". ")); }}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
            </div>
          }
        />

        {/* Bismillah */}
        {selectedSurah !== 9 && (
          <div className="text-center py-6 px-4">
            <p className="font-arabic text-2xl leading-loose text-primary" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          </div>
        )}

        {/* Verses */}
        <div className="px-4 pb-8 space-y-4">
          {verses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>Data ayat untuk surah ini belum tersedia secara offline.</p>
                <p className="text-xs mt-2">Silakan pilih surah Al-Fatihah, Al-Ikhlas, Al-Falaq, atau An-Nas.</p>
              </CardContent>
            </Card>
          ) : (
            verses.map((verse, idx) => (
              <Card
                key={idx}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => markVerseRead(selectedSurah, idx)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="outline" className="mt-1 flex-shrink-0">
                      {idx + 1}
                    </Badge>
                    <p className="text-right text-xl font-serif leading-loose text-foreground flex-1">
                      {verse.arabic}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground italic">{verse.latin}</p>
                  <p className="text-sm text-foreground">{verse.translation}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </JamaahAppShell>
    );
  }

  return (
    <JamaahAppShell>
      <JamaahPageHeader title="Al-Qur'an" arabic="ٱلْقُرْآن" subtitle="Bacaan offline untuk ibadah" />
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari surah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* S18-06: Filter tabs — Semua / Juz 30 / Favorit */}
        <div className="flex gap-1.5">
          {(["all", "juz30", "favorites"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filterTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab === "all" ? "Semua" : tab === "juz30" ? "Juz 30" : `Favorit ${favorites.length > 0 ? `(${favorites.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Progress */}
        {Object.keys(readingProgress).length > 0 && (
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-emerald-800 mb-2">Terakhir Dibaca</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(readingProgress).map(([sid, progress]) => {
                  const s = SURAH_LIST.find((x) => x.id === Number(sid));
                  if (!s) return null;
                  return (
                    <Badge
                      key={sid}
                      variant="outline"
                      className="cursor-pointer bg-white"
                      onClick={() => setSelectedSurah(Number(sid))}
                    >
                      {s.name} · Ayat {progress}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Favorit</p>
            <div className="grid grid-cols-1 gap-2">
              {SURAH_LIST.filter((s) => favorites.includes(s.id)).map((s) => (
                <SurahCard key={s.id} surah={s} onSelect={() => setSelectedSurah(s.id)} />
              ))}
            </div>
          </div>
        )}

        {/* All Surah */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Daftar Surah</p>
          <div className="grid grid-cols-1 gap-2">
            {filteredSurah.map((s) => (
              <SurahCard key={s.id} surah={s} onSelect={() => setSelectedSurah(s.id)} />
            ))}
          </div>
        </div>

        {filteredSurah.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Tidak ada surah yang cocok dengan pencarian.</p>
          </div>
        )}
      </div>
    </JamaahAppShell>
  );
}

function SurahCard({
  surah,
  onSelect,
}: {
  surah: (typeof SURAH_LIST)[0];
  onSelect: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onSelect}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">{surah.id}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm truncate">{surah.name}</p>
            <p className="text-lg font-serif text-primary">{surah.arabic}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{surah.meaning}</span>
            <span>·</span>
            <span>{surah.verses} ayat</span>
            <Badge variant="secondary" className="text-[10px] h-4">{surah.category}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
