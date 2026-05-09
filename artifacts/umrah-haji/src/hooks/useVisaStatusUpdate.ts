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
    await supabase.from("customer_notifications").insert({
      customer_id: payload.customerId,
      type:        "visa_update",
      title:       "Status Visa Diperbarui",
      message:     `Status visa Anda berubah menjadi: ${newLabel}`,
      is_read:     false,
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
