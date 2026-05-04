/**
 * Domain DTOs for the equipment module.
 *
 * Components/UI must consume these DTOs — never the raw Supabase Row types.
 * Mappers below normalize nullable DB fields into safe defaults so the UI
 * does not need defensive checks everywhere, and so we can change the DB
 * shape without breaking the UI.
 *
 * Type guards are used to validate runtime shape before mapping (e.g. when
 * a join returns `null` or an embedded relation may be a SelectQueryError).
 */
import type {
  EquipmentItemRow,
  EquipmentVariantRow,
  EquipmentStockOpnameRow,
  EquipmentSettingsRow,
  EquipmentNotificationSettingsRow,
  EquipmentCategoryRow,
  EquipmentStockHistoryRow,
} from "@/integrations/supabase/equipment-types";

// ---------- Domain types (UI-facing) ----------

export interface EquipmentItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  genderTarget: string;
  hasVariants: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  pic: string | null;
  picType: string | null;
  qrCode: string | null;
  photoUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EquipmentVariant {
  id: string;
  equipmentId: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  stockGood: number;
  stockDamaged: number;
  lowStockThreshold: number;
}

export interface StockOpname {
  id: string;
  equipmentItemId: string;
  opnameDate: string;
  physicalCount: number;
  systemCount: number;
  difference: number;
  notes: string | null;
  picName: string | null;
  picType: string | null;
  status: string;
  createdAt: string;
  /** Optional joined item — only present when fetched with details */
  equipmentItem?: EquipmentItem;
}

export interface EquipmentCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface EquipmentStockHistoryEntry {
  id: string;
  equipmentItemId: string;
  changeType: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  notes: string | null;
  createdAt: string;
}

export interface EquipmentSettings {
  showLogo: boolean;
  logoUrl: string;
  companyName: string;
  showAddress: boolean;
  showContact: boolean;
  themeColor: string;
  fontSize: string;
  paperSize: string;
  /** Any extra keys not explicitly modeled */
  extras: Record<string, string>;
}

export interface EquipmentNotificationSettings {
  id: string;
  enabled: boolean;
  notifyAdmins: boolean;
  notifyPic: boolean;
  lowStockThresholdDefault: number;
}

// ---------- Type guards ----------

/**
 * True when `value` is a real row object — not `null`, not a Supabase
 * `SelectQueryError` (which only has a `message` property), and not an array.
 */
export function isRow<T extends object>(value: unknown): value is T {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !("error" in (value as Record<string, unknown>))
  );
}

export function hasId(value: unknown): value is { id: string } {
  return isRow<{ id: string }>(value) && typeof (value as { id: unknown }).id === "string";
}

// ---------- Mappers (Row → DTO) ----------

export function mapEquipmentItem(row: EquipmentItemRow): EquipmentItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    category: row.category ?? "Lainnya",
    genderTarget: row.gender_target ?? "all",
    hasVariants: row.has_variants ?? false,
    stockQuantity: row.stock_quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 0,
    pic: row.pic ?? null,
    picType: row.pic_type ?? null,
    qrCode: row.qr_code ?? null,
    photoUrl: row.photo_url ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function mapEquipmentVariant(row: EquipmentVariantRow): EquipmentVariant {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    size: row.size ?? null,
    color: row.color ?? null,
    sku: row.sku ?? null,
    stockGood: row.stock_good ?? 0,
    stockDamaged: row.stock_damaged ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 0,
  };
}

export function mapStockOpname(
  row: EquipmentStockOpnameRow,
  joinedItem?: EquipmentItemRow | null,
): StockOpname {
  return {
    id: row.id,
    equipmentItemId: row.equipment_item_id,
    opnameDate: row.opname_date,
    physicalCount: row.physical_count ?? 0,
    systemCount: row.system_count ?? 0,
    difference: row.difference ?? 0,
    notes: row.notes ?? null,
    picName: row.pic_name ?? null,
    picType: row.pic_type ?? null,
    status: row.status ?? "completed",
    createdAt: row.created_at ?? new Date().toISOString(),
    equipmentItem: isRow<EquipmentItemRow>(joinedItem)
      ? mapEquipmentItem(joinedItem)
      : undefined,
  };
}

export function mapEquipmentCategory(row: EquipmentCategoryRow): EquipmentCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    icon: row.icon ?? null,
  };
}

export function mapStockHistoryEntry(row: EquipmentStockHistoryRow): EquipmentStockHistoryEntry {
  return {
    id: row.id,
    equipmentItemId: row.equipment_item_id,
    changeType: row.change_type,
    quantityChange: row.quantity_change ?? 0,
    previousQuantity: row.previous_quantity ?? 0,
    newQuantity: row.new_quantity ?? 0,
    notes: row.notes ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

const DEFAULT_SETTINGS: EquipmentSettings = {
  showLogo: true,
  logoUrl: "",
  companyName: "Vins Tour Travel",
  showAddress: true,
  showContact: true,
  themeColor: "#3B82F6",
  fontSize: "12",
  paperSize: "A4",
  extras: {},
};

const BOOLEAN_KEYS = new Set(["show_logo", "show_address", "show_contact"]);

function toBool(v: string | null | undefined, fallback: boolean): boolean {
  if (v === null || v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

/**
 * Collapse a key/value settings table into a single typed object.
 */
export function mapEquipmentSettings(rows: EquipmentSettingsRow[]): EquipmentSettings {
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.value !== null && r.value !== undefined) map.set(r.key, r.value);
  }

  const result: EquipmentSettings = { ...DEFAULT_SETTINGS, extras: {} };
  result.showLogo = toBool(map.get("show_logo"), DEFAULT_SETTINGS.showLogo);
  result.logoUrl = map.get("logo_url") ?? DEFAULT_SETTINGS.logoUrl;
  result.companyName = map.get("company_name") ?? DEFAULT_SETTINGS.companyName;
  result.showAddress = toBool(map.get("show_address"), DEFAULT_SETTINGS.showAddress);
  result.showContact = toBool(map.get("show_contact"), DEFAULT_SETTINGS.showContact);
  result.themeColor = map.get("theme_color") ?? DEFAULT_SETTINGS.themeColor;
  result.fontSize = map.get("font_size") ?? DEFAULT_SETTINGS.fontSize;
  result.paperSize = map.get("paper_size") ?? DEFAULT_SETTINGS.paperSize;

  const known = new Set([
    "show_logo",
    "logo_url",
    "company_name",
    "show_address",
    "show_contact",
    "theme_color",
    "font_size",
    "paper_size",
  ]);
  for (const [k, v] of map) {
    if (!known.has(k)) result.extras[k] = v;
  }
  // Silence unused warning if the helper is tree-shaken in the future.
  void BOOLEAN_KEYS;
  return result;
}

export function mapNotificationSettings(
  row: EquipmentNotificationSettingsRow,
): EquipmentNotificationSettings {
  return {
    id: row.id,
    enabled: row.enabled ?? true,
    notifyAdmins: row.notify_admins ?? true,
    notifyPic: row.notify_pic ?? true,
    lowStockThresholdDefault: row.low_stock_threshold_default ?? 10,
  };
}