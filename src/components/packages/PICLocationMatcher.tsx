import { useState } from 'react';
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
}

export function PICLocationMatcher({ packageId, onPICSelected }: PICLocationMatcherProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  // Fetch available locations from branches (agents don't have location column)
  const { data: locations } = useQuery({
    queryKey: ['pic-locations'],
    queryFn: async (): Promise<string[]> => {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('city')
          .eq('is_active', true)
          .not('city', 'is', null)
          .order('city', { ascending: true });

        if (error) throw error;
        const uniqueCities = [...new Set(data.map(d => d.city).filter(Boolean))] as string[];
        return uniqueCities;
      } catch {
        return [];
      }
    },
  });

  // Fetch agents for selected location (via branch)
  const { data: picsForLocation, isLoading: picsLoading } = useQuery({
    queryKey: ['pics-for-location', selectedLocation],
    queryFn: async (): Promise<LocationPIC[]> => {
      try {
        // Get branch ids for the selected city
        const { data: branches } = await supabase
          .from('branches')
          .select('id')
          .eq('city', selectedLocation)
          .eq('is_active', true);

        if (!branches || branches.length === 0) return [];
        const branchIds = branches.map(b => b.id);

        const { data: agents, error } = await supabase
          .from('agents')
          .select('id, company_name, branch_id')
          .eq('is_active', true)
          .in('branch_id', branchIds);

        if (error) throw error;
        return (agents || []).map(a => ({ id: a.id, company_name: a.company_name || 'Agent', location: selectedLocation }));
      } catch {
        return [];
      }
    },
    enabled: !!selectedLocation,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          Pilih PIC Berdasarkan Lokasi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Pilih Wilayah</label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger><SelectValue placeholder="Pilih wilayah Anda" /></SelectTrigger>
            <SelectContent>
              {locations?.map((location) => (
                <SelectItem key={location} value={location}>{location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedLocation && (
          <div className="space-y-2">
            <label className="text-sm font-medium">PIC Tersedia di {selectedLocation}</label>
            {picsLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : picsForLocation && picsForLocation.length > 0 ? (
              <div className="space-y-2">
                {picsForLocation.map((pic) => (
                  <Button key={pic.id} variant="outline" className="w-full justify-start h-auto py-3" onClick={() => onPICSelected?.(pic.id)}>
                    <div className="text-left">
                      <p className="font-medium text-sm">{pic.company_name}</p>
                      <p className="text-xs text-muted-foreground">{pic.location}</p>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada PIC di wilayah ini</p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Pilih wilayah Anda untuk menemukan PIC yang paling dekat dan siap membantu.
        </p>
      </CardContent>
    </Card>
  );
}
