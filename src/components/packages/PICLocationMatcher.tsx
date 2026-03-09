import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';

interface PICLocationMatcherProps {
  packageId: string;
  onPICSelected?: (picId: string) => void;
}

interface LocationPIC {
  id: string;
  company_name: string;
  location: string;
  specialization?: string;
  avatar_url?: string;
}

export function PICLocationMatcher({ packageId, onPICSelected }: PICLocationMatcherProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Get user's location from browser geolocation API
  useEffect(() => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you would use reverse geocoding to get the city name
          // For now, we'll just store the coordinates
          console.log('User location:', position.coords);
          setLocationLoading(false);
        },
        (error) => {
          console.log('Geolocation error:', error);
          setLocationLoading(false);
        }
      );
    }
  }, []);

  // Fetch available locations for PICs
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['pic-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('location')

        .eq('is_active', true)
        .not('location', 'is', null)
        .order('location', { ascending: true });

      if (error) throw error;
      
      // Get unique locations
      const uniqueLocations = [...new Set(data.map(d => d.location).filter(Boolean))];
      return uniqueLocations;
    },
  });

  // Fetch PICs for selected location
  const { data: picsForLocation, isLoading: picsLoading } = useQuery({
    queryKey: ['pics-for-location', selectedLocation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, company_name, location, specialization, avatar_url')

        .eq('is_active', true)
        .eq('location', selectedLocation)
        .order('company_name', { ascending: true });

      if (error) throw error;
      return data as LocationPIC[];
    },
    enabled: !!selectedLocation,
  });

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
  };

  const handlePICSelect = (picId: string) => {
    onPICSelected?.(picId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          Pilih PIC Berdasarkan Lokasi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Pilih Wilayah</label>
          <Select value={selectedLocation} onValueChange={handleLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih wilayah Anda" />
            </SelectTrigger>
            <SelectContent>
              {locations?.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* PICs for Selected Location */}
        {selectedLocation && (
          <div className="space-y-2">
            <label className="text-sm font-medium">PIC Tersedia di {selectedLocation}</label>
            {picsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : picsForLocation && picsForLocation.length > 0 ? (
              <div className="space-y-2">
                {picsForLocation.map((pic) => (
                  <Button
                    key={pic.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handlePICSelect(pic.id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {pic.avatar_url && (
                        <img
                          src={pic.avatar_url}
                          alt={pic.company_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <div className="text-left">
                        <p className="font-medium text-sm">{pic.company_name}</p>
                        {pic.specialization && (
                          <p className="text-xs text-muted-foreground">{pic.specialization}</p>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada PIC di wilayah ini</p>
            )}
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Pilih wilayah Anda untuk menemukan PIC yang paling dekat dan siap membantu.
        </p>
      </CardContent>
    </Card>
  );
}
