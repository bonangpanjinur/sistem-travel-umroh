import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Province {
  code: string;
  name: string;
}

interface Regency {
  code: string;
  name: string;
}

interface IndonesiaLocationSelectProps {
  province: string;
  city: string;
  onProvinceChange: (value: string) => void;
  onCityChange: (value: string) => void;
  disabled?: boolean;
}

export function IndonesiaLocationSelect({
  province,
  city,
  onProvinceChange,
  onCityChange,
  disabled = false,
}: IndonesiaLocationSelectProps) {
  const [isIndonesia, setIsIndonesia] = useState(true);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>("");
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingRegencies, setIsLoadingRegencies] = useState(false);

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setIsLoadingProvinces(true);
      try {
        const response = await fetch("https://wilayah.id/api/provinces.json");
        const data = await response.json();
        setProvinces(data.data || []);
      } catch (error) {
        console.error("Failed to fetch provinces:", error);
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  // Auto-detect if current province is Indonesian
  useEffect(() => {
    if (province && provinces.length > 0) {
      const matchedProvince = provinces.find(
        (p) => p.name.toLowerCase() === province.toLowerCase()
      );
      if (matchedProvince) {
        setIsIndonesia(true);
        setSelectedProvinceCode(matchedProvince.code);
      } else if (province) {
        // If province has a value but doesn't match any Indonesian province
        // Check if it might be a foreign location
        const isLikelyForeign = !provinces.some(
          (p) => p.name.toLowerCase().includes(province.toLowerCase().slice(0, 3))
        );
        if (isLikelyForeign) {
          setIsIndonesia(false);
        }
      }
    }
  }, [province, provinces]);

  // Fetch regencies when province changes
  useEffect(() => {
    if (!selectedProvinceCode || !isIndonesia) {
      setRegencies([]);
      return;
    }

    const fetchRegencies = async () => {
      setIsLoadingRegencies(true);
      try {
        const response = await fetch(
          `https://wilayah.id/api/regencies/${selectedProvinceCode}.json`
        );
        const data = await response.json();
        setRegencies(data.data || []);
      } catch (error) {
        console.error("Failed to fetch regencies:", error);
      } finally {
        setIsLoadingRegencies(false);
      }
    };

    fetchRegencies();
  }, [selectedProvinceCode, isIndonesia]);

  const handleProvinceSelect = (provinceName: string) => {
    const selected = provinces.find((p) => p.name === provinceName);
    if (selected) {
      setSelectedProvinceCode(selected.code);
      onProvinceChange(selected.name);
      // Reset city when province changes
      onCityChange("");
    }
  };

  const handleCitySelect = (cityName: string) => {
    onCityChange(cityName);
  };

  const handleIsIndonesiaChange = (checked: boolean) => {
    setIsIndonesia(checked);
    if (!checked) {
      // Clear selections when switching to foreign
      setSelectedProvinceCode("");
      setRegencies([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Indonesia Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-indonesia"
          checked={isIndonesia}
          onCheckedChange={handleIsIndonesiaChange}
          disabled={disabled}
        />
        <Label htmlFor="is-indonesia" className="text-sm font-normal cursor-pointer">
          Alamat di Indonesia
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Province Field */}
        <div className="space-y-2">
          <Label htmlFor="province">Provinsi</Label>
          {isIndonesia ? (
            <Select
              value={province}
              onValueChange={handleProvinceSelect}
              disabled={disabled || isLoadingProvinces}
            >
              <SelectTrigger>
                {isLoadingProvinces ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Pilih Provinsi" />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {provinces.map((prov) => (
                  <SelectItem key={prov.code} value={prov.name}>
                    {prov.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="province"
              value={province}
              onChange={(e) => onProvinceChange(e.target.value)}
              placeholder="Masukkan provinsi/state"
              disabled={disabled}
            />
          )}
        </div>

        {/* City Field */}
        <div className="space-y-2">
          <Label htmlFor="city">Kota/Kabupaten</Label>
          {isIndonesia ? (
            <Select
              value={city}
              onValueChange={handleCitySelect}
              disabled={disabled || isLoadingRegencies || !selectedProvinceCode}
            >
              <SelectTrigger>
                {isLoadingRegencies ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat...</span>
                  </div>
                ) : (
                  <SelectValue placeholder={selectedProvinceCode ? "Pilih Kota/Kabupaten" : "Pilih provinsi dulu"} />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {regencies.map((reg) => (
                  <SelectItem key={reg.code} value={reg.name}>
                    {reg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="city"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Masukkan kota"
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
