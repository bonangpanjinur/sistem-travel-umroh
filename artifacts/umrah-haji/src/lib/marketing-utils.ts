/**
 * Marketing Utilities for Package Promotion
 * Includes WhatsApp sharing, flyer generation, and promotional content
 */

import { formatCurrency, formatDate } from './format';

export interface PackageMarketingData {
  id: string;
  code: string;
  name: string;
  description?: string;
  duration_days: number;
  featured_image?: string;
  price_quad?: number;
  price_triple?: number;
  price_double?: number;
  price_single?: number;
  hotel_makkah?: { name: string; star_rating?: number | null };
  hotel_madinah?: { name: string; star_rating?: number | null };
  airline?: { name: string };
  departures?: Array<{
    departure_date: string;
    quota: number;
    booked_count: number;
    price_quad?: number;
    price_triple?: number;
    price_double?: number;
    price_single?: number;
  }>;
}

/**
 * Normalize Indonesian phone number to WhatsApp format
 * Converts 0812xxx or 62812xxx to 62812xxx
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 62
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.slice(1);
  }
  
  // If already starts with 62, return as is
  if (cleaned.startsWith('62')) {
    return cleaned;
  }
  
  // Otherwise prepend 62
  return '62' + cleaned;
}

/**
 * Get lowest price from package
 */
export function getLowestPackagePrice(pkg: PackageMarketingData): number {
  const today = new Date().toISOString().split('T')[0];
  
  // Get prices from open departures
  const openDeps = (pkg.departures || []).filter(
    d => d.departure_date >= today && d.booked_count < d.quota
  );
  
  const depPrices = openDeps.flatMap(d =>
    [d.price_quad, d.price_triple, d.price_double, d.price_single].filter((p): p is number => p != null && p > 0)
  );
  
  if (depPrices.length > 0) return Math.min(...depPrices);
  
  // Fallback to package prices
  const pkgPrices = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
    .filter((p): p is number => p != null && p > 0);
  
  return pkgPrices.length > 0 ? Math.min(...pkgPrices) : 0;
}

/**
 * Generate WhatsApp share message for package
 * Format: Package name, price, hotels, duration, link
 */
export function generateWhatsAppMessage(
  pkg: PackageMarketingData,
  bookingUrl?: string,
  companyName: string = 'Vins Tour Travel'
): string {
  const lowestPrice = getLowestPackagePrice(pkg);
  const priceText = lowestPrice > 0 ? formatCurrency(lowestPrice) : 'Hubungi Kami';
  
  const hotelMakkah = pkg.hotel_makkah?.name || '-';
  const hotelMadinah = pkg.hotel_madinah?.name || '-';
  const airline = pkg.airline?.name || '-';
  
  const message = `🕌 *${pkg.name}*

📋 *Paket Umroh Pilihan*
━━━━━━━━━━━━━━━━━━━━━
💰 Harga Mulai: ${priceText}
⏱️ Durasi: ${pkg.duration_days} Hari
✈️ Maskapai: ${airline}
🏨 Hotel Makkah: ${hotelMakkah}
🏨 Hotel Madinah: ${hotelMadinah}
━━━━━━━━━━━━━━━━━━━━━

${pkg.description ? `📝 ${pkg.description}\n\n` : ''}Hubungi kami untuk informasi lebih lanjut dan promo spesial!

${companyName}`;

  return message;
}

/**
 * Generate WhatsApp share URL
 * Returns a wa.me link with pre-filled message
 */
export function generateWhatsAppShareUrl(
  phoneNumber: string,
  message: string
): string {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Generate promotional flyer as canvas and download as image
 * Returns a data URL for the generated image
 */
export async function generateFlyerImage(
  pkg: PackageMarketingData,
  width: number = 1080,
  height: number = 1350
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#1e3a8a'); // Blue
      gradient.addColorStop(1, '#0f172a'); // Dark blue
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Header section with accent
      ctx.fillStyle = '#fbbf24'; // Amber
      ctx.fillRect(0, 0, width, 120);
      
      // Company name
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VINS TOUR TRAVEL', width / 2, 50);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText('Paket Umroh Terpercaya', width / 2, 85);

      // Package name
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      
      // Wrap long text
      const maxWidth = width - 60;
      const words = pkg.name.split(' ');
      let line = '';
      let y = 180;
      
      words.forEach(word => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          ctx.fillText(line, width / 2, y);
          line = word + ' ';
          y += 45;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, width / 2, y);

      // Divider
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(100, y + 40);
      ctx.lineTo(width - 100, y + 40);
      ctx.stroke();

      // Details section
      y += 100;
      const details = [
        { label: '💰 Harga Mulai:', value: formatCurrency(getLowestPackagePrice(pkg)) },
        { label: '⏱️ Durasi:', value: `${pkg.duration_days} Hari` },
        { label: '✈️ Maskapai:', value: pkg.airline?.name || '-' },
        { label: '🏨 Hotel Makkah:', value: pkg.hotel_makkah?.name || '-' },
        { label: '🏨 Hotel Madinah:', value: pkg.hotel_madinah?.name || '-' },
      ];

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      
      details.forEach(detail => {
        ctx.fillText(detail.label, 60, y);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(detail.value, 350, y);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        y += 50;
      });

      // Footer section
      y = height - 150;
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, y, width, height - y);
      
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('HUBUNGI KAMI SEKARANG!', width / 2, y + 50);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText('Dapatkan Promo Spesial & Konsultasi Gratis', width / 2, y + 90);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Download flyer image
 */
export async function downloadFlyer(
  pkg: PackageMarketingData,
  filename?: string
): Promise<void> {
  try {
    const dataUrl = await generateFlyerImage(pkg);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || `flyer-${pkg.code}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to download flyer:', error);
    throw error;
  }
}

/**
 * Share to social media (generic)
 */
export function shareToSocialMedia(
  platform: 'facebook' | 'twitter' | 'linkedin',
  url: string,
  title: string,
  text: string
): void {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);
  
  let shareUrl = '';
  
  switch (platform) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      break;
  }
  
  if (shareUrl) {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }
}
