import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StoreProduct = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  stock: number;
  weight_gram: number;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  sold_count: number;
  sku: string | null;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
  category?: StoreCategory;
};

export type StoreOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: StoreProduct;
};

export type StoreShipment = {
  id: string;
  order_id: string;
  courier_name: string;
  courier_service: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  estimated_arrival: string | null;
  delivered_at: string | null;
  status: 'preparing' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreOrder = {
  id: string;
  order_number: string;
  customer_id: string | null;
  user_id: string | null;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_postal: string | null;
  notes: string | null;
  payment_proof_url: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
  items?: StoreOrderItem[];
  shipment?: StoreShipment | null;
  customer?: { full_name: string; phone: string; email: string } | null;
};

// ─── Categories ───────────────────────────────────────────────────────────────

export function useStoreCategories(onlyActive = false) {
  return useQuery({
    queryKey: ["store-categories", onlyActive],
    queryFn: async () => {
      let q = supabase.from("store_categories").select("*").order("sort_order");
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StoreCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useStoreCategoryMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["store-categories"] });

  const upsert = useMutation({
    mutationFn: async (values: Partial<StoreCategory>) => {
      const { error } = values.id
        ? await supabase.from("store_categories").update(values).eq("id", values.id)
        : await supabase.from("store_categories").insert([values as any]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Kategori berhasil disimpan"); inv(); },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan kategori"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Kategori berhasil dihapus"); inv(); },
    onError: (e: any) => toast.error(e.message || "Gagal menghapus kategori"),
  });

  return { upsert, remove };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function useStoreProducts(categoryId?: string, onlyActive = false) {
  return useQuery({
    queryKey: ["store-products", categoryId, onlyActive],
    queryFn: async () => {
      let q = supabase
        .from("store_products")
        .select("*, category:store_categories(id,name,slug)")
        .order("created_at", { ascending: false });
      if (categoryId) q = q.eq("category_id", categoryId);
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StoreProduct[];
    },
    staleTime: 1000 * 60 * 3,
  });
}

export function useStoreProduct(id: string) {
  return useQuery({
    queryKey: ["store-product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_products")
        .select("*, category:store_categories(id,name,slug)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as StoreProduct;
    },
    enabled: !!id,
  });
}

export function useStoreProductMutations() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ["store-products"] });
    qc.invalidateQueries({ queryKey: ["store-product"] });
  };

  const upsert = useMutation({
    mutationFn: async (values: Partial<StoreProduct>) => {
      const payload = { ...values };
      delete (payload as any).category;
      const { error } = values.id
        ? await supabase.from("store_products").update(payload).eq("id", values.id)
        : await supabase.from("store_products").insert([payload as any]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produk berhasil disimpan"); inv(); },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan produk"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produk berhasil dihapus"); inv(); },
    onError: (e: any) => toast.error(e.message || "Gagal menghapus produk"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("store_products").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status produk diperbarui"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });

  return { upsert, remove, toggleActive };
}

// ─── Orders (Admin) ───────────────────────────────────────────────────────────

export function useStoreOrders(status?: string) {
  return useQuery({
    queryKey: ["store-orders", status],
    queryFn: async () => {
      let q = supabase
        .from("store_orders")
        .select(`
          *,
          items:store_order_items(*, product:store_products(name, images)),
          shipment:store_shipments(*),
          customer:customers(full_name, phone, email)
        `)
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as StoreOrder[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useStoreOrder(id: string) {
  return useQuery({
    queryKey: ["store-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select(`
          *,
          items:store_order_items(*, product:store_products(name, images, price)),
          shipment:store_shipments(*),
          customer:customers(full_name, phone, email)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as StoreOrder;
    },
    enabled: !!id,
  });
}

export function useStoreOrderMutations() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ["store-orders"] });
    qc.invalidateQueries({ queryKey: ["store-order"] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("store_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status pesanan diperbarui"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmPayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_orders").update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pembayaran dikonfirmasi"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });

  const upsertShipment = useMutation({
    mutationFn: async (values: Partial<StoreShipment> & { order_id: string }) => {
      const { data: existing } = await supabase
        .from("store_shipments")
        .select("id")
        .eq("order_id", values.order_id)
        .single();

      if (existing) {
        const { error } = await supabase.from("store_shipments").update(values).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_shipments").insert([values as any]);
        if (error) throw error;
      }

      // Update order status to shipped if tracking number provided
      if (values.tracking_number) {
        await supabase.from("store_orders").update({ status: "shipped" }).eq("id", values.order_id);
      }
    },
    onSuccess: () => { toast.success("Data pengiriman disimpan"); inv(); },
    onError: (e: any) => toast.error(e.message),
  });

  return { updateStatus, confirmPayment, upsertShipment };
}

// ─── Customer: My Orders ──────────────────────────────────────────────────────

export function useMyStoreOrders(userId?: string) {
  return useQuery({
    queryKey: ["my-store-orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select(`
          *,
          items:store_order_items(*, product:store_products(name, images)),
          shipment:store_shipments(*)
        `)
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreOrder[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Customer: Upload Payment Proof ──────────────────────────────────────────

export function useUploadStorePaymentProof() {
  const qc = useQueryClient();
  const supabaseRaw: any = supabase;

  return useMutation({
    mutationFn: async ({ orderId, userId, file }: { orderId: string; userId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `store-orders/${userId}/${fileName}`;

      const { error: uploadError } = await supabaseRaw.storage
        .from("payment-proofs")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(`Gagal mengunggah file: ${uploadError.message}`);

      const { error: updateError } = await supabaseRaw
        .from("store_orders")
        .update({ payment_proof_url: filePath })
        .eq("id", orderId);
      if (updateError) throw new Error(`Gagal menyimpan bukti bayar: ${updateError.message}`);

      // Kirim notifikasi ke admin
      await supabaseRaw.from("notifications").insert({
        title: "Bukti Pembayaran Toko Baru",
        message: `Jamaah mengunggah bukti pembayaran untuk pesanan toko. Harap verifikasi segera.`,
        type: "info",
        target_role: "admin",
        is_read: false,
      }).maybeSingle();

      return filePath;
    },
    onSuccess: (_data, vars) => {
      toast.success("Bukti pembayaran berhasil diupload! Admin akan memverifikasi segera.");
      qc.invalidateQueries({ queryKey: ["store-order", vars.orderId] });
      qc.invalidateQueries({ queryKey: ["my-store-orders"] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal mengupload bukti pembayaran"),
  });
}

// ─── Product Reviews ──────────────────────────────────────────────────────────

export type StoreProductReview = {
  id: string;
  order_id: string;
  product_id: string;
  user_id: string;
  customer_id: string | null;
  rating: number;
  comment: string | null;
  is_published: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Ambil semua ulasan yang sudah dikirim untuk satu pesanan (milik user yang login) */
export function useMyOrderReviews(orderId: string | undefined) {
  return useQuery({
    queryKey: ["my-order-reviews", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("store_product_reviews")
        .select("*")
        .eq("order_id", orderId);
      if (error) throw error;
      return (data ?? []) as StoreProductReview[];
    },
    enabled: !!orderId,
    staleTime: 1000 * 60,
  });
}

/** Ambil semua ulasan publik untuk satu produk */
export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("store_product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreProductReview[];
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Submit atau update ulasan produk */
export function useSubmitProductReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      productId,
      userId,
      customerId,
      rating,
      comment,
    }: {
      orderId: string;
      productId: string;
      userId: string;
      customerId?: string | null;
      rating: number;
      comment?: string;
    }) => {
      const payload = {
        order_id: orderId,
        product_id: productId,
        user_id: userId,
        customer_id: customerId ?? null,
        rating,
        comment: comment ?? null,
        is_published: true,
      };
      const { error } = await supabase
        .from("store_product_reviews")
        .upsert([payload], { onConflict: "order_id,product_id,user_id" });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success("Ulasan berhasil dikirim! Terima kasih.");
      qc.invalidateQueries({ queryKey: ["my-order-reviews", vars.orderId] });
      qc.invalidateQueries({ queryKey: ["product-reviews", vars.productId] });
    },
    onError: (e: any) => toast.error(e.message || "Gagal mengirim ulasan"),
  });
}

// ─── Customer: Place Order ────────────────────────────────────────────────────

export type CartItem = {
  product: StoreProduct;
  quantity: number;
};

export function usePlaceOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      customerId,
      cart,
      shipping,
      notes,
    }: {
      userId: string;
      customerId?: string;
      cart: CartItem[];
      shipping: {
        name: string;
        phone: string;
        address: string;
        city: string;
        province: string;
        postal: string;
        cost: number;
      };
      notes?: string;
    }) => {
      const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const total_amount = subtotal + shipping.cost;

      // Generate order number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const rand = Math.floor(Math.random() * 99999 + 1).toString().padStart(5, "0");
      const order_number = `TK-${dateStr}-${rand}`;

      const { data: order, error: oErr } = await supabase
        .from("store_orders")
        .insert([{
          order_number,
          user_id: userId,
          customer_id: customerId ?? null,
          subtotal,
          shipping_cost: shipping.cost,
          discount_amount: 0,
          total_amount,
          shipping_name: shipping.name,
          shipping_phone: shipping.phone,
          shipping_address: shipping.address,
          shipping_city: shipping.city,
          shipping_province: shipping.province,
          shipping_postal: shipping.postal,
          notes: notes ?? null,
        }])
        .select()
        .single();
      if (oErr) throw oErr;

      const items = cart.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        product_image: (i.product.images?.[0] as string) ?? null,
        quantity: i.quantity,
        unit_price: i.product.price,
        subtotal: i.product.price * i.quantity,
      }));

      const { error: iErr } = await supabase.from("store_order_items").insert(items);
      if (iErr) throw iErr;

      return order as StoreOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store-orders"] });
      toast.success("Pesanan berhasil dibuat! Silakan lakukan pembayaran.");
    },
    onError: (e: any) => toast.error(e.message || "Gagal membuat pesanan"),
  });
}
