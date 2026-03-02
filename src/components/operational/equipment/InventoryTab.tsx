import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Package,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { EquipmentItem } from "@/pages/operational/EquipmentPage";

interface InventoryTabProps {
  items: EquipmentItem[] | undefined;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedDeparture: string;
}

export function InventoryTab({
  items,
  searchTerm,
  setSearchTerm,
  selectedDeparture,
}: InventoryTabProps) {
  const filteredItems = items?.filter((i) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stock status statistics
  const totalItems = items?.length || 0;
  const safeStock = items?.filter((i) => i.stock_quantity > 10).length || 0;
  const lowStock = items?.filter(
    (i) => i.stock_quantity > 0 && i.stock_quantity <= 10
  ).length || 0;
  const outOfStock = items?.filter((i) => i.stock_quantity === 0).length || 0;

  // Get status badge for item
  const getStockStatus = (quantity: number) => {
    if (quantity === 0) {
      return {
        label: "Habis",
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      };
    }
    if (quantity <= 5) {
      return {
        label: "Kritis",
        variant: "destructive" as const,
        icon: AlertCircle,
        color: "text-red-600",
      };
    }
    if (quantity <= 10) {
      return {
        label: "Menipis",
        variant: "secondary" as const,
        icon: AlertTriangle,
        color: "text-yellow-600",
      };
    }
    return {
      label: "Aman",
      variant: "default" as const,
      icon: CheckCircle2,
      color: "text-green-600",
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Quick Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Stok Aman
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{safeStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {safeStock > 10 ? "Stok melimpah" : "Stok tersedia"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Perlu perhatian segera
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Stok Kritis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {items?.filter((i) => i.stock_quantity > 0 && i.stock_quantity <= 5)
                .length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Kurang dari 5 unit
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              Stok Habis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{outOfStock}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Perlu di-restock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari item perlengkapan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="luggage">Tas & Koper</SelectItem>
            <SelectItem value="clothing">Pakaian</SelectItem>
            <SelectItem value="accessories">Aksesoris</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems && filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const status = getStockStatus(item.stock_quantity);
            const StatusIcon = status.icon;

            return (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-shadow duration-200"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm leading-tight">
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description || "Tidak ada deskripsi"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                      <span className="text-sm font-medium">
                        {item.stock_quantity} unit
                      </span>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  {/* Action Button */}
                  <Button
                    className="w-full"
                    disabled={
                      item.stock_quantity < 1 || selectedDeparture === "all"
                    }
                    size="sm"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Distribusi
                  </Button>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Tidak ada item yang cocok dengan pencarian"
                : "Tidak ada item perlengkapan"}
            </p>
          </div>
        )}
      </div>

      {selectedDeparture === "all" && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Pilih keberangkatan terlebih dahulu untuk mendistribusikan perlengkapan
          </p>
        </div>
      )}
    </div>
  );
}
