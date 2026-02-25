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

type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];
type CouponInsert = Database["public"]["Tables"]["coupons"]["Insert"];
type CouponUpdate = Database["public"]["Tables"]["coupons"]["Update"];

const couponSchema = z.object({
  code: z.string().min(1, "Kode kupon harus diisi"),
  name: z.string().min(1, "Nama kupon harus diisi"),
  description: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.coerce.number().min(0),
  min_purchase: z.coerce.number().min(0).default(0),
  max_discount: z.coerce.number().optional().nullable(),
  usage_limit: z.coerce.number().optional().nullable(),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type CouponFormValues = z.infer<typeof couponSchema>;

interface CouponFormProps {
  couponData?: CouponRow;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CouponForm({ couponData, onSuccess, onCancel }: CouponFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!couponData;

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: couponData?.code || "",
      name: couponData?.name || "",
      description: couponData?.description || "",
      discount_type: (couponData?.discount_type as "percentage" | "fixed") || "percentage",
      discount_value: couponData?.discount_value || 0,
      min_purchase: couponData?.min_purchase || 0,
      max_discount: couponData?.max_discount || null,
      usage_limit: couponData?.usage_limit || null,
      valid_from: couponData?.valid_from || "",
      valid_until: couponData?.valid_until || "",
      is_active: couponData?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CouponFormValues) => {
      const payload = {
        ...values,
        max_discount: values.max_discount || null,
        usage_limit: values.usage_limit || null,
        valid_from: values.valid_from || null,
        valid_until: values.valid_until || null,
        description: values.description || null,
      };

      if (isEditing && couponData) {
        const updatePayload: CouponUpdate = payload;
        const { error } = await supabase.from("coupons").update(updatePayload).eq("id", couponData.id);
        if (error) throw error;
      } else {
        const insertPayload = payload as unknown as CouponInsert;
        const { error } = await supabase.from("coupons").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Kupon berhasil diperbarui" : "Kupon berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: CouponFormValues) => {
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
                <FormLabel>Kode Kupon</FormLabel>
                <FormControl>
                  <Input placeholder="DISKON10" {...field} />
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
                <FormLabel>Nama Kupon</FormLabel>
                <FormControl>
                  <Input placeholder="Diskon Awal Tahun" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea placeholder="Deskripsi kupon..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="discount_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipe Diskon</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                    <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discount_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nilai Diskon</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="min_purchase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min. Pembelian (Rp)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maks. Diskon (Rp)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="Opsional" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="valid_from"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Berlaku Dari</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valid_until"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Berlaku Sampai</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="usage_limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Batas Penggunaan</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="Tidak terbatas" {...field} value={field.value || ""} />
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
            {isEditing ? "Simpan Perubahan" : "Tambah Kupon"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
