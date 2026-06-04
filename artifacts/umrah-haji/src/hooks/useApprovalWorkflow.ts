import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export type ApprovalType = "refund" | "discount" | "cancellation" | "vendor_invoice";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "escalated" | "cancelled";
export type ApprovalAction = "approved" | "rejected" | "escalated" | "noted";

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  reference_id?: string;
  reference_code?: string;
  requester_id: string;
  requester_role: string;
  amount?: number;
  percentage?: number;
  reason: string;
  status: ApprovalStatus;
  current_level: number;
  max_level: number;
  branch_id?: string;
  created_at: string;
  updated_at: string;
  actions?: ApprovalActionRow[];
}

export interface ApprovalActionRow {
  id: string;
  request_id: string;
  actor_id: string;
  actor_role: string;
  action: ApprovalAction;
  level: number;
  notes?: string;
  created_at: string;
}

export function useApprovalRequests(filter?: { status?: string; type?: string; branchId?: string }) {
  return useQuery({
    queryKey: ["approval-requests", filter],
    queryFn: async () => {
      let q = supabase
        .from("approval_requests")
        .select("*, actions:approval_actions(*)")
        .order("created_at", { ascending: false });
      if (filter?.status && filter.status !== "all") q = q.eq("status", filter.status);
      if (filter?.type   && filter.type   !== "all") q = q.eq("type",   filter.type);
      if (filter?.branchId) q = q.eq("branch_id", filter.branchId);
      const { data, error } = await q;
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data || []) as ApprovalRequest[];
    },
  });
}

export function useSubmitApproval() {
  const queryClient = useQueryClient();
  const { user }    = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      type: ApprovalType;
      reference_id?: string;
      reference_code?: string;
      requester_role: string;
      amount?: number;
      percentage?: number;
      reason: string;
      branch_id?: string;
      max_level?: number;
    }) => {
      const { data, error } = await supabase.from("approval_requests").insert({
        ...payload,
        requester_id: user?.id,
        status: "pending",
        current_level: 1,
        max_level: payload.max_level ?? 2,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      toast.success("Request approval berhasil diajukan. Menunggu persetujuan.");
    },
    onError: (e: any) => toast.error("Gagal mengajukan approval: " + e.message),
  });
}

export function useApprovalAction() {
  const queryClient = useQueryClient();
  const { user }    = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      requestId: string;
      action: ApprovalAction;
      actorRole: string;
      level: number;
      notes?: string;
      newStatus: ApprovalStatus;
    }) => {
      const { error: actionError } = await supabase.from("approval_actions").insert({
        request_id: payload.requestId,
        actor_id:   user?.id,
        actor_role: payload.actorRole,
        action:     payload.action,
        level:      payload.level,
        notes:      payload.notes || null,
      });
      if (actionError) throw actionError;

      const updates: any = {
        status:     payload.newStatus,
        updated_at: new Date().toISOString(),
      };
      if (payload.newStatus === "escalated") {
        updates.current_level = payload.level + 1;
      }

      const { error: updateError } = await supabase
        .from("approval_requests")
        .update(updates)
        .eq("id", payload.requestId);
      if (updateError) throw updateError;

      // B3: Write audit trail entry for every approve/reject/escalate action
      try {
        await supabase.from("audit_logs").insert({
          user_id: user?.id ?? null,
          action: `approval.${payload.action}`,
          action_type: "approval",
          table_name: "approval_requests",
          record_id: payload.requestId,
          entity_name: "approval_requests",
          entity_id: payload.requestId,
          severity: payload.action === "rejected" ? "warn" : "info",
          new_data: {
            action: payload.action,
            new_status: payload.newStatus,
            level: payload.level,
            actor_role: payload.actorRole,
            notes: payload.notes ?? null,
          },
          metadata: { source: "approval_workflow" },
        });
      } catch (e) {
        // Audit logging must never block the workflow
        console.warn("audit_log insert failed", e);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      const labels: Record<ApprovalAction, string> = {
        approved: "Disetujui", rejected: "Ditolak", escalated: "Dieskalasi", noted: "Dicatat",
      };
      toast.success(`Request ${labels[vars.action]}`);
    },
    onError: (e: any) => toast.error("Gagal memproses approval: " + e.message),
  });
}
