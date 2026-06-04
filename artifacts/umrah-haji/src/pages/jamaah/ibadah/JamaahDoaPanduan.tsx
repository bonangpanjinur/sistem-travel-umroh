import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import {
  Book, BookOpen, ChevronDown,
  Search, Volume2, Star, Languages, WifiOff, Wifi,
  Download, Check, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { JamaahPageHeader } from "@/components/jamaah/shell/JamaahPageHeader";

interface OfflineContent {
  id: string;
  category: string;
  title: string;
  arabic_text?: string;
  latin_text?: string;
  translation?: string;
  content?: string;
  audio_url?: string;
  sort_order: number;
}

const CACHE_KEY = "offline-content-cache";
const CACHE_TIMESTAMP_KEY = "offline-content-timestamp";
const FAVORITES_KEY = "favorite-doa";

function getCachedContent(): Record<string, OfflineContent[]> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCachedContent(category: string, data: OfflineContent[]) {
  try {
    const existing = getCachedContent();
    existing[category] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
  } catch {
    // Storage full - clear old data
    localStorage.removeItem(CACHE_KEY);
  }
}

export default function JamaahDoaPanduan() {
  const [activeCategory, setActiveCategory] = useState("doa");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSynced, setIsSynced] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch content with offline fallback
  const { data: contents, isLoading } = useQuery({
    queryKey: ["jamaah-offline-content", activeCategory],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("offline_content")
          .select("*")
          .eq("category", activeCategory)
          .eq("is_active", true)
          .order("sort_order");
        if (error) throw error;
        const result = data as unknown as OfflineContent[];
        // Cache for offline use
        setCachedContent(activeCategory, result);
        return result;
      } catch {
        // Fallback to cached data
        const cached = getCachedContent();
        return cached[activeCategory] || [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync all categories for offline use
  const syncAllContent = useCallback(async () => {
    if (!isOnline) {
      toast.error("Tidak ada koneksi internet");
      return;
    }
    try {
      const categories = ["doa", "panduan", "manasik", "tips"];
      for (const cat of categories) {
        const { data } = await supabase
          .from("offline_content")
          .select("*")
          .eq("category", cat)
          .eq("is_active", true)
          .order("sort_order");
        if (data) setCachedContent(cat, data as unknown as OfflineContent[]);
      }
      setIsSynced(true);
      toast.success("Semua konten berhasil disimpan untuk offline");
      setTimeout(() => setIsSynced(false), 3000);
    } catch {
      toast.error("Gagal menyimpan konten offline");
    }
  }, [isOnline]);

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  const filteredContents = contents?.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(() => toast.error("Audio tidak tersedia offline"));
  };

  const lastSync = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const cachedData = getCachedContent();
  const hasCachedData = Object.keys(cachedData).length > 0;

  return (
    <JamaahAppShell>
      <JamaahPageHeader
        title="Doa & Panduan"
        arabic="ٱلْأَدْعِيَة"
        subtitle={isOnline ? "Online" : `Offline${hasCachedData ? " • Data tersedia" : ""}`}
        right={
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-white/10 gap-1.5"
            onClick={syncAllContent}
          >
            {isSynced ? (
              <><Check className="h-4 w-4" /> Tersimpan</>
            ) : (
              <><Download className="h-4 w-4" /> Simpan</>
            )}
          </Button>
        }
      />
      <div className="p-4 space-y-4">
        {/* Online indicator (mobile-friendly chip) */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          <span>{isOnline ? "Terhubung internet" : "Mode offline"}</span>
        </div>

        {/* Offline notice */}
        {!isOnline && hasCachedData && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Mode offline — menampilkan konten yang tersimpan</span>
          </div>
        )}

        {/* Cross-link to Panduan Ibadah Lengkap */}
        <Link to="/jamaah/panduan-ibadah">
          <div className="flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 hover:bg-emerald-100 transition-colors">
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="flex-1">Lihat juga: <strong>Panduan Ibadah Lengkap</strong> — doa manasik, tata cara umroh & haji</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari doa atau panduan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="doa" className="text-xs gap-1">
              <Book className="h-3.5 w-3.5" />
              Doa
            </TabsTrigger>
            <TabsTrigger value="panduan" className="text-xs gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              Panduan
            </TabsTrigger>
            <TabsTrigger value="manasik" className="text-xs gap-1">
              <Languages className="h-3.5 w-3.5" />
              Manasik
            </TabsTrigger>
            <TabsTrigger value="tips" className="text-xs gap-1">
              <Book className="h-3.5 w-3.5" />
              Tips
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeCategory} className="mt-4">
            {isLoading && !hasCachedData ? (
              <div className="text-center py-8 text-muted-foreground">
                Memuat konten...
              </div>
            ) : !filteredContents?.length ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {searchTerm ? "Tidak ditemukan" : !isOnline ? "Belum ada konten tersimpan untuk kategori ini" : "Belum ada konten"}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredContents.map((item) => (
                  <Collapsible
                    key={item.id}
                    open={expandedId === item.id}
                    onOpenChange={(open) => setExpandedId(open ? item.id : null)}
                  >
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-left">
                              <CardTitle className="text-base">{item.title}</CardTitle>
                              {favorites.includes(item.id) && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            <ChevronDown
                              className={`h-5 w-5 text-muted-foreground transition-transform ${
                                expandedId === item.id ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 px-4 space-y-4">
                          {item.arabic_text && (
                            <div className="bg-muted/50 p-4 rounded-lg">
                              <p className="text-xl leading-loose text-right font-arabic" dir="rtl">
                                {item.arabic_text}
                              </p>
                            </div>
                          )}

                          {item.latin_text && (
                            <div>
                              <Badge variant="outline" className="mb-2">Latin</Badge>
                              <p className="text-sm italic text-muted-foreground">{item.latin_text}</p>
                            </div>
                          )}

                          {item.translation && (
                            <div>
                              <Badge variant="outline" className="mb-2">Arti</Badge>
                              <p className="text-sm">{item.translation}</p>
                            </div>
                          )}

                          {item.content && (
                            <div className="prose prose-sm max-w-none">
                              {item.content.split("\n").map((line, i) => (
                                <p key={i} className="text-sm mb-2">{line}</p>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            {item.audio_url && (
                              <Button variant="outline" size="sm" onClick={() => playAudio(item.audio_url!)}>
                                <Volume2 className="h-4 w-4 mr-1" />
                                Dengar
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => toggleFavorite(item.id)}>
                              <Star className={`h-4 w-4 mr-1 ${favorites.includes(item.id) ? "text-yellow-500 fill-yellow-500" : ""}`} />
                              {favorites.includes(item.id) ? "Hapus" : "Favorit"}
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

      {/* Sync info */}
        {lastSync && (
          <p className="text-xs text-center text-muted-foreground">
            Terakhir disinkron: {new Date(lastSync).toLocaleString("id-ID")}
          </p>
        )}
      </div>
    </JamaahAppShell>
  );
}
