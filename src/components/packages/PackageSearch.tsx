import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { formatCurrency } from '@/lib/format';

interface PackageSearchProps {
  onSearch?: (filters: any) => void;
  onFilterApplied?: () => void;
}

export function PackageSearch({ onSearch, onFilterApplied }: PackageSearchProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [packageType, setPackageType] = useState(searchParams.get('type') || 'all');
  const [priceRange, setPriceRange] = useState([
    Number(searchParams.get('minPrice')) || 10000000,
    Number(searchParams.get('maxPrice')) || 150000000
  ]);
  const [duration, setDuration] = useState<string[]>(
    searchParams.get('duration')?.split(',').filter(Boolean) || []
  );

  // Update local state when URL params change
  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
    setPackageType(searchParams.get('type') || 'all');
    setPriceRange([
      Number(searchParams.get('minPrice')) || 10000000,
      Number(searchParams.get('maxPrice')) || 150000000
    ]);
    setDuration(searchParams.get('duration')?.split(',').filter(Boolean) || []);
  }, [searchParams]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (packageType && packageType !== 'all') params.set('type', packageType);
    
    params.set('minPrice', priceRange[0].toString());
    params.set('maxPrice', priceRange[1].toString());
    
    if (duration.length > 0) params.set('duration', duration.join(','));

    const queryString = params.toString();
    navigate(`/packages${queryString ? '?' + queryString : ''}`);
    
    if (onSearch) {
      onSearch({
        q: searchTerm,
        type: packageType,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        duration
      });
    }

    // Callback untuk menutup Sheet/Drawer pada mobile
    if (onFilterApplied) {
      onFilterApplied();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setSearchTerm('');
    setPackageType('all');
    setPriceRange([10000000, 150000000]);
    setDuration([]);
    navigate('/packages');
    
    if (onSearch) onSearch({});
    if (onFilterApplied) onFilterApplied();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDurationChange = (value: string, checked: boolean) => {
    if (checked) {
      setDuration([...duration, value]);
    } else {
      setDuration(duration.filter(d => d !== value));
    }
  };

  return (
    <div className="rounded-xl bg-card p-5 shadow-sm border space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Filter Paket</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReset}
          className="h-8 px-2 text-muted-foreground hover:text-primary"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      </div>
      
      {/* Search Input */}
      <div className="space-y-2">
        <Label>Kata Kunci</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari paket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
      </div>

      {/* Package Type */}
      <div className="space-y-2">
        <Label>Jenis Paket</Label>
        <Select value={packageType} onValueChange={setPackageType}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            <SelectItem value="umroh">Umroh</SelectItem>
            <SelectItem value="umroh_plus">Umroh Plus</SelectItem>
            <SelectItem value="haji">Haji Reguler</SelectItem>
            <SelectItem value="haji_plus">Haji Plus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <Label>Rentang Harga</Label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={10000000}
          max={200000000}
          step={1000000}
          className="mt-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>{formatCurrency(priceRange[0])}</span>
          <span>{formatCurrency(priceRange[1])}</span>
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <Label>Durasi Perjalanan</Label>
        <div className="space-y-2">
          {[
            { value: '9', label: '9 Hari' },
            { value: '12', label: '12 Hari' },
            { value: '14', label: '14 Hari' },
            { value: '21', label: '21+ Hari' },
          ].map((item) => (
            <div key={item.value} className="flex items-center space-x-2">
              <Checkbox
                id={`duration-${item.value}`}
                checked={duration.includes(item.value)}
                onCheckedChange={(checked) => handleDurationChange(item.value, checked as boolean)}
              />
              <label
                htmlFor={`duration-${item.value}`}
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                {item.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Search Button */}
      <Button onClick={handleSearch} className="w-full gap-2 shadow-md">
        <Search className="h-4 w-4" />
        Terapkan Filter
      </Button>
    </div>
  );
}
