import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Palette, RotateCcw, Save } from "lucide-react";

interface ColorSettingsProps {
  settings: WebsiteSettings;
}

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

function parseHSL(hslString: string | null): HSLColor {
  if (!hslString) return { h: 142, s: 70, l: 45 };
  const parts = hslString.split(" ");
  return {
    h: parseInt(parts[0]) || 0,
    s: parseInt(parts[1]?.replace("%", "")) || 0,
    l: parseInt(parts[2]?.replace("%", "")) || 0,
  };
}

function toHSLString(color: HSLColor): string {
  return `${color.h} ${color.s}% ${color.l}%`;
}

export function ColorSettings({ settings }: ColorSettingsProps) {
  const updateSettings = useUpdateWebsiteSettings();
  
  const [colors, setColors] = useState({
    primary: parseHSL(settings.primary_color),
    secondary: parseHSL(settings.secondary_color),
    accent: parseHSL(settings.accent_color),
    background: parseHSL(settings.background_color),
    foreground: parseHSL(settings.foreground_color),
  });

  useEffect(() => {
    setColors({
      primary: parseHSL(settings.primary_color),
      secondary: parseHSL(settings.secondary_color),
      accent: parseHSL(settings.accent_color),
      background: parseHSL(settings.background_color),
      foreground: parseHSL(settings.foreground_color),
    });
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      primary_color: toHSLString(colors.primary),
      secondary_color: toHSLString(colors.secondary),
      accent_color: toHSLString(colors.accent),
      background_color: toHSLString(colors.background),
      foreground_color: toHSLString(colors.foreground),
    });
  };

  const handleReset = () => {
    setColors({
      primary: parseHSL(settings.primary_color),
      secondary: parseHSL(settings.secondary_color),
      accent: parseHSL(settings.accent_color),
      background: parseHSL(settings.background_color),
      foreground: parseHSL(settings.foreground_color),
    });
  };

  const ColorPicker = ({
    label,
    description,
    value,
    onChange,
  }: {
    label: string;
    description: string;
    value: HSLColor;
    onChange: (color: HSLColor) => void;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg border shadow-sm"
            style={{ backgroundColor: `hsl(${toHSLString(value)})` }}
          />
          <div>
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Hue (Warna)</Label>
            <span className="text-xs text-muted-foreground">{value.h}°</span>
          </div>
          <Slider
            value={[value.h]}
            min={0}
            max={360}
            step={1}
            onValueChange={([h]) => onChange({ ...value, h })}
            className="[&>span]:bg-gradient-to-r [&>span]:from-red-500 [&>span]:via-green-500 [&>span]:to-blue-500"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Saturation (Kecerahan)</Label>
            <span className="text-xs text-muted-foreground">{value.s}%</span>
          </div>
          <Slider
            value={[value.s]}
            min={0}
            max={100}
            step={1}
            onValueChange={([s]) => onChange({ ...value, s })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Lightness (Terang/Gelap)</Label>
            <span className="text-xs text-muted-foreground">{value.l}%</span>
          </div>
          <Slider
            value={[value.l]}
            min={0}
            max={100}
            step={1}
            onValueChange={([l]) => onChange({ ...value, l })}
          />
        </div>
        <div className="pt-2">
          <Label className="text-xs text-muted-foreground">HSL Value</Label>
          <Input
            value={toHSLString(value)}
            readOnly
            className="font-mono text-xs h-8"
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <div>
                <CardTitle>Kustomisasi Warna</CardTitle>
                <CardDescription>
                  Atur warna tema website sesuai identitas brand Anda
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Simpan
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg p-6 space-y-4"
            style={{ backgroundColor: `hsl(${toHSLString(colors.background)})` }}
          >
            <h2
              className="text-2xl font-bold"
              style={{ color: `hsl(${toHSLString(colors.foreground)})` }}
            >
              Contoh Heading
            </h2>
            <p style={{ color: `hsl(${toHSLString(colors.foreground)})` }}>
              Ini adalah contoh teks paragraf yang akan muncul di website Anda.
            </p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: `hsl(${toHSLString(colors.primary)})` }}
              >
                Button Primer
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: `hsl(${toHSLString(colors.secondary)})` }}
              >
                Button Sekunder
              </button>
              <button
                className="px-4 py-2 rounded-lg font-medium border"
                style={{
                  borderColor: `hsl(${toHSLString(colors.accent)})`,
                  color: `hsl(${toHSLString(colors.accent)})`,
                }}
              >
                Button Aksen
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ColorPicker
          label="Warna Primer"
          description="Warna utama untuk tombol dan elemen penting"
          value={colors.primary}
          onChange={(primary) => setColors({ ...colors, primary })}
        />
        <ColorPicker
          label="Warna Sekunder"
          description="Warna pendukung untuk aksen dan highlight"
          value={colors.secondary}
          onChange={(secondary) => setColors({ ...colors, secondary })}
        />
        <ColorPicker
          label="Warna Aksen"
          description="Warna untuk elemen interaktif dan link"
          value={colors.accent}
          onChange={(accent) => setColors({ ...colors, accent })}
        />
        <ColorPicker
          label="Warna Background"
          description="Warna latar belakang halaman"
          value={colors.background}
          onChange={(background) => setColors({ ...colors, background })}
        />
        <ColorPicker
          label="Warna Foreground"
          description="Warna teks dan konten utama"
          value={colors.foreground}
          onChange={(foreground) => setColors({ ...colors, foreground })}
        />
      </div>
    </div>
  );
}
