/**
 * Centralised, fully typed query helpers for the equipment module.
 *
 * RULES:
 *  1. Every Supabase call against an equipment-related table goes through this
 *     file. Components must import these helpers — never call
 *     `supabase.from("equipment_*")` directly. This eliminates the recurring
 *     `Argument of type "..." is not assignable to "v_financial_summary"`
 *     overload errors caused by typoed table names.
 *  2. Every helper returns DTOs (mapped via `./dto.ts`), never raw rows.
 *  3. Inserts/updates accept the generated `Insert<...>` / `Update<...>`
 *     aliases, so missing columns are caught at compile time.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  EquipmentItemInsert,
  EquipmentItemUpdate,
  EquipmentStockHistoryInsert,
  EquipmentStockOpnameInsert,
  EquipmentItemRow,
  EquipmentStockOpnameRow,
} from "@/integrations/supabase/equipment-types";
import {
  type EquipmentItem,
  type EquipmentCategory,
  type EquipmentSettings,
  type EquipmentNotificationSettings,
  type StockOpname,
  type EquipmentStockHistoryEntry,
  hasId,
  isRow,
  mapEquipmentItem,
  mapEquipmentCategory,
  mapEquipmentSettings,
  mapNotificationSettings,
  mapStockOpname,
  mapStockHistoryEntry,
} from "./dto";

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned");
  return data;
}

// ---------- Equipment items ----------

export async function getEquipmentItems(): Promise<EquipmentItem[]> {
  const { data, error } = await supabase
    .from("equipment_items")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEquipmentItem);
}

export async function getEquipmentItemById(id: string): Promise<EquipmentItem | null> {
  const { data, error } = await supabase
    .from("equipment_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapEquipmentItem(data) : null;
}

export async function createEquipmentItem(payload: EquipmentItemInsert): Promise<EquipmentItem> {
  const { data, error } = await supabase
    .from("equipment_items")
    .insert(payload)
    .select("*")
    .single();
  return mapEquipmentItem(unwrap(data, error));
}

export async function updateEquipmentItem(
  id: string,
  payload: EquipmentItemUpdate,
): Promise<EquipmentItem> {
  const { data, error } = await supabase
    .from("equipment_items")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  return mapEquipmentItem(unwrap(data, error));
}

export async function deleteEquipmentItem(id: string): Promise<void> {
  const { error } = await supabase.from("equipment_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- Categories ----------

export async function getEquipmentCategories(): Promise<EquipmentCategory[]> {
  const { data, error } = await supabase
    .from("equipment_categories")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEquipmentCategory);
}

// ---------- Stock history ----------

export async function logStockChange(payload: EquipmentStockHistoryInsert): Promise<void> {
  const { error } = await supabase.from("equipment_stock_history").insert(payload);
  if (error) throw new Error(error.message);
}

export async function getStockHistoryForItem(
  equipmentItemId: string,
): Promise<EquipmentStockHistoryEntry[]> {
  const { data, error } = await supabase
    .from("equipment_stock_history")
    .select("*")
    .eq("equipment_item_id", equipmentItemId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapStockHistoryEntry);
}

// ---------- Stock opname ----------

/**
 * Fetch all opname records and enrich with their equipment item.
 * Uses two queries (records + items) to avoid embed-typing pitfalls when a
 * column on the joined table is renamed/missing.
 */
export async function getStockOpname(): Promise<StockOpname[]> {
  const { data: records, error } = await supabase
    .from("equipment_stock_opname")
    .select("*")
    .order("opname_date", { ascending: false });
  if (error) throw new Error(error.message);

  const rows: EquipmentStockOpnameRow[] = records ?? [];
  if (rows.length === 0) return [];

  const itemIds = Array.from(new Set(rows.map((r) => r.equipment_item_id).filter(Boolean)));
  let itemsById = new Map<string, EquipmentItemRow>();
  if (itemIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("equipment_items")
      .select("*")
      .in("id", itemIds);
    if (itemsError) throw new Error(itemsError.message);
    itemsById = new Map(
      (items ?? []).filter(hasId).map((it) => [it.id, it as EquipmentItemRow]),
    );
  }

  return rows.map((r) => mapStockOpname(r, itemsById.get(r.equipment_item_id) ?? null));
}

export async function createStockOpname(payload: EquipmentStockOpnameInsert): Promise<void> {
  const { error } = await supabase.from("equipment_stock_opname").insert(payload);
  if (error) throw new Error(error.message);
}

// ---------- Settings ----------

export async function getEquipmentSettings(): Promise<EquipmentSettings> {
  const { data, error } = await supabase.from("equipment_settings").select("*");
  if (error) throw new Error(error.message);
  return mapEquipmentSettings(data ?? []);
}

export async function upsertEquipmentSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from("equipment_settings")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}

// ---------- Notification settings ----------

export async function getNotificationSettings(): Promise<EquipmentNotificationSettings | null> {
  const { data, error } = await supabase
    .from("equipment_notification_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return isRow(data) ? mapNotificationSettings(data) : null;
}

export async function updateNotificationSettings(
  id: string,
  patch: {
    enabled: boolean;
    notifyAdmins: boolean;
    notifyPic: boolean;
    lowStockThresholdDefault: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from("equipment_notification_settings")
    .update({
      enabled: patch.enabled,
      notify_admins: patch.notifyAdmins,
      notify_pic: patch.notifyPic,
      low_stock_threshold_default: patch.lowStockThresholdDefault,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}