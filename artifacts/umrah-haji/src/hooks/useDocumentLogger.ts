import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type DocumentLogType =
  | "passport"
  | "certificate"
  | "cuti_jamaah"
  | "eticket"
  | "general"
  | "invoice"
  | "bulk_passport"
  | "bulk_certificate"
  | "bulk_cuti";

export interface DocumentLogInput {
  bookingId: string;
  documentType: DocumentLogType;
  documentLabel: string;
  jamaahName?: string | null;
  isBulk?: boolean;
  bulkCount?: number;
  notes?: string;
}

export interface BookingDocumentLog {
  id: string;
  booking_id: string;
  document_type: DocumentLogType;
  document_label: string;
  jamaah_name: string | null;
  generated_by: string | null;
  generated_by_name: string | null;
  is_bulk: boolean;
  bulk_count: number | null;
  notes: string | null;
  created_at: string;
}

export function useDocumentLogger() {
  const { user, profile } = useAuth();

  const logDocument = async (input: DocumentLogInput): Promise<void> => {
    try {
      const { error } = await (supabase as any)
        .from("booking_document_logs")
        .insert({
          booking_id: input.bookingId,
          document_type: input.documentType,
          document_label: input.documentLabel,
          jamaah_name: input.jamaahName ?? null,
          generated_by: user?.id ?? null,
          generated_by_name: profile?.full_name ?? user?.email ?? null,
          is_bulk: input.isBulk ?? false,
          bulk_count: input.bulkCount ?? null,
          notes: input.notes ?? null,
        });

      if (error) {
        // Silent fail — table may not exist yet in all environments
        console.warn("[DocumentLogger] Could not write log:", error.message);
      }
    } catch (err) {
      console.warn("[DocumentLogger] Unexpected error:", err);
    }
  };

  const fetchLogs = async (bookingId: string): Promise<BookingDocumentLog[]> => {
    try {
      const { data, error } = await (supabase as any)
        .from("booking_document_logs")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[DocumentLogger] Could not fetch logs:", error.message);
        return [];
      }
      return (data ?? []) as BookingDocumentLog[];
    } catch {
      return [];
    }
  };

  return { logDocument, fetchLogs };
}
