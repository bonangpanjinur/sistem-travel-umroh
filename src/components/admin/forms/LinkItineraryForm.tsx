import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Calendar, Clock, Check, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Database } from "@/integrations/supabase/types";

type ItineraryTemplateRow = Database["public"]["Tables"]["itinerary_templates"]["Row"];
type DepartureItineraryRow = Database["public"]["Tables"]["departure_itineraries"]["Row"];

interface ItineraryDay {
  day: number;
  title: string;
  activities: { time: string; activity: string; location?: string }[];
}

interface ItineraryTemplate extends Omit<ItineraryTemplateRow, "days"> {
  days: ItineraryDay[];
}

interface DepartureItinerary extends Omit<DepartureItineraryRow, "customized_days"> {
  customized_days: ItineraryDay[] | null;
  template?: ItineraryTemplate;
}

interface LinkItineraryFormProps {
  departureId: string;
  departureDate: string;
  onSuccess?: () => void;
}

export function LinkItineraryForm({ departureId, departureDate, onSuccess }: LinkItineraryFormProps) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Fetch available templates
  const { data: templates = [] } = useQuery({
    queryKey: ["itinerary-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itinerary_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as ItineraryTemplate[];
    },
  });

  // Fetch current linked itinerary
  const { data: linkedItinerary } = useQuery({
    queryKey: ["departure-itinerary", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departure_itineraries")
        .select("*, template:itinerary_templates(*)")
        .eq("departure_id", departureId)
        .maybeSingle();
      if (error) throw error;
      return data as DepartureItinerary | null;
    },
  });

  // Link mutation
  const linkMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // First remove any existing link
      await supabase
        .from("departure_itineraries")
        .delete()
        .eq("departure_id", departureId);

      // Insert new link
      const { error } = await supabase
        .from("departure_itineraries")
        .insert({
          departure_id: departureId,
          template_id: templateId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-itinerary", departureId] });
      toast.success("Itinerary berhasil dihubungkan");
      onSuccess?.();
    },
    onError: (error: Error) => toast.error("Gagal: " + error.message),
  });

  // Unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("departure_itineraries")
        .delete()
        .eq("departure_id", departureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departure-itinerary", departureId] });
      toast.success("Itinerary dihapus dari keberangkatan");
      setSelectedTemplateId("");
    },
    onError: (error: Error) => toast.error("Gagal: " + error.message),
  });

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const currentTemplate = linkedItinerary?.template;

  // Calculate actual dates based on departure date
  const getActualDate = (dayNumber: number) => {
    const date = new Date(departureDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return formatDate(date.toISOString());
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      {linkedItinerary && currentTemplate ? (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Itinerary Terhubung</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => unlinkMutation.mutate()}
                disabled={unlinkMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Lepas
              </Button>
            </div>
            <CardDescription>
              Template: <strong>{currentTemplate.name}</strong> ({currentTemplate.duration_days} hari)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {currentTemplate.days?.map((day) => (
                <div key={day.day} className="border rounded-lg p-3 bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Hari {day.day}</Badge>
                    <span className="text-sm font-medium">{day.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {getActualDate(day.day)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {day.activities?.map((act, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Clock className="h-3 w-3 mt-1 text-muted-foreground" />
                        <span className="text-muted-foreground w-12">{act.time}</span>
                        <span>{act.activity}</span>
                        {act.location && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {act.location}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Pilih Template Itinerary</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.duration_days} hari - {template.package_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Belum ada template. Buat template terlebih dahulu di menu Template Itinerary.
              </p>
            )}
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Preview: {selectedTemplate.name}</CardTitle>
                <CardDescription>{selectedTemplate.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {selectedTemplate.days?.map((day) => (
                    <div key={day.day} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Hari {day.day}</Badge>
                        <span className="text-sm font-medium">{day.title}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {getActualDate(day.day)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {day.activities?.slice(0, 3).map((act, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <Clock className="h-3 w-3 mt-1 text-muted-foreground" />
                            <span className="text-muted-foreground w-12">{act.time}</span>
                            <span>{act.activity}</span>
                          </div>
                        ))}
                        {day.activities?.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{day.activities.length - 3} aktivitas lainnya
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={() => linkMutation.mutate(selectedTemplateId)}
                  disabled={linkMutation.isPending}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {linkMutation.isPending ? "Menghubungkan..." : "Hubungkan Itinerary"}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
