import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface FloatingWhatsAppButtonProps {
  settings?: WebsiteSettings | null;
  enabled?: boolean;
  phoneNumber?: string;
  message?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export function FloatingWhatsAppButton({
  settings,
  enabled = true,
  phoneNumber,
  message = "Halo! Ada yang bisa saya bantu?",
  position = 'bottom-right',
}: FloatingWhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Get phone number from settings or props
  const whatsappNumber = phoneNumber || settings?.footer_whatsapp || '';
  
  // Get custom message from localStorage if available
  const [customMessage, setCustomMessage] = useState(message);

  useEffect(() => {
    const stored = localStorage.getItem("whatsapp_button_settings");
    if (stored) {
      const settings = JSON.parse(stored);
      setCustomMessage(settings.message || message);
    }
  }, [message]);

  if (!enabled || !whatsappNumber || !isVisible) {
    return null;
  }

  // Format phone number for WhatsApp (remove non-digits, add country code if needed)
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return '62' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('62')) {
      return '62' + cleaned;
    }
    return cleaned;
  };

  const formattedPhone = formatPhoneNumber(whatsappNumber);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(customMessage)}`;

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <>
      {/* Main Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed ${positionClasses[position]} z-40 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group`}
        title="Chat dengan kami di WhatsApp"
        aria-label="Chat dengan kami di WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
          Chat dengan kami
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      </a>

      {/* Close Button (for mobile/accessibility) */}
      <button
        onClick={() => setIsVisible(false)}
        className={`fixed ${positionClasses[position]} z-30 flex items-center justify-center w-5 h-5 rounded-full bg-gray-400 hover:bg-gray-500 text-white text-xs opacity-0 hover:opacity-100 transition-opacity duration-300`}
        style={{
          bottom: 'calc(1.5rem + 3.5rem)',
          right: position === 'bottom-right' ? '1.5rem' : 'auto',
          left: position === 'bottom-left' ? '1.5rem' : 'auto',
        }}
        title="Sembunyikan tombol WhatsApp"
        aria-label="Sembunyikan tombol WhatsApp"
      >
        <X className="h-3 w-3" />
      </button>
    </>
  );
}
