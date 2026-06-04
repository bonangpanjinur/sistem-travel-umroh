/**
 * useHPPTemplates — localStorage-backed CRUD for HPP template library.
 *
 * Templates are saved in localStorage under STORAGE_KEY so they survive
 * page reloads and work in full demo mode (no Supabase required).
 *
 * Each template stores a snapshot of cost-item fields — everything from
 * departure_cost_items EXCEPT: id, departure_id, total_cost_idr (generated),
 * check_in_date, check_out_date (departure-specific hotel dates).
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "vinstour_hpp_templates_v1";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HPPTemplateItem {
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
  /** Computed locally for display: quantity × unit_cost × exchange_rate */
  total_cost_idr: number;
}

export type HPPTemplateTag = "umroh" | "haji" | "plus" | "vip" | "reguler" | "custom";

export interface HPPTemplate {
  id: string;
  name: string;
  description?: string;
  tag?: HPPTemplateTag;
  items: HPPTemplateItem[];
  item_count: number;
  total_hpp: number;
  created_at: string;
  updated_at: string;
}

// ── Persistence helpers ───────────────────────────────────────────────────────

function load(): HPPTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HPPTemplate[]) : [];
  } catch {
    return [];
  }
}

function persist(templates: HPPTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHPPTemplates() {
  const [templates, setTemplates] = useState<HPPTemplate[]>(() => load());

  const refresh = useCallback(() => setTemplates(load()), []);

  /** Save a new template from a list of departure_cost_items rows. */
  const saveTemplate = useCallback(
    (
      name: string,
      sourceItems: any[],
      opts?: { description?: string; tag?: HPPTemplateTag }
    ): HPPTemplate => {
      const items: HPPTemplateItem[] = sourceItems.map(
        ({ id: _id, departure_id: _dep, check_in_date: _ci, check_out_date: _co, ...rest }: any) => ({
          ...rest,
          check_in_date: undefined,
          check_out_date: undefined,
          total_cost_idr: rest.total_cost_idr ?? rest.quantity * rest.unit_cost * (rest.exchange_rate ?? 1),
        })
      );

      const now = new Date().toISOString();
      const template: HPPTemplate = {
        id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        description: opts?.description?.trim() || undefined,
        tag: opts?.tag,
        items,
        item_count: items.length,
        total_hpp: items.reduce((s, i) => s + (i.total_cost_idr || 0), 0),
        created_at: now,
        updated_at: now,
      };

      const updated = [template, ...load()];
      persist(updated);
      setTemplates(updated);
      return template;
    },
    []
  );

  /** Update name/description/tag of an existing template. */
  const updateTemplate = useCallback(
    (id: string, patch: Partial<Pick<HPPTemplate, "name" | "description" | "tag">>) => {
      const updated = load().map((t) =>
        t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t
      );
      persist(updated);
      setTemplates(updated);
    },
    []
  );

  /** Delete a template by id. */
  const deleteTemplate = useCallback((id: string) => {
    const updated = load().filter((t) => t.id !== id);
    persist(updated);
    setTemplates(updated);
  }, []);

  /** Build the insert payload for departure_cost_items from a template. */
  const buildInsertPayload = useCallback(
    (template: HPPTemplate, targetDepartureId: string) =>
      template.items.map(({ total_cost_idr: _tc, ...item }) => ({
        ...item,
        departure_id: targetDepartureId,
        check_in_date: null,
        check_out_date: null,
      })),
    []
  );

  return {
    templates,
    refresh,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    buildInsertPayload,
  };
}
