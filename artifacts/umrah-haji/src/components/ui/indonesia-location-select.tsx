import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Province {
  id: string;
  name: string;
}

interface Regency {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
}

interface Village {
  id: string;
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

const API_BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api";

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
  
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [selectedRegencyId, setSelectedRegencyId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingRegencies, setIsLoadingRegencies] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false);

  // Helper to format name (Title Case)
  const formatName = (name: string) => {
    if (!name) return "";
    return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setIsLoadingProvinces(true);
      try {
        const response = await fetch(`${API_BASE_URL}/provinces.json`);
        const data = await response.json();
        setProvinces(data || []);
      } catch (error) {
        console.error("Failed to fetch provinces:", error);
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  // Sync internal IDs when external values change (e.g. during initial load or parent update)
  useEffect(() => {
    if (province && provinces.length > 0) {
      const matched = provinces.find(p => p.name.toLowerCase() === province.toLowerCase());
      if (matched && matched.id !== selectedProvinceId) {
        setSelectedProvinceId(matched.id);
      }
    } else if (!province) {
      setSelectedProvinceId("");
    }
  }, [province, provinces]);

  // Fetch regencies when province changes
  useEffect(() => {
    if (!selectedProvinceId || !isIndonesia) {
      setRegencies([]);
      return;
    }

    const fetchRegencies = async () => {
      setIsLoadingRegencies(true);
      try {
        const response = await fetch(`${API_BASE_URL}/regencies/${selectedProvinceId}.json`);
        const data = await response.json();
        setRegencies(data || []);
        
        // Sync city ID
        if (city && data) {
          const matched = data.find((r: Regency) => r.name.toLowerCase() === city.toLowerCase());
          if (matched) setSelectedRegencyId(matched.id);
        }
      } catch (error) {
        console.error("Failed to fetch regencies:", error);
      } finally {
        setIsLoadingRegencies(false);
      }
    };

    fetchRegencies();
  }, [selectedProvinceId, isIndonesia]);

  // Sync regency ID
  useEffect(() => {
    if (city && regencies.length > 0) {
      const matched = regencies.find(r => r.name.toLowerCase() === city.toLowerCase());
      if (matched && matched.id !== selectedRegencyId) {
        setSelectedRegencyId(matched.id);
      }
    } else if (!city) {
      setSelectedRegencyId("");
    }
  }, [city, regencies]);

  // Fetch districts when regency changes
  useEffect(() => {
    if (!selectedRegencyId || !isIndonesia) {
      setDistricts([]);
      return;
    }

    const fetchDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const response = await fetch(`${API_BASE_URL}/districts/${selectedRegencyId}.json`);
        const data = await response.json();
        setDistricts(data || []);
        
        // Sync district ID
        if (district && data) {
          const matched = data.find((d: District) => d.name.toLowerCase() === district.toLowerCase());
          if (matched) setSelectedDistrictId(matched.id);
        }
      } catch (error) {
        console.error("Failed to fetch districts:", error);
      } finally {
        setIsLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [selectedRegencyId, isIndonesia]);

  // Sync district ID
  useEffect(() => {
    if (district && districts.length > 0) {
      const matched = districts.find(d => d.name.toLowerCase() === district.toLowerCase());
      if (matched && matched.id !== selectedDistrictId) {
        setSelectedDistrictId(matched.id);
      }
    } else if (!district) {
      setSelectedDistrictId("");
    }
  }, [district, districts]);

  // Fetch villages when district changes
  useEffect(() => {
    if (!selectedDistrictId || !isIndonesia) {
      setVillages([]);
      return;
    }

    const fetchVillages = async () => {
      setIsLoadingVillages(true);
      try {
        const response = await fetch(`${API_BASE_URL}/villages/${selectedDistrictId}.json`);
        const data = await response.json();
        setVillages(data || []);
        
        // Sync village ID
        if (village && data) {
          const matched = data.find((v: Village) => v.name.toLowerCase() === village.toLowerCase());
          if (matched) setSelectedVillageId(matched.id);
        }
      } catch (error) {
        console.error("Failed to fetch villages:", error);
      } finally {
        setIsLoadingVillages(false);
      }
    };

    fetchVillages();
  }, [selectedDistrictId, isIndonesia]);

  // Sync village ID
  useEffect(() => {
    if (village && villages.length > 0) {
      const matched = villages.find(v => v.name.toLowerCase() === village.toLowerCase());
      if (matched && matched.id !== selectedVillageId) {
        setSelectedVillageId(matched.id);
      }
    } else if (!village) {
      setSelectedVillageId("");
    }
  }, [village, villages]);

  const handleProvinceSelect = (id: string) => {
    const selected = provinces.find((p) => p.id === id);
    if (selected) {
      setSelectedProvinceId(id);
      setSelectedRegencyId("");
      setSelectedDistrictId("");
      setSelectedVillageId("");
      onProvinceChange(formatName(selected.name));
      onCityChange("");
      onDistrictChange("");
      onVillageChange("");
    }
  };

  const handleCitySelect = (id: string) => {
    const selected = regencies.find((r) => r.id === id);
    if (selected) {
      setSelectedRegencyId(id);
      setSelectedDistrictId("");
      setSelectedVillageId("");
      onCityChange(formatName(selected.name));
      onDistrictChange("");
      onVillageChange("");
    }
  };

  const handleDistrictSelect = (id: string) => {
    const selected = districts.find((d) => d.id === id);
    if (selected) {
      setSelectedDistrictId(id);
      setSelectedVillageId("");
      onDistrictChange(formatName(selected.name));
      onVillageChange("");
    }
  };

  const handleVillageSelect = (id: string) => {
    const selected = villages.find((v) => v.id === id);
    if (selected) {
      setSelectedVillageId(id);
      onVillageChange(formatName(selected.name));
    }
  };

  const handleIsIndonesiaChange = (checked: boolean) => {
    setIsIndonesia(checked);
    if (!checked) {
      setSelectedProvinceId("");
      setSelectedRegencyId("");
      setSelectedDistrictId("");
      setSelectedVillageId("");
      setRegencies([]);
      setDistricts([]);
      setVillages([]);
    }
  };

  return (
    <div className="space-y-4">
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
              value={selectedProvinceId}
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
                  <SelectItem key={prov.id} value={prov.id}>
                    {formatName(prov.name)}
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
              value={selectedRegencyId}
              onValueChange={handleCitySelect}
              disabled={disabled || isLoadingRegencies || !selectedProvinceId}
            >
              <SelectTrigger>
                {isLoadingRegencies ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat...</span>
                  </div>
                ) : (
                  <SelectValue placeholder={selectedProvinceId ? "Pilih Kabupaten/Kota" : "Pilih provinsi dulu"} />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {regencies.map((reg) => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {formatName(reg.name)}
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
              value={selectedDistrictId}
              onValueChange={handleDistrictSelect}
              disabled={disabled || isLoadingDistricts || !selectedRegencyId}
            >
              <SelectTrigger>
                {isLoadingDistricts ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat...</span>
                  </div>
                ) : (
                  <SelectValue placeholder={selectedRegencyId ? "Pilih Kecamatan" : "Pilih kabupaten/kota dulu"} />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {districts.map((dist) => (
                  <SelectItem key={dist.id} value={dist.id}>
                    {formatName(dist.name)}
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
              value={selectedVillageId}
              onValueChange={handleVillageSelect}
              disabled={disabled || isLoadingVillages || !selectedDistrictId}
            >
              <SelectTrigger>
                {isLoadingVillages ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat...</span>
                  </div>
                ) : (
                  <SelectValue placeholder={selectedDistrictId ? "Pilih Kelurahan" : "Pilih kecamatan dulu"} />
                )}
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {villages.map((vill) => (
                  <SelectItem key={vill.id} value={vill.id}>
                    {formatName(vill.name)}
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
