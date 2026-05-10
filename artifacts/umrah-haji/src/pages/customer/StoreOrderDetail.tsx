import { useParams, Link } from "react-router-dom";
import { useStoreOrder } from "@/hooks/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Truck, MapPin, CreditCard, CheckCircle, Clock, XCircle, ReceiptText } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const ORDER_STATUS: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  pending:    { label: "Menunggu Konfirmasi",  color: "bg-yellow-100 text-yellow-800",  icon: Clock,         desc: "Pesanan kamu sedang menunggu dikonfirmasi oleh tim kami." },
  confirmed:  { label: "Dikonfirmasi",         color: "bg-blue-100 text-blue-800",      icon: CheckCircle,   desc: "Pembayaran dikonfirmasi. Pesanan sedang diproses." },
  processing: { label: "Sedang Diproses",      color: "bg-purple-100 text-purple-800",  icon: Package,       desc: "Produk sedang dikemas dan disiapkan untuk pengiriman." },
  shipped:    { label: "Dalam Pengiriman",     color: "bg-indigo-100 text-indigo-800",  icon: Truck,         desc: "Pesanan sudah dikirim! Pantau nomor resi di bawah." },
  delivered:  { label: "Sudah Diterima",       color: "bg-green-100 text-green-800",    icon: CheckCircle,   desc: "Pesanan berhasil diterima. Terima kasih sudah berbelanja!" },
  cancelled:  { label: "Dibatalkan",           color: "bg-red-100 text-red-800",        icon: XCircle,       desc: "Pesanan ini telah dibatalkan." },
  refunded:   { label: "Refund",               color: "bg-gray-100 text-gray-800",      icon: XCircle,       desc: "Pesanan ini sudah direfund." },
};

const SHIP_STEPS: Record<string, number> = {
  preparing: 1, picked_up: 2, in_transit: 3, out_for_delivery: 4, delivered: 5,
};

const SHIP_STEP_LABELS = [
  { key: "preparing",        label: "Disiapkan",        icon: Package },
  { key: "picked_up",        label: "Dijemput Kurir",   icon: Truck },
  { key: "in_transit",       label: "Dalam Perjalanan", icon: Truck },
  { key: "out_for_delivery", label: "Siap Diantar",     icon: Truck },
  { key: "delivered",        label: "Terkirim",         icon: CheckCircle },
];

export default function StoreOrderDetail() {
  const { id: orderId } = useParams<{ id: string }>();
  const { data: order, isLoading } = useStoreOrder(orderId!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Pesanan tidak ditemukan</p>
          <Button asChild><Link to="/store/orders">Kembali ke Pesanan</Link></Button>
        </div>
      </div>
    );
  }

  const st = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
  const StatusIcon = st.icon;

  const currentShipStep = order.shipment ? (SHIP_STEPS[order.shipment.status] ?? 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/store/orders"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">Detail Pesanan</h1>
            <p className="text-xs text-muted-foreground font-mono">{order.order_number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status Card */}
        <Card>
          <CardContent className="p-5">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${st.color}`}>
              <StatusIcon className="h-4 w-4" />
              {st.label}
            </div>
            <p className="text-sm text-muted-foreground mt-2">{st.desc}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pesanan dibuat: {format(new Date(order.created_at), "d MMMM yyyy, HH:mm", { locale: id })}
            </p>
          </CardContent>
        </Card>

        {/* Tracking Timeline */}
        {order.shipment && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />Tracking Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-indigo-800">
                  {order.shipment.courier_name} {order.shipment.courier_service}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <ReceiptText className="h-4 w-4 text-indigo-600" />
                  <p className="font-mono text-indigo-700 font-bold">{order.shipment.tracking_number ?? "Belum ada resi"}</p>
                </div>
                {order.shipment.estimated_arrival && (
                  <p className="text-xs text-indigo-600 mt-1">
                    Estimasi tiba: {format(new Date(order.shipment.estimated_arrival), "d MMMM yyyy", { locale: id })}
                  </p>
                )}
              </div>

              {/* Step indicator */}
              {order.shipment.status !== "failed" && order.shipment.status !== "returned" && (
                <div className="flex items-center justify-between">
                  {SHIP_STEP_LABELS.map((step, idx) => {
                    const stepNum = idx + 1;
                    const done = currentShipStep >= stepNum;
                    const active = currentShipStep === stepNum;
                    const StepIcon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                          ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                          <StepIcon className="h-3.5 w-3.5" />
                        </div>
                        {idx < SHIP_STEP_LABELS.length - 1 && (
                          <div className={`hidden sm:block absolute h-0.5 w-12 translate-x-8 translate-y-[-20px] ${done ? "bg-primary" : "bg-muted"}`} />
                        )}
                        <p className={`text-xs text-center hidden sm:block ${active ? "font-semibold text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {order.shipment.notes && (
                <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">{order.shipment.notes}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />Status Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge className={order.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800 text-sm"}>
                  {order.payment_status === "paid" ? "✓ Sudah Dibayar" : "⏳ Menunggu Pembayaran"}
                </Badge>
                {order.paid_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Dibayar: {format(new Date(order.paid_at), "d MMM yyyy, HH:mm", { locale: id })}
                  </p>
                )}
              </div>
              <p className="font-bold text-xl text-primary">{formatCurrency(order.total_amount)}</p>
            </div>

            {order.payment_status === "unpaid" && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                <p className="font-semibold mb-2">📋 Cara Pembayaran</p>
                <p>Transfer sejumlah <strong>{formatCurrency(order.total_amount)}</strong> ke rekening perusahaan, lalu hubungi admin untuk konfirmasi pembayaran.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />Alamat Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{order.shipping_name}</p>
            <p className="text-muted-foreground">{order.shipping_phone}</p>
            <p>{order.shipping_address}</p>
            <p>{order.shipping_city}, {order.shipping_province} {order.shipping_postal}</p>
            {order.notes && <p className="text-muted-foreground italic">Catatan: {order.notes}</p>}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />Item Pesanan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items?.map((item) => (
              <div key={item.id} className="flex gap-3">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="h-16 w-16 rounded-lg object-cover border shrink-0" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-semibold text-sm">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}

            <Separator />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkos Kirim</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link to="/store/orders">← Pesanan Lain</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/store">Belanja Lagi</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
