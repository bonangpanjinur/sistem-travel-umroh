import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const defaultFooterLinks = {
  layanan: [
    { href: '/packages', label: 'Paket Umroh' },
    { href: '/departures', label: 'Jadwal Keberangkatan' },
    { href: '/savings', label: 'Tabungan Umroh' },
  ],
  informasi: [
    { href: '/about', label: 'Tentang Kami' },
    { href: '/faq', label: 'FAQ' },
    { href: '/terms', label: 'Syarat & Ketentuan' },
    { href: '/privacy', label: 'Kebijakan Privasi' },
  ],
  panduan: [
    { href: '/contact', label: 'Hubungi Kami' },
  ],
};

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

interface DynamicFooterProps {
  tenantSettings?: import('@/hooks/useWebsiteSettings').WebsiteSettings | null;
}

export function DynamicFooter({ tenantSettings }: DynamicFooterProps = {}) {
  const { data: mainSettings } = useWebsiteSettings();
  const settings = tenantSettings || mainSettings;
  
  const companyName = settings?.company_name || 'UmrohTravel';
  const tagline = settings?.tagline || 'Perjalanan Suci Anda';
  const logoUrl = settings?.logo_url;
  const address = settings?.footer_address || 'Jl. Masjid Raya No. 123, Jakarta Pusat 10110';
  const phone = settings?.footer_phone || '0800-123-4567';
  const email = settings?.footer_email || 'info@umrohtravel.com';
  const whatsapp = settings?.footer_whatsapp;
  const instagram = settings?.social_instagram;
  const facebook = settings?.social_facebook;
  const youtube = settings?.social_youtube;
  const tiktok = settings?.social_tiktok;
  const footerDescription = settings?.footer_description || 'Melayani perjalanan ibadah Umroh dan Haji dengan pengalaman bertahun-tahun.';
  const footerBottomText = settings?.footer_bottom_text || 'Izin Resmi Kemenag RI';
  const footerLinks = settings?.footer_links || defaultFooterLinks;

  // Get footer layout settings from custom_sections
  const customSections = (settings as any)?.custom_sections;
  const footerLayout = customSections?.footerLayout || 'full';
  const footerShowSocial = customSections?.footerShowSocial ?? true;
  const footerShowContact = customSections?.footerShowContact ?? true;
  const footerShowLinks = customSections?.footerShowLinks ?? true;
  const footerCopyrightText = customSections?.footerCopyrightText;

  const currentYear = new Date().getFullYear();
  const bottomText = footerCopyrightText || footerBottomText;

  const renderSocialIcons = () => {
    if (!footerShowSocial) return null;
    const hasSocial = facebook || instagram || youtube || tiktok;
    return (
      <div className="flex gap-4">
        {facebook && (
          <a href={facebook} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground">
            <Facebook className="h-5 w-5" />
          </a>
        )}
        {instagram && (
          <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground">
            <Instagram className="h-5 w-5" />
          </a>
        )}
        {youtube && (
          <a href={youtube} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground">
            <Youtube className="h-5 w-5" />
          </a>
        )}
        {tiktok && (
          <a href={tiktok} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground transition-colors hover:bg-sidebar-primary hover:text-sidebar-primary-foreground">
            <TikTokIcon className="h-5 w-5" />
          </a>
        )}
        {!hasSocial && (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"><Facebook className="h-5 w-5" /></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"><Instagram className="h-5 w-5" /></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground"><Youtube className="h-5 w-5" /></div>
          </>
        )}
      </div>
    );
  };

  const renderContactInfo = () => {
    if (!footerShowContact) return null;
    return (
      <div className="mt-6 space-y-2">
        <a href={`tel:${phone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">
          <Phone className="h-4 w-4" />{phone}
        </a>
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
        )}
        <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-primary">
          <Mail className="h-4 w-4" />{email}
        </a>
        <div className="flex items-start gap-2 text-sm text-sidebar-foreground/70">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />{address}
        </div>
      </div>
    );
  };

  // Minimal layout - just copyright bar
  if (footerLayout === 'minimal') {
    return (
      <footer className="bg-sidebar text-sidebar-foreground">
        <div className="border-t border-sidebar-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-sidebar-foreground/70 md:flex-row md:text-left">
              <p>© {currentYear} {companyName}. Semua hak dilindungi.</p>
              <p>{bottomText}</p>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Simple layout - brand + contact + social only
  if (footerLayout === 'simple') {
    return (
      <footer className="bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-center text-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-10 w-auto object-contain brightness-0 invert" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <span className="font-display text-xl font-bold">ع</span>
                </div>
              )}
              <div className="text-left">
                <h2 className="text-lg font-bold">{companyName}</h2>
                <p className="text-xs text-sidebar-foreground/70">{tagline}</p>
              </div>
            </Link>
            <p className="max-w-md text-sm text-sidebar-foreground/70">{footerDescription}</p>
            {renderContactInfo()}
            <div className="mt-2">{renderSocialIcons()}</div>
          </div>
        </div>
        <div className="border-t border-sidebar-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-sidebar-foreground/70 md:flex-row md:text-left">
              <p>© {currentYear} {companyName}. Semua hak dilindungi.</p>
              <p>{bottomText}</p>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Full layout (default)
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-10 w-auto object-contain brightness-0 invert" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <span className="font-display text-xl font-bold">ع</span>
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold">{companyName}</h2>
                <p className="text-xs text-sidebar-foreground/70">{tagline}</p>
              </div>
            </Link>
            <p className="mt-4 max-w-md text-sm text-sidebar-foreground/70">{footerDescription}</p>
            {renderContactInfo()}
            <div className="mt-6">{renderSocialIcons()}</div>
          </div>

          {/* Links */}
          {footerShowLinks && (
            <>
              <div>
                <h3 className="mb-4 font-semibold">Layanan</h3>
                <ul className="space-y-2">
                  {footerLinks.layanan?.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className="text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-primary">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-4 font-semibold">Informasi</h3>
                <ul className="space-y-2">
                  {footerLinks.informasi?.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className="text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-primary">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-4 font-semibold">Panduan</h3>
                <ul className="space-y-2">
                  {footerLinks.panduan?.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className="text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-primary">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-sidebar-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-sidebar-foreground/70 md:flex-row md:text-left">
            <p>© {currentYear} {companyName}. Semua hak dilindungi.</p>
            <p>{bottomText}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
