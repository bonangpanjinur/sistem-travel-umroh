/**
 * usePackageHPPTemplate — DB-backed HPP template per package.
 *
 * Provides:
 *   - fetchTemplate(packageId)         → load template items from Supabase
 *   - saveAsTemplate(packageId, items) → replace package template with current departure items
 *   - buildInsertPayload(items, departureId) → rows ready to insert into departure_cost_items
 *
 * Unlike useHPPTemplates (localStorage), this persists to the `package_hpp_templates`
 * table so templates survive across devices and users.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PackageHPPTemplateItem {
  id: string;
  package_id: string;
  category: string;
  sub_category?: string | null;
  description: string;
  location?: string | null;
  nights?: number | null;
  room_type?: string | null;
  flight_route?: string | null;
  flight_class?: string | null;
  unit: string;
  quantity: number;
  unit_cost: number;
  currency: string;
  exchange_rate: number;
  sort_order: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  /** Computed: quantity × unit_cost × exchange_rate */
  total_cost_idr: number;
}

// ── Query key factory ─────────────────────────────────────────────────────────

export const packageHPPTemplateKey = (packageId: string) =>
  ["package-hpp-template", packageId] as const;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePackageHPPTemplate(packageId: string | undefined) {
  const queryClient = useQueryClient();
  const db = supabase as any;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const query = useQuery({
    queryKey: packageId ? packageHPPTemplateKey(packageId) : ["package-hpp-template-disabled"],
    enabled: !!packageId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<PackageHPPTemplateItem[]> => {
      if (!packageId) return [];
      const { data, error } = await db
        .from("package_hpp_templates")
        .select("*")
        .eq("package_id", packageId)
        .order("category")
        .order("sort_order");

      // Table may not exist yet in older environments — return empty gracefully
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }

      return (data || []).map((row: any): PackageHPPTemplateItem => ({
        ...row,
        quantity: Number(row.quantity),
        unit_cost: Number(row.unit_cost),
        exchange_rate: Number(row.exchange_rate),
        total_cost_idr: Number(row.quantity) * Number(row.unit_cost) * Number(row.exchange_rate),
      }));
    },
  });

  // ── Save / overwrite package template ────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({
      pkgId,
      sourceItems,
    }: {
      pkgId: string;
      sourceItems: any[];
    }) => {
      // Delete existing template for this package
      const { error: delErr } = await db
        .from("package_hpp_templates")
        .delete()
        .eq("package_id", pkgId);
      if (delErr && delErr.code !== "42P01") throw delErr;

      if (sourceItems.length === 0) return 0;

      // Build insert payload — strip departure-specific fields
      const payload = sourceItems.map(
        (
          {
            id: _id,
            departure_id: _dep,
            total_cost_idr: _tc,
            check_in_date: _ci,
            check_out_date: _co,
            created_at: _ca,
            updated_at: _ua,
            ...rest
          }: any,
          idx: number
        ) => ({
          ...rest,
          package_id: pkgId,
          sort_order: rest.sort_order ?? idx,
        })
      );

      const { error: insErr } = await db
        .from("package_hpp_templates")
        .insert(payload);
      if (insErr) throw insErr;

      return payload.length;
    },
    onSuccess: (count, { pkgId }) => {
      toast.success(
        `Template paket disimpan: ${count} item HPP`
      );
      queryClient.invalidateQueries({ queryKey: packageHPPTemplateKey(pkgId) });
    },
    onError: (e: any) =>
      toast.error("Gagal menyimpan template: " + (e.message || "Unknown error")),
  });

  // ── Apply template to departure ───────────────────────────────────────────
  const applyMutation = useMutation({
    mutationFn: async ({
      templateItems,
      departureId,
      mode,
    }: {
      templateItems: PackageHPPTemplateItem[];
      departureId: string;
      mode: "append" | "replace";
    }) => {
      if (mode === "replace") {
        const { error } = await db
          .from("departure_cost_items")
          .delete()
          .eq("departure_id", departureId);
        if (error) throw error;
      }

      const payload = templateItems.map(
        ({ id: _id, package_id: _pkg, total_cost_idr: _tc, created_at: _ca, updated_at: _ua, ...rest }: any) => ({
          ...rest,
          departure_id: departureId,
          check_in_date: null,
          check_out_date: null,
        })
      );

      const { error } = await db.from("departure_cost_items").insert(payload);
      if (error) throw error;

      return payload.length;
    },
    onSuccess: (count, { departureId }) => {
      toast.success(`${count} item HPP dari template paket berhasil diterapkan`);
      queryClient.invalidateQueries({
        queryKey: ["departure-cost-items", departureId],
      });
      queryClient.invalidateQueries({
        queryKey: ["departure-financial-summary", departureId],
      });
    },
    onError: (e: any) =>
      toast.error("Gagal menerapkan template: " + (e.message || "Unknown error")),
  });

  const templateItems = query.data ?? [];
  const hasTemplate = templateItems.length > 0;
  const totalHPP = templateItems.reduce((s, i) => s + i.total_cost_idr, 0);

  return {
    templateItems,
    hasTemplate,
    totalHPP,
    isLoading: query.isLoading,
    isError: query.isError,
    saveTemplate: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    applyTemplate: applyMutation.mutateAsync,
    isApplying: applyMutation.isPending,
  };
}
