import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

export function WhatsAppWidget() {
  const { data: settings } = useWebsiteSettings();
  
  const handleWhatsAppClick = () => {
    const phone = settings?.phone?.replace(/\D/g, '') || '6281234567890';
    const message = encodeURIComponent("Halo, saya ingin bertanya tentang paket umroh.");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleWhatsAppClick}
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white"
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
    </div>
  );
}
