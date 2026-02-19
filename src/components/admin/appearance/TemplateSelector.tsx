import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Layout, Sparkles } from "lucide-react";
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
];

export function TemplateSelector({ settings }: TemplateSelectorProps) {
  const updateSettings = useUpdateWebsiteSettings();
  const currentTemplate = settings.template || "classic";

  const handleSelect = (templateId: string) => {
    if (templateId === currentTemplate) return;
    updateSettings.mutate({ template: templateId } as any);
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
