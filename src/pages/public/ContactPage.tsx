import { useState } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useContactPageContent } from '@/hooks/useContactPageContent';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { extractIframeUrl, getGoogleMapsDirectionsUrl } from '@/lib/utils';
import { 
  MapPin, Phone, Mail, Clock, Send, MessageCircle,
  Facebook, Instagram, Youtube, MessageSquare, ExternalLink
} from 'lucide-react';

export default function ContactPage() {
  const { data: settings, isLoading: settingsLoading } = useWebsiteSettings();
  const { data: contactContent, isLoading: contactLoading } = useContactPageContent('00000000-0000-0000-0000-000000000001');
  const { toast } = useToast();
  const isLoading = settingsLoading || contactLoading;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Pesan Terkirim',
      description: 'Terima kasih! Tim kami akan segera menghubungi Anda.',
    });
    
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-12 w-64 mx-auto" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DynamicPublicLayout>
    );
  }

  const companyName = settings?.company_name || '';
  const phone = settings?.footer_phone || '';
  const email = settings?.footer_email || '';
  const address = settings?.footer_address || '';
  const whatsapp = settings?.footer_whatsapp || phone;
  const socialLinks = {
    facebook: settings?.social_facebook,
    instagram: settings?.social_instagram,
    youtube: settings?.social_youtube,
    tiktok: settings?.social_tiktok,
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Alamat Kantor',
      content: address,
      action: null,
      show: !!address
    },
    {
      icon: Phone,
      title: 'Telepon',
      content: phone,
      action: phone ? `tel:${phone.replace(/\s/g, '')}` : null,
      show: !!phone
    },
    {
      icon: Mail,
      title: 'Email',
      content: email,
      action: email ? `mailto:${email}` : null,
      show: !!email
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      content: whatsapp,
      action: whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : null,
      show: !!whatsapp
    },
  ].filter(info => info.show);

  const socialIcons: Record<string, typeof Facebook> = {
    facebook: Facebook,
    instagram: Instagram,
    youtube: Youtube,
    tiktok: MessageSquare,
  };

  return (
    <DynamicPublicLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <MessageCircle className="h-3 w-3 mr-1" />
              Hubungi Kami
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {contactContent?.hero_title || ''}
            </h1>
            <p className="text-lg text-muted-foreground">
              {contactContent?.hero_subtitle || ''}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    {contactContent?.form_title || ''}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap *</Label>
                        <Input
                          id="name"
                          placeholder="Masukkan nama Anda"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">No. Telepon</Label>
                        <Input
                          id="phone"
                          placeholder="08xxxxxxxxxx"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subjek *</Label>
                        <Input
                          id="subject"
                          placeholder="Topik pesan Anda"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Pesan *</Label>
                      <Textarea
                        id="message"
                        placeholder="Tulis pesan Anda di sini..."
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>Mengirim...</>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Kirim Pesan
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              {/* Contact Cards */}
              {contactInfo.map((info, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                        <info.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{info.title}</h3>
                        {info.action ? (
                          <a 
                            href={info.action}
                            target={info.action.startsWith('http') ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {info.content}
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">{info.content}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Operating Hours */}
              {contactContent?.operating_hours && contactContent.operating_hours.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-2">Jam Operasional</h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {contactContent.operating_hours.map((hour: any, index: number) => (
                            <p key={index}>{hour.label}: {hour.value}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Social Media */}
              {Object.values(socialLinks).some(link => !!link) && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3">Ikuti Kami</h3>
                    <div className="flex gap-3">
                      {Object.entries(socialLinks).map(([platform, url]) => {
                        const Icon = socialIcons[platform] || MessageSquare;
                        return url ? (
                          <a
                            key={platform}
                            href={url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <Icon className="h-5 w-5" />
                          </a>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* WhatsApp CTA */}
              {whatsapp && (
                <Button asChild className="w-full" size="lg">
                  <a 
                    href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=Halo, saya ingin bertanya tentang paket umroh`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Chat via WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      {contactContent?.map_url && (
        <section className="py-8 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Lokasi Kami
                </h2>
                <Button asChild variant="outline" size="sm">
                  <a 
                    href={getGoogleMapsDirectionsUrl(contactContent.map_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Petunjuk Arah (Buka Maps)
                  </a>
                </Button>
              </div>
              <div className="relative group">
                <iframe
                  src={extractIframeUrl(contactContent.map_url)}
                  width="100%"
                  height="400"
                  style={{ border: 0, borderRadius: '0.5rem' }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="shadow-sm"
                />
                <a 
                  href={getGoogleMapsDirectionsUrl(contactContent.map_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center"
                  title="Klik untuk membuka di Google Maps"
                >
                  <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-sm font-medium text-primary">
                    <MapPin className="h-4 w-4" />
                    Buka di Google Maps
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </DynamicPublicLayout>
  );
}
