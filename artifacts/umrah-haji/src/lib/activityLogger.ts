import { supabase } from "@/integrations/supabase/client";

export type ActivityEntityType = "booking" | "refund";

export interface LogActivityParams {
  entity_type: ActivityEntityType;
  entity_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Catat aktivitas admin ke tabel admin_activity_log.
 * Dipanggil secara fire-and-forget — error tidak akan melempar exception
 * agar tidak mengganggu operasi utama.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await (supabase as any).auth.getUser();
    await (supabase as any).from("admin_activity_log").insert({
      actor_id:    user?.id ?? null,
      actor_email: user?.email ?? null,
      entity_type: params.entity_type,
      entity_id:   params.entity_id,
      action:      params.action,
      old_value:   params.old_value ?? null,
      new_value:   params.new_value ?? null,
      notes:       params.notes ?? null,
      metadata:    params.metadata ?? {},
    });
  } catch {
    // Logging gagal tidak boleh menghentikan operasi utama
  }
}
