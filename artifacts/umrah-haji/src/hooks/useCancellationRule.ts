/**
 * useCancellationRule — Single source of truth untuk aturan pembatalan.
 *
 * Logika resolver (sama dengan API /api/cancellation-rules/for-package/:id):
 *   - Paket punya cancellation_rule_id spesifik → pakai itu (aturan khusus paket)
 *   - Tidak ada → fallback ke rule dengan is_default = true (aturan umum)
 *
 * Digunakan di:
 *   - StepReviewDynamic (form booking)
 *   - AdminBookingDetail (detail booking admin + invoice)
 *   - PackageDetail (halaman publik paket)
 *   - AdminDocumentGenerator (generate invoice/form transaksi)
 */

import { useQuery } from "@tanstack/react-query";

export interface CancellationRuleSection {
  title: string;
  items: string[];
}

export interface CancellationRule {
  id: string;
  name: string;
  is_default: boolean;
  is_using_default: boolean;
  sections: CancellationRuleSection[];
}

const API_BASE = "/api";

async function fetchRuleForPackage(packageId: string): Promise<CancellationRule | null> {
  const res = await fetch(`${API_BASE}/cancellation-rules/for-package/${packageId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

async function fetchDefaultRule(): Promise<CancellationRule | null> {
  const res = await fetch(`${API_BASE}/cancellation-rules/default`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ? { ...json.data, is_using_default: true } : null;
}

/**
 * Resolve aturan pembatalan efektif untuk sebuah paket.
 *
 * @param packageId - ID paket. Jika undefined/null → ambil aturan default saja.
 */
export function useCancellationRule(packageId?: string | null) {
  const { data: rule = null, isLoading, error } = useQuery<CancellationRule | null>({
    queryKey: ["cancellation-rule-for-package", packageId ?? "__default__"],
    queryFn: () =>
      packageId ? fetchRuleForPackage(packageId) : fetchDefaultRule(),
    staleTime: 3 * 60 * 1000,
    enabled: true,
  });

  return {
    rule,
    isDefault: rule?.is_using_default ?? true,
    isLoading,
    error,
  };
}
