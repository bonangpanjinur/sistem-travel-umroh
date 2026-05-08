import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Search, Clock, Eye, ArrowRight, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const DEMO_ARTICLES = [
  {
    id: "1", title: "Persiapan Umroh: Checklist Lengkap Sebelum Berangkat",
    slug: "persiapan-umroh-checklist",
    category: "Panduan Ibadah",
    excerpt: "Panduan lengkap mempersiapkan perjalanan Umroh agar ibadah berjalan lancar dan khusyuk.",
    cover_image_url: "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=600&q=80",
    views: 1240, published_at: "2026-04-10T08:00:00Z", author: "Admin Vinstour",
    read_time: 5,
  },
  {
    id: "2", title: "5 Doa Wajib yang Perlu Dihafal Sebelum Umroh",
    slug: "doa-wajib-umroh",
    category: "Panduan Ibadah",
    excerpt: "Kumpulan doa-doa penting yang harus dikuasai oleh setiap jamaah Umroh sebelum keberangkatan.",
    cover_image_url: "https://images.unsplash.com/photo-1564769610726-59cead6a6f8f?w=600&q=80",
    views: 980, published_at: "2026-04-05T08:00:00Z", author: "Ustadz Ahmad",
    read_time: 7,
  },
  {
    id: "3", title: "Promo Paket Umroh Plus Turki Ramadan 2027",
    slug: "promo-umroh-turki-ramadan-2027",
    category: "Promo",
    excerpt: "Nikmati perjalanan spiritual sekaligus wisata budaya ke Turki dengan harga spesial tahun ini.",
    cover_image_url: "https://images.unsplash.com/photo-1527576539890-dfa815648363?w=600&q=80",
    views: 2150, published_at: "2026-03-28T08:00:00Z", author: "Tim Marketing",
    read_time: 3,
  },
  {
    id: "4", title: "Perbedaan Umroh Reguler, Plus, dan VIP",
    slug: "perbedaan-paket-umroh",
    category: "Tips & Info",
    excerpt: "Penjelasan lengkap perbedaan fasilitas, hotel, dan layanan tiap jenis paket Umroh yang ditawarkan.",
    cover_image_url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80",
    views: 760, published_at: "2026-03-15T08:00:00Z", author: "Admin Vinstour",
    read_time: 6,
  },
  {
    id: "5", title: "Tips Menjaga Kesehatan Selama di Tanah Suci",
    slug: "tips-kesehatan-tanah-suci",
    category: "Tips & Info",
    excerpt: "Panduan menjaga stamina dan kesehatan tubuh selama menjalankan ibadah di Makkah dan Madinah.",
    cover_image_url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80",
    views: 1380, published_at: "2026-03-08T08:00:00Z", author: "Dr. Siti Nurhaliza",
    read_time: 8,
  },
  {
    id: "6", title: "Mengenal Manasik Haji: Panduan Ritual Lengkap",
    slug: "panduan-manasik-haji",
    category: "Panduan Ibadah",
    excerpt: "Pelajari urutan dan tata cara ibadah Haji secara lengkap untuk calon jamaah pertama kali.",
    cover_image_url: "https://images.unsplash.com/photo-1564769625392-651b89765ab8?w=600&q=80",
    views: 890, published_at: "2026-02-20T08:00:00Z", author: "Ustadz Budi",
    read_time: 12,
  },
];

const CATEGORIES = ["Semua", "Tips & Info", "Panduan Ibadah", "Berita", "Promo", "Inspirasi"];

const CATEGORY_COLORS: Record<string, string> = {
  "Tips & Info": "bg-blue-100 text-blue-700",
  "Panduan Ibadah": "bg-emerald-100 text-emerald-700",
  "Berita": "bg-purple-100 text-purple-700",
  "Promo": "bg-orange-100 text-orange-700",
  "Inspirasi": "bg-pink-100 text-pink-700",
};

export default function PublicBlog() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  const { data: articles = DEMO_ARTICLES, isLoading } = useQuery({
    queryKey: ["public-blog-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error || !data?.length) return DEMO_ARTICLES;
      return data;
    },
  });

  const filtered = articles.filter((a: any) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.excerpt?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "Semua" || a.category === activeCategory;
    return matchSearch && matchCat;
  });

  const [featured, ...rest] = filtered;

  return (
    <PublicLayout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-emerald-50 py-16">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
            <BookOpen className="h-4 w-4" /> Blog & Artikel
          </div>
          <h1 className="text-4xl font-bold mb-3">Wawasan Umroh & Haji</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Panduan, tips, dan inspirasi perjalanan ibadah dari tim Vinstour Travel
          </p>
          <div className="relative max-w-md mx-auto mt-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari artikel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 bg-white shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-12">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Tidak ada artikel ditemukan</p>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {featured && activeCategory === "Semua" && !search && (
              <Link
                to={`/blog/${featured.slug}`}
                className="group flex flex-col md:flex-row gap-6 bg-white rounded-2xl shadow-sm border border-muted/60 overflow-hidden mb-10 hover:shadow-md transition-shadow"
              >
                <div className="md:w-1/2">
                  {featured.cover_image_url ? (
                    <img
                      src={featured.cover_image_url}
                      alt={featured.title}
                      className="h-64 md:h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-64 md:h-full bg-muted flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="md:w-1/2 p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_COLORS[featured.category] || "bg-muted text-muted-foreground"}`}>
                      {featured.category}
                    </span>
                    <span className="text-xs text-muted-foreground">Artikel Pilihan</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{featured.title}</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{featured.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {featured.read_time} menit baca
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {(featured.views || 0).toLocaleString("id")} pembaca
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-primary font-semibold text-sm group-hover:gap-2 transition-all">
                    Baca Selengkapnya <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            )}

            {/* Article Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeCategory !== "Semua" || search ? filtered : rest).map((a: any) => (
                <Link
                  key={a.id}
                  to={`/blog/${a.slug}`}
                  className="group bg-white rounded-xl border border-muted/60 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className="h-48 overflow-hidden">
                    {a.cover_image_url ? (
                      <img
                        src={a.cover_image_url}
                        alt={a.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full bg-muted flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_COLORS[a.category] || "bg-muted text-muted-foreground"}`}>
                      {a.category}
                    </span>
                    <h3 className="font-bold mt-2 mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                      {a.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{a.published_at ? format(parseISO(a.published_at), "dd MMM yyyy", { locale: idLocale }) : ""}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {a.read_time || 5} mnt
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
