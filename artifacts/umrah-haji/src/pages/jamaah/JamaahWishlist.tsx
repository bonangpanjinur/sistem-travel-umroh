import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Package, ArrowLeft, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { PackageCardPWA } from "@/components/pwa/PackageCardPWA";
import { useWishlist } from "@/hooks/useWishlist";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { Skeleton } from "@/components/ui/skeleton";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function JamaahWishlist() {
  const { packages, isLoading, clearAll, count } = useWishlist();
  const { data: settings } = useWebsiteSettings();
  const themeColor = settings?.primary_color ?? "#15803d";

  return (
    <div className="min-h-screen bg-background pb-24 md:pl-16">
      <JamaahBottomNav />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
        <Link to="/jamaah" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
            Paket Tersimpan
          </h1>
          {count > 0 && (
            <p className="text-xs text-muted-foreground">{count} paket disimpan</p>
          )}
        </div>
        {count > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus semua
          </Button>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-border">
                <Skeleton className="h-36 w-full" />
                <div className="p-3.5 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && count === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex flex-col items-center justify-center py-20 text-center px-6"
          >
            <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-5">
              <Heart className="h-9 w-9 text-rose-300" />
            </div>
            <h2 className="font-bold text-lg mb-2">Belum ada paket tersimpan</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Tekan ikon hati pada kartu paket untuk menyimpannya di sini agar mudah ditemukan kembali.
            </p>
            <Button asChild style={{ backgroundColor: themeColor }}>
              <Link to="/packages" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Jelajahi Paket
              </Link>
            </Button>
          </motion.div>
        )}

        {/* Package cards */}
        {!isLoading && packages.length > 0 && (
          <AnimatePresence>
            <div className="space-y-3">
              {packages.map((pkg: any, i: number) => (
                <PackageCardPWA
                  key={pkg.id}
                  pkg={pkg}
                  index={i}
                  themeColor={themeColor}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Browse more */}
        {!isLoading && packages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 mb-4"
          >
            <Button asChild variant="outline" className="w-full gap-2">
              <Link to="/packages">
                <Package className="h-4 w-4" />
                Jelajahi Lebih Banyak Paket
              </Link>
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
