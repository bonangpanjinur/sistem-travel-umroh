import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Palette } from "lucide-react";
import { SectionHead } from "./SectionHead";

const COLORS = [
  { name: "Hijau (Default)", hex: "#16a34a" },
  { name: "Biru",             hex: "#3b82f6" },
  { name: "Indigo",           hex: "#6366f1" },
  { name: "Amber",            hex: "#f59e0b" },
  { name: "Rose",             hex: "#f43f5e" },
];

const MODES = [
  { label: "Terang", emoji: "☀️" },
  { label: "Gelap", emoji: "🌙" },
  { label: "Ikuti Sistem", emoji: "🖥️" },
];

export function AppearanceSection() {
  return (
    <>
      <SectionHead icon={Palette} title="Tampilan & Branding" desc="Warna tema, identitas visual, dan desain dokumen" />
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label className="text-sm font-semibold mb-3 block">Warna Utama Sistem</Label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button key={c.hex} title={c.name} className="group flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full border-2 border-transparent group-hover:border-foreground/40 transition-all shadow-sm"
                    style={{ backgroundColor: c.hex }} />
                  <span className="text-[10px] text-muted-foreground">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-sm font-semibold mb-3 block">Mode Tampilan</Label>
            <div className="grid grid-cols-3 gap-3">
              {MODES.map(m => (
                <button key={m.label} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors text-center">
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <div className="text-xs font-medium">{m.label}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Pengaturan Tampilan Lanjutan</p>
              <p className="text-xs text-muted-foreground">
                Logo perusahaan, banner carousel, template landing page, tema custom, font & branding lengkap
              </p>
            </div>
            <Button size="sm" asChild>
              <a href="/admin/appearance">Buka</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}