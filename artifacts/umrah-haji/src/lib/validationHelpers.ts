/**
 * Validation helpers for booking form
 */

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

/**
 * Validate room allocation
 */
export function validateRoomAllocation(allocation: {
  quad: number;
  triple: number;
  double: number;
  single: number;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if double rooms are even
  if (allocation.double > 0 && allocation.double % 2 !== 0) {
    errors.push({
      field: 'double',
      message: 'Tipe kamar Double harus berjumlah genap (kelipatan 2). Sisa 1 orang akan dipasangkan dengan staff.',
      type: 'warning',
    });
  }

  // Check if at least one room type is selected
  const total = allocation.quad + allocation.triple + allocation.double + allocation.single;
  if (total === 0) {
    errors.push({
      field: 'roomAllocation',
      message: 'Pilih minimal 1 jamaah untuk melanjutkan.',
      type: 'error',
    });
  }

  return errors;
}

/**
 * Validate PIC selection
 */
export function validatePICSelection(
  picSource: 'pusat' | 'cabang' | 'agen' | 'referral',
  selectedBranchId: string,
  selectedAgentId: string,
  referralCode: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (picSource === 'cabang' && !selectedBranchId) {
    errors.push({
      field: 'branch',
      message: 'Pilih kantor cabang untuk melanjutkan.',
      type: 'error',
    });
  }

  if (picSource === 'agen' && !selectedAgentId) {
    errors.push({
      field: 'agent',
      message: 'Pilih agen travel untuk melanjutkan.',
      type: 'error',
    });
  }

  if (picSource === 'referral' && !referralCode.trim()) {
    errors.push({
      field: 'referral',
      message: 'Masukkan kode referral untuk melanjutkan.',
      type: 'error',
    });
  }

  if (picSource === 'referral' && referralCode.trim() && !referralCode.match(/^REF-/i)) {
    errors.push({
      field: 'referral',
      message: 'Kode referral harus dimulai dengan "REF-". Contoh: REF-NAMA123',
      type: 'warning',
    });
  }

  return errors;
}

/**
 * Validate departure selection
 */
export function validateDeparture(
  selectedDeparture: string,
  hasPricing: boolean
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!selectedDeparture) {
    errors.push({
      field: 'departure',
      message: 'Pilih tanggal keberangkatan untuk melanjutkan.',
      type: 'error',
    });
  }

  if (selectedDeparture && !hasPricing) {
    errors.push({
      field: 'departure',
      message: 'Harga untuk keberangkatan ini belum tersedia. Silakan hubungi kami untuk informasi lebih lanjut.',
      type: 'info',
    });
  }

  return errors;
}

/**
 * Get error message for a specific field
 */
export function getErrorMessage(errors: ValidationError[], field: string): string | null {
  const error = errors.find(e => e.field === field && e.type === 'error');
  return error ? error.message : null;
}

/**
 * Get warning message for a specific field
 */
export function getWarningMessage(errors: ValidationError[], field: string): string | null {
  const error = errors.find(e => e.field === field && e.type === 'warning');
  return error ? error.message : null;
}

/**
 * Check if there are any errors (not warnings or info)
 */
export function hasErrors(errors: ValidationError[]): boolean {
  return errors.some(e => e.type === 'error');
}
