import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Heart, ShoppingCart, Star, Filter, Package } from "lucide-react";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { AppPageHeader } from "@/components/shared/AppPageHeader";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

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

const PRODUCTS: Product[] = [
  { id: "p1", name: "Koper Kabin Umroh 20\" — Hardcase", price: 485_000, originalPrice: 650_000, rating: 4.8, reviews: 234, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400", category: "Koper & Tas", badge: "Best Seller", badgeColor: "bg-orange-500", description: "Koper kabin ringan, kuat & bergaransi 1 tahun" },
  { id: "p2", name: "Koper Besar Umroh 24\" — TSA Lock", price: 750_000, originalPrice: 950_000, rating: 4.7, reviews: 189, image: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400", category: "Koper & Tas", badge: "Sale 21%", badgeColor: "bg-red-500", description: "Koper besar dengan kunci TSA, 4 roda putar 360°" },
  { id: "p3", name: "Tas Selempang Paspor Anti-RFID", price: 125_000, rating: 4.9, reviews: 512, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400", category: "Koper & Tas", badge: "Terlaris", badgeColor: "bg-emerald-500", description: "Tas paspor anti-RFID, waterproof, multi-slot" },
  { id: "p4", name: "Set Ihram Premium — Katun Mesir", price: 185_000, originalPrice: 220_000, rating: 4.9, reviews: 678, image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4647?w=400", category: "Pakaian Ibadah", badge: "Recommended", badgeColor: "bg-teal-500", description: "Kain ihram 2 lembar katun Mesir premium, nyaman & menyerap keringat" },
  { id: "p5", name: "Mukena Umroh — Katun Rayon", price: 145_000, rating: 4.8, reviews: 423, image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", category: "Pakaian Ibadah", description: "Mukena tipis & ringan, cocok untuk iklim panas Arab Saudi" },
  { id: "p6", name: "Payung Lipat Anti-UV SPF50+", price: 95_000, rating: 4.7, reviews: 891, image: "https://images.unsplash.com/photo-1558869602-b4fb6d1d5b48?w=400", category: "Aksesoris", badge: "Wajib Bawa", badgeColor: "bg-blue-500", description: "Payung anti-UV grade 50+, otomatis, ringan & mini" },
  { id: "p7", name: "Sajadah Lipat Travel — Anti Slip", price: 75_000, rating: 4.8, reviews: 334, image: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400", category: "Aksesoris", description: "Sajadah tipis bisa dilipat saku, bahan anti-selip" },
  { id: "p8", name: "Tasbih Kristal Premium 33 Butir", price: 55_000, originalPrice: 80_000, rating: 4.9, reviews: 1203, image: "https://images.unsplash.com/photo-1609699018484-6e14c77e4b43?w=400", category: "Aksesoris", badge: "Populer", badgeColor: "bg-purple-500", description: "Tasbih kristal bening 33 butir dengan kotak hadiah" },
  { id: "p9", name: "Bantal Leher Memory Foam", price: 115_000, rating: 4.6, reviews: 267, image: "https://images.unsplash.com/photo-1600701048049-3e7ccf6d5d4d?w=400", category: "Kenyamanan", description: "Bantal leher memory foam untuk perjalanan panjang" },
  { id: "p10", name: "Obat Semprot Hidung — Saline", price: 45_000, rating: 4.8, reviews: 445, image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400", category: "Kesehatan", badge: "Penting!", badgeColor: "bg-red-500", description: "Semprot hidung saline untuk cuaca kering Arab Saudi" },
  { id: "p11", name: "Sunscreen SPF 50+ Halal", price: 85_000, originalPrice: 110_000, rating: 4.7, reviews: 556, image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400", category: "Kesehatan", description: "Tabir surya halal tahan keringat, SPF 50+, water resistant" },
  { id: "p12", name: "Al-Quran Pocket + Terjemahan", price: 65_000, rating: 5.0, reviews: 789, image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400", category: "Buku & Panduan", badge: "Terfavorit", badgeColor: "bg-emerald-600", description: "Al-Quran ukuran saku A6 dengan terjemahan lengkap" },
];

const CATEGORIES = ["Semua", "Koper & Tas", "Pakaian Ibadah", "Aksesoris", "Kenyamanan", "Kesehatan", "Buku & Panduan"];
const STORAGE_KEY = "toko-favorites";
const CART_KEY = "toko-cart";

export default function TokoOnline() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [cart, setCart] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
  });
  const [showFavOnly, setShowFavOnly] = useState(false);
  const { toast } = useToast();

  const toggleFav = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addToCart = (product: Product) => {
    const next = [...cart, product.id];
    setCart(next);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    toast({ title: "Ditambahkan ke keranjang!", description: product.name, duration: 2000 });
  };

  const filtered = PRODUCTS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Semua" || p.category === category;
    const matchFav = !showFavOnly || favorites.includes(p.id);
    return matchSearch && matchCat && matchFav;
  });

  const cartCount = new Set(cart).size;
  const discount = (p: Product) => p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

  return (
    <DynamicPublicLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
        <AppPageHeader
          title="Toko Perlengkapan Umroh"
          subtitle="Lengkapi persiapan ibadah Anda"
          backTo="/"
          right={
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-foreground/70" />
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-4 h-4 p-0 flex items-center justify-center leading-none">
                  {cartCount}
                </Badge>
              )}
            </div>
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
                <Card key={product.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-white/5">
                  <div className="relative">
                    <img src={product.image} alt={product.name} className="w-full h-36 object-cover" loading="lazy" />
                    {product.badge && (
                      <Badge className={`absolute top-2 left-2 ${product.badgeColor} text-white border-0 text-xs`}>{product.badge}</Badge>
                    )}
                    {discount(product) > 0 && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white border-0 text-xs">-{discount(product)}%</Badge>
                    )}
                    <button
                      onClick={() => toggleFav(product.id)}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow"
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                    </button>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{product.category}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white leading-tight mb-1 line-clamp-2">{product.name}</p>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-500">{product.rating} ({product.reviews})</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-base font-bold text-teal-600">{formatCurrency(product.price)}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-gray-400 line-through ml-1">{formatCurrency(product.originalPrice)}</span>
                      )}
                    </div>
                    <Button size="sm" onClick={() => addToCart(product)} className="w-full h-7 text-xs bg-teal-600 hover:bg-teal-700">
                      <ShoppingCart className="w-3 h-3 mr-1" /> Keranjang
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="mt-6 bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 text-sm text-teal-700 dark:text-teal-300">
            <p className="font-medium mb-1">🛒 Cara Pemesanan</p>
            <p className="text-xs opacity-80">Pilih produk → Tambah ke keranjang → Hubungi kami via WhatsApp untuk konfirmasi pesanan dan pembayaran. Pengiriman ke seluruh Indonesia.</p>
          </div>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
