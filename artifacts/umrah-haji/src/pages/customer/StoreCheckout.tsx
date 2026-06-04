import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaceOrder, type CartItem } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShoppingBag, Truck, Package, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";

function loadCart(): CartItem[] {
  try { return JSON.parse(sessionStorage.getItem("store_cart") || "[]"); }
  catch { return []; }
}

const SHIPPING_OPTIONS = [
  { label: "JNE REG", cost: 15000, days: "3-5 hari" },
  { label: "JNE YES", cost: 30000, days: "1-2 hari" },
  { label: "SiCepat REG", cost: 12000, days: "2-4 hari" },
  { label: "SiCepat BEST", cost: 25000, days: "1-2 hari" },
  { label: "AnterAja", cost: 10000, days: "3-7 hari" },
];

export default function StoreCheckout() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const cart      = loadCart();

  const [form, setForm] = useState({
    name: "", phone: "", address: "", city: "", province: "", postal: "", notes: "",
  });
  const [selectedShipping, setSelectedShipping] = useState(0);

  const { data: customerData } = useQuery({
    queryKey: ["checkout-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, phone")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (customerData) {
      setForm((prev) => ({
        ...prev,
        name: (customerData as any).full_name ?? prev.name,
        phone: (customerData as any).phone ?? prev.phone,
      }));
    }
  }, [customerData]);

  const placeOrder = usePlaceOrder();

  const subtotal     = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shippingCost = SHIPPING_OPTIONS[selectedShipping]?.cost ?? 0;
  const total        = subtotal + shippingCost;

  const setField = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleOrder = async () => {
    if (!user) { toast.error("Silakan login terlebih dahulu"); return; }
    if (!form.name || !form.phone || !form.address || !form.city || !form.province || !form.postal) {
      toast.error("Lengkapi semua data pengiriman"); return;
    }
    if (cart.length === 0) { toast.error("Keranjang kosong"); return; }

    placeOrder.mutate(
      {
        userId: user.id,
        customerId: customerData?.id,
        cart,
        shipping: {
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          province: form.province,
          postal: form.postal,
          cost: shippingCost,
        },
        notes: form.notes,
      },
      {
        onSuccess: (order) => {
          sessionStorage.removeItem("store_cart");
          navigate(`/store/orders/${order.id}?new=1`);
        },
      }
    );
  };

  if (cart.length === 0) {
    return (
      <DynamicPublicLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-semibold mb-2">Keranjang Kosong</h2>
          <p className="text-muted-foreground mb-6">Belum ada produk di keranjang kamu</p>
          <Button asChild><Link to="/store">Belanja Sekarang</Link></Button>
        </div>
      </div>
    </DynamicPublicLayout>
    );
  }

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/store"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Checkout Pesanan</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Shipping address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />Alamat Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nama Penerima *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Nama lengkap penerima" />
              </div>
              <div>
                <Label>Nomor HP *</Label>
                <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="sm:col-span-2">
                <Label>Alamat Lengkap *</Label>
                <Textarea value={form.address} onChange={(e) => setField("address", e.target.value)} rows={2} placeholder="Jalan, no. rumah, RT/RW, kelurahan, kecamatan" />
              </div>
              <div>
                <Label>Kota *</Label>
                <Input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Kota / Kabupaten" />
              </div>
              <div>
                <Label>Provinsi *</Label>
                <Input value={form.province} onChange={(e) => setField("province", e.target.value)} placeholder="Provinsi" />
              </div>
              <div>
                <Label>Kode Pos *</Label>
                <Input value={form.postal} onChange={(e) => setField("postal", e.target.value)} placeholder="12345" />
              </div>
              <div>
                <Label>Catatan (opsional)</Label>
                <Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Catatan untuk penjual..." />
              </div>
            </CardContent>
          </Card>

          {/* Shipping method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />Metode Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SHIPPING_OPTIONS.map((opt, idx) => (
                <label
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedShipping === idx ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedShipping === idx}
                      onChange={() => setSelectedShipping(idx)}
                      className="text-primary"
                    />
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">Estimasi {opt.days}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(opt.cost)}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />Ringkasan Pesanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex gap-3">
                  {item.product.images?.[0] ? (
                    <img src={item.product.images[0]} alt={item.product.name} className="h-12 w-12 rounded object-cover border shrink-0" />
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatCurrency(item.product.price * item.quantity)}</span>
                </div>
              ))}

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkos Kirim</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Pembayaran</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 space-y-1">
                <p className="font-semibold">📋 Cara Pembayaran</p>
                <p>Setelah pesanan dibuat, silakan transfer ke rekening yang tertera dan unggah bukti pembayaran di halaman pesanan.</p>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleOrder}
                disabled={placeOrder.isPending}
              >
                <ShoppingBag className="h-5 w-5" />
                {placeOrder.isPending ? "Memproses..." : `Buat Pesanan · ${formatCurrency(total)}`}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Dengan menekan tombol di atas, kamu menyetujui syarat & ketentuan toko
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </DynamicPublicLayout>
  );
}
