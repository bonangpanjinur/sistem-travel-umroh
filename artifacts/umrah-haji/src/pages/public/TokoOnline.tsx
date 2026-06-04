import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Heart, ShoppingCart, Star, Filter, Package, 
  X, Plus, Minus, Send, Info, ChevronRight 
} from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { AppPageHeader } from "@/components/shared/AppPageHeader";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  category: string;
  badge?: string;
  badgeColor?: string;
  description: string;
}

interface CartItem {
  productId: string;
  quantity: number;
}

const PRODUCTS: Product[] = [
  { id: "p1", name: "Koper Kabin Umroh 20\" — Hardcase", price: 485_000, originalPrice: 650_000, rating: 4.8, reviews: 234, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400", category: "Koper & Tas", badge: "Best Seller", badgeColor: "bg-orange-500", description: "Koper kabin ringan, kuat & bergaransi 1 tahun. Terbuat dari bahan ABS+Polycarbonate yang tahan benturan. Dilengkapi dengan 4 roda putar 360 derajat yang senyap dan kunci kombinasi angka untuk keamanan ekstra." },
  { id: "p2", name: "Koper Besar Umroh 24\" — TSA Lock", price: 750_000, originalPrice: 950_000, rating: 4.7, reviews: 189, image: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400", category: "Koper & Tas", badge: "Sale 21%", badgeColor: "bg-red-500", description: "Koper ukuran bagasi 24 inch dengan standar keamanan TSA Lock. Cocok untuk perjalanan Umroh 9-12 hari. Memiliki kompartemen luas dengan pembatas jaring untuk organisasi barang yang lebih baik." },
  { id: "p3", name: "Tas Selempang Paspor Anti-RFID", price: 125_000, rating: 4.9, reviews: 512, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400", category: "Koper & Tas", badge: "Terlaris", badgeColor: "bg-emerald-500", description: "Tas paspor dengan teknologi pemblokir RFID untuk melindungi data kartu kredit dan paspor Anda dari pencurian digital. Desain slim, bisa dipakai di balik baju, bahan waterproof dan sangat ringan." },
  { id: "p4", name: "Set Ihram Premium — Katun Mesir", price: 185_000, originalPrice: 220_000, rating: 4.9, reviews: 678, image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4647?w=400", category: "Pakaian Ibadah", badge: "Recommended", badgeColor: "bg-teal-500", description: "Kain ihram 2 lembar (atas & bawah) terbuat dari katun Mesir premium 100%. Sangat nyaman, tidak panas, dan memiliki daya serap keringat yang sangat baik. Ukuran standar internasional." },
  { id: "p5", name: "Mukena Umroh — Katun Rayon", price: 145_000, rating: 4.8, reviews: 423, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", category: "Pakaian Ibadah", description: "Mukena khusus umroh dengan bahan katun rayon yang dingin dan jatuh. Desain simpel namun elegan, dilengkapi dengan tas kecil untuk memudahkan dibawa saat ke Masjidil Haram atau Masjid Nabawi." },
  { id: "p6", name: "Payung Lipat Anti-UV SPF50+", price: 95_000, rating: 4.7, reviews: 891, image: "https://images.unsplash.com/photo-1558869602-b4fb6d1d5b48?w=400", category: "Aksesoris", badge: "Wajib Bawa", badgeColor: "bg-blue-500", description: "Payung lipat otomatis dengan lapisan hitam anti-UV grade 50+. Melindungi Anda dari terik matahari Mekkah dan Madinah. Ukuran mini saat dilipat, mudah masuk ke dalam tas selempang." },
  { id: "p7", name: "Sajadah Lipat Travel — Anti Slip", price: 75_000, rating: 4.8, reviews: 334, image: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400", category: "Aksesoris", description: "Sajadah travel super ringan dan tipis, bisa dilipat hingga ukuran saku. Bagian bawah dilengkapi bintik anti-slip agar tidak bergeser saat digunakan di lantai masjid yang licin." },
  { id: "p8", name: "Tasbih Kristal Premium 33 Butir", price: 55_000, originalPrice: 80_000, rating: 4.9, reviews: 1203, image: "https://images.unsplash.com/photo-1609699018484-6e14c77e4b43?w=400", category: "Aksesoris", badge: "Populer", badgeColor: "bg-purple-500", description: "Tasbih kristal sintetis berkualitas tinggi dengan 33 butir. Berkilau saat terkena cahaya, sangat cantik sebagai teman dzikir atau sebagai hadiah/oleh-oleh umroh." },
  { id: "p9", name: "Bantal Leher Memory Foam", price: 115_000, rating: 4.6, reviews: 267, image: "https://images.unsplash.com/photo-1600701048049-3e7ccf6d5d4d?w=400", category: "Kenyamanan", description: "Bantal leher ergonomis dengan bahan memory foam yang empuk dan bisa mengikuti bentuk leher. Sangat membantu mengurangi pegal saat penerbangan panjang menuju Tanah Suci." },
  { id: "p10", name: "Obat Semprot Hidung — Saline", price: 45_000, rating: 4.8, reviews: 445, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400", category: "Kesehatan", badge: "Penting!", badgeColor: "bg-red-500", description: "Cairan saline steril dalam bentuk semprotan untuk menjaga kelembapan hidung di cuaca kering Arab Saudi. Mencegah hidung berdarah (mimisan) akibat udara yang terlalu kering." },
  { id: "p11", name: "Sunscreen SPF 50+ Halal", price: 85_000, originalPrice: 110_000, rating: 4.7, reviews: 556, image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400", category: "Kesehatan", description: "Tabir surya dengan formula halal, tanpa alkohol, dan tahan air/keringat. Memberikan perlindungan maksimal SPF 50+ dari radiasi sinar UVA dan UVB." },
  { id: "p12", name: "Al-Quran Pocket + Terjemahan", price: 65_000, rating: 5.0, reviews: 789, image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400", category: "Buku & Panduan", badge: "Terfavorit", badgeColor: "bg-emerald-600", description: "Al-Quran ukuran saku A6 yang praktis dibawa kemana saja. Dilengkapi dengan terjemahan bahasa Indonesia standar Kemenag RI dan tanda tajwid berwarna." },
];

const CATEGORIES = ["Semua", "Koper & Tas", "Pakaian Ibadah", "Aksesoris", "Kenyamanan", "Kesehatan", "Buku & Panduan"];
const STORAGE_KEY = "toko-favorites";
const CART_KEY = "toko-cart-items";

export default function TokoOnline() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
  });
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const toggleFav = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      return [...prev, { productId: product.id, quantity }];
    });
    toast({ 
      title: "Ditambahkan ke keranjang!", 
      description: `${product.name} (${quantity} item)`, 
      duration: 2000 
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const filtered = PRODUCTS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Semua" || p.category === category;
    const matchFav = !showFavOnly || favorites.includes(p.id);
    return matchSearch && matchCat && matchFav;
  });

  const cartTotalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalPrice = cartItems.reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const checkoutWhatsApp = () => {
    const itemsText = cartItems.map(item => {
      const product = PRODUCTS.find(p => p.id === item.productId);
      return `- ${product?.name} x${item.quantity} (${formatCurrency((product?.price || 0) * item.quantity)})`;
    }).join("%0A");
    
    const message = `Halo Vinstour Travel, saya ingin memesan perlengkapan umroh:%0A%0A${itemsText}%0A%0A*Total: ${formatCurrency(cartTotalPrice)}*%0A%0AMohon info cara pembayaran dan pengirimannya. Terima kasih.`;
    window.open(`https://wa.me/6281234567890?text=${message}`, "_blank");
  };

  const discount = (p: Product) => p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
        <AppPageHeader
          title="Toko Perlengkapan Umroh"
          subtitle="Lengkapi persiapan ibadah Anda"
          backTo="/"
          right={
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                  <ShoppingCart className="w-5 h-5 text-foreground/70" />
                  {cartTotalItems > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] p-0 flex items-center justify-center leading-none border-2 border-white dark:border-gray-950">
                      {cartTotalItems}
                    </Badge>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Keranjang Belanja
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-hidden">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <ShoppingCart className="w-10 h-10 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">Keranjang Kosong</h3>
                      <p className="text-sm text-gray-500 mb-6">Belum ada produk yang ditambahkan ke keranjang Anda.</p>
                      <Button onClick={() => setIsCartOpen(false)} className="bg-teal-600 hover:bg-teal-700">
                        Mulai Belanja
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-full p-4">
                      <div className="space-y-4">
                        {cartItems.map(item => {
                          const product = PRODUCTS.find(p => p.id === item.productId);
                          if (!product) return null;
                          return (
                            <div key={item.productId} className="flex gap-3">
                              <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium line-clamp-1">{product.name}</h4>
                                <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-teal-600">{formatCurrency(product.price)}</p>
                                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 rounded-lg p-1">
                                    <button 
                                      onClick={() => updateCartQuantity(item.productId, -1)}
                                      className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-white/20 rounded-md transition-colors"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                                    <button 
                                      onClick={() => updateCartQuantity(item.productId, 1)}
                                      className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-white/20 rounded-md transition-colors"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {cartItems.length > 0 && (
                  <SheetFooter className="p-4 border-t bg-gray-50 dark:bg-white/5 sm:flex-col gap-3">
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-medium">{formatCurrency(cartTotalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold">
                        <span>Total</span>
                        <span className="text-teal-600">{formatCurrency(cartTotalPrice)}</span>
                      </div>
                    </div>
                    <Button onClick={checkoutWhatsApp} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12">
                      <Send className="w-4 h-4" /> Pesan via WhatsApp
                    </Button>
                    <p className="text-[10px] text-center text-gray-400">
                      Anda akan diarahkan ke WhatsApp untuk konfirmasi pesanan
                    </p>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          }
        />
        
        <div className="max-w-4xl mx-auto px-4 mt-4">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          {/* Category + Favorite filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat ? "bg-teal-600 text-white" : "bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"}`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setShowFavOnly(!showFavOnly)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${showFavOnly ? "bg-red-500 text-white" : "bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"}`}
            >
              <Heart className="w-3 h-3" /> Favorit ({favorites.length})
            </button>
          </div>

          {/* Products grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(product => (
                <Card 
                  key={product.id} 
                  className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all bg-white dark:bg-white/5 cursor-pointer group"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="relative">
                    <img src={product.image} alt={product.name} className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    {product.badge && (
                      <Badge className={`absolute top-2 left-2 ${product.badgeColor} text-white border-0 text-[10px] px-1.5 py-0`}>{product.badge}</Badge>
                    )}
                    {discount(product) > 0 && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white border-0 text-[10px] px-1.5 py-0">-{discount(product)}%</Badge>
                    )}
                    <button
                      onClick={(e) => toggleFav(e, product.id)}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                    </button>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-[10px] text-gray-400 mb-0.5">{product.category}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight mb-1 line-clamp-2 min-h-[2.5rem]">{product.name}</p>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-[10px] text-gray-500">{product.rating} ({product.reviews})</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-base font-bold text-teal-600">{formatCurrency(product.price)}</span>
                      {product.originalPrice && (
                        <span className="text-[10px] text-gray-400 line-through ml-1">{formatCurrency(product.originalPrice)}</span>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }} 
                      className="w-full h-8 text-xs bg-teal-600 hover:bg-teal-700"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Keranjang
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="mt-8 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                <Info className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">Informasi Belanja</h3>
                <p className="text-xs text-gray-500">Panduan pemesanan perlengkapan</p>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold">1</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pilih perlengkapan yang Anda butuhkan dan masukkan ke keranjang.</p>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold">2</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Klik ikon keranjang di pojok kanan atas untuk melihat ringkasan pesanan.</p>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold">3</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Klik tombol "Pesan via WhatsApp" untuk terhubung dengan admin kami.</p>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold">4</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Admin akan mengkonfirmasi stok, ongkir, dan detail pembayaran.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          {selectedProduct && (
            <>
              <div className="relative h-64 sm:h-80">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {selectedProduct.badge && (
                  <Badge className={`absolute top-4 left-4 ${selectedProduct.badgeColor} text-white border-0`}>
                    {selectedProduct.badge}
                  </Badge>
                )}
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs text-teal-600 font-medium mb-1">{selectedProduct.category}</p>
                    <DialogTitle className="text-xl font-bold leading-tight">{selectedProduct.name}</DialogTitle>
                  </div>
                  <button 
                    onClick={(e) => toggleFav(e, selectedProduct.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(selectedProduct.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(selectedProduct.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{selectedProduct.rating}</span>
                  <span className="text-sm text-gray-500">({selectedProduct.reviews} ulasan)</span>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-teal-600">{formatCurrency(selectedProduct.price)}</span>
                    {selectedProduct.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">{formatCurrency(selectedProduct.originalPrice)}</span>
                    )}
                    {discount(selectedProduct) > 0 && (
                      <Badge variant="outline" className="text-red-500 border-red-500 text-xs">Hemat {discount(selectedProduct)}%</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Deskripsi Produk</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 h-12"
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                  >
                    <ShoppingCart className="w-4 h-4" /> + Keranjang
                  </Button>
                  <Button 
                    className="flex-1 bg-teal-600 hover:bg-teal-700 gap-2 h-12"
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                      setIsCartOpen(true);
                    }}
                  >
                    Beli Sekarang
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DynamicPublicLayout>
  );
}
