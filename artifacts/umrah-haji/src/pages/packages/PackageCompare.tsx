import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { usePackages } from "@/hooks/usePackages";
import { DynamicPublicLayout } from "@/components/layout/DynamicPublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, getPackageTypeLabel } from "@/lib/format";
import {
  Check, X, Plus, Trash2, Scale, Plane, Hotel, Clock,
  Users, DollarSign, Star, ChevronRight, ArrowRight, TrendingDown,
  MapPin, Briefcase, Shield, Utensils, Wifi, Zap, Download, Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PackageLabelBadges } from "@/components/packages/PackageLabelBadges";

const MAX_COMPARE = 4;
const ROOM_TYPES = [
  { value: 'quad', label: 'Quad (4 Org)', icon: Users },
  { value: 'triple', label: 'Triple (3 Org)', icon: Users },
  { value: 'double', label: 'Double (2 Org)', icon: Users },
  { value: 'single', label: 'Single (1 Org)', icon: Users },
];

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
  hotel_makkah?: { name: string; star_rating?: number };
  hotel_madinah?: { name: string; star_rating?: number };
  includes_visa?: boolean;
  includes_manasik?: boolean;
  includes_equipment?: boolean;
  includes_insurance?: boolean;
  is_featured?: boolean;
  currency?: string;
  itinerary?: any;
  [key: string]: any;
}

interface ComparisonCell {
  value: boolean | string | number | null | undefined;
  highlight?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

function FeatureRow({ 
  label, 
  values, 
  icon: Icon,
  category 
}: { 
  label: string; 
  values: (boolean | string | number | null | undefined)[]; 
  icon?: any;
  category?: string;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-4 px-4 text-sm font-medium text-muted-foreground w-[220px] flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary/60" />}
        {label}
      </td>
      {values.map((val, idx) => (
        <td key={idx} className="py-4 px-4 text-center">
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
            <span className="text-sm font-medium text-foreground">{val}</span>
          )}
        </td>
      ))}
      {values.length < MAX_COMPARE && Array.from({ length: MAX_COMPARE - values.length }).map((_, i) => (
        <td key={`empty-${i}`} className="py-4 px-4 text-center text-muted-foreground/30">—</td>
      ))}
    </tr>
  );
}

function PriceBadge({ 
  price, 
  isLowest, 
  currency,
  showTrend 
}: { 
  price: number; 
  isLowest?: boolean; 
  currency?: string;
  showTrend?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn(
        "text-2xl font-extrabold",
        isLowest ? "text-green-600 dark:text-green-400" : "text-foreground"
      )}>
        {formatCurrency(price, currency)}
      </span>
      {isLowest && showTrend && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold">
          <TrendingDown className="h-3 w-3" />
          Terendah
        </div>
      )}
    </div>
  );
}

function PackageHeader({ 
  pkg, 
  onRemove,
  lowestPriceIndex,
  index
}: { 
  pkg: Package; 
  onRemove: () => void;
  lowestPriceIndex: number;
  index: number;
}) {
  return (
    <div className="space-y-3">
      {pkg.featured_image && (
        <div className="relative overflow-hidden rounded-lg h-32">
          <img 
            src={pkg.featured_image} 
            alt={pkg.name} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {pkg.is_featured && (
              <Badge className="mb-2 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30">
                <Star className="h-3 w-3 mr-1" />
                Unggulan
              </Badge>
            )}
            <p className="font-bold text-sm line-clamp-2">{pkg.name}</p>
            {pkg.code && <p className="text-xs text-muted-foreground">#{pkg.code}</p>}
          </div>
          <button
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Custom Labels */}
        <PackageLabelBadges packageId={pkg.id} size="sm" className="flex-wrap" />

        {/* Package Type Badge */}
        <Badge className="w-fit text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30">
          {getPackageTypeLabel(pkg.package_type)}
        </Badge>

        {/* Best Price Indicator */}
        {lowestPriceIndex === index && (
          <Badge className="w-fit text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30">
            <TrendingDown className="h-2.5 w-2.5 mr-1" />
            Harga Terbaik
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function PackageCompare() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<'quad' | 'triple' | 'double' | 'single'>('quad');
  const [activeTab, setActiveTab] = useState('pricing');
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

  const getPriceByRoomType = (pkg: Package, roomType: string): number => {
    const priceMap: Record<string, number> = {
      quad: Number(pkg.price_quad) || 0,
      triple: Number(pkg.price_triple) || 0,
      double: Number(pkg.price_double) || 0,
      single: Number(pkg.price_single) || 0,
    };
    return priceMap[roomType] || 0;
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

  const pricesByRoomType = useMemo(() => {
    return selectedPackages.map(pkg => getPriceByRoomType(pkg, selectedRoomType));
  }, [selectedPackages, selectedRoomType]);

  const lowestPriceByRoomType = useMemo(() => {
    const validPrices = pricesByRoomType.filter(p => p > 0);
    return validPrices.length > 0 ? Math.min(...validPrices) : 0;
  }, [pricesByRoomType]);

  const priceDifference = useMemo(() => {
    const validPrices = pricesByRoomType.filter(p => p > 0);
    if (validPrices.length < 2) return 0;
    return Math.max(...validPrices) - Math.min(...validPrices);
  }, [pricesByRoomType]);

  const handleExportComparison = () => {
    // Generate CSV export
    const headers = ['Kriteria', ...selectedPackages.map(p => p.name)];
    const rows = [
      headers,
      ['Tipe Paket', ...selectedPackages.map(p => getPackageTypeLabel(p.package_type))],
      ['Durasi', ...selectedPackages.map(p => `${p.duration_days} Hari`)],
      ['Harga Quad', ...selectedPackages.map(p => formatCurrency(Number(p.price_quad) || 0, p.currency))],
      ['Harga Triple', ...selectedPackages.map(p => formatCurrency(Number(p.price_triple) || 0, p.currency))],
      ['Harga Double', ...selectedPackages.map(p => formatCurrency(Number(p.price_double) || 0, p.currency))],
      ['Harga Single', ...selectedPackages.map(p => formatCurrency(Number(p.price_single) || 0, p.currency))],
      ['Hotel Makkah', ...selectedPackages.map(p => (p.hotel_makkah as any)?.name || '-')],
      ['Hotel Madinah', ...selectedPackages.map(p => (p.hotel_madinah as any)?.name || '-')],
      ['Maskapai', ...selectedPackages.map(p => (p.airline as any)?.name || '-')],
      ['Visa Termasuk', ...selectedPackages.map(p => p.includes_visa ? 'Ya' : 'Tidak')],
      ['Manasik', ...selectedPackages.map(p => p.includes_manasik ? 'Ya' : 'Tidak')],
      ['Equipment', ...selectedPackages.map(p => p.includes_equipment ? 'Ya' : 'Tidak')],
      ['Asuransi', ...selectedPackages.map(p => p.includes_insurance ? 'Ya' : 'Tidak')],
    ];

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `perbandingan-paket-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <DynamicPublicLayout>
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
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
            Pilih hingga {MAX_COMPARE} paket untuk dibandingkan fitur, harga, dan layanannya secara langsung. Analisis perbedaan untuk membuat keputusan terbaik.
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

        {/* Comparison Section */}
        {selectedPackages.length > 0 && (
          <div className="space-y-6">
            {/* Room Type Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pilih Tipe Kamar untuk Perbandingan Harga</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ROOM_TYPES.map((room) => (
                    <button
                      key={room.value}
                      onClick={() => setSelectedRoomType(room.value as any)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left",
                        selectedRoomType === room.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : "border-muted hover:border-blue-300"
                      )}
                    >
                      <p className="text-sm font-semibold">{room.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedPackages.some(p => getPriceByRoomType(p, room.value) > 0)
                          ? `Mulai ${formatCurrency(
                              Math.min(...selectedPackages
                                .map(p => getPriceByRoomType(p, room.value))
                                .filter(p => p > 0)),
                              selectedPackages[0]?.currency
                            )}`
                          : "Tidak tersedia"}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Different Comparison Views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pricing">Harga</TabsTrigger>
                <TabsTrigger value="details">Detail</TabsTrigger>
                <TabsTrigger value="services">Layanan</TabsTrigger>
                <TabsTrigger value="summary">Ringkasan</TabsTrigger>
              </TabsList>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedPackages.map((pkg, idx) => (
                    <Card key={pkg.id} className={cn(
                      "relative",
                      lowestPriceIndex === idx && "ring-2 ring-green-500"
                    )}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <PackageHeader 
                            pkg={pkg} 
                            onRemove={() => removePackage(pkg.id)}
                            lowestPriceIndex={lowestPriceIndex}
                            index={idx}
                          />
                          
                          <div className="border-t pt-4 space-y-3">
                            <div>
                              <p className="text-xs text-muted-foreground font-semibold mb-2">
                                Harga {ROOM_TYPES.find(r => r.value === selectedRoomType)?.label}
                              </p>
                              <PriceBadge 
                                price={pricesByRoomType[idx]} 
                                isLowest={pricesByRoomType[idx] === lowestPriceByRoomType && lowestPriceByRoomType > 0}
                                currency={pkg.currency}
                                showTrend
                              />
                            </div>

                            {pricesByRoomType[idx] > 0 && (
                              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground">Harga Semua Tipe Kamar</p>
                                <div className="space-y-1 text-xs">
                                  {[
                                    { type: 'quad', label: 'Quad', price: pkg.price_quad },
                                    { type: 'triple', label: 'Triple', price: pkg.price_triple },
                                    { type: 'double', label: 'Double', price: pkg.price_double },
                                    { type: 'single', label: 'Single', price: pkg.price_single },
                                  ].map(room => (
                                    <div key={room.type} className="flex justify-between">
                                      <span className="text-muted-foreground">{room.label}:</span>
                                      <span className="font-semibold">
                                        {room.price ? formatCurrency(Number(room.price), pkg.currency) : '—'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {priceDifference > 0 && (
                              <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                                  Perbedaan Harga: {formatCurrency(priceDifference, selectedPackages[0]?.currency)}
                                </p>
                              </div>
                            )}

                            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                              <Link to={`/packages/${pkg.id}`}>
                                Daftar Sekarang
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {selectedPackages.length < MAX_COMPARE && (
                    <Card className="border-dashed flex items-center justify-center min-h-96">
                      <div className="text-center text-muted-foreground">
                        <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Tambah Paket</p>
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details">
                <div className="overflow-x-auto rounded-xl border shadow-sm">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-4 text-left text-sm font-semibold text-muted-foreground w-[220px]">
                          Detail Perjalanan
                        </th>
                        {selectedPackages.map((pkg) => (
                          <th key={pkg.id} className="p-4 text-center min-w-[200px]">
                            <p className="font-bold text-sm">{pkg.name}</p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <FeatureRow 
                        label="Durasi" 
                        values={selectedPackages.map(p => p.duration_days ? `${p.duration_days} Hari` : null)}
                        icon={Clock}
                      />
                      <FeatureRow 
                        label="Tipe Paket" 
                        values={selectedPackages.map(p => getPackageTypeLabel(p.package_type))}
                        icon={Briefcase}
                      />
                      <FeatureRow 
                        label="Maskapai" 
                        values={selectedPackages.map(p => (p.airline as any)?.name || null)}
                        icon={Plane}
                      />
                      <FeatureRow 
                        label="Hotel Makkah" 
                        values={selectedPackages.map(p => {
                          const hotel = p.hotel_makkah as any;
                          return hotel ? `${hotel.name}${hotel.star_rating ? ` (${hotel.star_rating}⭐)` : ''}` : null;
                        })}
                        icon={Hotel}
                      />
                      <FeatureRow 
                        label="Hotel Madinah" 
                        values={selectedPackages.map(p => {
                          const hotel = p.hotel_madinah as any;
                          return hotel ? `${hotel.name}${hotel.star_rating ? ` (${hotel.star_rating}⭐)` : ''}` : null;
                        })}
                        icon={Hotel}
                      />
                      <FeatureRow 
                        label="Bandara Keberangkatan" 
                        values={selectedPackages.map(p => {
                          const dep = p.departure_airport as any;
                          return dep ? `${dep.name} (${dep.code})` : null;
                        })}
                        icon={MapPin}
                      />
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services">
                <div className="overflow-x-auto rounded-xl border shadow-sm">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-4 text-left text-sm font-semibold text-muted-foreground w-[220px]">
                          Layanan Termasuk
                        </th>
                        {selectedPackages.map((pkg) => (
                          <th key={pkg.id} className="p-4 text-center min-w-[200px]">
                            <p className="font-bold text-sm">{pkg.name}</p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <FeatureRow 
                        label="Visa Termasuk" 
                        values={selectedPackages.map(p => p.includes_visa ?? null)}
                        icon={Shield}
                      />
                      <FeatureRow 
                        label="Manasik Intensif" 
                        values={selectedPackages.map(p => p.includes_manasik ?? null)}
                        icon={Zap}
                      />
                      <FeatureRow 
                        label="Perlengkapan Jamaah" 
                        values={selectedPackages.map(p => p.includes_equipment ?? null)}
                        icon={Briefcase}
                      />
                      <FeatureRow 
                        label="Asuransi Perjalanan" 
                        values={selectedPackages.map(p => p.includes_insurance ?? null)}
                        icon={Shield}
                      />
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedPackages.map((pkg, idx) => (
                    <Card key={pkg.id} className={cn(
                      "relative",
                      lowestPriceIndex === idx && "ring-2 ring-green-500"
                    )}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-bold text-lg mb-2">{pkg.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">{pkg.description}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground font-semibold">Durasi</p>
                              <p className="font-bold">{pkg.duration_days} Hari</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground font-semibold">Harga Mulai</p>
                              <p className="font-bold text-green-600">
                                {formatCurrency(cheapestPrice(pkg), pkg.currency)}
                              </p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground font-semibold">Maskapai</p>
                              <p className="font-bold text-xs">{(pkg.airline as any)?.name || 'TBA'}</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground font-semibold">Tipe</p>
                              <p className="font-bold text-xs">{getPackageTypeLabel(pkg.package_type)}</p>
                            </div>
                          </div>

                          <div className="border-t pt-4 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Fasilitas</p>
                            <div className="space-y-1 text-sm">
                              {pkg.includes_visa && (
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-600" />
                                  <span>Visa Termasuk</span>
                                </div>
                              )}
                              {pkg.includes_manasik && (
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-600" />
                                  <span>Manasik Intensif</span>
                                </div>
                              )}
                              {pkg.includes_equipment && (
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-600" />
                                  <span>Perlengkapan Jamaah</span>
                                </div>
                              )}
                              {pkg.includes_insurance && (
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-600" />
                                  <span>Asuransi Perjalanan</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                            <Link to={`/packages/${pkg.id}`}>
                              Daftar Sekarang
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Export & Share */}
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={handleExportComparison}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button 
                variant="outline"
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Bagikan
              </Button>
            </div>
          </div>
        )}

        {/* Quick Pick from Catalogue */}
        {selectedPackages.length > 0 && selectedPackages.length < MAX_COMPARE && !isLoading && availableToAdd.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-3">Paket Lainnya yang Bisa Dibandingkan</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {availableToAdd.slice(0, 10).map((pkg: any) => (
                <button
                  key={pkg.id}
                  onClick={() => addPackage(pkg.id)}
                  className="p-3 border rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all group"
                >
                  {pkg.featured_image && (
                    <img 
                      src={pkg.featured_image} 
                      alt={pkg.name}
                      className="w-full h-20 object-cover rounded-lg mb-2"
                    />
                  )}
                  <p className="text-sm font-semibold line-clamp-2 group-hover:text-blue-600">{pkg.name}</p>
                  <p className="text-xs text-green-600 font-medium mt-1">{formatCurrency(cheapestPrice(pkg), pkg.currency)}</p>
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
