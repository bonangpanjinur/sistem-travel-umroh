// Formatting utilities for the Umroh system

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  
  return new Intl.DateTimeFormat('id-ID', options || defaultOptions).format(
    typeof date === 'string' ? new Date(date) : date
  );
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date);
}

export function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
}

export function formatDuration(days: number): string {
  if (days === 1) return '1 Hari';
  return `${days} Hari`;
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Format Indonesian phone number
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('62')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)}-${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  return phone;
}

export function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getRoomTypeLabel(roomType: string): string {
  const labels: Record<string, string> = {
    quad: 'Quad (4 Orang)',
    triple: 'Triple (3 Orang)',
    double: 'Double (2 Orang)',
    single: 'Single (1 Orang)',
  };
  return labels[roomType] || roomType;
}

export function getPackageTypeLabel(packageType: string): string {
  const labels: Record<string, string> = {
    umroh: 'Umroh',
    haji: 'Haji Reguler',
    haji_plus: 'Haji Plus',
    umroh_plus: 'Umroh Plus',
    tabungan: 'Tabungan Umroh',
  };
  return labels[packageType] || packageType;
}

// Alias for formatPackageType
export const formatPackageType = getPackageTypeLabel;

export function getBookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Menunggu Konfirmasi',
    confirmed: 'Terkonfirmasi',
    processing: 'Dalam Proses',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    refunded: 'Dikembalikan',
  };
  return labels[status] || status;
}

export function getPaymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Menunggu Pembayaran',
    partial: 'Sebagian Lunas',
    paid: 'Lunas',
    refunded: 'Dikembalikan',
    failed: 'Gagal',
  };
  return labels[status] || status;
}

export function getDocumentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Belum Diupload',
    uploaded: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    rejected: 'Ditolak',
    expired: 'Kadaluarsa',
  };
  return labels[status] || status;
}

export function calculateAvailableSeats(quota: number, bookedCount: number): number {
  return Math.max(0, quota - bookedCount);
}

export function getPriceByRoomType(
  pkg: { price_quad: number; price_triple: number; price_double: number; price_single: number },
  roomType: string
): number {
  const prices: Record<string, number> = {
    quad: pkg.price_quad,
    triple: pkg.price_triple,
    double: pkg.price_double,
    single: pkg.price_single,
  };
  return prices[roomType] || pkg.price_quad;
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
