import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Share2, QrCode, User, Plane, Hotel, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function JamaahDigitalID() {
  const { user } = useAuth();

  // Fetch customer data
  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch active booking with departure
  const { data: booking } = useQuery({
    queryKey: ["jamaah-booking-detail", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          departure:departures(
            *,
            package:packages(*),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(*),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(*)
          )
        `)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  // Fetch QR Code
  const { data: qrCode } = useQuery({
    queryKey: ["jamaah-qr", customer?.id, booking?.departure_id],
    queryFn: async () => {
      if (!customer?.id || !booking?.departure_id) return null;
      const { data, error } = await supabase
        .from("jamaah_qr_codes")
        .select("*")
        .eq("customer_id", customer.id)
        .eq("departure_id", booking.departure_id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id && !!booking?.departure_id,
  });

  const departure = booking?.departure;

  // Generate QR code URL (using a public QR service)
  const qrCodeUrl = qrCode?.qr_code_data 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode.qr_code_data)}`
    : null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Digital ID Jamaah",
          text: `ID Jamaah: ${customer?.full_name}\nBooking: ${booking?.booking_code}`,
        });
      } catch (err) {
      }
    }
  };

  const handleDownload = () => {
    if (qrCodeUrl) {
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `digital-id-${customer?.full_name?.replace(/\s+/g, "-")}.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold">Digital ID</h1>
            <p className="text-xs opacity-80">Kartu Identitas Digital Jamaah</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ID Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs opacity-80">KARTU IDENTITAS JAMAAH</p>
                <p className="text-lg font-bold">{booking?.booking_code || "---"}</p>
              </div>
              <Badge className="bg-primary-foreground/20 text-primary-foreground">
                {booking?.room_type || "---"}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-primary-foreground/20">
                <AvatarImage src={customer?.photo_url || ""} />
                <AvatarFallback className="bg-primary-foreground/10 text-2xl">
                  {customer?.full_name?.[0] || "J"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{customer?.full_name || "Jamaah"}</h2>
                <p className="text-sm opacity-80">{customer?.nik || "NIK: ---"}</p>
                <p className="text-sm opacity-80">
                  {customer?.passport_number ? `Passport: ${customer.passport_number}` : "Passport: ---"}
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-4 space-y-4">
            {/* QR Code */}
            <div className="flex flex-col items-center py-4">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-48 h-48 border rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Scan untuk verifikasi identitas
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Data Pribadi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Tanggal Lahir</p>
                <p className="font-medium">
                  {customer?.birth_date 
                    ? format(new Date(customer.birth_date), "dd MMMM yyyy", { locale: id })
                    : "---"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Jenis Kelamin</p>
                <p className="font-medium">
                  {customer?.gender === "male" ? "Laki-laki" : customer?.gender === "female" ? "Perempuan" : "---"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Golongan Darah</p>
                <p className="font-medium">{customer?.blood_type || "---"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telepon</p>
                <p className="font-medium">{customer?.phone || "---"}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-muted-foreground text-sm">Kontak Darurat</p>
              <p className="font-medium">{customer?.emergency_contact_name || "---"}</p>
              <p className="text-sm text-muted-foreground">
                {customer?.emergency_contact_phone || "---"} 
                {customer?.emergency_contact_relation && ` (${customer.emergency_contact_relation})`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trip Info */}
        {departure && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Info Perjalanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-muted-foreground text-sm">Paket</p>
                <p className="font-medium">{departure.package?.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Keberangkatan</p>
                  <p className="font-medium">
                    {format(new Date(departure.departure_date), "dd MMM yyyy", { locale: id })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kepulangan</p>
                  <p className="font-medium">
                    {format(new Date(departure.return_date), "dd MMM yyyy", { locale: id })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Hotel className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Hotel Makkah</p>
                    <p className="text-sm text-muted-foreground">{departure.hotel_makkah?.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Hotel className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Hotel Madinah</p>
                    <p className="text-sm text-muted-foreground">{departure.hotel_madinah?.name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}