import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Globe, Save, ExternalLink, Copy, QrCode,
  MessageCircle, Instagram, Facebook, Youtube, BarChart2,
  Star, Plus, Trash2, Link as LinkIcon, MessageSquare, Check, Eye,
} from "lucide-react";
import { CHAT_COLOR_PRESETS, type ChatColorPreset } from "@/components/public/TenantChatBubble";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QR_API = (url: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

function ShareButtons({ url }: { url: string }) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`Kunjungi website cabang kami: ${url}`)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return (
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" variant="outline" asChild className="gap-1.5">
        <a href={waUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4 text-green-600" />WhatsApp
        </a>
      </Button>
      <Button size="sm" variant="outline" asChild className="gap-1.5">
        <a href={fbUrl} target="_blank" rel="noopener noreferrer">
          <Facebook className="h-4 w-4 text-blue-600" />Facebook
        </a>
      </Button>
    </div>
  );
}

function QrDialog({ url, open, onClose }: { url: string; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>QR Code Website Cabang</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <img src={QR_API(url)} alt="QR Code" className="w-48 h-48 rounded-lg border" />
          <p className="text-xs text-muted-foreground text-center break-all">{url}</p>
          <Button asChild size="sm" variant="outline">
            <a href={QR_API(url)} download="qr-website-cabang.png">Download QR Code</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TestimonialEditor({ testimonials, onChange }: { testimonials: any[]; onChange: (t: any[]) => void }) {
  const addNew = () => onChange([...testimonials, { name: "", text: "", rating: 5 }]);
  const remove = (i: number) => onChange(testimonials.filter((_, idx) => idx !== i));
  const update = (i: number, key: string, val: any) =>
    onChange(testimonials.map((t, idx) => idx === i ? { ...t, [key]: val } : t));

  return (
    <div className="space-y-3">
      {testimonials.map((t, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Testimoni {i + 1}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
          <Input value={t.name} onChange={e => update(i, "name", e.target.value)} placeholder="Nama jamaah" />
          <Textarea value={t.text} onChange={e => update(i, "text", e.target.value)} placeholder="Ulasan jamaah..." rows={2} />
          <div className="flex items-center gap-2">
            <Label className="text-xs">Rating:</Label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(r => (
                <button key={r} onClick={() => update(i, "rating", r)} className="focus:outline-none">
                  <Star className={`h-4 w-4 ${r <= t.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addNew} className="w-full gap-2">
        <Plus className="h-4 w-4" />Tambah Testimoni
      </Button>
    </div>
  );
}

function GalleryEditor({ urls, onChange }: { urls: string[]; onChange: (u: string[]) => void }) {
  const [newUrl, setNewUrl] = useState("");
  const add = () => { if (newUrl.trim()) { onChange([...urls, newUrl.trim()]); setNewUrl(""); } };
  const remove = (i: number) => onChange(urls.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL foto..."
          onKeyDown={e => e.key === "Enter" && add()} />
        <Button size="sm" onClick={add} variant="outline">Tambah</Button>
      </div>
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((u, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
              <img src={u} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = ""; }} />
              <button onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Default form ─────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  company_name: "",
  tagline: "",
  profile_photo_url: "",
  banner_url: "",
  bio: "",
  hero_title: "",
  hero_subtitle: "",
  hero_cta_text: "",
  hero_cta_link: "",
  footer_phone: "",
  footer_email: "",
  footer_whatsapp: "",
  footer_address: "",
  social_instagram: "",
  social_facebook: "",
  social_youtube: "",
  social_tiktok: "",
  seo_title: "",
  seo_description: "",
  chat_bubble_color: "emerald" as ChatColorPreset,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BranchWebsiteSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [showQr, setShowQr] = useState(false);

  // 1. Get branch info
  const { data: branchData, isLoading: loadingBranch } = useQuery({
    queryKey: ["branch-for-website", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("branches")
        .select("id, name, city, slug")
        .eq("manager_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // 2. Get/create website_settings for this branch
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["branch-website-settings", branchData?.id],
    enabled: !!branchData?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("website_settings")
        .select("*")
        .eq("branch_id", branchData!.id)
        .maybeSingle();
      if (!data) {
        const { data: created } = await (supabase as any)
          .from("website_settings")
          .insert({ branch_id: branchData!.id, company_name: branchData!.name || "" })
          .select()
          .maybeSingle();
        return created;
      }
      return data;
    },
  });

  // 3. Populate form when settings load
  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    setForm({
      company_name:      s.company_name      || "",
      tagline:           s.tagline           || "",
      profile_photo_url: s.profile_photo_url || "",
      banner_url:        s.banner_url        || "",
      bio:               s.bio               || "",
      hero_title:        s.hero_title        || "",
      hero_subtitle:     s.hero_subtitle     || "",
      hero_cta_text:     s.hero_cta_text     || "",
      hero_cta_link:     s.hero_cta_link     || "",
      footer_phone:      s.footer_phone      || "",
      footer_email:      s.footer_email      || "",
      footer_whatsapp:   s.footer_whatsapp   || "",
      footer_address:    s.footer_address    || "",
      social_instagram:  s.social_instagram  || "",
      social_facebook:   s.social_facebook   || "",
      social_youtube:    s.social_youtube    || "",
      social_tiktok:     s.social_tiktok     || "",
      seo_title:         s.seo_title         || "",
      seo_description:   s.seo_description   || "",
      chat_bubble_color: (s.chat_bubble_color as ChatColorPreset) || "emerald",
    });
    try {
      const t = s.testimonials;
      setTestimonials(t ? (typeof t === "string" ? JSON.parse(t) : t) : []);
      const g = s.gallery_urls;
      setGallery(g ? (typeof g === "string" ? JSON.parse(g) : g) : []);
    } catch {}
  }, [settings]);

  const f = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  // 4. Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!branchData?.id) throw new Error("Data cabang tidak ditemukan");
      const payload = {
        ...form,
        testimonials:      JSON.stringify(testimonials),
        gallery_urls:      JSON.stringify(gallery),
        chat_bubble_color: form.chat_bubble_color,
        updated_at:        new Date().toISOString(),
      };
      const s = settings as any;
      if (s?.id) {
        const { error } = await (supabase as any)
          .from("website_settings").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("website_settings").insert({ ...payload, branch_id: branchData.id });
        if (error) throw error;
      }
      // Auto-generate slug for branch if missing
      if (!branchData.slug) {
        const slug = branchData.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        await (supabase as any).from("branches").update({ slug }).eq("id", branchData.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-website-settings"] });
      toast.success("Pengaturan website cabang berhasil disimpan");
    },
    onError: (e: Error) => toast.error(`Gagal menyimpan: ${e.message}`),
  });

  const branchSlug = branchData?.slug ||
    branchData?.name?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "";
  const websiteUrl = `${window.location.origin}/b/${branchSlug}`;
  const viewCount = (settings as any)?.view_count || 0;

  if (loadingBranch || loadingSettings) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  if (!branchData) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground p-6">
        Data cabang tidak ditemukan. Pastikan akun Anda terdaftar sebagai Branch Manager.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />Website Cabang
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kelola tampilan website publik {branchData.name}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowQr(true)}>
            <QrCode className="h-4 w-4 mr-2" />QR Code
          </Button>
          <Button variant="outline" asChild>
            <a href={`/b/${branchSlug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />Lihat Website
            </a>
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {/* URL + Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />URL Website Cabang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all">{websiteUrl}</code>
              <Button variant="outline" size="icon" onClick={() => {
                navigator.clipboard.writeText(websiteUrl);
                toast.success("Link disalin");
              }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-2">Bagikan ke:</p>
              <ShareButtons url={websiteUrl} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />Statistik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{viewCount.toLocaleString("id-ID")}</p>
                <p className="text-xs text-muted-foreground">Total Pengunjung</p>
              </div>
              <p className="text-xs text-muted-foreground">Jumlah kunjungan ke website cabang Anda</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="contact">Kontak</TabsTrigger>
          <TabsTrigger value="social">Media Sosial</TabsTrigger>
          <TabsTrigger value="testimonials">Testimoni</TabsTrigger>
          <TabsTrigger value="gallery">Galeri</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* ── Branding ── */}
        <TabsContent value="branding" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Nama Cabang / Perusahaan</Label>
                <Input value={form.company_name} onChange={f("company_name")}
                  placeholder={branchData?.name} />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input value={form.tagline} onChange={f("tagline")}
                  placeholder="Cabang Resmi Umroh & Haji Terpercaya" />
              </div>
              <div className="space-y-2">
                <Label>Bio / Deskripsi Cabang</Label>
                <Textarea value={form.bio} onChange={f("bio")} rows={4}
                  placeholder="Ceritakan tentang cabang Anda dan layanan yang tersedia..." />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL Logo / Foto Profil</Label>
                  <Input value={form.profile_photo_url} onChange={f("profile_photo_url")} placeholder="https://..." />
                  {form.profile_photo_url && (
                    <img src={form.profile_photo_url} alt="Logo"
                      className="mt-2 w-20 h-20 rounded-full object-cover border"
                      onError={e => { (e.target as any).style.display = "none"; }} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>URL Banner / Foto Sampul</Label>
                  <Input value={form.banner_url} onChange={f("banner_url")} placeholder="https://..." />
                  {form.banner_url && (
                    <img src={form.banner_url} alt="Banner"
                      className="mt-2 w-full h-16 rounded object-cover border"
                      onError={e => { (e.target as any).style.display = "none"; }} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Chat Bubble Color Picker ── */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">Warna Chat Bubble</Label>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Pilih warna aksen untuk bubble chat AI yang muncul di website cabang Anda.
                Pengunjung bisa langsung tanya paket, harga, dan info lainnya melalui bubble ini.
              </p>

              <div className="grid grid-cols-4 gap-3">
                {(Object.entries(CHAT_COLOR_PRESETS) as [ChatColorPreset, typeof CHAT_COLOR_PRESETS[ChatColorPreset]][]).map(([key, preset]) => {
                  const isSelected = form.chat_bubble_color === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, chat_bubble_color: key }))}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 hover:scale-105 ${
                        isSelected
                          ? "border-gray-900 shadow-md bg-gray-50"
                          : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${preset.hex}, ${preset.hex}bb)` }}
                      />
                      <span className="text-xs font-medium text-center leading-tight">{preset.label}</span>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Live preview */}
              <div className="mt-1 p-4 bg-gray-50 rounded-xl border border-dashed">
                <p className="text-xs text-muted-foreground mb-3 font-medium">Preview:</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full shadow flex items-center justify-center shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${CHAT_COLOR_PRESETS[form.chat_bubble_color as ChatColorPreset]?.hex ?? "#059669"}, ${CHAT_COLOR_PRESETS[form.chat_bubble_color as ChatColorPreset]?.hex ?? "#059669"}99)`,
                    }}
                  >
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Bubble warna {CHAT_COLOR_PRESETS[form.chat_bubble_color as ChatColorPreset]?.label ?? "Hijau"}
                    </p>
                    <p className="text-xs text-muted-foreground">Muncul di sudut kanan bawah website cabang Anda</p>
                  </div>
                  <span
                    className="ml-auto text-xs font-semibold px-3 py-1 rounded-full text-white shrink-0"
                    style={{ background: CHAT_COLOR_PRESETS[form.chat_bubble_color as ChatColorPreset]?.hex ?? "#059669" }}
                  >
                    Aktif
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Hero ── */}
        <TabsContent value="hero" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Judul Hero</Label>
                <Input value={form.hero_title} onChange={f("hero_title")}
                  placeholder="Wujudkan Ibadah Suci Anda" />
              </div>
              <div className="space-y-2">
                <Label>Subtitle Hero</Label>
                <Textarea value={form.hero_subtitle} onChange={f("hero_subtitle")} rows={3}
                  placeholder="Deskripsi layanan cabang Anda..." />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teks Tombol CTA</Label>
                  <Input value={form.hero_cta_text} onChange={f("hero_cta_text")} placeholder="Lihat Paket" />
                </div>
                <div className="space-y-2">
                  <Label>Link Tombol CTA</Label>
                  <Input value={form.hero_cta_link} onChange={f("hero_cta_link")} placeholder="/packages" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contact ── */}
        <TabsContent value="contact" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telepon</Label>
                  <Input value={form.footer_phone} onChange={f("footer_phone")} placeholder="08xx-xxxx-xxxx" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp (nomor saja)</Label>
                  <Input value={form.footer_whatsapp} onChange={f("footer_whatsapp")} placeholder="628xxxxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.footer_email} onChange={f("footer_email")} placeholder="cabang@contoh.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alamat Kantor Cabang</Label>
                <Textarea value={form.footer_address} onChange={f("footer_address")} rows={3}
                  placeholder="Alamat lengkap kantor cabang Anda..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Social ── */}
        <TabsContent value="social" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Instagram className="h-4 w-4 text-pink-500" />Instagram
                  </Label>
                  <Input value={form.social_instagram} onChange={f("social_instagram")}
                    placeholder="https://instagram.com/..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Facebook className="h-4 w-4 text-blue-600" />Facebook
                  </Label>
                  <Input value={form.social_facebook} onChange={f("social_facebook")}
                    placeholder="https://facebook.com/..." />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Youtube className="h-4 w-4 text-red-600" />YouTube
                  </Label>
                  <Input value={form.social_youtube} onChange={f("social_youtube")}
                    placeholder="https://youtube.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>TikTok</Label>
                  <Input value={form.social_tiktok} onChange={f("social_tiktok")}
                    placeholder="https://tiktok.com/@..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Testimonials ── */}
        <TabsContent value="testimonials" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-4">
                Tambahkan ulasan dari jamaah yang berangkat melalui cabang Anda
              </p>
              <TestimonialEditor testimonials={testimonials} onChange={setTestimonials} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Gallery ── */}
        <TabsContent value="gallery" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-4">
                Tambahkan foto-foto kegiatan dan perjalanan cabang Anda
              </p>
              <GalleryEditor urls={gallery} onChange={setGallery} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SEO ── */}
        <TabsContent value="seo" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">Atur judul dan deskripsi yang muncul di Google</p>
              <div className="space-y-2">
                <Label>Judul SEO</Label>
                <Input value={form.seo_title} onChange={f("seo_title")}
                  placeholder={form.company_name || "Nama Cabang"} maxLength={60} />
                <p className="text-xs text-muted-foreground">{form.seo_title.length}/60 karakter</p>
              </div>
              <div className="space-y-2">
                <Label>Deskripsi SEO</Label>
                <Textarea value={form.seo_description} onChange={f("seo_description")} rows={3}
                  placeholder="Deskripsi singkat website cabang Anda..." maxLength={160} />
                <p className="text-xs text-muted-foreground">{form.seo_description.length}/160 karakter</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <QrDialog url={websiteUrl} open={showQr} onClose={() => setShowQr(false)} />
    </div>
  );
}
