import { useState } from "react";
import { useStoreOrders, useStoreOrderMutations } from "@/hooks/useStore";
import type { StoreOrder, StoreShipment } from "@/hooks/useStore";
import { useWhatsAppNotifierSecure } from "@/hooks/useWhatsAppNotifierSecure";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShoppingCart, Truck, CheckCircle, Eye, Package, ReceiptText, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

function ProofImage({ path }: { path: string }) {
  let url: string | null = null;
  try {
    const { data } = (supabase as any).storage.from("payment-proofs").getPublicUrl(path);
    url = data?.publicUrl ?? null;
  } catch { /* no-op */ }

  if (!url) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg p-3">
        <ImageIcon className="h-4 w-4" />
        <span>File bukti tersimpan (tidak dapat ditampilkan preview).</span>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={url}
        alt="Bukti Pembayaran"
        className="max-h-56 rounded-lg border object-contain cursor-pointer hover:opacity-90 transition-opacity w-full"
      />
      <p className="text-xs text-primary mt-1 underline">Klik untuk buka gambar penuh</p>
    </a>
  );
}

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Menunggu",      color: "bg-yellow-100 text-yellow-800" },
  confirmed:  { label: "Dikonfirmasi",  color: "bg-blue-100 text-blue-800" },
  processing: { label: "Diproses",      color: "bg-purple-100 text-purple-800" },
  shipped:    { label: "Dikirim",       color: "bg-indigo-100 text-indigo-800" },
  delivered:  { label: "Diterima",      color: "bg-green-100 text-green-800" },
  cancelled:  { label: "Dibatalkan",    color: "bg-red-100 text-red-800" },
  refunded:   { label: "Refund",        color: "bg-gray-100 text-gray-800" },
};

const SHIP_STATUS: Record<string, { label: string; color: string }> = {
  preparing:        { label: "Disiapkan",        color: "bg-yellow-100 text-yellow-800" },
  picked_up:        { label: "Dijemput Kurir",   color: "bg-blue-100 text-blue-800" },
  in_transit:       { label: "Dalam Perjalanan", color: "bg-indigo-100 text-indigo-800" },
  out_for_delivery: { label: "Siap Diantar",     color: "bg-purple-100 text-purple-800" },
  delivered:        { label: "Terkirim",          color: "bg-green-100 text-green-800" },
  failed:           { label: "Gagal Kirim",       color: "bg-red-100 text-red-800" },
  returned:         { label: "Dikembalikan",      color: "bg-gray-100 text-gray-800" },
};

const TABS = [
  { value: "all",       label: "Semua" },
  { value: "pending",   label: "Menunggu" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "shipped",   label: "Dikirim" },
  { value: "delivered", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

export default function AdminStoreOrders() {
  const [tab, setTab]           = useState("all");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<StoreOrder | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [shipData, setShipData] = useState<Partial<StoreShipment>>({});

  const { data: orders = [], isLoading } = useStoreOrders(tab === "all" ? undefined : tab);
  const { updateStatus, confirmPayment, upsertShipment } = useStoreOrderMutations();
  const wa = useWhatsAppNotifierSecure();

  const filtered = search
    ? orders.filter((o) =>
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.shipping_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.shipping_phone?.includes(search)
      )
    : orders;

  const openShipping = (order: StoreOrder) => {
    setSelected(order);
    setShipData(
      order.shipment
        ? { ...order.shipment }
        : { courier_name: "", courier_service: "", tracking_number: "", status: "preparing" }
    );
    setShipOpen(true);
  };

  const handleConfirmPayment = (order: StoreOrder) => {
    confirmPayment.mutate(order.id, {
      onSuccess: () => {
        // Send WA notification to customer
        const phone = order.shipping_phone ?? order.customer?.phone;
        if (phone) {
          wa.sendStoreOrderConfirmed(phone, {
            nama: order.shipping_name ?? order.customer?.full_name ?? "Jamaah",
            no_pesanan: order.order_number,
            total: formatCurrency(order.total_amount),
            jumlah_item: order.items?.length ?? 0,
          });
        }
      },
    });
  };

  const handleSaveShipment = () => {
    if (!selected) return;
    upsertShipment.mutate(
      { ...shipData, order_id: selected.id } as Partial<StoreShipment> & { order_id: string },
      {
        onSuccess: () => {
          setShipOpen(false);
          // Send WA notification if resi was provided
          if (shipData.tracking_number) {
            const phone = selected.shipping_phone ?? selected.customer?.phone;
            if (phone) {
              const estimasi = shipData.estimated_arrival
                ? new Date(shipData.estimated_arrival).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                : "Segera";
              wa.sendStoreOrderShipped(phone, {
                nama: selected.shipping_name ?? selected.customer?.full_name ?? "Jamaah",
                no_pesanan: selected.order_number,
                kurir: shipData.courier_name ?? "",
                layanan: shipData.courier_service ?? "",
                no_resi: shipData.tracking_number,
                estimasi_tiba: estimasi,
              });
            }
          }
        },
      }
    );
  };

  const handleUpdateStatus = (order: StoreOrder, status: string) => {
    updateStatus.mutate({ id: order.id, status }, {
      onSuccess: () => {
        if (status === "delivered") {
          const phone = order.shipping_phone ?? order.customer?.phone;
          if (phone) {
            wa.sendStoreOrderDelivered(phone, {
              nama: order.shipping_name ?? order.customer?.full_name ?? "Jamaah",
              no_pesanan: order.order_number,
            });
          }
        }
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pesanan Toko</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola pesanan, konfirmasi pembayaran, dan input resi pengiriman</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
              {t.value !== "all" && (
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">
                  {orders.filter((o) => o.status === t.value).length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari no. pesanan atau nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada pesanan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Pesanan</TableHead>
                  <TableHead>Pemesan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const os = ORDER_STATUS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-800" };
                  const ss = order.shipment ? SHIP_STATUS[order.shipment.status] : null;
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-mono font-medium text-sm">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "d MMM yyyy HH:mm", { locale: id })}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{order.shipping_name ?? order.customer?.full_name ?? "-"}</p>
                          <p className="text-xs text-muted-foreground">{order.shipping_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{order.items?.length ?? 0} item</p>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(order.total_amount)}</TableCell>
                      <TableCell>
                        <Badge className={order.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {order.payment_status === "paid" ? "Lunas" : "Belum Bayar"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${os.color}`}>{os.label}</span>
                      </TableCell>
                      <TableCell>
                        {order.shipment?.tracking_number ? (
                          <div>
                            <p className="font-mono text-xs font-medium">{order.shipment.tracking_number}</p>
                            <p className="text-xs text-muted-foreground">{order.shipment.courier_name}</p>
                            {ss && <span className={`text-xs px-1.5 py-0.5 rounded-full ${ss.color}`}>{ss.label}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Belum ada</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {order.payment_status === "unpaid" && order.status === "pending" && (
                            <Button
                              size="sm" variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                              onClick={() => handleConfirmPayment(order)}
                              disabled={confirmPayment.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />Konfirmasi
                            </Button>
                          )}
                          <Button
                            size="sm" variant="outline"
                            className="text-xs"
                            onClick={() => openShipping(order)}
                          >
                            <Truck className="h-3 w-3 mr-1" />Resi
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setSelected(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Shipping / Resi Dialog */}
      <Dialog open={shipOpen} onOpenChange={setShipOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Input Resi Pengiriman — {selected?.order_number}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 mt-2">
              {/* Order summary */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Penerima:</span> <span className="font-medium">{selected.shipping_name}</span></p>
                <p><span className="text-muted-foreground">Telepon:</span> {selected.shipping_phone}</p>
                <p><span className="text-muted-foreground">Alamat:</span> {selected.shipping_address}, {selected.shipping_city}, {selected.shipping_province} {selected.shipping_postal}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Kurir *</Label>
                  <Input
                    value={shipData.courier_name ?? ""}
                    onChange={(e) => setShipData((p) => ({ ...p, courier_name: e.target.value }))}
                    placeholder="JNE, TIKI, SiCepat..."
                  />
                </div>
                <div>
                  <Label>Layanan</Label>
                  <Input
                    value={shipData.courier_service ?? ""}
                    onChange={(e) => setShipData((p) => ({ ...p, courier_service: e.target.value }))}
                    placeholder="REG, YES, OKE..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Nomor Resi *</Label>
                  <Input
                    value={shipData.tracking_number ?? ""}
                    onChange={(e) => setShipData((p) => ({ ...p, tracking_number: e.target.value }))}
                    placeholder="Masukkan nomor resi..."
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Status Pengiriman</Label>
                  <Select
                    value={shipData.status ?? "preparing"}
                    onValueChange={(v) => setShipData((p) => ({ ...p, status: v as any }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SHIP_STATUS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimasi Tiba</Label>
                  <Input
                    type="date"
                    value={shipData.estimated_arrival ?? ""}
                    onChange={(e) => setShipData((p) => ({ ...p, estimated_arrival: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Catatan</Label>
                  <Textarea
                    value={shipData.notes ?? ""}
                    onChange={(e) => setShipData((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    placeholder="Catatan pengiriman (opsional)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShipOpen(false)}>Batal</Button>
                <Button onClick={handleSaveShipment} disabled={upsertShipment.isPending}>
                  <Truck className="h-4 w-4 mr-2" />
                  {upsertShipment.isPending ? "Menyimpan..." : "Simpan Resi"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      {selected && !shipOpen && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Pesanan — {selected.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Status Pesanan</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ORDER_STATUS[selected.status]?.color}`}>
                    {ORDER_STATUS[selected.status]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pembayaran</p>
                  <Badge className={selected.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {selected.payment_status === "paid" ? "Lunas" : "Belum Bayar"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-1">Alamat Pengiriman</p>
                  <p className="font-medium">{selected.shipping_name}</p>
                  <p>{selected.shipping_phone}</p>
                  <p className="text-muted-foreground">{selected.shipping_address}, {selected.shipping_city}, {selected.shipping_province} {selected.shipping_postal}</p>
                </div>
              </div>

              <Separator />
              <div>
                <p className="font-semibold text-sm mb-2">Item Pesanan</p>
                <div className="space-y-2">
                  {selected.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                            <Package className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <span>{item.product_name} × {item.quantity}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(selected.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ongkos Kirim</span><span>{formatCurrency(selected.shipping_cost)}</span></div>
                {selected.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600"><span>Diskon</span><span>-{formatCurrency(selected.discount_amount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>{formatCurrency(selected.total_amount)}</span></div>
              </div>

              {/* Bukti Pembayaran */}
              {selected.payment_proof_url && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <p className="font-semibold mb-2 flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-primary" />Bukti Pembayaran Jamaah
                    </p>
                    <ProofImage path={selected.payment_proof_url} />
                    {selected.payment_status === "unpaid" && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                        ⚠️ Bukti sudah diterima. Klik "Konfirmasi Pembayaran" jika transfer sudah terverifikasi.
                      </p>
                    )}
                  </div>
                </>
              )}

              {selected.shipment && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <p className="font-semibold mb-2">Info Pengiriman</p>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <p><span className="text-muted-foreground">Kurir:</span> {selected.shipment.courier_name} {selected.shipment.courier_service}</p>
                      <p><span className="text-muted-foreground">No. Resi:</span> <span className="font-mono font-medium">{selected.shipment.tracking_number}</span></p>
                      <p><span className="text-muted-foreground">Status:</span> <span className={`text-xs px-2 py-0.5 rounded-full ${SHIP_STATUS[selected.shipment.status]?.color}`}>{SHIP_STATUS[selected.shipment.status]?.label}</span></p>
                      {selected.shipment.estimated_arrival && (
                        <p><span className="text-muted-foreground">Estimasi:</span> {format(new Date(selected.shipment.estimated_arrival), "d MMMM yyyy", { locale: id })}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap gap-2">
                {selected.payment_status === "unpaid" && selected.status === "pending" && (
                  <Button size="sm" className="gap-2" onClick={() => { handleConfirmPayment(selected); setSelected(null); }}>
                    <CheckCircle className="h-4 w-4" />Konfirmasi Pembayaran
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-2" onClick={() => { setShipOpen(true); }}>
                  <Truck className="h-4 w-4" />Input / Update Resi
                </Button>
                {selected.status !== "cancelled" && selected.status !== "delivered" && (
                  <Select
                    onValueChange={(v) => { handleUpdateStatus(selected, v); setSelected(null); }}
                  >
                    <SelectTrigger className="w-40 h-9 text-sm">
                      <SelectValue placeholder="Ubah Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORDER_STATUS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
