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

interface District {
  code: string;
  name: string;
}

interface Village {
  code: string;
  name: string;
}

interface IndonesiaLocationSelectProps {
  province: string;
  city: string;
  district: string;
  village: string;
  onProvinceChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onVillageChange: (value: string) => void;
  disabled?: boolean;
}

export function IndonesiaLocationSelect({
  province,
  city,
  district,
  village,
  onProvinceChange,
  onCityChange,
  onDistrictChange,
  onVillageChange,
  disabled = false,
}: IndonesiaLocationSelectProps) {
  const [isIndonesia, setIsIndonesia] = useState(true);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>("");
  const [selectedRegencyCode, setSelectedRegencyCode] = useState<string>("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>("");
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingRegencies, setIsLoadingRegencies] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false);

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
      setDistricts([]);
      setVillages([]);
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

  // Fetch districts when regency changes
  useEffect(() => {
    if (!selectedRegencyCode || !isIndonesia) {
      setDistricts([]);
      setVillages([]);
      return;
    }

    const fetchDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const response = await fetch(
          `https://wilayah.id/api/districts/${selectedRegencyCode}.json`
        );
        const data = await response.json();
        setDistricts(data.data || []);
      } catch (error) {
        console.error("Failed to fetch districts:", error);
      } finally {
        setIsLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [selectedRegencyCode, isIndonesia]);

  // Fetch villages when district changes
  useEffect(() => {
    if (!selectedDistrictCode || !isIndonesia) {
      setVillages([]);
      return;
    }

    const fetchVillages = async () => {
      setIsLoadingVillages(true);
      try {
        const response = await fetch(
          `https://wilayah.id/api/villages/${selectedDistrictCode}.json`
        );
        const data = await response.json();
        setVillages(data.data || []);
      } catch (error) {
        console.error("Failed to fetch villages:", error);
      } finally {
        setIsLoadingVillages(false);
      }
    };

    fetchVillages();
  }, [selectedDistrictCode, isIndonesia]);

  const handleProvinceSelect = (provinceName: string) => {
    const selected = provinces.find((p) => p.name === provinceName);
    if (selected) {
      setSelectedProvinceCode(selected.code);
      setSelectedRegencyCode("");
      setSelectedDistrictCode("");
      onProvinceChange(selected.name);
      // Reset city, district, and village when province changes
      onCityChange("");
      onDistrictChange("");
      onVillageChange("");
    }
  };

  const handleCitySelect = (cityName: string) => {
    const selected = regencies.find((r) => r.name === cityName);
    if (selected) {
      setSelectedRegencyCode(selected.code);
      setSelectedDistrictCode("");
      onCityChange(cityName);
      // Reset district and village when city changes
      onDistrictChange("");
      onVillageChange("");
    }
  };

  const handleDistrictSelect = (districtName: string) => {
    const selected = districts.find((d) => d.name === districtName);
    if (selected) {
      setSelectedDistrictCode(selected.code);
      onDistrictChange(districtName);
      // Reset village when district changes
      onVillageChange("");
    }
  };

  const handleVillageSelect = (villageName: string) => {
    onVillageChange(villageName);
  };

  const handleIsIndonesiaChange = (checked: boolean) => {
    setIsIndonesia(checked);
    if (!checked) {
      // Clear selections when switching to foreign
      setSelectedProvinceCode("");
      setSelectedRegencyCode("");
      setSelectedDistrictCode("");
      setRegencies([]);
      setDistricts([]);
      setVillages([]);
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

        {/* City/Regency Field */}
        <div className="space-y-2">
          <Label htmlFor="city">Kabupaten/Kota</Label>
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
                  <SelectValue placeholder={selectedProvinceCode ? "Pilih Kabupaten/Kota" : "Pilih provinsi dulu"} />
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

        {/* District Field */}
        <div className="space-y-2">
          <Label htmlFor="district">Kecamatan</Label>
          {isIndonesia ? (
            <Select
              value={district}
              onValueChange={handleDistrictSelect}
              disabled={disabled || isLoadingDistricts || !selectedRegencyCode}
            >
              <SelectTrigger>
                {isLoadingDistricts ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat...</span>
                  </div>
                ) : (
                  <SelectValue placeholder={selectedRegencyCode ? "Pilih Kecamatan" : "Pilih kabupaten/kota dulu"} />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {districts.map((dist) => (
                  <SelectItem key={dist.code} value={dist.name}>
                    {dist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="district"
              value={district}
              onChange={(e) => onDistrictChange(e.target.value)}
              placeholder="Masukkan kecamatan"
              disabled={disabled}
            />
          )}
        </div>

        {/* Village Field */}
        <div className="space-y-2">
          <Label htmlFor="village">Kelurahan</Label>
          {isIndonesia ? (
            <Select
              value={village}
              onValueChange={handleVillageSelect}
              disabled={disabled || isLoadingVillages || !selectedDistrictCode}
            >
              <SelectTrigger>
                {isLoadingVillages ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat...</span>
                  </div>
                ) : (
                  <SelectValue placeholder={selectedDistrictCode ? "Pilih Kelurahan" : "Pilih kecamatan dulu"} />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {villages.map((vill) => (
                  <SelectItem key={vill.code} value={vill.name}>
                    {vill.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="village"
              value={village}
              onChange={(e) => onVillageChange(e.target.value)}
              placeholder="Masukkan kelurahan"
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
