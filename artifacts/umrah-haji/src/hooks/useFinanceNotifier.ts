/**
 * useFinanceNotifier
 * Kirim notifikasi WhatsApp ke semua staf finance saat ada bukti pembayaran masuk.
 * Fire-and-forget: tidak memblokir UI jika gagal.
 */
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppMessage } from "@/lib/whatsapp-notifier";
import { formatCurrency } from "@/lib/format";

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
   */
  const notifyFinance = async (params: FinanceNotifyParams): Promise<FinanceNotifyResult> => {
    const { bookingId, bookingCode, customerName, amount } = params;

    try {
      // ── 1. Fetch konfigurasi WA ──────────────────────────────────────
      const { data: config } = await (supabase as any)
        .from("whatsapp_config")
        .select("api_key, is_active")
        .maybeSingle();

      if (!config?.is_active || !config?.api_key) {
        return { sent: 0, failed: 0, skipped: 0 };
      }

      // ── 2. Ambil semua user_id dengan role 'finance' ─────────────────
      const { data: financeRoles, error: rolesError } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .eq("role", "finance");

      if (rolesError || !financeRoles || financeRoles.length === 0) {
        return { sent: 0, failed: 0, skipped: 0 };
      }

      const userIds: string[] = financeRoles.map((r: any) => r.user_id);

      // ── 3. Fetch profil mereka untuk dapat nomor HP ──────────────────
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

      // ── 4. Bangun pesan ──────────────────────────────────────────────
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

      // ── 5. Kirim WA ke setiap staf finance ──────────────────────────
      let sent = 0;
      let failed = 0;

      for (const staff of staffWithPhone) {
        const result = await sendWhatsAppMessage({
          token: config.api_key,
          target: staff.phone!,
          message,
        });
        if (result.success) {
          sent++;
        } else {
          failed++;
          console.warn(
            `[FinanceNotifier] Gagal kirim ke ${staff.full_name ?? "staf"}: ${result.error}`
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
