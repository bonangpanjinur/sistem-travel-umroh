import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle2
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Informasi Dasar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Informasi Dasar</h3>
          </div>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Nama Hotel
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Contoh: Pullman Zamzam Makkah" 
                    className="focus-visible:ring-primary"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Kota
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Makkah, Madinah, Jeddah..." 
                      className="focus-visible:ring-primary"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="star_rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-muted-foreground" />
                    Rating Bintang
                  </FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger className="focus:ring-primary">
                        <SelectValue placeholder="Pilih rating" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <SelectItem key={star} value={star.toString()}>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: star }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                            ))}
                            <span className="ml-2 text-xs text-muted-foreground">({star} Bintang)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Section 2: Lokasi & Detail */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Navigation className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Lokasi & Detail</h3>
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alamat Lengkap</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Jl. Ibrahim Al Khalil, Makkah..." 
                    className="focus-visible:ring-primary"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="distance_to_masjid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jarak ke Masjid</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="Contoh: 50 meter" 
                      className="pl-9 focus-visible:ring-primary"
                      {...field} 
                    />
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormDescription className="text-[10px]">
                  Sebutkan jarak perkiraan dari pintu masuk utama masjid.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Section 3: Fasilitas */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b">
            <ListChecks className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Fasilitas</h3>
          </div>

          <FormField
            control={form.control}
            name="facilities"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Daftar Fasilitas</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="WiFi Gratis&#10;Restoran&#10;Laundry&#10;Layanan Kamar 24 Jam" 
                    rows={4} 
                    className="resize-none focus-visible:ring-primary"
                    {...field} 
                  />
                </FormControl>
                <FormDescription className="text-[10px]">
                  Tulis satu fasilitas per baris.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm">Status Aktif</FormLabel>
                  <FormDescription className="text-[10px]">
                    Hotel yang tidak aktif tidak akan muncul di pilihan paket.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-background pb-2">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel}
            className="hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            className="min-w-[140px] shadow-md hover:shadow-lg transition-all"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {isEditing ? "Simpan Perubahan" : "Tambah Hotel"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
