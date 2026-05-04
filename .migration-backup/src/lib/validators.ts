import { z } from 'zod';

// === NIK (16 digit Indonesian National ID) ===
export const nikSchema = z
  .string()
  .regex(/^\d{16}$/, 'NIK harus 16 digit angka')
  .optional()
  .or(z.literal(''));

// === Passport Number ===
export const passportSchema = z
  .string()
  .regex(/^[A-Z0-9]{6,9}$/, 'Nomor paspor tidak valid (6-9 karakter alfanumerik)')
  .optional()
  .or(z.literal(''));

// === Indonesian Phone Number ===
export const phoneSchema = z
  .string()
  .regex(/^(\+62|62|0)8[1-9][0-9]{7,11}$/, 'Nomor telepon tidak valid')
  .optional()
  .or(z.literal(''));

// === Email ===
export const emailSchema = z
  .string()
  .trim()
  .email('Format email tidak valid')
  .max(255, 'Email terlalu panjang');

// === General Text ===
export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Nama minimal 2 karakter')
  .max(100, 'Nama maksimal 100 karakter');

// === Helpers ===
export function isValidNIK(nik: string): boolean {
  return /^\d{16}$/.test(nik);
}

export function isValidPassport(passport: string): boolean {
  return /^[A-Z0-9]{6,9}$/.test(passport);
}

export function isValidPhone(phone: string): boolean {
  return /^(\+62|62|0)8[1-9][0-9]{7,11}$/.test(phone);
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) return '+62' + cleaned.slice(1);
  if (cleaned.startsWith('62')) return '+' + cleaned;
  return phone;
}
