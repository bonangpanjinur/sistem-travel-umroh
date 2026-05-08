import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface WhatsAppSettings {
  enabled: boolean;
  phone_number: string;
  message: string;
  position: "bottom-right" | "bottom-left";
}

export function WhatsAppWidget() {
  const { data: settings } = useWebsiteSettings();
  const [localSettings, setLocalSettings] = useState<WhatsAppSettings>({
    enabled: true,
    phone_number: "",
    message: "Halo! Ada yang bisa saya bantu?",
    position: "bottom-right",
  });

  useEffect(() => {
    const stored = localStorage.getItem("whatsapp_button_settings");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLocalSettings(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (e) {
        console.error("Failed to parse whatsapp settings", e);
      }
    }
  }, []);

  // Use phone number from database if available, otherwise from localStorage
  const whatsappNumber = settings?.footer_whatsapp || settings?.footer_phone || localSettings.phone_number;

  if (!localSettings.enabled || !whatsappNumber) {
    return null;
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      return "62" + cleaned.substring(1);
    }
    if (!cleaned.startsWith("62") && cleaned.length > 0) {
      return "62" + cleaned;
    }
    return cleaned;
  };

  const handleWhatsAppClick = () => {
    const formattedPhone = formatPhoneNumber(whatsappNumber);
    const message = encodeURIComponent(localSettings.message);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
  };

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
  };

  return (
    <div className={`fixed ${positionClasses[localSettings.position]} z-50`}>
      <Button
        onClick={handleWhatsAppClick}
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg bg-green-500 hover:bg-green-600 text-white transition-transform hover:scale-110"
        title="Chat WhatsApp"
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
    </div>
  );
}
