import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, MessageCircle, UserCheck, Zap, Clock 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingOptionsCardProps {
  packageId: string;
  picName?: string;
  picWhatsapp?: string;
  onOnlineBooking: () => void;
  onPICBooking?: () => void;
}

export function BookingOptionsCard({
  packageId,
  picName,
  picWhatsapp,
  onOnlineBooking,
  onPICBooking,
}: BookingOptionsCardProps) {
  const [selectedOption, setSelectedOption] = useState<"online" | "pic" | null>(null);

  const handleWhatsAppChat = () => {
    if (!picWhatsapp) return;
    
    const message = encodeURIComponent(
      `Halo, saya ingin berkonsultasi tentang paket umroh. Bisa membantu saya?`
    );
    const whatsappNumber = picWhatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
    onPICBooking?.();
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Pilih Cara Pemesanan
        </CardTitle>
        <CardDescription>
          Lanjutkan pemesanan secara mandiri atau konsultasi dengan tim kami
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Online Booking Option */}
        <button
          onClick={() => {
            setSelectedOption("online");
            onOnlineBooking();
          }}
          className={cn(
            "w-full p-4 border-2 rounded-lg transition-all text-left hover:border-primary hover:bg-primary/5",
            selectedOption === "online" ? "border-primary bg-primary/5" : "border-muted"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Booking Online Langsung</h3>
                <Badge variant="secondary" className="text-xs">Cepat</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Isi form pemesanan dan lanjutkan pembayaran dengan mudah. Proses otomatis dan instan.
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Selesai dalam 5-10 menit</span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
          </div>
        </button>

        {/* PIC Consultation Option */}
        {picName && picWhatsapp && (
          <button
            onClick={() => {
              setSelectedOption("pic");
              handleWhatsAppChat();
            }}
            className={cn(
              "w-full p-4 border-2 rounded-lg transition-all text-left hover:border-primary hover:bg-primary/5",
              selectedOption === "pic" ? "border-primary bg-primary/5" : "border-muted"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Konsultasi dengan {picName}</h3>
                  <Badge variant="secondary" className="text-xs">Personal</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Chat langsung dengan tim kami untuk konsultasi gratis. Dapatkan rekomendasi paket yang sesuai dengan kebutuhan Anda.
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <MessageCircle className="h-3 w-3" />
                  <span>Respons dalam beberapa menit</span>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
            </div>
          </button>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <p className="font-medium mb-1">💡 Pilihan Terbaik</p>
          <p>
            Jika Anda ragu atau ingin mendapatkan penawaran khusus, hubungi tim kami melalui WhatsApp untuk konsultasi gratis.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Perbandingan</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kecepatan</span>
              <div className="flex gap-2">
                <span className="text-green-600">⚡ Online</span>
                <span className="text-amber-600">🤝 Konsultasi</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Personalisasi</span>
              <div className="flex gap-2">
                <span className="text-amber-600">Standar</span>
                <span className="text-green-600">✓ Tinggi</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Support</span>
              <div className="flex gap-2">
                <span className="text-amber-600">Email</span>
                <span className="text-green-600">✓ Direct</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
