/**
 * useFinanceNotifier
 * Kirim notifikasi WhatsApp ke semua staf finance saat ada bukti pembayaran masuk.
 * Fire-and-forget: tidak memblokir UI jika gagal.
 * 
 * ⚠️ MIGRATED TO SECURE BACKEND API
 * Previously sent tokens directly from browser — now uses /api/whatsapp/send
 */
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface FinanceNotifyParams {
  bookingId: string;
  bookingCode: string;
  customerName: string;
  amount: number;
}

export interface FinanceNotifyResult {
  sent: number;
  failed: number;
  skipped: number;
}

export function useFinanceNotifier() {
  /**
   * Kirim WA ke semua staf finance yang punya nomor HP.
   * Returns jumlah pesan terkirim / gagal.
   * 
   * Sekarang menggunakan backend API — token tidak pernah terekspos ke browser.
   */
  const notifyFinance = async (params: FinanceNotifyParams): Promise<FinanceNotifyResult> => {
    const { bookingId, bookingCode, customerName, amount } = params;

    try {
      // ── 1. Ambil semua user_id dengan role 'finance' ─────────────────
      const { data: financeRoles, error: rolesError } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "finance");

      if (rolesError || !financeRoles || financeRoles.length === 0) {
        return { sent: 0, failed: 0, skipped: 0 };
      }

      const userIds: string[] = financeRoles.map((r: any) => r.user_id);

      // ── 2. Fetch profil mereka untuk dapat nomor HP ──────────────────
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .in("user_id", userIds);

      if (profilesError || !profiles || profiles.length === 0) {
        return { sent: 0, failed: 0, skipped: 0 };
      }

      const staffWithPhone = profiles.filter((p) => p.phone && p.phone.trim() !== "");
      const skipped = profiles.length - staffWithPhone.length;

      if (staffWithPhone.length === 0) {
        return { sent: 0, failed: 0, skipped };
      }

      // ── 3. Bangun pesan ──────────────────────────────────────────────
      const deepLink = `${window.location.origin}/admin/bookings/${bookingId}`;
      const tanggal = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const message =
        `🔔 *Bukti Pembayaran Masuk – Perlu Verifikasi*\n\n` +
        `📋 Booking : *${bookingCode}*\n` +
        `👤 Jamaah  : ${customerName}\n` +
        `💰 Nominal : *${formatCurrency(amount)}*\n` +
        `📅 Waktu   : ${tanggal}\n\n` +
        `🔗 Klik untuk verifikasi:\n${deepLink}\n\n` +
        `_Mohon segera diverifikasi. Terima kasih._`;

      // ── 4. Kirim WA ke setiap staf finance via backend API ───────────
      let sent = 0;
      let failed = 0;

      for (const staff of staffWithPhone) {
        try {
          const res = await fetch(`${API_BASE}/api/whatsapp/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              target: staff.phone!,
              message,
            }),
          });

          const data = (await res.json()) as { success?: boolean; error?: string };

          if (data.success) {
            sent++;
          } else {
            failed++;
            console.warn(
              `[FinanceNotifier] Gagal kirim ke ${staff.full_name ?? "staf"}: ${data.error}`
            );
          }
        } catch (err: any) {
          failed++;
          console.warn(
            `[FinanceNotifier] Network error untuk ${staff.full_name ?? "staf"}: ${err.message}`
          );
        }
      }

      return { sent, failed, skipped };
    } catch (err) {
      console.error("[FinanceNotifier] Error:", err);
      return { sent: 0, failed: 0, skipped: 0 };
    }
  };

  return { notifyFinance };
}
