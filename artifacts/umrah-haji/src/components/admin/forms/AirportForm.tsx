import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

type AirportInsert = Database["public"]["Tables"]["airports"]["Insert"];
type AirportUpdate = Database["public"]["Tables"]["airports"]["Update"];

const airportSchema = z.object({
  code: z.string().min(3, "Kode bandara harus 3 karakter").max(3),
  name: z.string().min(1, "Nama bandara harus diisi"),
  city: z.string().min(1, "Kota harus diisi"),
  country: z.string().min(1, "Negara harus diisi"),
  is_active: z.boolean().default(true),
});

type AirportFormValues = z.infer<typeof airportSchema>;

interface AirportFormProps {
  airportData?: Database["public"]["Tables"]["airports"]["Row"];
  onSuccess: () => void;
  onCancel: () => void;
}

export function AirportForm({ airportData, onSuccess, onCancel }: AirportFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!airportData;

  const form = useForm<AirportFormValues>({
    resolver: zodResolver(airportSchema),
    defaultValues: {
      code: airportData?.code || "",
      name: airportData?.name || "",
      city: airportData?.city || "",
      country: airportData?.country || "Indonesia",
      is_active: airportData?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AirportFormValues) => {
      if (isEditing && airportData) {
        const payload: AirportUpdate = values;
        const { error } = await supabase.from("airports").update(payload).eq("id", airportData.id);
        if (error) throw error;
      } else {
        const payload = values as unknown as AirportInsert;
        const { error } = await supabase.from("airports").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Bandara berhasil diperbarui" : "Bandara berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-airports"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: AirportFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kode Bandara (IATA)</FormLabel>
                <FormControl>
                  <Input placeholder="CGK" maxLength={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Bandara</FormLabel>
                <FormControl>
                  <Input placeholder="Soekarno-Hatta International Airport" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kota</FormLabel>
                <FormControl>
                  <Input placeholder="Jakarta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Negara</FormLabel>
                <FormControl>
                  <Input placeholder="Indonesia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
            {isEditing ? "Simpan Perubahan" : "Tambah Bandara"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
