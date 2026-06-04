import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Search, ChevronLeft, ChevronRight, Play, Volume2 } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { AppPageHeader } from "@/components/shared/AppPageHeader";

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  audio?: string;
}

interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  ayahs: Ayah[];
}

interface Translation {
  ayahs: Array<{ numberInSurah: number; text: string }>;
}

export default function AlQuran() {
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [view, setView] = useState<"list" | "read">("list");

  const { data: surahs = [], isLoading: loadingSurahs } = useQuery<Surah[]>({
    queryKey: ["quran-surahs"],
    queryFn: async () => {
      const r = await fetch("https://api.alquran.cloud/v1/surah");
      const j = await r.json();
      return j.data;
    },
    staleTime: Infinity,
  });

  const { data: surahDetail, isLoading: loadingDetail } = useQuery<SurahDetail>({
    queryKey: ["quran-surah-detail", selectedSurah],
    queryFn: async () => {
      const r = await fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/ar.alafasy`);
      const j = await r.json();
      return j.data;
    },
    enabled: !!selectedSurah,
  });

  const { data: translation } = useQuery<Translation>({
    queryKey: ["quran-translation", selectedSurah],
    queryFn: async () => {
      const r = await fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/id.indonesian`);
      const j = await r.json();
      return j.data;
    },
    enabled: !!selectedSurah,
  });

  const filtered = surahs.filter(s =>
    s.englishName.toLowerCase().includes(search.toLowerCase()) ||
    s.name.includes(search) ||
    String(s.number).includes(search)
  );

  const handlePlayAyah = (ayah: Ayah) => {
    if (audio) { audio.pause(); setAudio(null); }
    if (playingAyah === ayah.number) { setPlayingAyah(null); return; }
    if (!ayah.audio) return;
    const a = new Audio(ayah.audio);
    a.play();
    setAudio(a);
    setPlayingAyah(ayah.number);
    a.onended = () => { setPlayingAyah(null); setAudio(null); };
  };

  const handleSelectSurah = (num: number) => {
    setSelectedSurah(num);
    setView("read");
    if (audio) { audio.pause(); setAudio(null); setPlayingAyah(null); }
  };

  const prevSurah = selectedSurah && selectedSurah > 1 ? selectedSurah - 1 : null;
  const nextSurah = selectedSurah && selectedSurah < 114 ? selectedSurah + 1 : null;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-slate-900 pb-16">
        <AppPageHeader
          title="Al-Quran Al-Karim"
          subtitle="114 Surah • Terjemahan Indonesia • Audio Murottal"
          backTo="/"
          dark
        />

        <div className="max-w-3xl mx-auto px-4 mt-6">
          {view === "list" ? (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari surah..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>

              {/* Surah List */}
              {loadingSurahs ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(s => (
                    <button
                      key={s.number}
                      onClick={() => handleSelectSurah(s.number)}
                      className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left border border-white/10"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-700/50 flex items-center justify-center text-emerald-300 font-bold text-sm shrink-0">
                        {s.number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{s.englishName}</p>
                        <p className="text-gray-400 text-xs">{s.englishNameTranslation} • {s.numberOfAyahs} ayat</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-arabic text-lg">{s.name}</p>
                        <Badge variant="outline" className="text-xs border-emerald-600/40 text-emerald-400 mt-1">
                          {s.revelationType}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Reading View */}
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" onClick={() => { setView("list"); if (audio) { audio.pause(); setAudio(null); setPlayingAyah(null); } }} className="text-white hover:bg-white/10">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Daftar Surah
                </Button>
                <div className="flex-1 text-center">
                  <p className="text-white font-bold">{surahDetail?.englishName}</p>
                  <p className="text-gray-400 text-xs">{surahDetail?.ayahs.length} Ayat</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" disabled={!prevSurah} onClick={() => prevSurah && handleSelectSurah(prevSurah)} className="text-white hover:bg-white/10 px-2">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={!nextSurah} onClick={() => nextSurah && handleSelectSurah(nextSurah)} className="text-white hover:bg-white/10 px-2">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Bismillah */}
              {selectedSurah !== 1 && selectedSurah !== 9 && (
                <div className="text-center py-4 mb-4">
                  <p className="text-white font-arabic text-2xl leading-loose">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                  <p className="text-gray-400 text-sm mt-1">Dengan menyebut nama Allah Yang Maha Pemurah lagi Maha Penyayang</p>
                </div>
              )}

              {loadingDetail ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {surahDetail?.ayahs.map(ayah => {
                    const trans = translation?.ayahs.find(t => t.numberInSurah === ayah.numberInSurah);
                    return (
                      <Card key={ayah.number} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-700/50 flex items-center justify-center text-emerald-300 text-xs font-bold">
                              {ayah.numberInSurah}
                            </div>
                            {ayah.audio && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePlayAyah(ayah)}
                                className={`h-8 w-8 p-0 ${playingAyah === ayah.number ? "text-emerald-400" : "text-gray-400 hover:text-white"}`}
                              >
                                {playingAyah === ayah.number ? <Volume2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                            )}
                          </div>
                          <p className="text-white font-arabic text-xl leading-loose text-right mb-3 dir-rtl">{ayah.text}</p>
                          {trans && <p className="text-gray-300 text-sm leading-relaxed">{trans.text}</p>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
