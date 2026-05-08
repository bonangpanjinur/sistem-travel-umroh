import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { usePackages } from "@/hooks/usePackages";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  Check, X, Plus, Trash2, Scale, Plane, Hotel, Clock,
  Users, DollarSign, Star, ChevronRight, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_COMPARE = 3;

interface Package {
  id: string;
  name: string;
  code?: string;
  package_type?: string;
  duration_days?: number;
  price_quad?: number;
  price_triple?: number;
  price_double?: number;
  price_single?: number;
  description?: string;
  featured_image?: string;
  airline?: { name: string };
  departure_airport?: { name: string; code: string };
  hotel_makkah?: string;
  hotel_madinah?: string;
  includes_visa?: boolean;
  includes_manasik?: boolean;
  includes_equipment?: boolean;
  includes_insurance?: boolean;
  is_featured?: boolean;
  [key: string]: any;
}

function FeatureRow({ label, values }: { label: string; values: (boolean | string | number | null | undefined)[] }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4 text-sm font-medium text-muted-foreground w-[200px]">{label}</td>
      {values.map((val, idx) => (
        <td key={idx} className="py-3 px-4 text-center">
          {val === true ? (
            <div className="flex justify-center">
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-green-600" />
              </div>
            </div>
          ) : val === false ? (
            <div className="flex justify-center">
              <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-red-500" />
              </div>
            </div>
          ) : val == null ? (
            <span className="text-muted-foreground text-sm">—</span>
          ) : (
            <span className="text-sm font-medium">{val}</span>
          )}
        </td>
      ))}
      {values.length < MAX_COMPARE && Array.from({ length: MAX_COMPARE - values.length }).map((_, i) => (
        <td key={`empty-${i}`} className="py-3 px-4 text-center text-muted-foreground/30">—</td>
      ))}
    </tr>
  );
}

function PriceBadge({ price, selected }: { price: number; selected: boolean }) {
  return (
    <span className={cn(
      "text-2xl font-extrabold",
      selected ? "text-green-600" : "text-foreground"
    )}>
      {formatCurrency(price)}
    </span>
  );
}

export default function PackageCompare() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const { data: packages = [], isLoading } = usePackages();

  const selectedPackages = useMemo(
    () => compareIds.map(id => packages.find((p: any) => p.id === id)).filter(Boolean) as Package[],
    [compareIds, packages]
  );

  const availableToAdd = packages.filter((p: any) => !compareIds.includes(p.id));

  const addPackage = (id: string) => {
    if (compareIds.length < MAX_COMPARE && !compareIds.includes(id)) {
      setCompareIds(prev => [...prev, id]);
    }
  };

  const removePackage = (id: string) => {
    setCompareIds(prev => prev.filter(x => x !== id));
  };

  const cheapestPrice = (pkg: Package) => {
    const prices = [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
      .map(p => Number(p) || 0)
      .filter(p => p > 0);
    return prices.length ? Math.min(...prices) : 0;
  };

  const lowestPriceIndex = useMemo(() => {
    if (selectedPackages.length < 2) return -1;
    let minIdx = 0;
    let minPrice = cheapestPrice(selectedPackages[0]);
    for (let i = 1; i < selectedPackages.length; i++) {
      const p = cheapestPrice(selectedPackages[i]);
      if (p > 0 && (p < minPrice || minPrice === 0)) {
        minPrice = p;
        minIdx = i;
      }
    }
    return minPrice > 0 ? minIdx : -1;
  }, [selectedPackages]);

  return (
    <DynamicPublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium mb-4">
            <Scale className="h-4 w-4" />
            Perbandingan Paket
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Bandingkan Paket<br />
            <span className="text-blue-600 dark:text-blue-400">Side by Side</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pilih hingga {MAX_COMPARE} paket untuk dibandingkan fitur, harga, dan layanannya secara langsung.
          </p>
        </div>

        {/* Package Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pilih Paket yang Ingin Dibandingkan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-center">
              {selectedPackages.map((pkg) => (
                <div key={pkg.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <span className="text-sm font-medium truncate max-w-[200px]">{pkg.name}</span>
                  <button
                    onClick={() => removePackage(pkg.id)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {compareIds.length < MAX_COMPARE && (
                <Select onValueChange={addPackage} value="">
                  <SelectTrigger className="w-[240px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Plus className="h-4 w-4" />
                      <span>Tambah Paket {compareIds.length + 1}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <div className="p-2 text-sm text-muted-foreground">Memuat paket...</div>
                    ) : availableToAdd.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Semua paket dipilih</div>
                    ) : (
                      availableToAdd.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {compareIds.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCompareIds([])} className="text-muted-foreground">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {selectedPackages.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Scale className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-semibold mb-2">Belum ada paket dipilih</p>
            <p className="text-sm">Pilih minimal 2 paket di atas untuk mulai membandingkan.</p>
            {isLoading && (
              <div className="mt-6 flex justify-center gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-36 rounded-xl" />)}
              </div>
            )}
          </div>
        )}

        {/* Comparison Table */}
        {selectedPackages.length > 0 && (
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <table className="w-full min-w-[600px]">
              {/* Package Header Row */}
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-4 text-left text-sm font-semibold text-muted-foreground w-[200px]">
                    Perbandingan
                  </th>
                  {selectedPackages.map((pkg, idx) => (
                    <th key={pkg.id} className="p-4 text-center min-w-[200px]">
                      <div className="space-y-2">
                        {pkg.featured_image && (
                          <img src={pkg.featured_image} alt={pkg.name} className="w-full h-24 object-cover rounded-lg" />
                        )}
                        <div>
                          {pkg.is_featured && (
                            <Badge className="mb-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30">
                              <Star className="h-3 w-3 mr-1" />
                              Unggulan
                            </Badge>
                          )}
                          <p className="font-bold text-sm">{pkg.name}</p>
                          {pkg.code && <p className="text-xs text-muted-foreground">#{pkg.code}</p>}
                          {lowestPriceIndex === idx && selectedPackages.length > 1 && (
                            <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 mt-1">
                              Harga Terbaik
                            </Badge>
                          )}
                        </div>
                        <button
                          onClick={() => removePackage(pkg.id)}
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mx-auto"
                        >
                          <X className="h-3 w-3" />
                          Hapus
                        </button>
                      </div>
                    </th>
                  ))}
                  {selectedPackages.length < MAX_COMPARE && (
                    <th className="p-4 text-center min-w-[200px]">
                      <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 text-muted-foreground">
                        <Plus className="h-6 w-6 mx-auto mb-1" />
                        <p className="text-xs">Tambah Paket</p>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {/* Section: Harga */}
                <tr className="bg-blue-50 dark:bg-blue-950/20">
                  <td colSpan={MAX_COMPARE + 1} className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    <DollarSign className="inline h-3.5 w-3.5 mr-1" />
                    Harga
                  </td>
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4 text-sm font-medium text-muted-foreground">Harga Quad (4 org)</td>
                  {selectedPackages.map((pkg, idx) => (
                    <td key={pkg.id} className="py-3 px-4 text-center">
                      {pkg.price_quad ? <PriceBadge price={Number(pkg.price_quad)} selected={lowestPriceIndex === idx} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  {selectedPackages.length < MAX_COMPARE && <td />}
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4 text-sm font-medium text-muted-foreground">Harga Triple (3 org)</td>
                  {selectedPackages.map(pkg => (
                    <td key={pkg.id} className="py-3 px-4 text-center text-sm font-medium">
                      {pkg.price_triple ? formatCurrency(Number(pkg.price_triple)) : '—'}
                    </td>
                  ))}
                  {selectedPackages.length < MAX_COMPARE && <td />}
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4 text-sm font-medium text-muted-foreground">Harga Double (2 org)</td>
                  {selectedPackages.map(pkg => (
                    <td key={pkg.id} className="py-3 px-4 text-center text-sm font-medium">
                      {pkg.price_double ? formatCurrency(Number(pkg.price_double)) : '—'}
                    </td>
                  ))}
                  {selectedPackages.length < MAX_COMPARE && <td />}
                </tr>
                <tr className="border-b hover:bg-muted/30">
                  <td className="py-3 px-4 text-sm font-medium text-muted-foreground">Harga Single (1 org)</td>
                  {selectedPackages.map(pkg => (
                    <td key={pkg.id} className="py-3 px-4 text-center text-sm font-medium">
                      {pkg.price_single ? formatCurrency(Number(pkg.price_single)) : '—'}
                    </td>
                  ))}
                  {selectedPackages.length < MAX_COMPARE && <td />}
                </tr>

                {/* Section: Detail */}
                <tr className="bg-green-50 dark:bg-green-950/20">
                  <td colSpan={MAX_COMPARE + 1} className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />
                    Detail Perjalanan
                  </td>
                </tr>
                <FeatureRow label="Durasi" values={selectedPackages.map(p => p.duration_days ? `${p.duration_days} Hari` : null)} />
                <FeatureRow label="Tipe Paket" values={selectedPackages.map(p => p.package_type || null)} />
                <FeatureRow label="Maskapai" values={selectedPackages.map(p => (p.airline as any)?.name || null)} />
                <FeatureRow label="Bandara Keberangkatan" values={selectedPackages.map(p => {
                  const dep = p.departure_airport as any;
                  return dep ? `${dep.name} (${dep.code})` : null;
                })} />
                <FeatureRow label="Hotel Makkah" values={selectedPackages.map(p => p.hotel_makkah || null)} />
                <FeatureRow label="Hotel Madinah" values={selectedPackages.map(p => p.hotel_madinah || null)} />

                {/* Section: Layanan */}
                <tr className="bg-amber-50 dark:bg-amber-950/20">
                  <td colSpan={MAX_COMPARE + 1} className="py-2 px-4 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    <Check className="inline h-3.5 w-3.5 mr-1" />
                    Layanan Termasuk
                  </td>
                </tr>
                <FeatureRow label="Visa Termasuk" values={selectedPackages.map(p => p.includes_visa ?? null)} />
                <FeatureRow label="Manasik Intensif" values={selectedPackages.map(p => p.includes_manasik ?? null)} />
                <FeatureRow label="Perlengkapan Jamaah" values={selectedPackages.map(p => p.includes_equipment ?? null)} />
                <FeatureRow label="Asuransi Perjalanan" values={selectedPackages.map(p => p.includes_insurance ?? null)} />

                {/* CTA Row */}
                <tr className="bg-muted/30">
                  <td className="py-4 px-4 text-sm font-medium text-muted-foreground">Pilih Paket</td>
                  {selectedPackages.map(pkg => (
                    <td key={pkg.id} className="py-4 px-4 text-center">
                      <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
                        <Link to={`/packages/${pkg.id}`}>
                          Daftar Sekarang
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </td>
                  ))}
                  {selectedPackages.length < MAX_COMPARE && <td />}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Quick Pick from Catalogue */}
        {selectedPackages.length > 0 && selectedPackages.length < MAX_COMPARE && !isLoading && availableToAdd.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-3">Paket Lainnya yang Bisa Dibandingkan</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableToAdd.slice(0, 8).map((pkg: any) => (
                <button
                  key={pkg.id}
                  onClick={() => addPackage(pkg.id)}
                  className="p-3 border rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all group"
                >
                  <p className="text-sm font-semibold line-clamp-2 group-hover:text-blue-600">{pkg.name}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">{formatCurrency(Number(pkg.price_quad) || 0)}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-3 w-3" />
                    Bandingkan
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Back to packages */}
        <div className="text-center pt-4">
          <Button variant="outline" asChild>
            <Link to="/packages">
              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
              Kembali ke Katalog Paket
            </Link>
          </Button>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
