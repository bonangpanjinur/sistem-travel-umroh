import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "./format";

export type CurrencyCode = "IDR" | "USD" | "SAR" | "EUR" | "MYR" | "SGD";

let _ratesCache: Record<string, { rate: number; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

export async function getExchangeRate(from: string, to: string = "IDR"): Promise<number> {
  if (!from || from.toUpperCase() === to.toUpperCase()) return 1;
  const key = `${from}-${to}`.toUpperCase();
  const cached = _ratesCache[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.rate;
  try {
    const { data, error } = await (supabase.rpc as any)("get_active_exchange_rate", {
      from_currency: from.toUpperCase(),
      to_currency: to.toUpperCase(),
    });
    if (error) throw error;
    const rate = Number(data) || 1;
    _ratesCache[key] = { rate, ts: Date.now() };
    return rate;
  } catch {
    return 1;
  }
}

export function convertAmount(amount: number, rate: number): number {
  return Math.round((amount || 0) * (rate || 1));
}

/** Tampilkan harga asli dengan ekuivalen IDR jika mata uang non-IDR */
export function formatPriceWithIDR(
  amount: number,
  currency: string | null | undefined,
  rate?: number
): string {
  const cur = (currency || "IDR").toUpperCase();
  if (cur === "IDR") return formatCurrency(amount, "IDR");
  const original = formatCurrency(amount, cur);
  if (!rate || rate === 1) return original;
  const idr = formatCurrency(convertAmount(amount, rate), "IDR");
  return `${original} (≈ ${idr})`;
}
