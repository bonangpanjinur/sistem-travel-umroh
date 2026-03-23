import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Layout, Sparkles, Crown, Moon, Zap, Leaf } from "lucide-react";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface TemplateSelectorProps {
  settings: WebsiteSettings;
}

const templates = [
  {
    id: "classic",
    name: "Classic",
    description: "Layout profesional dengan hero besar, search widget, statistik angka, dan section standar. Cocok untuk tampilan korporat.",
    icon: Layout,
    features: ["Hero fullscreen + search widget", "Statistik angka", "Section standar"],
    preview: (
      <div className="space-y-2">
        <div className="h-20 bg-primary/20 rounded flex items-center justify-center text-xs text-muted-foreground">
          Hero + Search Widget
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
        </div>
        <div className="h-6 bg-muted/50 rounded" />
        <div className="h-10 bg-primary/10 rounded" />
      </div>
    ),
  },
  {
    id: "modern",
    name: "Modern Minimalist",
    description: "Tampilan clean dengan hero split-screen, layout horizontal, dan CTA card-style bergradasi. Cocok untuk kesan modern.",
    icon: Sparkles,
    features: ["Hero split-screen", "Layout minimalis", "CTA card-style"],
    preview: (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1">
          <div className="h-20 bg-primary/10 rounded flex items-center justify-center text-xs text-muted-foreground">
            Teks
          </div>
          <div className="h-20 bg-primary/20 rounded flex items-center justify-center text-xs text-muted-foreground">
            Gambar
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
        </div>
        <div className="h-6 bg-muted/50 rounded" />
        <div className="grid grid-cols-3 gap-1">
          <div className="h-10 bg-primary/10 rounded" />
          <div className="h-10 bg-primary/10 rounded" />
          <div className="h-10 bg-primary/10 rounded" />
        </div>
      </div>
    ),
  },
  {
    id: "luxury",
    name: "Elegant Luxury",
    description: "Desain eksklusif dengan tipografi serif, aksen emas, dan layout asimetris. Memberikan kesan premium dan terpercaya untuk layanan VVIP.",
    icon: Crown,
    features: ["Tipografi Serif Premium", "Aksen Emas & Border Halus", "Layout Asimetris"],
    preview: (
      <div className="space-y-2">
        <div className="h-20 bg-gradient-to-br from-amber-500/10 to-primary/20 rounded-lg border border-amber-500/20 flex flex-col items-center justify-center text-[10px] text-amber-700 font-serif">
          <Crown className="h-3 w-3 mb-1 text-amber-600" />
          Exclusive Experience
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-muted/40 rounded border-l-2 border-amber-500" />
          <div className="w-1/3 h-12 bg-muted/60 rounded" />
        </div>
        <div className="h-4 w-2/3 mx-auto bg-amber-500/10 rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-14 bg-white border border-amber-100 rounded shadow-sm" />
          <div className="h-14 bg-white border border-amber-100 rounded shadow-sm" />
        </div>
      </div>
    ),
  },
  {
    id: "islamic",
    name: "Islamic Contemporary",
    description: "Desain modern dengan sentuhan ornamen Islami, layout asimetris yang dinamis, dan widget pencarian yang menonjol. Memberikan kesan religius namun tetap kekinian.",
    icon: Moon,
    features: ["Ornamen Islami Halus", "Widget Pencarian Menonjol", "Layout Dinamis & Clean"],
    preview: (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <div className="h-3 w-1/2 bg-primary/20 rounded" />
            <div className="h-8 bg-primary/10 rounded" />
            <div className="h-4 bg-muted rounded" />
          </div>
          <div className="w-1/3 h-20 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-center">
            <Moon className="h-4 w-4 text-primary/40" />
          </div>
        </div>
        <div className="h-12 bg-white border border-primary/20 rounded-xl shadow-sm flex items-center px-2 gap-1">
          <div className="h-6 flex-1 bg-muted/50 rounded" />
          <div className="h-8 w-8 bg-primary rounded-lg" />
        </div>
        <div className="grid grid-cols-4 gap-1">
          <div className="h-6 bg-muted rounded" />
          <div className="h-6 bg-muted rounded" />
          <div className="h-6 bg-muted rounded" />
          <div className="h-6 bg-muted rounded" />
        </div>
      </div>
    ),
  },
  {
    id: "futuristic",
    name: "Futuristic Dark",
    description: "Desain gelap yang elegan dengan aksen neon dan elemen digital. Memberikan kesan teknologi tinggi, modern, dan profesional.",
    icon: Zap,
    features: ["Dark Mode UI", "Neon Accents", "Digital Elements"],
    preview: (
      <div className="space-y-2 bg-[#050505] p-2 rounded">
        <div className="h-20 bg-primary/20 rounded border border-primary/30 flex flex-col items-center justify-center text-[10px] text-primary font-bold">
          <Zap className="h-3 w-3 mb-1" />
          NEXT-GEN TECH
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-white/5 border border-white/10 rounded" />
          <div className="h-12 bg-white/5 border border-white/10 rounded" />
        </div>
        <div className="h-8 bg-primary rounded-none clip-path-polygon" />
      </div>
    ),
  },
  {
    id: "nature",
    name: "Nature Serenity",
    description: "Desain yang menenangkan dengan palet warna alam dan tipografi serif. Memberikan kesan kedamaian spiritual dan pelayanan yang tulus.",
    icon: Leaf,
    features: ["Earthy Color Palette", "Serif Typography", "Organic Shapes"],
    preview: (
      <div className="space-y-2 bg-[#fdfcf8] p-2 rounded">
        <div className="h-20 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center justify-center text-[10px] text-emerald-700 font-serif">
          <Leaf className="h-3 w-3 mb-1" />
          Pure Serenity
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-white border border-emerald-50 rounded-2xl shadow-sm" />
          <div className="w-1/3 h-12 bg-emerald-700 rounded-2xl" />
        </div>
        <div className="h-4 w-1/2 mx-auto bg-emerald-100 rounded-full" />
      </div>
    ),
  },
];

export function TemplateSelector({ settings }: TemplateSelectorProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const currentTemplate = settings.template || "classic";

  const handleSelect = (templateId: string) => {
    if (templateId === currentTemplate) return;
    updateSettings.mutate({ template: templateId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Pilih Template Website</h2>
        <p className="text-sm text-muted-foreground">
          Template mengatur layout keseluruhan halaman publik website Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((tmpl) => {
          const isActive = currentTemplate === tmpl.id;
          const Icon = tmpl.icon;

          return (
            <Card
              key={tmpl.id}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                isActive ? "ring-2 ring-primary shadow-lg" : "hover:ring-1 hover:ring-border"
              }`}
              onClick={() => handleSelect(tmpl.id)}
            >
              {isActive && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="gap-1">
                    <Check className="h-3 w-3" /> Aktif
                  </Badge>
                </div>
              )}

              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{tmpl.name}</h3>
                  </div>
                </div>

                {/* Preview */}
                <div className="border rounded-lg p-3 bg-muted/30">
                  {tmpl.preview}
                </div>

                <p className="text-sm text-muted-foreground">{tmpl.description}</p>

                <div className="flex flex-wrap gap-2">
                  {tmpl.features.map((f) => (
                    <Badge key={f} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>

                <Button
                  variant={isActive ? "default" : "outline"}
                  className="w-full"
                  disabled={isActive || updateSettings.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(tmpl.id);
                  }}
                >
                  {isActive ? "Template Aktif" : "Terapkan Template"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
