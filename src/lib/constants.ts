// === Status Labels ===
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  cancelled: 'Dibatalkan',
  completed: 'Selesai',
  waiting_payment: 'Menunggu Pembayaran',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Belum Bayar',
  partial: 'Sebagian',
  paid: 'Lunas',
  refunded: 'Dikembalikan',
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'Baru',
  contacted: 'Dihubungi',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negosiasi',
  won: 'Menang',
  lost: 'Kalah',
};

// === Room Types ===
export const ROOM_TYPE_LABELS: Record<string, string> = {
  quad: 'Quad (4 orang)',
  triple: 'Triple (3 orang)',
  double: 'Double (2 orang)',
  single: 'Single (1 orang)',
};

// === Role Labels ===
export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  branch_manager: 'Branch Manager',
  finance: 'Finance',
  sales: 'Sales',
  operational: 'Operasional',
  marketing: 'Marketing',
  agent: 'Agen',
  customer: 'Customer',
  jamaah: 'Jamaah',
  equipment: 'Equipment',
};

// Role priority for sorting (lower number = higher priority)
// Customer is always last
export const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 1,
  owner: 2,
  branch_manager: 3,
  finance: 4,
  operational: 5,
  sales: 6,
  marketing: 7,
  equipment: 8,
  agent: 9,
  customer: 100,
  jamaah: 101,
};

/**
 * Sorts roles based on priority, ensuring 'customer' is at the end.
 */
export const sortRoles = <T extends { role: string } | string>(roles: T[]): T[] => {
  return [...roles].sort((a, b) => {
    const roleA = typeof a === 'string' ? a : a.role;
    const roleB = typeof b === 'string' ? b : b.role;
    
    const priorityA = ROLE_PRIORITY[roleA] || 50;
    const priorityB = ROLE_PRIORITY[roleB] || 50;
    
    return priorityA - priorityB;
  });
};

// === Gender ===
export const GENDER_LABELS: Record<string, string> = {
  male: 'Laki-laki',
  female: 'Perempuan',
};

// === Pagination ===
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
