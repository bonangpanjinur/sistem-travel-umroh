import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Link2, Copy, Share2, QrCode, ExternalLink,
  Users, CheckCircle2, TrendingUp, Smartphone, Globe
} from "lucide-react";
import { toast } from "sonner";
import QRCodeLib from "qrcode";
import { useEffect, useRef, useState } from "react";

export default function AgentUniqueLink() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showQR, setShowQR] = useState(false);

  const { data: agentData, isLoading } = useQuery({
    queryKey: ["agent-profile-link", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, company_name, agent_code, slug")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: referralStats } = useQuery({
    queryKey: ["agent-referral-stats", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { count: totalBookings } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentData!.id);
      const { count: totalCustomers } = await (supabase as any)
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentData!.id);
      return { bookings: totalBookings || 0, customers: totalCustomers || 0 };
    },
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const agentCode = (agentData as any)?.agent_code || (agentData as any)?.slug || "KODE_AGEN";
  const uniqueLink = `${baseUrl}/daftar?ref=${agentCode}`;
  const websiteLink = `${baseUrl}/a/${(agentData as any)?.slug || agentCode}`;

  const SHARE_LINKS = [
    {
      id: "daftar",
      label: "Link Pendaftaran",
      url: uniqueLink,
      desc: "Calon jamaah langsung diarahkan ke form pendaftaran — komisi otomatis masuk ke akun Anda",
      icon: Link2,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      id: "website",
      label: "Website Agen",
      url: websiteLink,
      desc: "Halaman profil agen Anda — paket, testimoni, dan info kontak",
      icon: Globe,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  useEffect(() => {
    if (showQR && canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, uniqueLink, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [showQR, uniqueLink]);

  const copyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success(`${label} disalin!`));
  };

  const shareLink = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url, text: `Daftar Umroh/Haji via link ini: ${url}` });
      } catch {
        copyLink(url, title);
      }
    } else {
      copyLink(url, title);
    }
  };

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qr-agen-${agentCode}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
    toast.success("QR Code diunduh!");
  };

  const whatsappText = `Assalamu'alaikum 🌙\n\nMau Umroh/Haji dengan tenang dan terjangkau?\n\nDaftarkan diri Anda sekarang melalui link berikut:\n${uniqueLink}\n\nInsyaAllah mabrur! 🕋`;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Link Pendaftaran Unik</h1>
        <p className="text-sm text-muted-foreground">Share link ini — komisi otomatis masuk saat ada yang daftar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Kode Agen", value: agentCode, icon: Link2, color: "text-primary" },
          { label: "Total Jamaah", value: referralStats?.customers ?? "-", icon: Users, color: "text-blue-600" },
          { label: "Total Booking", value: referralStats?.bookings ?? "-", icon: CheckCircle2, color: "text-green-600" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <Icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                <div className="font-bold text-sm">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Links */}
      {SHARE_LINKS.map(link => {
        const Icon = link.icon;
        return (
          <Card key={link.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${link.bg}`}>
                  <Icon className={`h-4 w-4 ${link.color}`} />
                </div>
                {link.label}
              </CardTitle>
              <CardDescription className="text-xs">{link.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={link.url} readOnly className="text-xs font-mono bg-muted" />
                <Button size="icon" variant="outline" onClick={() => copyLink(link.url, link.label)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => shareLink(link.url, link.label)}>
                  <Share2 className="h-3.5 w-3.5 mr-1" /> Bagikan
                </Button>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Buka
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* QR Code */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-50">
              <QrCode className="h-4 w-4 text-purple-600" />
            </div>
            QR Code Pendaftaran
          </CardTitle>
          <CardDescription className="text-xs">
            Print atau share QR ini — calon jamaah scan langsung menuju form daftar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showQR ? (
            <Button variant="outline" className="w-full" onClick={() => setShowQR(true)}>
              <QrCode className="h-4 w-4 mr-2" /> Tampilkan QR Code
            </Button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="border-4 border-primary/20 rounded-xl p-2 inline-block bg-white">
                <canvas ref={canvasRef} className="rounded-lg" />
              </div>
              <div className="flex gap-2 w-full">
                <Button variant="outline" size="sm" className="flex-1" onClick={downloadQR}>
                  Unduh PNG
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                  navigator.clipboard.writeText(uniqueLink);
                  toast.success("Link disalin!");
                }}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Salin Link
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WA Template */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-green-600" /> Template WA Siap Pakai
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="bg-white rounded-xl p-3 border border-green-200">
            <p className="text-xs whitespace-pre-wrap text-gray-700">{whatsappText}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 border-green-300 text-green-700 hover:bg-green-100"
              onClick={() => { navigator.clipboard.writeText(whatsappText); toast.success("Template disalin!"); }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Salin
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                Kirim via WA
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold mb-2">💡 Tips Maksimalkan Konversi</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Share link di status WA setiap hari</li>
            <li>Sertakan foto/video kabar dari jamaah sebelumnya</li>
            <li>Gunakan template WA sesuai momen (Ramadan, Idul Adha)</li>
            <li>Print QR code dan pasang di tempat strategis</li>
            <li>Follow up prospek dalam 24 jam pertama</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
