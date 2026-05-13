import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PackageLabel {
  id: string;
  branch_id: string | null;
  slug: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export function usePackageLabels(opts?: { branchId?: string | null; activeOnly?: boolean }) {
  const activeOnly = opts?.activeOnly ?? true;
  return useQuery({
    queryKey: ["package-labels", opts?.branchId ?? "all", activeOnly],
    queryFn: async () => {
      let q = (supabase.from as any)("package_labels")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (activeOnly) q = q.eq("is_active", true);
      if (opts?.branchId !== undefined) {
        if (opts.branchId === null) q = q.is("branch_id", null);
        else q = q.or(`branch_id.eq.${opts.branchId},branch_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PackageLabel[];
    },
  });
}

/** Map of package_id -> labels[] for batch rendering on listings */
export function usePackageLabelsMap() {
  return useQuery({
    queryKey: ["package-labels-map"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("package_label_assignments")
        .select("package_id, label:package_labels(*)");
      if (error) throw error;
      const map: Record<string, PackageLabel[]> = {};
      for (const row of (data ?? []) as Array<{ package_id: string; label: PackageLabel | null }>) {
        if (!row.label || !row.label.is_active) continue;
        (map[row.package_id] ||= []).push(row.label);
      }
      for (const id of Object.keys(map)) {
        map[id].sort((a, b) => a.sort_order - b.sort_order);
      }
      return map;
    },
    staleTime: 60_000,
  });
}

export function usePackageLabelsForPackage(packageId: string | undefined) {
  return useQuery({
    queryKey: ["package-labels-for", packageId],
    enabled: !!packageId,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("package_label_assignments")
        .select("label:package_labels(*)")
        .eq("package_id", packageId);
      if (error) throw error;
      return ((data ?? []) as Array<{ label: PackageLabel | null }>)
        .map((r) => r.label)
        .filter((l): l is PackageLabel => !!l);
    },
  });
}

export function useUpsertPackageLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PackageLabel> & { name: string; slug: string; color: string }) => {
      const { data, error } = await (supabase.from as any)("package_labels")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();
      if (error) throw error;
      return data as PackageLabel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["package-labels"] });
      qc.invalidateQueries({ queryKey: ["package-labels-map"] });
      toast.success("Label tersimpan");
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan label"),
  });
}

export function useDeletePackageLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("package_labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["package-labels"] });
      qc.invalidateQueries({ queryKey: ["package-labels-map"] });
      toast.success("Label dihapus");
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menghapus label"),
  });
}

export function useAssignPackageLabels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ packageId, labelIds }: { packageId: string; labelIds: string[] }) => {
      // Replace assignments transactionally by delete + insert
      const { error: delErr } = await (supabase.from as any)("package_label_assignments")
        .delete()
        .eq("package_id", packageId);
      if (delErr) throw delErr;
      if (labelIds.length === 0) return;
      const rows = labelIds.map((label_id) => ({ package_id: packageId, label_id }));
      const { error: insErr } = await (supabase.from as any)("package_label_assignments").insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["package-labels-map"] });
      qc.invalidateQueries({ queryKey: ["package-labels-for", vars.packageId] });
      toast.success("Label paket diperbarui");
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal memperbarui label paket"),
  });
}

/** Tailwind class map for known label colors */
export function getLabelColorClasses(color: string): string {
  const map: Record<string, string> = {
    amber: "bg-amber-500 text-white border-amber-600",
    emerald: "bg-emerald-600 text-white border-emerald-700",
    red: "bg-red-500 text-white border-red-600",
    rose: "bg-rose-500 text-white border-rose-600",
    blue: "bg-blue-600 text-white border-blue-700",
    purple: "bg-purple-600 text-white border-purple-700",
    primary: "bg-primary text-primary-foreground border-primary",
    secondary: "bg-secondary text-secondary-foreground border-secondary",
    slate: "bg-slate-700 text-white border-slate-800",
  };
  return map[color] ?? map.primary;
}