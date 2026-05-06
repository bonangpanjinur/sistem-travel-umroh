/**
 * useWhatsAppNotifier
 * Convenience hook for sending WhatsApp notifications from anywhere in the app.
 * Loads the Fonnte token from the whatsapp_config table and exposes typed send methods.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppMessage, buildMessage, renderTemplate, TemplateVars, normalisePhone } from "@/lib/whatsapp-notifier";
import { toast } from "sonner";

interface WAConfig {
  api_key: string | null;
  sender_number: string | null;
  is_active: boolean;
  provider: string;
}

export function useWhatsAppNotifier() {
  const { data: config } = useQuery<WAConfig | null>({
    queryKey: ["whatsapp-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_config" as any)
        .select("api_key, sender_number, is_active, provider")
        .maybeSingle();
      return (data as unknown as WAConfig) || null;
    },
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });

  const isReady = !!(config?.is_active && config?.api_key);

  const send = async (phone: string, message: string, silent = false): Promise<boolean> => {
    if (!config?.api_key) {
      if (!silent) toast.error("Konfigurasi WhatsApp belum diisi. Buka Admin > WhatsApp untuk setup.");
      return false;
    }
    if (!config.is_active) {
      if (!silent) toast.warning("WhatsApp notifikasi sedang nonaktif.");
      return false;
    }

    const result = await sendWhatsAppMessage({
      token: config.api_key,
      target: phone,
      message,
    });

    if (result.success) {
      if (!silent) toast.success("Notifikasi WhatsApp berhasil dikirim");
      return true;
    } else {
      if (!silent) toast.error("Gagal kirim WA: " + result.error);
      return false;
    }
  };

  /** Send payment confirmation notification */
  const sendPaymentConfirmation = async (
    phone: string,
    vars: {
      nama: string;
      kode_booking: string;
      jumlah_bayar: string;
      tanggal_bayar: string;
      total_terbayar: string;
      sisa_bayar: string;
      nomor_cs?: string;
    }
  ) => {
    const message = buildMessage("PAYMENT_CONFIRM", { nomor_cs: "", ...vars });
    return send(phone, message);
  };

  /** Send "fully paid" (lunas) notification */
  const sendPaymentLunas = async (
    phone: string,
    vars: {
      nama: string;
      nama_paket: string;
      kode_booking: string;
      tanggal_berangkat: string;
      nomor_cs?: string;
    }
  ) => {
    const message = buildMessage("PAYMENT_LUNAS", { nomor_cs: "", ...vars });
    return send(phone, message);
  };

  /** Send booking confirmation notification */
  const sendBookingConfirm = async (
    phone: string,
    vars: {
      nama: string;
      kode_booking: string;
      nama_paket: string;
      tanggal_berangkat: string;
      total_harga: string;
      terbayar: string;
      sisa_bayar: string;
      nomor_cs?: string;
    }
  ) => {
    const message = buildMessage("BOOKING_CONFIRM", { nomor_cs: "", ...vars });
    return send(phone, message);
  };

  /** Send document ready notification */
  const sendDocumentReady = async (
    phone: string,
    vars: {
      nama: string;
      jenis_dokumen: string;
      nama_paket: string;
      tanggal_berangkat: string;
      nomor_cs?: string;
    }
  ) => {
    const message = buildMessage("DOCUMENT_READY", { nomor_cs: "", ...vars });
    return send(phone, message);
  };

  /** Send departure reminder notification */
  const sendDepartureReminder = async (
    phone: string,
    vars: {
      nama: string;
      sisa_hari: string | number;
      tanggal_berangkat: string;
      nomor_penerbangan: string;
      hotel_makkah: string;
      titik_kumpul: string;
      nomor_cs?: string;
    }
  ) => {
    const message = buildMessage("DEPARTURE_REMINDER", { nomor_cs: "", ...vars });
    return send(phone, message);
  };

  /** Send custom message with template rendering */
  const sendCustom = async (phone: string, template: string, vars: TemplateVars) => {
    const message = renderTemplate(template, vars);
    return send(phone, message);
  };

  return {
    isReady,
    config,
    send,
    sendPaymentConfirmation,
    sendPaymentLunas,
    sendBookingConfirm,
    sendDocumentReady,
    sendDepartureReminder,
    sendCustom,
  };
}
