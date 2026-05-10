import { useState, useMemo } from "react";
import { useStoreProducts, useStoreCategories, type StoreProduct, type CartItem } from "@/hooks/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Star, Package, Plus, Minus, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Simple cart state lifted into this page (persisted in sessionStorage)
function loadCart(): CartItem[] {
  try { return JSON.parse(sessionStorage.getItem("store_cart") || "[]"); }
  catch { return []; }
}
function saveCart(cart: CartItem[]) {
  sessionStorage.setItem("store_cart", JSON.stringify(cart));
}

export default function StorePage() {
  const [search, setSearch]     = useState("");
  const [catId, setCatId]       = useState<string>("all");
  const [cart, setCart]         = useState<CartItem[]>(loadCart);
  const navigate                = useNavigate();

  const { data: products = [], isLoading } = useStoreProducts(undefined, true);
  const { data: categories = [] }          = useStoreCategories(true);

  const filtered = useMemo(() => {
    let list = products;
    if (catId !== "all") list = list.filter((p) => p.category_id === catId);
    if (search) {
      const t = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t) || p.description?.toLowerCase().includes(t));
    }
    return list;
  }, [products, search, catId]);

  const cartTotal   = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount   = cart.reduce((s, i) => s + i.quantity, 0);

  const getQty = (productId: string) =>
    cart.find((i) => i.product.id === productId)?.quantity ?? 0;

  const updateCart = (product: StoreProduct, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      let next: CartItem[];
      if (!existing) {
        if (delta <= 0) return prev;
        next = [...prev, { product, quantity: delta }];
      } else {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          next = prev.filter((i) => i.product.id !== product.id);
        } else if (newQty > product.stock) {
          toast.error("Stok tidak mencukupi");
          return prev;
        } else {
          next = prev.map((i) => i.product.id === product.id ? { ...i, quantity: newQty } : i);
        }
      }
      saveCart(next);
      return next;
    });
  };

  const goCheckout = () => {
    if (cart.length === 0) { toast.error("Keranjang masih kosong"); return; }
    navigate("/store/checkout");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShoppingBag className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Toko Vinstour</h1>
          </div>
          <p className="text-primary-foreground/80 text-lg">Perlengkapan ibadah & perjalanan terbaik untuk jamaah</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar filters */}
          <aside className="lg:w-56 shrink-0 space-y-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-white"
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <p className="font-semibold text-sm mb-3">Kategori</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setCatId("all")}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${catId === "all" ? "bg-primary text-white" : "hover:bg-muted"}`}
                  >
                    Semua Produk
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCatId(cat.id)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${catId === cat.id ? "bg-primary text-white" : "hover:bg-muted"}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <p className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Keranjang ({cartCount} item)
                  </p>
                  <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex justify-between">
                        <span className="truncate text-muted-foreground">{item.product.name} ×{item.quantity}</span>
                        <span className="font-medium ml-2 shrink-0">{formatCurrency(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-2 flex justify-between font-bold text-sm">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(cartTotal)}</span>
                  </div>
                  <Button onClick={goCheckout} className="w-full mt-3 gap-2" size="sm">
                    <ShoppingCart className="h-4 w-4" />Checkout
                  </Button>
                </CardContent>
              </Card>
            )}
          </aside>

          {/* Products grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Tidak ada produk ditemukan</p>
                <p className="text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filtered.map((product) => {
                  const qty = getQty(product.id);
                  const discount = product.original_price && product.original_price > product.price
                    ? Math.round((1 - product.price / product.original_price) * 100)
                    : null;
                  return (
                    <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="relative">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-40 bg-muted flex items-center justify-center">
                            <Package className="h-10 w-10 text-muted-foreground/40" />
                          </div>
                        )}
                        {discount && (
                          <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">
                            -{discount}%
                          </Badge>
                        )}
                        {product.is_featured && (
                          <Badge className="absolute top-2 right-2 bg-yellow-500 text-white text-xs gap-1">
                            <Star className="h-2.5 w-2.5 fill-white" />Unggulan
                          </Badge>
                        )}
                        {product.stock === 0 && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm bg-black/50 px-3 py-1 rounded">Stok Habis</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
                          {product.original_price && product.original_price > product.price && (
                            <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.original_price)}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {product.stock > 0 ? `Stok: ${product.stock}` : "Stok habis"}
                        </p>

                        {product.stock > 0 ? (
                          qty === 0 ? (
                            <Button
                              size="sm"
                              className="w-full gap-2 text-xs"
                              onClick={() => { updateCart(product, 1); toast.success("Ditambahkan ke keranjang"); }}
                            >
                              <ShoppingCart className="h-3 w-3" />Tambah
                            </Button>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateCart(product, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-semibold text-sm w-6 text-center">{qty}</span>
                              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateCart(product, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )
                        ) : (
                          <Button size="sm" className="w-full text-xs" disabled>Stok Habis</Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating cart button on mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 lg:hidden z-50">
          <Button onClick={goCheckout} size="lg" className="rounded-full shadow-xl gap-2 pr-5">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </div>
            <span>{formatCurrency(cartTotal)}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
