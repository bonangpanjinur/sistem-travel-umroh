import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { toast } from "sonner";

export interface VisaStatusUpdatePayload {
  visaId: string;
  customerId: string;
  newStatus: string;
  oldStatus: string;
  visaNumber?: string;
  visaExpiry?: string;
  rejectionReason?: string;
  notes?: string;
  changedBy?: string;
}

const VISA_STATUS_LABELS: Record<string, string> = {
  pending:              "Menunggu",
  documents_collected:  "Dokumen Lengkap",
  submitted:            "Diajukan ke Kedutaan",
  processing:           "Diproses Kedutaan",
  approved:             "Visa Disetujui ✅",
  rejected:             "Visa Ditolak ❌",
  expired:              "Visa Expired",
};

async function insertVisaLog(payload: VisaStatusUpdatePayload) {
  try {
    await supabase.from("visa_status_logs").insert({
      customer_id: payload.customerId,
      old_status:  payload.oldStatus,
      new_status:  payload.newStatus,
      notes:       payload.notes || null,
      changed_by:  payload.changedBy || null,
    });
  } catch {
  }
}

async function insertCustomerNotification(payload: VisaStatusUpdatePayload) {
  try {
    const newLabel = VISA_STATUS_LABELS[payload.newStatus] || payload.newStatus;

    let title = "Status Visa Diperbarui";
    let message = `Status visa Anda berubah menjadi: ${newLabel}.`;

    if (payload.newStatus === "approved") {
      title = "Visa Anda Telah Disetujui! ✅";
      message = `Selamat! Permohonan visa Anda telah disetujui.`;
      if (payload.visaNumber) message += ` Nomor visa: ${payload.visaNumber}.`;
      if (payload.visaExpiry) {
        const expDate = new Date(payload.visaExpiry);
        const formatted = expDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        message += ` Berlaku hingga: ${formatted}.`;
      }
      message += " Silakan simpan informasi ini dengan baik.";
    } else if (payload.newStatus === "rejected") {
      title = "Permohonan Visa Ditolak ❌";
      message = "Mohon maaf, permohonan visa Anda ditolak oleh kedutaan.";
      if (payload.rejectionReason) message += ` Alasan: ${payload.rejectionReason}.`;
      message += " Silakan hubungi tim kami untuk informasi lebih lanjut.";
    } else if (payload.newStatus === "submitted") {
      title = "Visa Telah Diajukan ke Kedutaan 📋";
      message = "Dokumen visa Anda telah kami ajukan ke kedutaan. Proses verifikasi membutuhkan waktu beberapa hari kerja. Kami akan memberikan update segera.";
    } else if (payload.newStatus === "processing") {
      title = "Visa Sedang Diproses Kedutaan ⏳";
      message = "Permohonan visa Anda sedang dalam proses verifikasi di kedutaan. Mohon tunggu, kami akan segera memberikan kabar.";
    } else if (payload.newStatus === "documents_collected") {
      title = "Dokumen Visa Lengkap ✔️";
      message = "Dokumen Anda telah kami terima dan dinyatakan lengkap. Tim kami akan segera mengajukan ke kedutaan.";
    }

    if (payload.notes && !["approved", "rejected"].includes(payload.newStatus)) {
      message += ` Catatan: ${payload.notes}`;
    }

    await supabase.from("customer_notifications").insert({
      customer_id: payload.customerId,
      type:        "visa_update",
      title,
      message,
      is_read:     false,
      metadata: {
        visa_status:      payload.newStatus,
        old_status:       payload.oldStatus,
        visa_number:      payload.visaNumber    || null,
        visa_expiry:      payload.visaExpiry    || null,
        rejection_reason: payload.rejectionReason || null,
      },
    });
  } catch {
  }
}

export function useVisaStatusUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: VisaStatusUpdatePayload) => {
      const updates: Record<string, any> = {
        status:     payload.newStatus,
        updated_at: new Date().toISOString(),
      };
      if (payload.newStatus === "submitted") {
        updates.submitted_at = new Date().toISOString();
      }
      if (payload.newStatus === "approved") {
        updates.approved_at  = new Date().toISOString();
        updates.visa_number  = payload.visaNumber || null;
        updates.visa_expiry  = payload.visaExpiry || null;
      }
      if (payload.newStatus === "rejected") {
        updates.rejected_at       = new Date().toISOString();
        updates.rejection_reason  = payload.rejectionReason || null;
      }

      const { error } = await supabase
        .from("visa_applications")
        .update(updates)
        .eq("id", payload.visaId);

      if (error) throw error;

      await Promise.allSettled([
        insertVisaLog(payload),
        insertCustomerNotification(payload),
      ]);

      return payload;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["visa-applications"] });
      const newLabel = VISA_STATUS_LABELS[payload.newStatus] || payload.newStatus;
      toast.success(`Status visa diperbarui ke: ${newLabel}`, {
        description: "Jamaah akan mendapat notifikasi otomatis.",
      });
    },
    onError: (e: any) => {
      toast.error("Gagal memperbarui status visa: " + e.message);
    },
  });
}
