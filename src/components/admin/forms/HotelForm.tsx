import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
        const insertPayload: HotelInsert = payload;
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Hotel</FormLabel>
              <FormControl>
                <Input placeholder="Pullman Zamzam Makkah" {...field} />
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
                <FormLabel>Kota</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kota" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Makkah">Makkah</SelectItem>
                    <SelectItem value="Madinah">Madinah</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="star_rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bintang</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rating" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <SelectItem key={star} value={star.toString()}>
                        {"⭐".repeat(star)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alamat</FormLabel>
              <FormControl>
                <Input placeholder="Alamat lengkap hotel" {...field} />
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
                <Input placeholder="50 meter" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="facilities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fasilitas (per baris)</FormLabel>
              <FormControl>
                <Textarea placeholder="WiFi Gratis&#10;Restoran&#10;Laundry" rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Aktif</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Simpan Perubahan" : "Tambah Hotel"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
