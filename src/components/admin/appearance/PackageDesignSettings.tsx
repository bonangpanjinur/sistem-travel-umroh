import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WebsiteSettings, useUpdateWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Save, Loader2, Square, RectangleHorizontal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PackageDesignSettingsProps {
  settings: WebsiteSettings;
}

export function PackageDesignSettings({ settings }: PackageDesignSettingsProps) {
  const updateSettings = useUpdateWebsiteSettings();
  
  const [cardLayout, setCardLayout] = useState<'modern' | 'classic' | 'minimal'>(
    settings.package_card_layout || 'modern'
  );
  const [imageRatio, setImageRatio] = useState<'16/10' | '1/1' | '3/4' | '9/6'>(
    settings.package_card_image_ratio || '16/10'
  );

  useEffect(() => {
    setCardLayout(settings.package_card_layout || 'modern');
    setImageRatio(settings.package_card_image_ratio || '16/10');
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      package_card_layout: cardLayout,
      package_card_image_ratio: imageRatio,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Square className="h-5 w-5" />
              <div>
                <CardTitle>Desain Card Paket</CardTitle>
                <CardDescription>
                  Konfigurasi tampilan card paket dan rasio foto yang akan diterapkan di halaman publik
                </CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-3">
            <Label className="text-base">Layout Card</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Pilih gaya tampilan card untuk katalog paket Anda
            </p>
            <Tabs value={cardLayout} onValueChange={(v: any) => setCardLayout(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="modern">Modern</TabsTrigger>
                <TabsTrigger value="classic">Classic</TabsTrigger>
                <TabsTrigger value="minimal">Minimal</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Rasio Foto</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Atur aspek rasio gambar utama pada card paket
            </p>
            <div className="flex items-center gap-2 p-1 border rounded-md bg-muted/20">
              <Button 
                variant={imageRatio === '16/10' ? 'secondary' : 'ghost'} 
                className="flex-1 gap-2"
                onClick={() => setImageRatio('16/10')}
              >
                <RectangleHorizontal className="h-4 w-4" />
                16:10
              </Button>
              <Button 
                variant={imageRatio === '1/1' ? 'secondary' : 'ghost'} 
                className="flex-1 gap-2"
                onClick={() => setImageRatio('1/1')}
              >
                <Square className="h-4 w-4" />
                1:1
              </Button>
              <Button 
                variant={imageRatio === '3/4' ? 'secondary' : 'ghost'} 
                className="flex-1 gap-2"
                onClick={() => setImageRatio('3/4')}
              >
                <div className="w-3 h-4 border-2 border-current rounded-[1px]" />
                3:4
              </Button>
              <Button 
                variant={imageRatio === '9/6' ? 'secondary' : 'ghost'} 
                className="flex-1 gap-2"
                onClick={() => setImageRatio('9/6')}
              >
                <div className="w-4 h-3 border-2 border-current rounded-[1px]" />
                9:6
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview Layout</CardTitle>
          <CardDescription>
            Gambaran kasar bagaimana card akan terlihat (warna mengikuti tema yang dipilih)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl p-8 bg-muted/30 flex justify-center">
            <div className={`
              w-full max-w-sm bg-card rounded-xl shadow-lg overflow-hidden border
              ${cardLayout === 'minimal' ? 'border-muted' : ''}
            `}>
              <div className={`
                bg-muted flex items-center justify-center text-muted-foreground
                ${imageRatio === '1/1' ? 'aspect-square' : ''}
                ${imageRatio === '3/4' ? 'aspect-[3/4]' : ''}
                ${imageRatio === '9/6' ? 'aspect-[9/6]' : ''}
                ${imageRatio === '16/10' ? 'aspect-[16/10]' : ''}
              `}>
                <span className="text-xs font-medium">Foto Paket ({imageRatio})</span>
              </div>
              <div className="p-5 space-y-3">
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted/60 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-muted/60 rounded animate-pulse" />
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <div className="h-5 w-24 bg-primary/20 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-primary rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
