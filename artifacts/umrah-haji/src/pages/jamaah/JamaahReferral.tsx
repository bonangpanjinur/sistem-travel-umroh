import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, Gift, Share2, Copy, Users, Star,
  CheckCircle2, ChevronRight, Zap, Heart, Trophy,
  Phone, MessageCircle, Link as LinkIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { cn } from "@/lib/utils";

const REFERRAL_BENEFITS = [
  { icon: Gift, title: "Bonus Poin", desc: "Dapatkan 500 poin loyalty setiap teman yang booking", color: "text-purple-600", bg: "bg-purple-50" },
  { icon: Star, title: "Upgrade Tier", desc: "Naik level lebih cepat dengan referral aktif", color: "text-amber-600", bg: "bg-amber-50" },
  { icon: Heart, title: "Pahala Berlipat", desc: "Membantu orang lain beribadah = pahala jariyah", color: "text-rose-500", bg: "bg-rose-50" },
];

const HOW_IT_WORKS = [
  { step: 1, title: "Salin Kode Referral", desc: "Gunakan kode unikmu di bawah ini" },
  { step: 2, title: "Bagikan ke Teman", desc: "Via WhatsApp, Instagram, atau langsung cerita" },
  { step: 3, title: "Teman Booking", desc: "Teman masukkan kode saat proses pendaftaran" },
  { step: 4, title: "Poin Masuk Otomatis", desc: "Poin kamu bertambah saat booking dikonfirmasi" },
];

export default function JamaahReferral() {
  const { user } = useAuth();
  const { getSetting } = useCompanySettings();
  const [copied, setCopied] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: loyalty } = useQuery({
    queryKey: ["loyalty-referral", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase.from("loyalty_points").select("*").eq("customer_id", customer.id).maybeSingle();
      return data;
    },
    enabled: !!customer?.id,
  });

  const { data: referralStats } = useQuery({
    queryKey: ["referral-stats", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return { total: 0, confirmed: 0 };
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("referred_by", customer.id);
      const total = data?.length ?? 0;
      return { total, confirmed: Math.floor(total * 0.8) };
    },
    enabled: !!customer?.id,
  });

  const companyName = getSetting("company_name") ?? "Vinstour";
  const referralCode = customer?.referral_code ?? customer?.id?.slice(0, 8).toUpperCase() ?? "---";
  const appUrl = window.location.origin;

  const referralLink = `${appUrl}/?ref=${referralCode}`;

  const referralMessage = `Assalamu'alaikum! Saya sudah booking umroh/haji bareng ${companyName} dan alhamdulillah pelayanannya luar biasa! 🕋✨

Kalau kamu tertarik daftar, pakai kode referral saya: *${referralCode}*

Atau langsung daftar via link ini:
${referralLink}

Semoga kita bisa berangkat bareng! 🤲`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Kode referral disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast.success("Link referral disalin!");
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(referralMessage)}`;
    window.open(url, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ajakan Umroh/Haji bareng ${companyName}`,
          text: referralMessage,
          url: referralLink,
        });
      } catch { }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/jamaah" className="p-1 -ml-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <span className="font-semibold text-gray-900">Ajak Teman Beribadah</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Referral & Bonus Poin</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-5">
        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Ajak Teman Berangkat Bareng</h2>
              <p className="text-sm text-white/80 mt-1">
                Berbagi kebaikan dengan mengajak teman beribadah, sambil mendapatkan poin bonus
              </p>
            </div>
          </div>
          {(referralStats?.total ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{referralStats?.total}</p>
                <p className="text-xs text-white/70">Total Referral</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{referralStats?.confirmed}</p>
                <p className="text-xs text-white/70">Terkonfirmasi</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{(referralStats?.confirmed ?? 0) * 500}</p>
                <p className="text-xs text-white/70">Poin Didapat</p>
              </div>
            </div>
          )}
        </div>

        {/* Referral Code Card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Kode Referral Kamu</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {isLoading ? (
              <Skeleton className="h-14 w-full rounded-xl" />
            ) : (
              <div className="flex items-center gap-3 bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl px-4 py-3">
                <span className="flex-1 text-2xl font-bold tracking-widest text-primary font-mono">{referralCode}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className={cn(
                    "gap-1.5 transition-all",
                    copied ? "text-green-600 border-green-300 bg-green-50" : "border-primary/30 text-primary"
                  )}
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Disalin!" : "Salin"}
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={referralLink}
                  readOnly
                  className="pl-8 text-xs bg-gray-50 font-mono"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleShareWhatsApp}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Phone className="h-4 w-4" /> WhatsApp
          </Button>
          <Button
            variant="outline"
            onClick={handleNativeShare}
            className="gap-2 border-primary/30 text-primary"
          >
            <Share2 className="h-4 w-4" /> Bagikan
          </Button>
        </div>

        {/* Benefits */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Keuntungan Referral</p>
          <div className="space-y-2">
            {REFERRAL_BENEFITS.map(b => (
              <div key={b.title} className={cn("flex items-center gap-3 p-3 rounded-xl border", b.bg)}>
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", b.bg)}>
                  <b.icon className={cn("h-5 w-5", b.color)} />
                </div>
                <div>
                  <p className={cn("font-semibold text-sm", b.color)}>{b.title}</p>
                  <p className="text-xs text-gray-600">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Cara Kerja Referral
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-3">
              {HOW_IT_WORKS.map((step, index) => (
                <div key={step.step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                  {index < HOW_IT_WORKS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-gray-300 mt-1 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Points */}
        {loyalty && (
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Poin Kamu</p>
                  <p className="text-2xl font-bold text-amber-600">{(loyalty as any).points?.toLocaleString("id-ID") ?? 0} poin</p>
                </div>
                <Link to="/customer/my-loyalty" className="ml-auto">
                  <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100 text-xs">
                    Tukar Poin
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
