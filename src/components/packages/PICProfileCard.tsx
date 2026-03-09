import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Mail, MapPin, Star, User, Phone 
} from "lucide-react";

interface PICProfileCardProps {
  picId?: string;
  picName?: string;
  picPhone?: string;
  picWhatsapp?: string;
  picEmail?: string;
  picAvatarUrl?: string;
  picSpecialization?: string;
  picLocation?: string;
  picDescription?: string;
}

export function PICProfileCard({
  picId,
  picName = "Tim Kami",
  picPhone,
  picWhatsapp,
  picEmail,
  picAvatarUrl,
  picSpecialization,
  picLocation,
  picDescription,
}: PICProfileCardProps) {
  if (!picId && !picName) {
    return null;
  }

  const handleWhatsAppChat = () => {
    if (!picWhatsapp) return;
    
    const message = encodeURIComponent(
      "Halo, saya ingin bertanya tentang paket umroh Anda."
    );
    const whatsappNumber = picWhatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  const handleEmailClick = () => {
    if (!picEmail) return;
    window.location.href = `mailto:${picEmail}`;
  };

  const handlePhoneClick = () => {
    if (!picPhone) return;
    window.location.href = `tel:${picPhone.replace(/\D/g, "")}`;
  };

  return (
    <Card className="border-primary/20 hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with Avatar */}
          <div className="flex items-start gap-4">
            {picAvatarUrl ? (
              <img
                src={picAvatarUrl}
                alt={picName}
                className="h-16 w-16 rounded-full object-cover bg-muted flex-shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{picName}</h3>
              {picSpecialization && (
                <p className="text-sm text-muted-foreground">{picSpecialization}</p>
              )}
              {picLocation && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  {picLocation}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {picDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {picDescription}
            </p>
          )}

          {/* Contact Info */}
          <div className="space-y-2 pt-2 border-t">
            {picPhone && (
              <button
                onClick={handlePhoneClick}
                className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors text-left"
              >
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{picPhone}</span>
              </button>
            )}
            {picEmail && (
              <button
                onClick={handleEmailClick}
                className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors text-left"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{picEmail}</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {picWhatsapp && (
              <Button
                onClick={handleWhatsAppChat}
                className="flex-1 gap-2"
                size="sm"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </Button>
            )}
            {picEmail && (
              <Button
                onClick={handleEmailClick}
                variant="outline"
                className="flex-1 gap-2"
                size="sm"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </Button>
            )}
          </div>

          {/* Badge */}
          <Badge variant="secondary" className="w-full justify-center">
            <Star className="h-3 w-3 mr-1" />
            Person in Charge
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
