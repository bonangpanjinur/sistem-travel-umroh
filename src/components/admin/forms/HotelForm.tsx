import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { toast } from "sonner";
import { 
  Loader2, 
  Building2, 
  MapPin, 
  Star, 
  Navigation, 
  ListChecks, 
  Info,
  CheckCircle2,
  X
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type HotelRow = Database["public"]["Tables"]["hotels"]["Row"];
type HotelInsert = Database["public"]["Tables"]["hotels"]["Insert"];
type HotelUpdate = Database["public"]["Tables"]["hotels"]["Update"];

const hotelSchema = z.object({
  name: z.string().min(1, "Nama hotel harus diisi"),
  city: z.string().min(1, "Kota harus diisi"),
  star_rating: z.coerce.number().min(1).max(5),
  address: z.string().optional(),
  distance_to_masjid: z.string().optional(),
  facilities: z.string().optional(),
  is_active: z.boolean().default(true),
});

type HotelFormValues = z.infer<typeof hotelSchema>;

interface HotelFormProps {
  hotelData?: HotelRow;
  onSuccess: () => void;
  onCancel: () => void;
}

export function HotelForm({ hotelData, onSuccess, onCancel }: HotelFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!hotelData;

  const form = useForm<HotelFormValues>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: hotelData?.name || "",
      city: hotelData?.city || "Makkah",
      star_rating: hotelData?.star_rating || 3,
      address: hotelData?.address || "",
      distance_to_masjid: hotelData?.distance_to_masjid || "",
      facilities: hotelData?.facilities?.join("\n") || "",
      is_active: hotelData?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: HotelFormValues) => {
      const payload = {
        ...values,
        facilities: values.facilities ? values.facilities.split("\n").filter(Boolean) : [],
      };

      if (isEditing && hotelData) {
        const updatePayload: HotelUpdate = payload;
        const { error } = await supabase.from("hotels").update(updatePayload).eq("id", hotelData.id);
        if (error) throw error;
      } else {
        const insertPayload = payload as unknown as HotelInsert;
        const { error } = await supabase.from("hotels").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Hotel berhasil diperbarui" : "Hotel berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-hotels"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: HotelFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[85vh]">
        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 px-1 pr-4">
          <div className="space-y-5 py-1">
            {/* Section 1: Informasi Dasar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-muted">
                <Info className="h-3.5 w-3.5 text-primary" />
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Informasi Dasar</h3>
              </div>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      Nama Hotel
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Pullman Zamzam Makkah" 
                        className="h-9 text-sm focus-visible:ring-primary"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        Kota
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Makkah" 
                          className="h-9 text-sm focus-visible:ring-primary"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="star_rating"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs flex items-center gap-2">
                        <Star className="h-3 w-3 text-muted-foreground" />
                        Rating
                      </FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm focus:ring-primary">
                            <SelectValue placeholder="Pilih rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <SelectItem key={star} value={star.toString()}>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: star }).map((_, i) => (
                                  <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                ))}
                                <span className="ml-1 text-[11px] text-muted-foreground">({star})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 2: Lokasi & Detail */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-muted">
                <Navigation className="h-3.5 w-3.5 text-primary" />
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Lokasi & Detail</h3>
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Alamat</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Jl. Ibrahim Al Khalil, Makkah" 
                        className="h-9 text-sm focus-visible:ring-primary"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="distance_to_masjid"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Jarak ke Masjid</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="50 meter" 
                          className="h-9 pl-8 text-sm focus-visible:ring-primary"
                          {...field} 
                        />
                        <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 3: Fasilitas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-muted">
                <ListChecks className="h-3.5 w-3.5 text-primary" />
                <h3 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Fasilitas</h3>
              </div>

              <FormField
                control={form.control}
                name="facilities"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Daftar Fasilitas (per baris)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="WiFi Gratis&#10;Restoran&#10;Laundry" 
                        rows={3} 
                        className="text-sm resize-none focus-visible:ring-primary min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-2 shadow-sm bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-xs">Status Aktif</FormLabel>
                      <p className="text-[10px] text-muted-foreground">Tampilkan hotel di pilihan paket</p>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        className="scale-90"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Footer with Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t bg-background">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={onCancel}
            className="h-9 px-4 hover:bg-destructive/10 hover:text-destructive transition-colors text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Batal
          </Button>
          <Button 
            type="submit" 
            size="sm"
            disabled={mutation.isPending}
            className="h-9 px-6 shadow-sm hover:shadow-md transition-all text-xs"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isEditing ? "Simpan Perubahan" : "Tambah Hotel"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
