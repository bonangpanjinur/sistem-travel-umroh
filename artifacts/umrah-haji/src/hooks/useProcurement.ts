import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string | null;
  status: "draft" | "ordered" | "partial" | "received" | "cancelled";
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier | null;
  items?: PurchaseOrderItem[];
};

export type PurchaseOrderItem = {
  id: string;
  po_id: string;
  product_id: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
  subtotal: number;
  product?: { id: string; name: string; sku: string | null; current_stock: number; avg_cost: number } | null;
};

export type StockMovement = {
  id: string;
  product_id: string;
  type: "purchase_in" | "sale_out" | "adjustment" | "return_in" | "transfer_out";
  qty: number;
  unit_cost: number | null;
  ref_table: string | null;
  ref_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: { id: string; name: string; sku: string | null } | null;
};

const sb: any = supabase;

/* ─── Suppliers ───────────────────────────────────────────── */
export function useSuppliers() {
  return useQuery({
    queryKey: ["store-suppliers"],
    queryFn: async () => {
      const { data, error } = await sb.from("store_suppliers").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Supplier[];
    },
  });
}

export function useSupplierMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["store-suppliers"] });

  const upsert = useMutation({
    mutationFn: async (v: Partial<Supplier>) => {
      const { error } = v.id
        ? await sb.from("store_suppliers").update(v).eq("id", v.id)
        : await sb.from("store_suppliers").insert([v]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supplier disimpan"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("store_suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supplier dihapus"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });

  return { upsert, remove };
}

/* ─── Purchase Orders ─────────────────────────────────────── */
export function usePurchaseOrders(status?: string) {
  return useQuery({
    queryKey: ["store-pos", status],
    queryFn: async () => {
      let q = sb.from("store_purchase_orders")
        .select("*, supplier:store_suppliers(*), items:store_purchase_order_items(*, product:store_products(id,name,sku,current_stock,avg_cost))")
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PurchaseOrder[];
    },
  });
}

export function usePurchaseOrder(id?: string) {
  return useQuery({
    queryKey: ["store-po", id],
    queryFn: async () => {
      const { data, error } = await sb.from("store_purchase_orders")
        .select("*, supplier:store_suppliers(*), items:store_purchase_order_items(*, product:store_products(id,name,sku,current_stock,avg_cost))")
        .eq("id", id).single();
      if (error) throw error;
      return data as PurchaseOrder;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      supplier_id: string | null;
      order_date: string;
      expected_date?: string | null;
      notes?: string;
      tax?: number;
      shipping_cost?: number;
      items: { product_id: string; qty_ordered: number; unit_cost: number }[];
    }) => {
      const { data: poNum, error: errNum } = await sb.rpc("generate_po_number");
      if (errNum) throw errNum;

      const subtotal = input.items.reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0);
      const total = subtotal + (input.tax ?? 0) + (input.shipping_cost ?? 0);

      const { data: po, error: errPO } = await sb.from("store_purchase_orders").insert([{
        po_number: poNum,
        supplier_id: input.supplier_id,
        status: "ordered",
        order_date: input.order_date,
        expected_date: input.expected_date ?? null,
        subtotal,
        tax: input.tax ?? 0,
        shipping_cost: input.shipping_cost ?? 0,
        total,
        notes: input.notes ?? null,
      }]).select("*").single();
      if (errPO) throw errPO;

      const itemsPayload = input.items.map(i => ({
        po_id: po.id,
        product_id: i.product_id,
        qty_ordered: i.qty_ordered,
        unit_cost: i.unit_cost,
        subtotal: i.qty_ordered * i.unit_cost,
      }));
      const { error: errItems } = await sb.from("store_purchase_order_items").insert(itemsPayload);
      if (errItems) throw errItems;

      return po as PurchaseOrder;
    },
    onSuccess: () => {
      toast.success("Purchase Order dibuat");
      qc.invalidateQueries({ queryKey: ["store-pos"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { po_id: string; items: { item_id: string; qty: number }[] }) => {
      const { error } = await sb.rpc("receive_purchase_order", {
        _po_id: input.po_id,
        _items: input.items,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Penerimaan barang berhasil");
      qc.invalidateQueries({ queryKey: ["store-pos"] });
      qc.invalidateQueries({ queryKey: ["store-po"] });
      qc.invalidateQueries({ queryKey: ["store-products"] });
      qc.invalidateQueries({ queryKey: ["store-stock-movements"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePOStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseOrder["status"] }) => {
      const { error } = await sb.from("store_purchase_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-pos"] });
      qc.invalidateQueries({ queryKey: ["store-po"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ─── Stock Movements ─────────────────────────────────────── */
export function useStockMovements(productId?: string) {
  return useQuery({
    queryKey: ["store-stock-movements", productId],
    queryFn: async () => {
      let q = sb.from("store_stock_movements")
        .select("*, product:store_products(id,name,sku)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (productId) q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StockMovement[];
    },
  });
}

/* ─── Sales Report (gross profit) ─────────────────────────── */
export type SalesReportRow = {
  order_id: string;
  order_number: string;
  date: string;
  customer_name: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  cogs: number;
  gross_profit: number;
};

export function useSalesReport(from: string, to: string) {
  return useQuery({
    queryKey: ["store-sales-report", from, to],
    queryFn: async () => {
      const { data: orders, error } = await sb.from("store_orders")
        .select("id, order_number, created_at, status, payment_status, total_amount, shipping_name, items:store_order_items(quantity, unit_price, product_id)")
        .gte("created_at", from)
        .lte("created_at", to + "T23:59:59")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const productIds = new Set<string>();
      (orders ?? []).forEach((o: any) => o.items?.forEach((it: any) => it.product_id && productIds.add(it.product_id)));
      let costMap = new Map<string, number>();
      if (productIds.size) {
        const { data: prods } = await sb.from("store_products").select("id, avg_cost").in("id", Array.from(productIds));
        (prods ?? []).forEach((p: any) => costMap.set(p.id, Number(p.avg_cost) || 0));
      }

      const rows: SalesReportRow[] = (orders ?? []).map((o: any) => {
        const cogs = (o.items ?? []).reduce((s: number, it: any) => s + (it.quantity * (costMap.get(it.product_id) ?? 0)), 0);
        return {
          order_id: o.id,
          order_number: o.order_number,
          date: o.created_at,
          customer_name: o.shipping_name,
          status: o.status,
          payment_status: o.payment_status,
          total_amount: Number(o.total_amount) || 0,
          cogs,
          gross_profit: (Number(o.total_amount) || 0) - cogs,
        };
      });
      return rows;
    },
  });
}
