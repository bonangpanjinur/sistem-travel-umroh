import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/hooks/useDarkMode";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import JamaahPrivateGate from "@/components/auth/JamaahPrivateGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Loader2, User, Phone, Mail, CreditCard,
  MapPin, Calendar, Shield, Bell, Moon, Sun, LogOut,
  ChevronRight, Edit3, Key, FileText, Heart, Info
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/format";

function InfoRow({ icon: Icon, label, value, className = "" }: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 py-2.5 ${className}`}>
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5 break-words">{value || <span className="text-muted-foreground italic">Belum diisi</span>}</p>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, to, onClick, danger = false, badge }: {
  icon: React.ElementType;
  label: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
  badge?: string;
}) {
  const cls = `flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-muted/60 transition-colors ${danger ? "text-destructive" : "text-foreground"}`;
  const content = (
    <>
      <Icon className={`h-4 w-4 shrink-0 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
      <ChevronRight className={`h-4 w-4 ${danger ? "text-destructive/60" : "text-muted-foreground/60"}`} />
    </>
  );
  if (to) return <Link to={to} className={cls}>{content}</Link>;
  return <button className={cls} onClick={onClick}>{content}</button>;
}

export default function JamaahProfil() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking } = useQuery({
    queryKey: ["jamaah-booking", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_code, booking_status, total_price, paid_amount, departure:departures(departure_date, package:packages(name))")
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.id,
  });

  const handlePhotoUpload = async (file: File) => {
    if (!customer?.id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran foto maks 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${customer.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("customer-documents").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("customer-documents").getPublicUrl(path);
      await supabase.from("customers").update({ photo_url: urlData.publicUrl }).eq("id", customer.id);
      queryClient.invalidateQueries({ queryKey: ["jamaah-customer"] });
      toast.success("Foto profil diperbarui!");
    } catch (err: any) {
      toast.error(err.message || "Gagal upload foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/jamaah", { replace: true });
  };

  const firstName = customer?.full_name?.split(" ")[0] || "Jamaah";
  const initials = customer?.full_name
    ? customer.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "J";

  return (
    <JamaahPrivateGate>
      <div className="min-h-screen bg-gray-50 dark:bg-background pb-24 md:pb-6">
        <JamaahBottomNav />

        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
          <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
            <Link to="/jamaah" className="p-1.5 rounded-lg hover:bg-muted transition-colors -ml-1">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-bold text-base">Profil & Akun</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto md:ml-64 py-4 space-y-4 px-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Profile hero */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-primary to-primary/70 px-4 pt-6 pb-10" />
                <CardContent className="relative px-4 pb-4">
                  {/* Avatar — overlapping the gradient */}
                  <div className="flex items-end gap-4 -mt-10 mb-3">
                    <div className="relative">
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        className="relative group"
                        title="Ganti foto profil"
                      >
                        <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                          <AvatarImage src={customer?.photo_url || ""} />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                            {uploadingPhoto ? <Loader2 className="h-6 w-6 animate-spin" /> : initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="h-5 w-5 text-white" />
                        </div>
                      </button>
                      <input
                        ref={photoInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }}
                      />
                    </div>
                    <div className="pb-1">
                      <h2 className="font-bold text-lg leading-snug">{customer?.full_name || "—"}</h2>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      {booking && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          {booking.booking_code}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Booking summary strip */}
                  {booking && (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground">Paket Aktif</p>
                          <p className="font-semibold mt-0.5 line-clamp-1">{(booking as any).departure?.package?.name || "—"}</p>
                        </div>
                        <Link to="/jamaah/booking" className="text-primary font-semibold flex items-center gap-0.5 shrink-0 ml-2">
                          Detail <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Personal data */}
              <Card>
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Data Diri
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 divide-y divide-border/50">
                  <InfoRow icon={User} label="Nama Lengkap" value={customer?.full_name} />
                  <InfoRow icon={Phone} label="Nomor HP" value={customer?.phone} />
                  <InfoRow icon={Mail} label="Email" value={user?.email} />
                  <InfoRow icon={MapPin} label="Alamat" value={customer?.address} />
                  <InfoRow icon={CreditCard} label="NIK / No. KTP" value={customer?.nik} />
                  <InfoRow icon={FileText} label="No. Passport" value={customer?.passport_number} />
                  {customer?.passport_expiry && (
                    <InfoRow
                      icon={Calendar}
                      label="Masa Berlaku Passport"
                      value={format(new Date(customer.passport_expiry), "dd MMMM yyyy", { locale: id })}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Quick links */}
              <Card className="overflow-hidden divide-y divide-border/40">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm">Menu Cepat</CardTitle>
                </CardHeader>
                <NavItem icon={FileText} label="Dokumen Saya" to="/jamaah/documents" />
                <NavItem icon={Shield} label="Tracker Visa" to="/jamaah/visa" />
                <NavItem icon={Heart} label="Profil Kesehatan" to="/jamaah/kesehatan" />
                <NavItem icon={CreditCard} label="Riwayat Pembayaran" to="/jamaah/payment-history" />
                <NavItem icon={Bell} label="Notifikasi" to="/jamaah/notifications" />
              </Card>

              {/* Settings */}
              <Card className="overflow-hidden divide-y divide-border/40">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm">Pengaturan</CardTitle>
                </CardHeader>
                <div className="flex items-center gap-3 w-full px-4 py-3.5">
                  {isDark ? <Moon className="h-4 w-4 text-muted-foreground shrink-0" /> : <Sun className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="flex-1 text-sm font-medium">{isDark ? "Mode Gelap" : "Mode Terang"}</span>
                  <button
                    onClick={toggleDark}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isDark ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </div>
              </Card>

              {/* Danger zone */}
              <Card className="overflow-hidden divide-y divide-border/40">
                <NavItem icon={Info} label="Tentang Aplikasi" to="/jamaah/chatbot" />
                <NavItem icon={LogOut} label="Keluar Akun" onClick={handleLogout} danger />
              </Card>

              <p className="text-center text-[11px] text-muted-foreground pb-2">
                Vinstour Travel Portal Jamaah · v1.0
              </p>
            </>
          )}
        </div>
      </div>
    </JamaahPrivateGate>
  );
}
