import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Share2,
  MessageCircle,
  Download,
  Copy,
  CheckCircle2,
  Loader2,
  Facebook,
  Twitter,
} from 'lucide-react';
import {
  generateWhatsAppMessage,
  generateWhatsAppShareUrl,
  copyToClipboard,
  downloadFlyer,
  shareToSocialMedia,
  getLowestPackagePrice,
  PackageMarketingData,
} from '@/lib/marketing-utils';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PackageMarketingActionsProps {
  pkg: PackageMarketingData;
  companyPhone?: string;
  companyName?: string;
  bookingUrl?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function PackageMarketingActions({
  pkg,
  companyPhone = '62812345678',
  companyName = 'Vins Tour Travel',
  bookingUrl,
  variant = 'outline',
  size = 'sm',
  className,
}: PackageMarketingActionsProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState(
    generateWhatsAppMessage(pkg, bookingUrl, companyName)
  );
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyWhatsAppMessage = async () => {
    const copied = await copyToClipboard(whatsappMessage);
    if (copied) {
      setIsCopied(true);
      toast.success('Pesan disalin ke clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast.error('Gagal menyalin pesan');
    }
  };

  const handleShareWhatsApp = () => {
    const url = generateWhatsAppShareUrl(companyPhone, whatsappMessage);
    window.open(url, '_blank');
    toast.success('Membuka WhatsApp...');
  };

  const handleDownloadFlyer = async () => {
    setIsGeneratingFlyer(true);
    try {
      await downloadFlyer(pkg);
      toast.success('Flyer berhasil diunduh');
    } catch (error) {
      console.error('Error downloading flyer:', error);
      toast.error('Gagal mengunduh flyer');
    } finally {
      setIsGeneratingFlyer(false);
    }
  };

  const handleShareSocial = (platform: 'facebook' | 'twitter' | 'linkedin') => {
    const lowestPrice = getLowestPackagePrice(pkg);
    const priceText = lowestPrice > 0 ? formatCurrency(lowestPrice) : 'Hubungi Kami';
    const shareText = `Cek paket umroh ${pkg.name} mulai dari ${priceText}! Hubungi ${companyName} untuk info lebih lanjut.`;
    
    shareToSocialMedia(platform, bookingUrl || window.location.href, pkg.name, shareText);
    toast.success(`Membuka ${platform}...`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn('gap-2 rounded-xl', className)}
          >
            <Share2 className="h-4 w-4" />
            {size !== 'icon' && 'Bagikan'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl w-56">
          <DropdownMenuItem
            onClick={handleShareWhatsApp}
            className="gap-2 cursor-pointer rounded-lg"
          >
            <MessageCircle className="h-4 w-4 text-green-600" />
            <span>Bagikan ke WhatsApp</span>
          </DropdownMenuItem>

          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsShareDialogOpen(true);
                }}
                className="gap-2 cursor-pointer rounded-lg"
              >
                <Copy className="h-4 w-4 text-blue-600" />
                <span>Salin Teks Promosi</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-2xl">
              <DialogHeader>
                <DialogTitle>Teks Promosi WhatsApp</DialogTitle>
                <DialogDescription>
                  Salin dan bagikan teks ini ke WhatsApp atau media sosial lainnya
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  className="min-h-64 font-mono text-sm rounded-xl"
                  placeholder="Pesan promosi..."
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyWhatsAppMessage}
                    className="flex-1 gap-2 rounded-xl"
                    variant={isCopied ? 'default' : 'outline'}
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Salin Pesan
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleShareWhatsApp}
                    className="flex-1 gap-2 rounded-xl bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Buka WhatsApp
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleDownloadFlyer}
            disabled={isGeneratingFlyer}
            className="gap-2 cursor-pointer rounded-lg"
          >
            {isGeneratingFlyer ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Membuat Flyer...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-purple-600" />
                <span>Unduh Flyer</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleShareSocial('facebook')}
            className="gap-2 cursor-pointer rounded-lg"
          >
            <Facebook className="h-4 w-4 text-blue-600" />
            <span>Bagikan ke Facebook</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleShareSocial('twitter')}
            className="gap-2 cursor-pointer rounded-lg"
          >
            <Twitter className="h-4 w-4 text-sky-500" />
            <span>Bagikan ke Twitter</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
