import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface LegalPage {
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
}

const DEFAULT_PAGES: Record<string, LegalPage> = {
  terms: {
    slug: "terms",
    title: "Syarat & Ketentuan",
    content: `## Syarat & Ketentuan Layanan

### 1. Ketentuan Umum
Dengan menggunakan layanan kami, Anda menyetujui syarat dan ketentuan yang berlaku.

### 2. Pendaftaran
- Calon jamaah wajib mengisi formulir pendaftaran dengan data yang benar
- Pembayaran DP dilakukan paling lambat 3 hari setelah pendaftaran
- Pelunasan dilakukan paling lambat 30 hari sebelum keberangkatan

### 3. Pembatalan
- Pembatalan lebih dari 30 hari sebelum keberangkatan: pengembalian 75%
- Pembatalan 15-30 hari sebelum keberangkatan: pengembalian 50%
- Pembatalan kurang dari 15 hari: tidak ada pengembalian

### 4. Tanggung Jawab
Kami bertanggung jawab atas pelayanan sesuai paket yang dipilih. Perubahan jadwal penerbangan di luar kendali kami.

### 5. Lisensi
Kami memiliki lisensi resmi dari Kementerian Agama RI untuk menyelenggarakan perjalanan ibadah umroh dan haji.`,
    is_published: true,
  },
  privacy: {
    slug: "privacy",
    title: "Kebijakan Privasi",
    content: `## Kebijakan Privasi

### Pengumpulan Data
Kami mengumpulkan data pribadi yang diperlukan untuk proses pendaftaran dan pelayanan umroh/haji, termasuk:
- Nama lengkap, alamat, dan kontak
- Data paspor dan dokumen perjalanan
- Informasi kesehatan yang relevan

### Penggunaan Data
Data Anda digunakan untuk:
- Proses pendaftaran dan pembuatan visa
- Komunikasi terkait perjalanan
- Peningkatan layanan kami

### Keamanan Data
Kami menggunakan enkripsi dan langkah-langkah keamanan untuk melindungi data pribadi Anda.

### Hak Anda
Anda berhak mengakses, memperbarui, atau menghapus data pribadi Anda dengan menghubungi kami.

### Kontak
Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, silakan hubungi kami di:
- Email: privacy@example.com
- Telepon: +62-XXX-XXXX-XXXX`,
    is_published: true,
  },
};

export function LegalPagesGenerator() {
  const [pages, setPages] = useState<Record<string, LegalPage>>(DEFAULT_PAGES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("terms");

  // Load legal pages from database
  useEffect(() => {
    fetchLegalPages();
  }, []);

  const fetchLegalPages = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .in("slug", ["terms", "privacy"]);

      if (error && error.code !== "PGRST116") throw error;

      if (data && data.length > 0) {
        const loadedPages: Record<string, LegalPage> = { ...DEFAULT_PAGES };
        data.forEach((page: any) => {
          loadedPages[page.slug] = {
            slug: page.slug,
            title: page.title,
            content: page.content,
            is_published: page.is_published,
          };
        });
        setPages(loadedPages);
      }
    } catch (error: any) {
      console.error("Error fetching legal pages:", error);
      toast.error("Gagal memuat halaman legal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (slug: string) => {
    const page = pages[slug];
    if (!page.content.trim()) {
      toast.error("Konten tidak boleh kosong");
      return;
    }

    setIsSaving(slug);
    try {
      // Check if page exists
      const { data: existing } = await supabase
        .from("static_pages")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existing) {
        // Update existing page
        const { error } = await supabase
          .from("static_pages")
          .update({
            title: page.title,
            content: page.content,
            is_published: page.is_published,
            updated_at: new Date().toISOString(),
          })
          .eq("slug", slug);

        if (error) throw error;
      } else {
        // Insert new page
        const { error } = await supabase
          .from("static_pages")
          .insert([
            {
              slug,
              title: page.title,
              content: page.content,
              is_published: page.is_published,
              sort_order: Object.keys(pages).indexOf(slug),
            },
          ]);

        if (error) throw error;
      }

      toast.success(`${page.title} berhasil disimpan`);
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message}`);
    } finally {
      setIsSaving(null);
    }
  };

  const handleContentChange = (slug: string, content: string) => {
    setPages((prev) => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        content,
      },
    }));
  };

  const handleTogglePublished = (slug: string) => {
    setPages((prev) => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        is_published: !prev[slug].is_published,
      },
    }));
  };

  const handleResetToDefault = (slug: string) => {
    setPages((prev) => ({
      ...prev,
      [slug]: DEFAULT_PAGES[slug],
    }));
    toast.success("Konten direset ke default");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const currentPage = pages[activeTab];

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Kelola halaman legal seperti Syarat & Ketentuan dan Kebijakan Privasi. Halaman ini penting untuk transparansi dan kepatuhan hukum.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="terms">Syarat & Ketentuan</TabsTrigger>
          <TabsTrigger value="privacy">Kebijakan Privasi</TabsTrigger>
        </TabsList>

        <TabsContent value="terms" className="space-y-4">
          <LegalPageEditor
            page={pages.terms}
            onContentChange={(content) => handleContentChange("terms", content)}
            onTogglePublished={() => handleTogglePublished("terms")}
            onSave={() => handleSave("terms")}
            onReset={() => handleResetToDefault("terms")}
            isSaving={isSaving === "terms"}
          />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <LegalPageEditor
            page={pages.privacy}
            onContentChange={(content) => handleContentChange("privacy", content)}
            onTogglePublished={() => handleTogglePublished("privacy")}
            onSave={() => handleSave("privacy")}
            onReset={() => handleResetToDefault("privacy")}
            isSaving={isSaving === "privacy"}
          />
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips Penulisan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✓ Gunakan bahasa yang jelas dan mudah dipahami</p>
          <p>✓ Pastikan semua informasi penting tercakup</p>
          <p>✓ Update secara berkala sesuai perubahan kebijakan</p>
          <p>✓ Gunakan format Markdown untuk struktur yang lebih baik</p>
          <p>✓ Pastikan halaman dipublikasikan sebelum ditampilkan ke publik</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface LegalPageEditorProps {
  page: LegalPage;
  onContentChange: (content: string) => void;
  onTogglePublished: () => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
}

function LegalPageEditor({
  page,
  onContentChange,
  onTogglePublished,
  onSave,
  onReset,
  isSaving,
}: LegalPageEditorProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{page.title}</CardTitle>
          <CardDescription>
            {page.is_published ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Dipublikasikan
              </span>
            ) : (
              <span className="text-amber-600">Belum dipublikasikan</span>
            )}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePublished}
          >
            {page.is_published ? "Sembunyikan" : "Publikasikan"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`content-${page.slug}`}>Konten (Markdown)</Label>
          <Textarea
            id={`content-${page.slug}`}
            value={page.content}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[400px] resize-none font-mono text-sm"
            placeholder="Tuliskan konten halaman di sini..."
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={isSaving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
          <p className="text-sm font-semibold">Preview:</p>
          <div className="prose prose-sm max-w-none text-sm">
            {page.content.split("\n\n").map((paragraph, i) => {
              if (paragraph.startsWith("##")) {
                return (
                  <h3 key={i} className="font-bold text-base mt-4 mb-2">
                    {paragraph.replace(/^##\s*/, "")}
                  </h3>
                );
              }
              if (paragraph.startsWith("-")) {
                return (
                  <ul key={i} className="list-disc list-inside space-y-1 mb-2">
                    {paragraph.split("\n").map((line, j) => (
                      <li key={j}>{line.replace(/^-\s*/, "")}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="mb-2">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
