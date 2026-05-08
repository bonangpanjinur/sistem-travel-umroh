import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, Plane, MapPin, User, Ticket, Bus, Store, Package, RotateCcw, Settings } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminHotels from "./AdminHotels";
import AdminAirlines from "./AdminAirlines";
import AdminAirports from "./AdminAirports";
import AdminMuthawifs from "./AdminMuthawifs";
import AdminCoupons from "./AdminCoupons";
import AdminBusProviders from "./AdminBusProviders";
import AdminVendors from "./AdminVendors";
import AdminEquipmentMaster from "./AdminEquipmentMaster";
import AdminStockOpname from "./AdminStockOpname";
import AdminEquipmentSettings from "./AdminEquipmentSettings";

export default function AdminMasterData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "hotels";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Master Data</h1>
        <p className="text-muted-foreground">Kelola data referensi sistem</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="hotels" className="gap-2">
            <Hotel className="h-4 w-4" />
            <span className="hidden sm:inline">Hotel</span>
          </TabsTrigger>
          <TabsTrigger value="airlines" className="gap-2">
            <Plane className="h-4 w-4" />
            <span className="hidden sm:inline">Maskapai</span>
          </TabsTrigger>
          <TabsTrigger value="airports" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Bandara</span>
          </TabsTrigger>
          <TabsTrigger value="muthawifs" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Muthawif</span>
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Perlengkapan</span>
          </TabsTrigger>
          <TabsTrigger value="stock-opname" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Stock Opname</span>
          </TabsTrigger>
          <TabsTrigger value="equipment-settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Pengaturan</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-2">
            <Ticket className="h-4 w-4" />
            <span className="hidden sm:inline">Kupon</span>
          </TabsTrigger>
          <TabsTrigger value="bus" className="gap-2">
            <Bus className="h-4 w-4" />
            <span className="hidden sm:inline">Bus</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Vendor</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="hotels">
          <AdminHotels />
        </TabsContent>
        <TabsContent value="airlines">
          <AdminAirlines />
        </TabsContent>
        <TabsContent value="airports">
          <AdminAirports />
        </TabsContent>
        <TabsContent value="muthawifs">
          <AdminMuthawifs />
        </TabsContent>
        <TabsContent value="equipment">
          <AdminEquipmentMaster />
        </TabsContent>
        <TabsContent value="stock-opname">
          <AdminStockOpname />
        </TabsContent>
        <TabsContent value="equipment-settings">
          <AdminEquipmentSettings />
        </TabsContent>
        <TabsContent value="coupons">
          <AdminCoupons />
        </TabsContent>
        <TabsContent value="bus">
          <AdminBusProviders />
        </TabsContent>
        <TabsContent value="vendors">
          <AdminVendors />
        </TabsContent>
      </Tabs>
    </div>
  );
}
