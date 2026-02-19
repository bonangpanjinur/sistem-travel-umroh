import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useAgentByUserId } from "@/hooks/useAgents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Save, Palette, ExternalLink, Copy, Link as LinkIcon } from "lucide-react";

export default function AgentWebsiteSettings() {
  const { user } = useAuth();
  const { data: agentData, isLoading: loadingAgent } = useAgentByUserId(user?.id);
  const queryClient = useQueryClient();

  // Fetch agent's website settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["agent-website-settings", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data } = await (supabase
        .from("website_settings")
        .select("*") as any)
        .eq("agent_id", agentData!.id)
        .single();
      return data;
    },
  });

  const [form, setForm] = useState({
    company_name: "",
    tagline: "",
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
  });

  const [hasCustomSite, setHasCustomSite] = useState(false);

  // Populate form when settings load
  useState(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || "",
        tagline: settings.tagline || "",
        hero_title: settings.hero_title || "",
        hero_subtitle: settings.hero_subtitle || "",
        hero_cta_text: settings.hero_cta_text || "",
        hero_cta_link: settings.hero_cta_link || "",
        footer_phone: settings.footer_phone || "",
        footer_email: settings.footer_email || "",
        footer_whatsapp: settings.footer_whatsapp || "",
        footer_address: settings.footer_address || "",
        social_instagram: settings.social_instagram || "",
        social_facebook: settings.social_facebook || "",
      });
      setHasCustomSite(true);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!agentData?.id) throw new Error("Agent not found");

      if (settings) {
        // Update existing
        const { error } = await (supabase
          .from("website_settings")
          .update({ ...form, updated_at: new Date().toISOString() }) as any)
          .eq("agent_id", agentData.id);
        if (error) throw error;
      } else {
        // Create new with agent_id
        const { error } = await (supabase
          .from("website_settings")
          .insert({ ...form, agent_id: agentData.id }) as any);
        if (error) throw error;
      }

      // Update agent slug if not set
      if (!(agentData as any).slug) {
        const slug = agentData.agent_code.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await (supabase
          .from("agents")
          .update({ slug } as any) as any)
          .eq("id", agentData.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-website-settings"] });
      toast.success("Pengaturan website berhasil disimpan");
    },
    onError: (error: any) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
    },
  });

  const agentSlug = (agentData as any)?.slug || agentData?.agent_code?.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const websiteUrl = `/a/${agentSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + websiteUrl);
    toast.success("Link website berhasil disalin");
  };

  if (loadingAgent || loadingSettings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Website Saya
          </h1>
          <p className="text-muted-foreground">
            Kelola tampilan website personal Anda sebagai agen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Lihat Website
            </a>
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Simpan
          </Button>
        </div>
      </div>

      {/* Website URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            URL Website Anda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
              {window.location.origin}{websiteUrl}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Bagikan link ini kepada calon jamaah Anda
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🏢 Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Perusahaan / Nama Agen</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm(p => ({ ...p, company_name: e.target.value }))}
                placeholder={agentData?.company_name || "Nama agen Anda"}
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={form.tagline}
                onChange={(e) => setForm(p => ({ ...p, tagline: e.target.value }))}
                placeholder="Agen Resmi Umroh & Haji"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🖼️ Hero Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Hero</Label>
              <Input
                value={form.hero_title}
                onChange={(e) => setForm(p => ({ ...p, hero_title: e.target.value }))}
                placeholder="Wujudkan Ibadah Suci Anda"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={form.hero_subtitle}
                onChange={(e) => setForm(p => ({ ...p, hero_subtitle: e.target.value }))}
                rows={2}
                placeholder="Deskripsi layanan Anda..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teks CTA</Label>
                <Input
                  value={form.hero_cta_text}
                  onChange={(e) => setForm(p => ({ ...p, hero_cta_text: e.target.value }))}
                  placeholder="Lihat Paket"
                />
              </div>
              <div className="space-y-2">
                <Label>Link CTA</Label>
                <Input
                  value={form.hero_cta_link}
                  onChange={(e) => setForm(p => ({ ...p, hero_cta_link: e.target.value }))}
                  placeholder="/packages"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📞 Informasi Kontak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input
                value={form.footer_phone}
                onChange={(e) => setForm(p => ({ ...p, footer_phone: e.target.value }))}
                placeholder="08xx-xxxx-xxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={form.footer_whatsapp}
                onChange={(e) => setForm(p => ({ ...p, footer_whatsapp: e.target.value }))}
                placeholder="628xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.footer_email}
                onChange={(e) => setForm(p => ({ ...p, footer_email: e.target.value }))}
                placeholder="email@contoh.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea
                value={form.footer_address}
                onChange={(e) => setForm(p => ({ ...p, footer_address: e.target.value }))}
                rows={2}
                placeholder="Alamat kantor Anda"
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📱 Media Sosial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={form.social_instagram}
                onChange={(e) => setForm(p => ({ ...p, social_instagram: e.target.value }))}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                value={form.social_facebook}
                onChange={(e) => setForm(p => ({ ...p, social_facebook: e.target.value }))}
                placeholder="https://facebook.com/..."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
