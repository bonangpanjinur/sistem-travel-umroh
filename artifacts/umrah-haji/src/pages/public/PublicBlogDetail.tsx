import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { PublicLayout } from "@/components/layout/PublicLayout";
import { generateArticleSchema, schemaToScriptTag } from "@/lib/schema-generator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Eye, Share2, BookOpen, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const DEMO_ARTICLES: Record<string, any> = {
  "persiapan-umroh-checklist": {
    id: "1", title: "Persiapan Umroh: Checklist Lengkap Sebelum Berangkat",
    slug: "persiapan-umroh-checklist", category: "Panduan Ibadah",
    excerpt: "Panduan lengkap mempersiapkan perjalanan Umroh agar ibadah berjalan lancar dan khusyuk.",
    cover_image_url: "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=1200&q=80",
    views: 1240, published_at: "2026-04-10T08:00:00Z", author: "Admin Vinstour", read_time: 5,
    content: `## Mempersiapkan Perjalanan Umroh

Perjalanan Umroh adalah impian setiap Muslim. Agar ibadah berjalan lancar dan khusyuk, persiapan yang matang sangat diperlukan. Berikut adalah checklist lengkap yang perlu Anda siapkan.

## Dokumen Perjalanan

Pastikan semua dokumen berikut sudah siap minimal 2 bulan sebelum keberangkatan:

- **Paspor**: Masa berlaku minimal 6 bulan dari tanggal keberangkatan
- **Visa Umroh**: Diurus melalui travel agent resmi Anda
- **KTP**: Identitas diri yang masih berlaku
- **Pas Foto**: 4x6 cm berlatar putih, tampak wajah penuh (tidak berkacamata)
- **Buku Kuning**: Kartu vaksinasi meningitis (wajib)

## Kesehatan & Vaksinasi

Kondisi kesehatan yang prima akan mendukung kelancaran ibadah:

- Vaksin **Meningitis** — wajib oleh pemerintah Arab Saudi
- Vaksin **COVID-19** — sesuai kebijakan terkini
- Surat keterangan sehat dari dokter
- Konsultasi dengan dokter jika memiliki riwayat penyakit kronis

## Perlengkapan yang Perlu Dibawa

**Pakaian Ihram:**
- Pria: 2 lembar kain ihram putih
- Wanita: pakaian muslimah tertutup (tidak perlu ihram khusus)

**Perlengkapan Ibadah:**
- Al-Qur'an (ukuran saku)
- Buku doa Umroh
- Tasbih
- Sajadah tipis

**Perlengkapan Umum:**
- Koper ukuran sesuai ketentuan airline (biasanya max 23kg)
- Tas ransel/kabin untuk barang bawaan di pesawat
- Sandal yang nyaman untuk thawaf
- Obat-obatan pribadi secukupnya

## Kesiapan Finansial

Pastikan semua pembayaran sudah lunas sebelum berangkat:

- Pelunasan biaya paket Umroh
- Dana cadangan minimal USD 500–1000 untuk kebutuhan di sana
- Uang riyal Saudi untuk keperluan sehari-hari

## Tips Tambahan

1. Pelajari **manasik Umroh** dengan baik — ikuti kelas manasik yang disediakan travel
2. Jaga **kondisi fisik** dengan olahraga ringan minimal 2 minggu sebelum berangkat
3. Kurangi makanan berminyak dan tingkatkan konsumsi sayur & buah
4. Download aplikasi panduan ibadah untuk kemudahan di lapangan

Semoga ibadah Umroh Anda diterima Allah SWT dan menjadi pengalaman spiritual yang tak terlupakan. Aamiin.`,
  },
  "doa-wajib-umroh": {
    id: "2", title: "5 Doa Wajib yang Perlu Dihafal Sebelum Umroh",
    slug: "doa-wajib-umroh", category: "Panduan Ibadah",
    excerpt: "Kumpulan doa-doa penting yang harus dikuasai oleh setiap jamaah Umroh.",
    cover_image_url: "https://images.unsplash.com/photo-1564769610726-59cead6a6f8f?w=1200&q=80",
    views: 980, published_at: "2026-04-05T08:00:00Z", author: "Ustadz Ahmad", read_time: 7,
    content: `## Doa-Doa Penting dalam Ibadah Umroh

Menghafal doa-doa ibadah Umroh adalah persiapan spiritual yang tidak kalah penting dari persiapan fisik dan dokumen. Berikut adalah 5 doa wajib yang harus Anda kuasai.

## 1. Niat Ihram Umroh

*"Labbaika Allāhumma 'umratan"*

Artinya: "Aku penuhi panggilan-Mu ya Allah untuk berumroh."

Dibaca ketika mulai berihram di miqat (titik batas mulai ihram).

## 2. Talbiyah

*"Labbaikallahumma labbaik. Labbaika laa syariika laka labbaik. Innal-hamda wan-ni'mata laka wal-mulk. Laa syariika lak."*

Artinya: "Aku penuhi panggilan-Mu ya Allah, aku penuhi. Aku penuhi, tiada sekutu bagi-Mu, aku penuhi. Sesungguhnya segala pujian, nikmat, dan kekuasaan adalah milik-Mu. Tiada sekutu bagi-Mu."

Dibaca terus-menerus sejak ihram hingga tiba di Masjidil Haram.

## 3. Doa Melihat Ka'bah

*"Allāhumma zid hādzal-bait tasyrīfan wa ta'zhīman wa takriman wa mahabatan..."*

Artinya: "Ya Allah, tambahkanlah kemuliaan, keagungan, kehormatan, dan keindahan Baitullah ini..."

Dibaca saat pertama kali melihat Ka'bah.

## 4. Doa Thawaf

*"Subhānallāh wal-hamdu lillāh wa lā ilāha illallāh wallāhu akbar wa lā hawla wa lā quwwata illā billāh"*

Dibaca selama melakukan thawaf (mengelilingi Ka'bah 7 putaran).

## 5. Doa Sa'i

*"Rabbighfir warham wa anta al-a'azzul akram"*

Artinya: "Ya Tuhanku, ampunilah dan rahmatilah, Engkau Maha Mulia lagi Maha Pemurah."

Dibaca saat melakukan sa'i (berlari-lari kecil antara Safa dan Marwah).

## Tips Menghafal

- Mulai hafalkan minimal **1 bulan** sebelum keberangkatan
- Gunakan metode pengulangan — baca setiap pagi dan malam
- Ikuti kelas **manasik** yang diselenggarakan oleh Vinstour Travel
- Download aplikasi doa Umroh untuk panduan audio`,
  },
};

const RELATED_ARTICLES = [
  { title: "Persiapan Umroh: Checklist Lengkap", slug: "persiapan-umroh-checklist", category: "Panduan Ibadah" },
  { title: "Tips Menjaga Kesehatan di Tanah Suci", slug: "tips-kesehatan-tanah-suci", category: "Tips & Info" },
  { title: "Perbedaan Umroh Reguler, Plus, dan VIP", slug: "perbedaan-paket-umroh", category: "Tips & Info" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Tips & Info": "bg-blue-100 text-blue-700",
  "Panduan Ibadah": "bg-emerald-100 text-emerald-700",
  "Berita": "bg-purple-100 text-purple-700",
  "Promo": "bg-orange-100 text-orange-700",
};

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="text-2xl font-bold mt-8 mb-4">{line.slice(3)}</h2>;
    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold mb-2">{line.slice(2, -2)}</p>;
    if (line.startsWith("- ")) {
      const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, (_m: string, g: string) => `<strong>${g}</strong>`);
      return <li key={i} className="mb-1.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />;
    }
    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      return <p key={i} className="italic text-muted-foreground mb-2">{line.slice(1, -1)}</p>;
    }
    if (line.trim() === "") return <div key={i} className="h-3" />;
    const html = line.replace(/\*\*(.*?)\*\*/g, (_m: string, g: string) => `<strong>${g}</strong>`);
    return <p key={i} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

export default function PublicBlogDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading } = useQuery({
    queryKey: ["blog-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error || !data) return DEMO_ARTICLES[slug || ""] || null;
      return data;
    },
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container max-w-3xl mx-auto px-4 py-12 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </PublicLayout>
    );
  }

  if (!article) {
    return (
      <PublicLayout>
        <div className="container max-w-3xl mx-auto px-4 py-20 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <h1 className="text-2xl font-bold mb-2">Artikel Tidak Ditemukan</h1>
          <p className="text-muted-foreground mb-6">Artikel yang Anda cari tidak tersedia atau telah dihapus.</p>
          <Button asChild><Link to="/blog">Kembali ke Blog</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  const siteTitle = "Vinstour Travel";

  // Inject SEO meta tags + JSON-LD + canonical dynamically
  useEffect(() => {
    if (!article) return;

    const metaTitle = article.meta_title || `${article.title} — ${siteTitle}`;
    const metaDesc = article.meta_description || article.excerpt || article.content.substring(0, 160);
    const canonicalUrl = window.location.href.split('?')[0];

    document.title = metaTitle;

    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", metaDesc);
    setMeta("robots", "index, follow");

    // Open Graph
    setMeta("og:title", metaTitle, true);
    setMeta("og:description", metaDesc, true);
    setMeta("og:type", "article", true);
    if (article.cover_image_url) setMeta("og:image", article.cover_image_url, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:locale", "id_ID", true);
    setMeta("og:site_name", siteTitle, true);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", metaTitle);
    setMeta("twitter:description", metaDesc);
    if (article.cover_image_url) setMeta("twitter:image", article.cover_image_url);

    // Canonical link
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // JSON-LD structured data (Article schema)
    const jsonLd = generateArticleSchema({
      pageType: "Article",
      title: article.title,
      description: metaDesc,
      imageUrl: article.cover_image_url,
      url: canonicalUrl,
      authorName: article.author,
      publishedDate: article.published_at,
      modifiedDate: article.updated_at || article.published_at,
      companyName: siteTitle,
      companyLogo: "/logo.png", // Replace with actual logo URL
    });

    let ldScript = document.querySelector<HTMLScriptElement>('script[data-schema="blog-article"]');
    if (!ldScript) {
      ldScript = document.createElement("script");
      ldScript.setAttribute("type", "application/ld+json");
      ldScript.setAttribute("data-schema", "blog-article");
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = siteTitle;
      const ldEl = document.querySelector('script[data-schema="blog-article"]');
      if (ldEl) ldEl.remove();
      const canonicalEl = document.querySelector('link[rel="canonical"]');
      if (canonicalEl) canonicalEl.remove();
    };
  }, [article]);

  return (
    <PublicLayout>
      <div className="container max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Blog
        </Link>

        {/* Category */}
        <div className="mb-4">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${CATEGORY_COLORS[article.category] || "bg-muted text-muted-foreground"}`}>
            {article.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">{article.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b">
          <span className="font-medium text-foreground">{article.author}</span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {article.published_at ? format(parseISO(article.published_at), "dd MMMM yyyy", { locale: idLocale }) : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {article.read_time || 5} menit baca
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" /> {(article.views || 0).toLocaleString("id")} pembaca
          </span>
          <button
            onClick={() => navigator.share?.({ title: article.title, url: window.location.href })}
            className="ml-auto flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Share2 className="h-4 w-4" /> Bagikan
          </button>
        </div>

	        {/* Cover Image */}
	        {article.cover_image_url && (
	          <img
	            src={article.cover_image_url}
	            alt={article.title}
	            className="w-full h-72 sm:h-96 object-cover rounded-2xl mb-8 shadow-sm"
	            fetchpriority="high"
	          />
	        )}

        {/* Excerpt highlight */}
        {article.excerpt && (
          <p className="text-lg text-muted-foreground border-l-4 border-primary pl-4 mb-8 italic leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <ul className="list-none p-0">
            {article.content ? renderContent(article.content) : (
              <p className="text-muted-foreground">Konten artikel belum tersedia.</p>
            )}
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center">
          <h3 className="text-xl font-bold mb-2">Siap Memulai Perjalanan Umroh?</h3>
          <p className="text-muted-foreground mb-4">Konsultasikan kebutuhan Anda dengan tim kami sekarang.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild><Link to="/packages">Lihat Paket Umroh</Link></Button>
            <Button variant="outline" asChild><Link to="/contact">Hubungi Kami</Link></Button>
          </div>
        </div>

        {/* Related */}
        <div className="mt-12">
          <h3 className="text-lg font-bold mb-5">Artikel Terkait</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {RELATED_ARTICLES.filter(r => r.slug !== slug).map((r) => (
              <Link
                key={r.slug}
                to={`/blog/${r.slug}`}
                className="p-4 border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_COLORS[r.category] || "bg-muted text-muted-foreground"}`}>
                  {r.category}
                </span>
                <p className="mt-2 font-semibold text-sm leading-snug hover:text-primary">{r.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
