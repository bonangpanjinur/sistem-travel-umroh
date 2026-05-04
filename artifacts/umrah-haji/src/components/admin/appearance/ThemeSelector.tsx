import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Palette } from "lucide-react";
import { WebsiteSettings, ThemePreset, useApplyThemePreset } from "@/hooks/useWebsiteSettings";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  settings: WebsiteSettings;
  presets: ThemePreset[];
}

export function ThemeSelector({ settings, presets }: ThemeSelectorProps) {
  const applyPreset = useApplyThemePreset();

  const handleApply = (preset: ThemePreset) => {
    applyPreset.mutate(preset);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Pilih Tema
          </CardTitle>
          <CardDescription>
            Pilih salah satu tema preset untuk diterapkan ke website publik. 
            Anda bisa menyesuaikan warna dan font di tab berikutnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => {
              const isActive = settings.active_theme === preset.slug;
              return (
                <Card
                  key={preset.id}
                  className={cn(
                    "relative cursor-pointer transition-all hover:shadow-md",
                    isActive && "ring-2 ring-primary"
                  )}
                  onClick={() => handleApply(preset)}
                >
                  {isActive && (
                    <Badge className="absolute -top-2 -right-2 gap-1">
                      <Check className="h-3 w-3" />
                      Aktif
                    </Badge>
                  )}
                  {preset.is_default && (
                    <Badge variant="secondary" className="absolute top-2 left-2">
                      Default
                    </Badge>
                  )}
                  
                  {/* Theme Preview */}
                  <div className="p-4 space-y-3">
                    {/* Color swatches */}
                    <div className="flex gap-2">
                      <div
                        className="w-12 h-12 rounded-lg shadow-inner"
                        style={{ backgroundColor: `hsl(${preset.primary_color})` }}
                        title="Primary"
                      />
                      <div
                        className="w-12 h-12 rounded-lg shadow-inner"
                        style={{ backgroundColor: `hsl(${preset.secondary_color})` }}
                        title="Secondary"
                      />
                      <div
                        className="w-12 h-12 rounded-lg shadow-inner"
                        style={{ backgroundColor: `hsl(${preset.accent_color})` }}
                        title="Accent"
                      />
                    </div>

                    {/* Theme info */}
                    <div>
                      <h3 className="font-semibold">{preset.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {preset.description}
                      </p>
                    </div>

                    {/* Typography preview */}
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Font:</span> {preset.heading_font} / {preset.body_font}
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <Button
                      className="w-full"
                      variant={isActive ? "secondary" : "default"}
                      disabled={isActive || applyPreset.isPending}
                    >
                      {isActive ? "Sedang Digunakan" : "Terapkan Tema"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Theme Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Tema Aktif</CardTitle>
          <CardDescription>
            Ringkasan pengaturan tema yang sedang digunakan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Tema</span>
              <p className="font-medium capitalize">{settings.active_theme}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Font Heading</span>
              <p className="font-medium">{settings.heading_font}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Font Body</span>
              <p className="font-medium">{settings.body_font}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Warna Primer</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: `hsl(${settings.primary_color})` }}
                />
                <span className="text-sm font-mono">{settings.primary_color}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
