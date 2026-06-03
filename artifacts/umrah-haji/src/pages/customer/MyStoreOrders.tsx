import { useMyStoreOrders } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useSearchParams } from "react-router-dom";
import { ShoppingBag, Package, Truck, CheckCircle, Clock, XCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";

const ORDER_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-800",  icon: Clock },
  confirmed:  { label: "Pesanan Dikonfirmasi", color: "bg-blue-100 text-blue-800",    icon: CheckCircle },
  processing: { label: "Sedang Diproses",     color: "bg-purple-100 text-purple-800", icon: Package },
  shipped:    { label: "Dalam Pengiriman",    color: "bg-indigo-100 text-indigo-800",  icon: Truck },
  delivered:  { label: "Pesanan Diterima",    color: "bg-green-100 text-green-800",   icon: CheckCircle },
  cancelled:  { label: "Dibatalkan",          color: "bg-red-100 text-red-800",       icon: XCircle },
  refunded:   { label: "Refund",              color: "bg-gray-100 text-gray-800",     icon: XCircle },
};

const SHIP_STATUS: Record<string, string> = {
  preparing:        "Disiapkan penjual",
  picked_up:        "Dijemput kurir",
  in_transit:       "Dalam perjalanan",
  out_for_delivery: "Sedang diantarkan",
  delivered:        "Sudah diterima",
  failed:           "Gagal diantar",
  returned:         "Dikembalikan",
};

export default function MyStoreOrders() {
  const { user }                = useAuth();
  const [params]                = useSearchParams();
  const isNew                   = params.get("new") === "1";

  const { data: orders = [], isLoading } = useMyStoreOrders(user?.id);

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/store"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Pesanan Saya</h1>
            <p className="text-sm text-muted-foreground">Riwayat belanja di Toko Vinstour</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* New order success banner */}
        {isNew && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
            <p className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />Pesanan berhasil dibuat!
            </p>
            <p className="text-sm mt-1">Silakan transfer dan unggah bukti pembayaran pada pesanan di bawah.</p>
          </div>
        )}

        {!user ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground mb-4">Silakan login untuk melihat pesanan</p>
            <Button asChild><Link to="/auth/login">Login</Link></Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-lg font-semibold">Belum ada pesanan</h2>
            <p className="text-sm mt-1 mb-6">Yuk mulai belanja perlengkapan ibadahmu</p>
            <Button asChild><Link to="/store">Belanja Sekarang</Link></Button>
          </div>
        ) : (
          orders.map((order) => {
            const st = ORDER_STATUS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-800", icon: Package };
            const Icon = st.icon;
            return (
              <Link key={order.id} to={`/store/orders/${order.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-mono font-semibold text-sm">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(order.created_at), "d MMMM yyyy, HH:mm", { locale: id })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
                          <Icon className="h-3 w-3 inline mr-1" />
                          {st.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="flex gap-2 mb-4 overflow-hidden">
                      {order.items?.slice(0, 3).map((item) => (
                        <div key={item.id} className="relative shrink-0">
                          {item.product_image ? (
                            <img src={item.product_image} alt={item.product_name} className="h-14 w-14 rounded-lg object-cover border" />
                          ) : (
                            <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          {item.quantity > 1 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                              {item.quantity}
                            </span>
                          )}
                        </div>
                      ))}
                      {(order.items?.length ?? 0) > 3 && (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs text-muted-foreground font-medium">+{(order.items?.length ?? 0) - 3}</span>
                        </div>
                      )}
                    </div>

                    {/* Tracking info if shipped */}
                    {order.shipment?.tracking_number && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-3 text-xs">
                        <p className="text-indigo-700 font-medium">
                          🚚 {order.shipment.courier_name} — No. Resi: <span className="font-mono">{order.shipment.tracking_number}</span>
                        </p>
                        {order.shipment.status && (
                          <p className="text-indigo-600 mt-0.5">{SHIP_STATUS[order.shipment.status]}</p>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{order.items?.length ?? 0} produk</p>
                        <p className="font-bold text-base">{formatCurrency(order.total_amount)}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={order.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                          {order.payment_status === "paid" ? "✓ Lunas" : "Belum Dibayar"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}

        {orders.length > 0 && (
          <div className="text-center pt-4">
            <Button variant="outline" asChild>
              <Link to="/store"><ShoppingBag className="h-4 w-4 mr-2" />Belanja Lagi</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
    </DynamicPublicLayout>
  );
}
