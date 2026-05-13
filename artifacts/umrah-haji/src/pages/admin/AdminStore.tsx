import { useStoreOrders, useStoreProducts, useStoreCategories } from "@/hooks/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ShoppingBag, Package, ShoppingCart, Tag, TrendingUp, Clock, CheckCircle, Truck, FileText, ArrowDownUp, BarChart3, ClipboardCheck, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: "Menunggu",   color: "bg-yellow-100 text-yellow-800" },
  confirmed:  { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-800" },
  processing: { label: "Diproses",   color: "bg-purple-100 text-purple-800" },
  shipped:    { label: "Dikirim",    color: "bg-indigo-100 text-indigo-800" },
  delivered:  { label: "Diterima",   color: "bg-green-100 text-green-800" },
  cancelled:  { label: "Dibatalkan", color: "bg-red-100 text-red-800" },
  refunded:   { label: "Refund",     color: "bg-gray-100 text-gray-800" },
};

export default function AdminStore() {
  const { data: orders = [] } = useStoreOrders();
  const { data: products = [] } = useStoreProducts();
  const { data: categories = [] } = useStoreCategories();

  const totalRevenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + o.total_amount, 0);

  const pendingOrders   = orders.filter((o) => o.status === "pending").length;
  const shippedOrders   = orders.filter((o) => o.status === "shipped").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const activeProducts  = products.filter((p) => p.is_active).length;
  const lowStock        = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  const recentOrders = orders.slice(0, 8);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Toko Online</h1>
          <p className="text-muted-foreground text-sm mt-1">Dashboard penjualan produk untuk jamaah</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/store/categories"><Tag className="h-4 w-4 mr-1" />Kategori</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/store/products"><Package className="h-4 w-4 mr-1" />Produk</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/admin/store/orders"><ShoppingCart className="h-4 w-4 mr-1" />Pesanan</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pesanan Masuk</p>
                <p className="text-xl font-bold text-yellow-600">{pendingOrders}</p>
                <p className="text-xs text-muted-foreground">menunggu konfirmasi</p>
              </div>
              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Dalam Pengiriman</p>
                <p className="text-xl font-bold text-indigo-600">{shippedOrders}</p>
                <p className="text-xs text-muted-foreground">{deliveredOrders} sudah diterima</p>
              </div>
              <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Truck className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Produk Aktif</p>
                <p className="text-xl font-bold">{activeProducts}</p>
                {lowStock > 0 && <p className="text-xs text-red-500">{lowStock} stok menipis</p>}
              </div>
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick access & recent orders */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Menu Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: "/admin/store/products", icon: Package, label: "Kelola Produk", desc: `${activeProducts} produk aktif` },
              { href: "/admin/store/orders", icon: ShoppingCart, label: "Kelola Pesanan", desc: `${orders.length} total pesanan` },
              { href: "/admin/store/categories", icon: Tag, label: "Kategori Produk", desc: `${categories.length} kategori` },
              { href: "/admin/store/suppliers", icon: Truck, label: "Supplier", desc: "Daftar supplier procurement" },
              { href: "/admin/store/purchase-orders", icon: FileText, label: "Purchase Order", desc: "Pembelian / restock barang" },
              { href: "/admin/store/sales-report", icon: BarChart3, label: "Laporan Penjualan", desc: "Pendapatan, HPP, laba kotor" },
              { href: "/admin/store/stock-movements", icon: ArrowDownUp, label: "Mutasi Stok", desc: "Riwayat pergerakan stok" },
              { href: "/admin/store/stock-opname", icon: ClipboardCheck, label: "Stock Opname", desc: "Hitung fisik vs sistem" },
              { href: "/admin/store/low-stock", icon: AlertTriangle, label: "Stok Menipis", desc: `${lowStock} produk perlu restock` },
            ].map((item) => (
              <Link key={item.href} to={item.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pesanan Terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/store/orders">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada pesanan</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentOrders.map((order) => {
                  const s = ORDER_STATUS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-800" };
                  return (
                    <Link key={order.id} to={`/admin/store/orders`}>
                      <div className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.shipping_name} · {format(new Date(order.created_at), "d MMM yyyy", { locale: id })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{formatCurrency(order.total_amount)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low stock products */}
      {lowStock > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-800">⚠️ Stok Menipis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products
                .filter((p) => p.stock > 0 && p.stock <= 5)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 shadow-sm">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <Badge variant="destructive" className="ml-2 shrink-0">{p.stock} sisa</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
