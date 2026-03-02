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
import { ArrowRight, ArrowLeft, Package, Users, CheckCircle2, Search, Loader2 } from "lucide-react";
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

type DistributionStep = "package" | "departure" | "passengers" | "checklist";

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
  const { data: equipmentItems } = useQuery({
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
  const { data: customerDistributions } = useQuery({
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
    } else if (currentStep === "passengers" && selectedCustomerId) {
      setCurrentStep("checklist");
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
    } else if (currentStep === "checklist") {
      setSelectedCustomerId("");
      setCurrentStep("passengers");
    }
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
              currentStep === "package" || currentStep === "departure" || currentStep === "passengers" || currentStep === "checklist"
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            1
          </div>
          <span className="text-sm font-medium">Paket</span>
        </div>
        <div className="flex-1 h-1 mx-2 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
              currentStep === "departure" || currentStep === "passengers" || currentStep === "checklist"
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            2
          </div>
          <span className="text-sm font-medium">Tanggal</span>
        </div>
        <div className="flex-1 h-1 mx-2 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
              currentStep === "passengers" || currentStep === "checklist"
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            3
          </div>
          <span className="text-sm font-medium">Jamaah</span>
        </div>
        <div className="flex-1 h-1 mx-2 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all ${
              currentStep === "checklist"
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            4
          </div>
          <span className="text-sm font-medium">Checklist</span>
        </div>
      </div>

      {/* Step 1: Package Selection */}
      {currentStep === "package" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pilih Paket Umrah/Haji
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPackages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cari Paket</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama atau kode paket..."
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paket</label>
                  <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                    <SelectTrigger>
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
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleNextStep}
                disabled={!selectedPackage || loadingPackages}
                className="gap-2"
              >
                Lanjut
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Departure Selection */}
      {currentStep === "departure" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pilih Tanggal Keberangkatan
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Paket: {selectedPackageData?.name}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingDepartures ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cari Tanggal</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari tanggal keberangkatan..."
                      value={departureSearch}
                      onChange={(e) => setDepartureSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tanggal Keberangkatan</label>
                  <Select value={selectedDepartureId} onValueChange={setSelectedDepartureId}>
                    <SelectTrigger>
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
                          Tanggal tidak ditemukan
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex justify-between gap-2">
              <Button
                onClick={handlePreviousStep}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!selectedDepartureId || loadingDepartures}
                className="gap-2"
              >
                Lanjut
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Passenger Selection */}
      {currentStep === "passengers" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pilih Jamaah
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedPackageData?.name} -{" "}
              {format(new Date(selectedDepartureData?.departure_date || ""), "dd MMMM yyyy", {
                locale: localeId,
              })}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPassengers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PassengerSelection
                passengers={passengers || []}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={setSelectedCustomerId}
                selectedDepartureId={selectedDepartureId}
              />
            )}
            <div className="flex justify-between gap-2">
              <Button
                onClick={handlePreviousStep}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!selectedCustomerId || loadingPassengers}
                className="gap-2"
              >
                Lanjut
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Equipment Checklist */}
      {currentStep === "checklist" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Checklist Perlengkapan
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Jamaah: {selectedPassenger?.customer?.full_name}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <EquipmentChecklist
              equipmentItems={equipmentItems || []}
              selectedCustomerId={selectedCustomerId}
              selectedDepartureId={selectedDepartureId}
              existingDistributions={customerDistributions || []}
            />
            <div className="flex justify-between gap-2">
              <Button
                onClick={handlePreviousStep}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
