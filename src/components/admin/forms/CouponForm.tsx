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
  FormDescription,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Tag, Percent, DollarSign, Calendar, Lock } from "lucide-react";
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
        {/* Section 1: Informasi Dasar */}
        <div className="space-y-4 pb-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-sm text-gray-900">Informasi Dasar</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Kode Kupon</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="DISKON10" 
                      {...field} 
                      className="font-mono font-semibold tracking-wider"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Kode unik yang digunakan pelanggan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Nama Kupon</FormLabel>
                  <FormControl>
                    <Input placeholder="Diskon Awal Tahun" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Nama tampilan untuk admin
                  </FormDescription>
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
                <FormLabel className="text-sm font-medium">Deskripsi</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Jelaskan tujuan dan syarat kupon ini..." 
                    rows={2} 
                    {...field}
                    className="resize-none"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Deskripsi internal untuk referensi
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Section 2: Konfigurasi Diskon */}
        <div className="space-y-4 pb-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-sm text-gray-900">Konfigurasi Diskon</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="discount_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Tipe Diskon</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Persentase (%)
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Nominal (Rp)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Pilih jenis diskon yang ingin diberikan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Nilai Diskon</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        min={0} 
                        {...field}
                        placeholder="0"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                        {form.watch("discount_type") === "percentage" ? "%" : "Rp"}
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Besar diskon yang diberikan
                  </FormDescription>
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
                  <FormLabel className="text-sm font-medium">Min. Pembelian (Rp)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      {...field}
                      placeholder="0"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Minimum pembelian untuk menggunakan kupon
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Maks. Diskon (Rp)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      placeholder="Tidak ada batas" 
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Batas maksimal diskon yang diberikan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Section 3: Periode Berlaku */}
        <div className="space-y-4 pb-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-sm text-gray-900">Periode Berlaku</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="valid_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Berlaku Dari</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value || ""}
                      className="cursor-pointer"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Tanggal mulai berlaku kupon
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valid_until"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Berlaku Sampai</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value || ""}
                      className="cursor-pointer"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Tanggal akhir berlaku kupon
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Section 4: Batasan Penggunaan */}
        <div className="space-y-4 pb-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-sm text-gray-900">Batasan Penggunaan</h3>
          </div>

          <FormField
            control={form.control}
            name="usage_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Batas Penggunaan</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    placeholder="Tidak terbatas" 
                    {...field} 
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Jumlah maksimal kupon yang dapat digunakan (kosongkan untuk unlimited)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Section 5: Status */}
        <div className="space-y-4 pb-4 bg-gray-50 -mx-6 px-6 py-4 rounded-lg">
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div className="space-y-1">
                  <FormLabel className="text-sm font-medium">Status Kupon</FormLabel>
                  <FormDescription className="text-xs">
                    Aktifkan atau nonaktifkan kupon ini
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    className="ml-auto"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t -mx-6 px-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="min-w-[100px]"
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            className="min-w-[140px]"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Simpan Perubahan" : "Tambah Kupon"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
