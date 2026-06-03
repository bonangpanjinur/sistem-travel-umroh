/**
 * useWhatsAppNotifierSecure
 * Secure WhatsApp notifier that sends all messages through backend API.
 * Token is kept on the server side — never exposed to the browser.
 * 
 * This replaces the old useWhatsAppNotifier which sent tokens directly from browser.
 */
import { useCallback } from "react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export function useWhatsAppNotifierSecure() {
  const isReady = true; // Always ready since token is on backend

  /**
   * Send a simple message via backend API proxy
   * Backend will handle token retrieval and Fonnte API call
   */
  const send = useCallback(
    async (phone: string, message: string, silent = false): Promise<boolean> => {
      if (!phone || !message) {
        if (!silent) toast.error("Nomor telepon dan pesan harus diisi");
        return false;
      }

      try {
        const res = await fetch(`${API_BASE}/api/whatsapp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: phone, message }),
        });

        const data = (await res.json()) as SendResult;

        if (data.success) {
          if (!silent) toast.success("Notifikasi WhatsApp berhasil dikirim");
          return true;
        } else {
          if (!silent) toast.error("Gagal kirim WA: " + data.error);
          return false;
        }
      } catch (err: any) {
        if (!silent) toast.error("Error: " + err.message);
        return false;
      }
    },
    []
  );

  /**
   * Send notification using template system
   * Backend will look up booking data and build message from template
   */
  const sendNotification = useCallback(
    async (
      type: string,
      data: { phone?: string; name?: string; booking_id?: string; [key: string]: any },
      silent = false
    ): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE}/api/whatsapp/notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, ...data }),
        });

        const result = (await res.json()) as { success: boolean; error?: string };

        if (result.success) {
          if (!silent) toast.success("Notifikasi WhatsApp berhasil dikirim");
          return true;
        } else {
          if (!silent) toast.error("Gagal kirim WA: " + result.error);
          return false;
        }
      } catch (err: any) {
        if (!silent) toast.error("Error: " + err.message);
        return false;
      }
    },
    []
  );

  /**
   * Send payment confirmation notification
   */
  const sendPaymentConfirmation = useCallback(
    async (
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
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `✅ *Pembayaran Diterima!*\n\n` +
        `📋 Kode Booking: *${vars.kode_booking}*\n` +
        `💰 Jumlah Diterima: *${vars.jumlah_bayar}*\n` +
        `📅 Tanggal: ${vars.tanggal_bayar}\n` +
        `💳 Total Terbayar: ${vars.total_terbayar}\n` +
        `⏳ Sisa: ${vars.sisa_bayar}\n\n` +
        `Jazakallahu khairan atas kepercayaan Anda. 🙏\n\n` +
        `📱 Lihat riwayat pembayaran Anda di portal jamaah.\n\n` +
        `Info: ${vars.nomor_cs || "—"}`;

      return send(phone, message);
    },
    [send]
  );

  /**
   * Send "fully paid" (lunas) notification
   */
  const sendPaymentLunas = useCallback(
    async (
      phone: string,
      vars: {
        nama: string;
        nama_paket: string;
        kode_booking: string;
        tanggal_berangkat: string;
        nomor_cs?: string;
      }
    ) => {
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `🎉 *Pembayaran Lunas!*\n\n` +
        `Alhamdulillah, pembayaran Anda untuk paket *${vars.nama_paket}* telah LUNAS.\n\n` +
        `📋 Kode Booking: *${vars.kode_booking}*\n` +
        `📅 Keberangkatan: ${vars.tanggal_berangkat}\n\n` +
        `Kami akan segera memproses dokumen perjalanan Anda. Mohon lengkapi persyaratan dokumen jika belum.\n\n` +
        `📱 Akses portal jamaah Anda di halaman login.\n\n` +
        `Informasi: ${vars.nomor_cs || "—"} 🙏`;

      return send(phone, message);
    },
    [send]
  );

  /**
   * Send booking confirmation notification
   */
  const sendBookingConfirm = useCallback(
    async (
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
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `✅ *Booking Anda Berhasil!*\n\n` +
        `📋 Kode Booking: *${vars.kode_booking}*\n` +
        `📦 Paket: ${vars.nama_paket}\n` +
        `📅 Keberangkatan: ${vars.tanggal_berangkat}\n` +
        `💰 Total: ${vars.total_harga}\n` +
        `💳 DP/Terbayar: ${vars.terbayar}\n` +
        `⏳ Sisa: ${vars.sisa_bayar}\n\n` +
        `Terima kasih telah mempercayakan perjalanan ibadah Anda kepada kami. 🙏\n\n` +
        `📱 Pantau status booking Anda di portal jamaah.\n\n` +
        `Informasi lebih lanjut: ${vars.nomor_cs || "—"}`;

      return send(phone, message);
    },
    [send]
  );

  /**
   * Send document ready notification
   */
  const sendDocumentReady = useCallback(
    async (
      phone: string,
      vars: {
        nama: string;
        jenis_dokumen: string;
        nama_paket: string;
        tanggal_berangkat: string;
        nomor_cs?: string;
      }
    ) => {
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `📄 *Dokumen Anda Sudah Siap!*\n\n` +
        `Jenis dokumen: *${vars.jenis_dokumen}*\n` +
        `Paket: ${vars.nama_paket}\n` +
        `Keberangkatan: ${vars.tanggal_berangkat}\n\n` +
        `Silakan hubungi kami untuk pengambilan dokumen.\n\n` +
        `📱 Pantau dokumen Anda di portal jamaah.\n\n` +
        `Info: ${vars.nomor_cs || "—"} 🙏`;

      return send(phone, message);
    },
    [send]
  );

  /**
   * Send departure reminder notification
   */
  const sendDepartureReminder = useCallback(
    async (
      phone: string,
      vars: {
        nama: string;
        sisa_hari: string | number;
        tanggal_berangkat: string;
        nomor_penerbangan?: string;
        hotel_makkah?: string;
        titik_kumpul?: string;
        nomor_cs?: string;
      }
    ) => {
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `✈️ Keberangkatan Anda tinggal *${vars.sisa_hari} hari lagi*!\n\n` +
        `📦 Pastikan dokumen dan perlengkapan sudah siap.\n` +
        `📅 *Tanggal Berangkat:* ${vars.tanggal_berangkat}\n` +
        (vars.nomor_penerbangan ? `✈️ *Nomor Penerbangan:* ${vars.nomor_penerbangan}\n` : "") +
        (vars.hotel_makkah ? `🏨 *Hotel Makkah:* ${vars.hotel_makkah}\n` : "") +
        (vars.titik_kumpul ? `📍 *Titik Kumpul:* ${vars.titik_kumpul}\n` : "") +
        `\nSemoga ibadah Anda mabrur. Barakallahu fiikum 🌙\n\n` +
        `Info: ${vars.nomor_cs || "—"}`;

      return send(phone, message);
    },
    [send]
  );

  /**
   * Send custom message
   */
  const sendCustom = useCallback(
    async (phone: string, message: string) => {
      return send(phone, message);
    },
    [send]
  );

  /**
   * Send savings cicilan confirmation
   */
  const sendSavingsCicilanDiterima = useCallback(
    async (
      phone: string,
      vars: {
        nama: string;
        nama_paket: string;
        jumlah_cicilan: string;
        tanggal: string;
        total_terkumpul: string;
        target: string;
        sisa: string;
        nomor_cs?: string;
      }
    ) => {
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `✅ *Cicilan Tabungan Diterima!*\n\n` +
        `📦 Paket: *${vars.nama_paket}*\n` +
        `💰 Jumlah Cicilan: *${vars.jumlah_cicilan}*\n` +
        `📅 Tanggal: ${vars.tanggal}\n` +
        `💳 Total Terkumpul: ${vars.total_terkumpul}\n` +
        `🎯 Target: ${vars.target}\n` +
        `⏳ Sisa: *${vars.sisa}*\n\n` +
        `Jazakallahu khairan, semoga tabungan Anda segera lunas. 🙏\n\n` +
        `Info: ${vars.nomor_cs || "—"}`;

      return send(phone, message, true);
    },
    [send]
  );

  /**
   * Send savings cicilan rejected
   */
  const sendSavingsCicilanDitolak = useCallback(
    async (
      phone: string,
      vars: {
        nama: string;
        nama_paket: string;
        jumlah_cicilan: string;
        tanggal: string;
        alasan: string;
        nomor_cs?: string;
      }
    ) => {
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `❌ *Cicilan Tabungan Ditolak*\n\n` +
        `📦 Paket: *${vars.nama_paket}*\n` +
        `💰 Jumlah: ${vars.jumlah_cicilan}\n` +
        `📅 Tanggal: ${vars.tanggal}\n\n` +
        `📋 Alasan: _${vars.alasan}_\n\n` +
        `Mohon lakukan pembayaran ulang atau hubungi kami untuk informasi lebih lanjut.\n\n` +
        `Info: ${vars.nomor_cs || "—"}`;

      return send(phone, message, true);
    },
    [send]
  );

  /**
   * Send savings reminder
   */
  const sendSavingsReminder = useCallback(
    async (
      phone: string,
      vars: {
        nama: string;
        nama_paket: string;
        jumlah_cicilan: string;
        total_terkumpul: string;
        target: string;
        target_date: string;
        info_rekening: string;
        nomor_cs?: string;
      }
    ) => {
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `⏰ *Pengingat Cicilan Tabungan*\n\n` +
        `📦 Paket: *${vars.nama_paket}*\n` +
        `💰 Cicilan Bulan Ini: *${vars.jumlah_cicilan}*\n` +
        `💳 Terkumpul: ${vars.total_terkumpul} dari ${vars.target}\n` +
        `📅 Target Lunas: ${vars.target_date}\n\n` +
        `Jangan lupa lakukan pembayaran cicilan agar tabungan Anda tetap berjalan lancar. 🙏\n\n` +
        `Pembayaran via transfer ke rekening kami:\n${vars.info_rekening}\n\n` +
        `Info: ${vars.nomor_cs || "—"}`;

      return send(phone, message, true);
    },
    [send]
  );

  /**
   * Send savings fully paid (lunas)
   */
  const sendSavingsLunas = useCallback(
    async (
      phone: string,
      vars: {
        nama: string;
        nama_paket: string;
        total_terkumpul: string;
        tanggal: string;
        nomor_cs?: string;
      }
    ) => {
      const message =
        `Assalamu'alaikum *${vars.nama}* 🤲\n\n` +
        `🎉 *Alhamdulillah — Tabungan Lunas!*\n\n` +
        `Selamat! Tabungan Umroh Anda untuk paket *${vars.nama_paket}* telah LUNAS.\n\n` +
        `💰 Total Terkumpul: *${vars.total_terkumpul}*\n` +
        `📅 Lunas pada: ${vars.tanggal}\n\n` +
        `Tim kami akan segera menghubungi Anda untuk proses konfirmasi booking dan persiapan keberangkatan. 🕌✈️\n\n` +
        `Semoga menjadi umroh yang mabrur! 🤲\n\n` +
        `Info: ${vars.nomor_cs || "—"}`;

      return send(phone, message, true);
    },
    [send]
  );

  return {
    isReady,
    send,
    sendNotification,
    sendPaymentConfirmation,
    sendPaymentLunas,
    sendBookingConfirm,
    sendDocumentReady,
    sendDepartureReminder,
    sendCustom,
    sendSavingsCicilanDiterima,
    sendSavingsCicilanDitolak,
    sendSavingsReminder,
    sendSavingsLunas,
  };
}
