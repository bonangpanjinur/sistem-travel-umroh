/**
 * PIC Fee Calculator Utility
 * 
 * Utility untuk menghitung dan mengelola fee PIC (Cabang, Agen, Sub Agen, Referral Jemaah)
 * berdasarkan data paket yang telah dikonfigurasi.
 */

import type { Database } from "@/integrations/supabase/types";

type Package = Database["public"]["Tables"]["packages"]["Row"] & {
  fee_branch?: number;
  fee_agent?: number;
  fee_sub_agent?: number;
  fee_referral?: number;
};

export type PICType = "cabang" | "agen" | "sub_agen" | "referral";

export interface PICFeeBreakdown {
  picType: PICType;
  picName: string;
  fee: number;
  currency: string;
}

/**
 * Mendapatkan fee untuk tipe PIC tertentu dari paket
 * @param pkg - Data paket
 * @param picType - Tipe PIC (cabang, agen, sub_agen, referral)
 * @returns Nilai fee dalam Rupiah
 */
export const getPICFee = (pkg: Package, picType: PICType): number => {
  switch (picType) {
    case "cabang":
      return pkg.fee_branch || 0;
    case "agen":
      return pkg.fee_agent || 0;
    case "sub_agen":
      return pkg.fee_sub_agent || 0;
    case "referral":
      return pkg.fee_referral || 0;
    default:
      return 0;
  }
};

/**
 * Mendapatkan semua fee breakdown untuk sebuah paket
 * @param pkg - Data paket
 * @returns Array berisi semua fee untuk setiap tipe PIC
 */
export const getAllPICFees = (pkg: Package): PICFeeBreakdown[] => {
  return [
    {
      picType: "cabang",
      picName: "Cabang",
      fee: pkg.fee_branch || 0,
      currency: pkg.currency || "IDR",
    },
    {
      picType: "agen",
      picName: "Agen",
      fee: pkg.fee_agent || 0,
      currency: pkg.currency || "IDR",
    },
    {
      picType: "sub_agen",
      picName: "Sub Agen",
      fee: pkg.fee_sub_agent || 0,
      currency: pkg.currency || "IDR",
    },
    {
      picType: "referral",
      picName: "Referral Jemaah",
      fee: pkg.fee_referral || 0,
      currency: pkg.currency || "IDR",
    },
  ];
};

/**
 * Menghitung total fee dari semua tipe PIC
 * @param pkg - Data paket
 * @returns Total fee dalam Rupiah
 */
export const getTotalPICFees = (pkg: Package): number => {
  return (pkg.fee_branch || 0) + 
         (pkg.fee_agent || 0) + 
         (pkg.fee_sub_agent || 0) + 
         (pkg.fee_referral || 0);
};

/**
 * Format nilai fee ke format Rupiah yang readable
 * @param amount - Jumlah dalam Rupiah
 * @returns String dengan format Rp X.XXX.XXX
 */
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Validasi bahwa semua fee sudah dikonfigurasi untuk sebuah paket
 * @param pkg - Data paket
 * @returns true jika semua fee > 0, false jika ada yang 0
 */
export const isAllPICFeesConfigured = (pkg: Package): boolean => {
  return (
    (pkg.fee_branch || 0) > 0 &&
    (pkg.fee_agent || 0) > 0 &&
    (pkg.fee_sub_agent || 0) > 0 &&
    (pkg.fee_referral || 0) > 0
  );
};

/**
 * Mendapatkan PIC fee yang belum dikonfigurasi (bernilai 0)
 * @param pkg - Data paket
 * @returns Array berisi nama-nama PIC yang belum dikonfigurasi
 */
export const getUnconfiguredPICFees = (pkg: Package): string[] => {
  const unconfigured: string[] = [];
  
  if (!pkg.fee_branch || pkg.fee_branch === 0) unconfigured.push("Cabang");
  if (!pkg.fee_agent || pkg.fee_agent === 0) unconfigured.push("Agen");
  if (!pkg.fee_sub_agent || pkg.fee_sub_agent === 0) unconfigured.push("Sub Agen");
  if (!pkg.fee_referral || pkg.fee_referral === 0) unconfigured.push("Referral Jemaah");
  
  return unconfigured;
};

/**
 * Membuat ringkasan fee untuk ditampilkan di UI
 * @param pkg - Data paket
 * @returns String dengan ringkasan semua fee
 */
export const getPICFeeSummary = (pkg: Package): string => {
  const fees = getAllPICFees(pkg);
  return fees
    .map(f => `${f.picName}: ${formatRupiah(f.fee)}`)
    .join(" | ");
};
