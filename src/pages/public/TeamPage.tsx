import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, Mail, MapPin, User, Phone, Award, Building2 
} from "lucide-react";

interface TeamMember {
  id: string;
  agent_code: string;
  company_name: string;
  avatar_url?: string;
  specialization?: string;
  location?: string;
  description?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}

export default function TeamPage() {
  const { data: settings, isLoading: settingsLoading } = useWebsiteSettings();

  // Fetch team members (PICs)
  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select(`
          id,
          agent_code,
          company_name,
          avatar_url,
          specialization,
          location,
          description,
          is_active,
          bank_account_number
        `)
        .eq("is_pic", true)
        .eq("is_active", true)
        .order("location", { ascending: true });

      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const isLoading = settingsLoading || teamLoading;
  const companyName = settings?.company_name || "UmrohTravel";

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-48 w-full" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </DynamicPublicLayout>
    );
  }

  return (
    <DynamicPublicLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Building2 className="h-3 w-3 mr-1" />
              Tim Kami
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Tim Profesional {companyName}
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Bertemu dengan tim berpengalaman kami yang siap membantu perjalanan ibadah Anda
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Setiap anggota tim kami memiliki pengalaman bertahun-tahun dalam industri perjalanan umroh dan haji, 
              berkomitmen memberikan pelayanan terbaik untuk kenyamanan dan keamanan Anda.
            </p>
          </div>
        </div>
      </section>

      {/* Team Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {teamMembers && teamMembers.length > 0 ? (
            <>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">
                  {teamMembers.length} Anggota Tim
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Profesional berpengalaman siap membantu Anda merencanakan perjalanan ibadah yang sempurna
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {teamMembers.map((member) => (
                  <TeamMemberCard key={member.id} member={member} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Tim Belum Tersedia</h3>
              <p className="text-muted-foreground">
                Tim kami sedang diperbarui. Silakan hubungi kami untuk informasi lebih lanjut.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Hubungi Tim Kami</h2>
            <p className="text-muted-foreground mb-8">
              Tidak menemukan orang yang tepat? Hubungi kami melalui berbagai channel yang tersedia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="/contact">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Hubungi Kami
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/packages">
                  <Award className="h-5 w-5 mr-2" />
                  Lihat Paket
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </DynamicPublicLayout>
  );
}

interface TeamMemberCardProps {
  member: TeamMember;
}

function TeamMemberCard({ member }: TeamMemberCardProps) {
  const whatsapp = member.bank_account_number; // Placeholder as per migration
  
  const handleWhatsAppChat = () => {
    if (!whatsapp) return;
    
    const message = encodeURIComponent(
      "Halo, saya ingin bertanya tentang paket umroh Anda."
    );
    const whatsappNumber = whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
  };

  const handleEmailClick = () => {
    if (!member.email) return;
    window.location.href = `mailto:${member.email}`;
  };

  const handlePhoneClick = () => {
    if (!member.phone) return;
    window.location.href = `tel:${member.phone.replace(/\D/g, "")}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <CardContent className="p-0">
        {/* Avatar Section */}
        <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.company_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-24 w-24 text-muted-foreground opacity-50" />
          )}
          {member.specialization && (
            <Badge className="absolute top-3 right-3">
              {member.specialization}
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-4">
          {/* Name & Location */}
          <div>
            <h3 className="text-lg font-semibold">{member.company_name}</h3>
            <p className="text-sm text-muted-foreground">
              Kode Agen: {member.agent_code}
            </p>
            {member.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <MapPin className="h-4 w-4" />
                {member.location}
              </div>
            )}
          </div>

          {/* Description */}
          {member.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {member.description}
            </p>
          )}

          {/* Contact Info */}
          <div className="space-y-2 pt-2 border-t">
            {member.phone && (
              <button
                onClick={handlePhoneClick}
                className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors text-left"
              >
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{member.phone}</span>
              </button>
            )}
            {member.email && (
              <button
                onClick={handleEmailClick}
                className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors text-left"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{member.email}</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {whatsapp && (
              <Button
                onClick={handleWhatsAppChat}
                className="flex-1 gap-2"
                size="sm"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Chat</span>
              </Button>
            )}
            {member.email && (
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
        </div>
      </CardContent>
    </Card>
  );
}
