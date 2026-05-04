import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Type, Save } from "lucide-react";

interface TypographySettingsProps {
  settings: WebsiteSettings;
}

const FONT_OPTIONS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans", category: "Sans-Serif" },
  { value: "Inter", label: "Inter", category: "Sans-Serif" },
  { value: "Poppins", label: "Poppins", category: "Sans-Serif" },
  { value: "Open Sans", label: "Open Sans", category: "Sans-Serif" },
  { value: "Lato", label: "Lato", category: "Sans-Serif" },
  { value: "Roboto", label: "Roboto", category: "Sans-Serif" },
  { value: "Montserrat", label: "Montserrat", category: "Sans-Serif" },
  { value: "Nunito", label: "Nunito", category: "Sans-Serif" },
  { value: "Playfair Display", label: "Playfair Display", category: "Serif" },
  { value: "Merriweather", label: "Merriweather", category: "Serif" },
  { value: "Lora", label: "Lora", category: "Serif" },
  { value: "Source Serif Pro", label: "Source Serif Pro", category: "Serif" },
];

export function TypographySettings({ settings }: TypographySettingsProps) {
  const updateSettings = useUpdateWebsiteSettings();
  
  const [headingFont, setHeadingFont] = useState(settings.heading_font || "Plus Jakarta Sans");
  const [bodyFont, setBodyFont] = useState(settings.body_font || "Inter");

  useEffect(() => {
    setHeadingFont(settings.heading_font || "Plus Jakarta Sans");
    setBodyFont(settings.body_font || "Inter");
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      heading_font: headingFont,
      body_font: bodyFont,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              <div>
                <CardTitle>Pengaturan Typography</CardTitle>
                <CardDescription>
                  Pilih font untuk heading dan body text website
                </CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Font Heading</Label>
              <Select value={headingFont} onValueChange={setHeadingFont}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                    Sans-Serif
                  </div>
                  {FONT_OPTIONS.filter((f) => f.category === "Sans-Serif").map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2">
                    Serif
                  </div>
                  {FONT_OPTIONS.filter((f) => f.category === "Serif").map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Digunakan untuk judul, heading, dan nama paket
              </p>
            </div>

            <div className="space-y-2">
              <Label>Font Body</Label>
              <Select value={bodyFont} onValueChange={setBodyFont}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                    Sans-Serif
                  </div>
                  {FONT_OPTIONS.filter((f) => f.category === "Sans-Serif").map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2">
                    Serif
                  </div>
                  {FONT_OPTIONS.filter((f) => f.category === "Serif").map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Digunakan untuk paragraf, deskripsi, dan konten
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview Typography</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 p-6 bg-muted/30 rounded-lg">
            <div style={{ fontFamily: headingFont }}>
              <h1 className="text-4xl font-bold mb-2">Heading 1 - Perjalanan Spiritual</h1>
              <h2 className="text-3xl font-semibold mb-2">Heading 2 - Paket Umroh Premium</h2>
              <h3 className="text-2xl font-medium mb-2">Heading 3 - Detail Keberangkatan</h3>
              <h4 className="text-xl font-medium">Heading 4 - Fasilitas Hotel</h4>
            </div>

            <div style={{ fontFamily: bodyFont }}>
              <p className="text-base mb-3">
                Ini adalah contoh paragraf body text yang akan digunakan untuk deskripsi paket, 
                informasi perjalanan, dan konten lainnya di website Anda. Font yang baik harus 
                mudah dibaca dan nyaman untuk mata.
              </p>
              <p className="text-sm text-muted-foreground">
                Teks kecil untuk caption, label, dan informasi tambahan. Lorem ipsum dolor sit amet, 
                consectetur adipiscing elit.
              </p>
            </div>

            <div className="flex gap-4 items-center" style={{ fontFamily: bodyFont }}>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium">
                Button Text
              </button>
              <a href="#" className="text-primary underline">Link Text</a>
              <span className="text-muted-foreground">Muted Text</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Font Pairing Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekomendasi Kombinasi Font</CardTitle>
          <CardDescription>
            Kombinasi font yang sudah terbukti cocok digunakan bersama
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { heading: "Plus Jakarta Sans", body: "Inter", style: "Modern & Clean" },
              { heading: "Playfair Display", body: "Lato", style: "Elegant & Classic" },
              { heading: "Poppins", body: "Open Sans", style: "Professional" },
              { heading: "Montserrat", body: "Roboto", style: "Contemporary" },
              { heading: "Merriweather", body: "Source Serif Pro", style: "Traditional" },
              { heading: "Nunito", body: "Inter", style: "Friendly & Warm" },
            ].map((pair, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start text-left"
                onClick={() => {
                  setHeadingFont(pair.heading);
                  setBodyFont(pair.body);
                }}
              >
                <span className="text-xs text-muted-foreground">{pair.style}</span>
                <span className="font-medium">{pair.heading}</span>
                <span className="text-sm text-muted-foreground">+ {pair.body}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
