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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

const packageTypeSchema = z.object({
  code: z.string().min(2, "Kode minimal 2 karakter").max(50),
  name: z.string().min(1, "Nama harus diisi"),
  description: z.string().optional().nullable(),
  booking_mode: z.enum(["umroh", "haji", "wisata"]).default("umroh"),
  display_order: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
});

type PackageTypeFormValues = z.infer<typeof packageTypeSchema>;

interface PackageTypeFormProps {
  packageTypeData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PackageTypeForm({ packageTypeData, onSuccess, onCancel }: PackageTypeFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!packageTypeData;

  const form = useForm<PackageTypeFormValues>({
    resolver: zodResolver(packageTypeSchema),
    defaultValues: {
      code: packageTypeData?.code || "",
      name: packageTypeData?.name || "",
      description: packageTypeData?.description || "",
      booking_mode: packageTypeData?.booking_mode || "umroh",
      display_order: packageTypeData?.display_order || 0,
      is_active: packageTypeData?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: PackageTypeFormValues) => {
      if (isEditing && packageTypeData) {
        const { error } = await supabase
          .from("package_types")
          .update(values as any)
          .eq("id", packageTypeData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("package_types")
          .insert([values as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Tipe paket berhasil diperbarui" : "Tipe paket berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-package-types"] });
      queryClient.invalidateQueries({ queryKey: ["package-types"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: PackageTypeFormValues) => {
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
                <FormLabel>Kode Tipe</FormLabel>
                <FormControl>
                  <Input placeholder="wisata_turki" {...field} disabled={isEditing} />
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
                <FormLabel>Nama Tipe</FormLabel>
                <FormControl>
                  <Input placeholder="Wisata Turki" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="booking_mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mode Booking</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mode booking" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="umroh">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      Umroh — Alokasi kamar Quad/Triple/Double/Single
                    </span>
                  </SelectItem>
                  <SelectItem value="haji">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      Haji — Harga per orang, tanpa alokasi kamar
                    </span>
                  </SelectItem>
                  <SelectItem value="wisata">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Wisata — Tour religi, Twin/Double + surcharge solo
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Menentukan tampilan step alokasi kamar di wizard booking dan model harga yang digunakan.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea placeholder="Deskripsi tipe paket..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="display_order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Urutan Tampilan</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Status Aktif</FormLabel>
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

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isEditing ? "Simpan Perubahan" : "Tambah Tipe"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
