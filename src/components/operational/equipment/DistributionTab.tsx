import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowRight, ArrowLeft, Package, Users, CheckCircle2, Search, Loader2, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Distribution } from "@/pages/operational/EquipmentPage";
import { PassengerSelection } from "./PassengerSelection";
import { EquipmentChecklist } from "./EquipmentChecklist";

interface DistributionTabProps {
  distributions: Distribution[] | undefined;
  onReturn: (dist: Distribution) => void;
  departures: any[] | undefined;
  selectedDeparture: string;
}

type DistributionStep = "package" | "departure" | "passengers";

export function DistributionTab({
  distributions,
  onReturn,
  departures,
  selectedDeparture,
}: DistributionTabProps) {
  const [currentStep, setCurrentStep] = useState<DistributionStep>("package");
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [packageSearch, setPackageSearch] = useState("");
  const [departureSearch, setDepartureSearch] = useState("");
  const [showChecklistSheet, setShowChecklistSheet] = useState(false);

  // Fetch all packages
  const { data: packages, isLoading: loadingPackages } = useQuery({
    queryKey: ["packages-for-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch departures for selected package
  const { data: packageDepartures, isLoading: loadingDepartures } = useQuery({
    queryKey: ["departures-for-package", selectedPackage],
    queryFn: async () => {
      if (!selectedPackage) return [];
      const { data, error } = await supabase
        .from("departures")
        .select("id, departure_date, package_id")
        .eq("package_id", selectedPackage)
        .gte("departure_date", new Date().toISOString().split("T")[0])
        .order("departure_date");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPackage,
  });

  // Fetch passengers for selected departure
  const { data: passengers, isLoading: loadingPassengers } = useQuery({
    queryKey: ["passengers-for-departure", selectedDepartureId],
    queryFn: async () => {
      if (!selectedDepartureId) return [];
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          id,
          customer_id,
          customer:customers(id, full_name),
          booking:bookings(departure_id),
          is_main_passenger,
          passenger_type
        `)
        .eq("booking.departure_id", selectedDepartureId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDepartureId,
  });

  // Fetch equipment items for checklist
  const { data: equipmentItems = [] } = useQuery({
    queryKey: ["equipment-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_items")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing distributions for selected customer and departure
  const { data: customerDistributions = [] } = useQuery({
    queryKey: ["customer-distributions", selectedCustomerId, selectedDepartureId],
    queryFn: async () => {
      if (!selectedCustomerId || !selectedDepartureId) return [];
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select("equipment_id")
        .eq("customer_id", selectedCustomerId)
        .eq("departure_id", selectedDepartureId)
        .eq("status", "distributed");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId && !!selectedDepartureId,
  });

  // Filter packages based on search
  const filteredPackages = useMemo(() => {
    if (!packageSearch.trim()) return packages;
    const lowerSearch = packageSearch.toLowerCase();
    return packages?.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerSearch) ||
        p.code.toLowerCase().includes(lowerSearch)
    );
  }, [packages, packageSearch]);

  // Filter departures based on search
  const filteredDepartures = useMemo(() => {
    if (!departureSearch.trim()) return packageDepartures;
    const lowerSearch = departureSearch.toLowerCase();
    return packageDepartures?.filter((d) =>
      format(new Date(d.departure_date), "dd MMMM yyyy", { locale: localeId })
        .toLowerCase()
        .includes(lowerSearch)
    );
  }, [packageDepartures, departureSearch]);

  const handleNextStep = () => {
    if (currentStep === "package" && selectedPackage) {
      setCurrentStep("departure");
    } else if (currentStep === "departure" && selectedDepartureId) {
      setCurrentStep("passengers");
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === "departure") {
      setSelectedPackage("");
      setPackageSearch("");
      setCurrentStep("package");
    } else if (currentStep === "passengers") {
      setSelectedDepartureId("");
      setDepartureSearch("");
      setCurrentStep("departure");
    }
  };

  const handlePassengerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowChecklistSheet(true);
  };

  const selectedPackageData = packages?.find((p) => p.id === selectedPackage);
  const selectedDepartureData = packageDepartures?.find(
    (d) => d.id === selectedDepartureId
  );
  const selectedPassenger = passengers?.find(
    (p) => p.customer_id === selectedCustomerId
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-6 bg-muted/50 p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
              currentStep === "package" || currentStep === "departure" || currentStep === "passengers"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            1
          </div>
          <span className={cn("text-sm font-medium", currentStep === "package" ? "text-blue-600" : "text-gray-500")}>Paket</span>
        </div>
        <div className="flex-1 h-1 mx-2 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
              currentStep === "departure" || currentStep === "passengers"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            2
          </div>
          <span className={cn("text-sm font-medium", currentStep === "departure" ? "text-blue-600" : "text-gray-500")}>Tanggal</span>
        </div>
        <div className="flex-1 h-1 mx-2 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
              currentStep === "passengers"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            3
          </div>
          <span className={cn("text-sm font-medium", currentStep === "passengers" ? "text-blue-600" : "text-gray-500")}>Jamaah</span>
        </div>
      </div>

      {/* Step 1: Package Selection */}
      {currentStep === "package" && (
        <Card className="border-2 border-blue-100 shadow-lg">
          <CardHeader className="bg-blue-50/50 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Package className="h-5 w-5" />
              Pilih Paket Umrah/Haji
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {loadingPackages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Cari Paket</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama atau kode paket..."
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                      className="pl-10 h-12 text-lg border-2 focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Paket</label>
                  <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                    <SelectTrigger className="h-12 text-lg border-2">
                      <SelectValue placeholder="Pilih paket..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPackages && filteredPackages.length > 0 ? (
                        filteredPackages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} ({pkg.code})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">
                          Paket tidak ditemukan
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNextStep}
                    disabled={!selectedPackage}
                    size="lg"
                    className="px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                  >
                    Lanjut
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Departure Date Selection */}
      {currentStep === "departure" && (
        <Card className="border-2 border-blue-100 shadow-lg">
          <CardHeader className="bg-blue-50/50 border-b flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <ClipboardList className="h-5 w-5" />
              Pilih Tanggal Keberangkatan
            </CardTitle>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              Paket: {selectedPackageData?.name}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {loadingDepartures ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Cari Tanggal</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari tanggal (contoh: Januari)..."
                      value={departureSearch}
                      onChange={(e) => setDepartureSearch(e.target.value)}
                      className="pl-10 h-12 text-lg border-2 focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Keberangkatan</label>
                  <Select
                    value={selectedDepartureId}
                    onValueChange={setSelectedDepartureId}
                  >
                    <SelectTrigger className="h-12 text-lg border-2">
                      <SelectValue placeholder="Pilih tanggal keberangkatan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDepartures && filteredDepartures.length > 0 ? (
                        filteredDepartures.map((dep) => (
                          <SelectItem key={dep.id} value={dep.id}>
                            {format(new Date(dep.departure_date), "dd MMMM yyyy", {
                              locale: localeId,
                            })}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">
                          Tidak ada keberangkatan tersedia
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handlePreviousStep} size="lg">
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Kembali
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!selectedDepartureId}
                    size="lg"
                    className="px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                  >
                    Lanjut
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Passenger Selection */}
      {currentStep === "passengers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePreviousStep} size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Tanggal
            </Button>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50 border-blue-200">
                Paket: {selectedPackageData?.name}
              </Badge>
              <Badge variant="outline" className="bg-blue-50 border-blue-200">
                Tgl: {selectedDepartureData && format(new Date(selectedDepartureData.departure_date), "dd MMM yyyy", { locale: localeId })}
              </Badge>
            </div>
          </div>
          
          <Card className="border-2 border-blue-100 shadow-lg">
            <CardHeader className="bg-blue-50/50 border-b">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Users className="h-5 w-5" />
                Pilih Jamaah untuk Distribusi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PassengerSelection
                passengers={passengers || []}
                loading={loadingPassengers}
                onSelect={handlePassengerSelect}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Equipment Checklist Sheet (Slide-out Drawer) */}
      <Sheet open={showChecklistSheet} onOpenChange={setShowChecklistSheet}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
          <SheetHeader className="p-6 bg-blue-600 text-white">
            <SheetTitle className="text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Checklist Perlengkapan
            </SheetTitle>
            <div className="mt-2">
              <p className="text-blue-100 text-sm font-medium">{selectedPassenger?.customer?.full_name}</p>
              <p className="text-blue-200 text-xs">Tipe: {selectedPassenger?.passenger_type || "Jamaah"}</p>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-auto p-6">
            <EquipmentChecklist
              equipmentItems={equipmentItems}
              selectedCustomerId={selectedCustomerId}
              selectedDepartureId={selectedDepartureId}
              existingDistributions={customerDistributions}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
