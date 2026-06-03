import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Eye, Smartphone } from "lucide-react";
import { SectionHead } from "./SectionHead";
import RevokeSessions from "@/components/settings/RevokeSessions";

const ITEMS = [
  { label: "Autentikasi 2 Faktor (2FA)", desc: "Tambahkan lapisan keamanan ekstra", btnLabel: "Atur 2FA",   icon: Lock },
  { label: "Log Aktivitas",              desc: "Riwayat login dan perubahan akun", btnLabel: "Lihat Log",   icon: Eye },
  { label: "Sesi Aktif",                 desc: "Perangkat yang sedang login",      btnLabel: "Kelola Sesi", icon: Smartphone },
];

export function SecuritySection() {
  return (
    <>
      <SectionHead icon={Lock} title="Keamanan Akun" desc="Autentikasi dua faktor dan manajemen sesi" />
      <Card>
        <CardContent className="pt-6 space-y-3">
          {ITEMS.map(item => (
            <div key={item.label} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Button variant="outline" size="sm">
                <item.icon className="h-3.5 w-3.5 mr-1.5" />{item.btnLabel}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <RevokeSessions />
    </>
  );
}