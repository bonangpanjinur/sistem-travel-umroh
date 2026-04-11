import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Loader2, Upload, X, ImageIcon, Info, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import type { Database } from "@/integrations/supabase/types";

type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type PackageInsert = Database["public"]["Tables"]["packages"]["Insert"];
type PackageUpdate = Database["public"]["Tables"]["packages"]["Update"];

const generatePackageCode = () => {
  const prefix = "TAB";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${timestamp}${random}`;
};

const savingsPackageSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Nama paket harus diisi"),
  description: z.string().optional(),
  duration_days: z.coerce.number().min(1, "Durasi minimal 1 hari"),
  featured_image: z.string().optional().nullable(),
  includes: z.string().optional(),
  excludes: z.string().optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // Tabungan-specific fields
  savings_target: z.coerce.number().min(1, "Target tabungan harus diisi dan lebih dari 0"),
  is_tenor_flexible: z.boolean().default(true),
  fixed_tenor_months: z.coerce.number().min(6, "Durasi minimal 6 bulan").optional(),
  // PIC Fee fields
  fee_branch: z.coerce.number().min(0, "Fee cabang tidak boleh negatif").default(0),
  fee_agent: z.coerce.number().min(0, "Fee agen tidak boleh negatif").default(0),
  fee_sub_agent: z.coerce.number().min(0, "Fee sub agen tidak boleh negatif").default(0),
  fee_referral: z.coerce.number().min(0, "Fee referral jemaah tidak boleh negatif").default(0),
});

type SavingsPackageFormValues = z.infer<typeof savingsPackageSchema>;

interface SavingsPackageFormProps {
  packageData?: PackageRow;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SavingsPackageForm({ packageData, onSuccess, onCancel }: SavingsPackageFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!packageData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(packageData?.featured_image || null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<SavingsPackageFormValues>({
    resolver: zodResolver(savingsPackageSchema),
    defaultValues: {
      code: packageData?.code || "",
      name: packageData?.name || "",
      description: packageData?.description || "",
      duration_days: packageData?.duration_days || 9,
      featured_image: packageData?.featured_image || "",
      includes: packageData?.includes?.join("\n") || "",
      excludes: packageData?.excludes?.join("\n") || "",
      is_featured: packageData?.is_featured || false,
      is_active: packageData?.is_active ?? true,
      savings_target: packageData?.savings_target || 0,
      is_tenor_flexible: (packageData as any)?.is_tenor_flexible ?? true,
      fixed_tenor_months: (packageData as any)?.fixed_tenor_months || 12,
      fee_branch: (packageData as any)?.fee_branch || 0,
      fee_agent: (packageData as any)?.fee_agent || 0,
      fee_sub_agent: (packageData as any)?.fee_sub_agent || 0,
      fee_referral: (packageData as any)?.fee_referral || 0,
    },
  });

  const watchedFlexible = form.watch("is_tenor_flexible");
  const watchedTarget = form.watch("savings_target");
  const watchedFixedTenor = form.watch("fixed_tenor_months");

  // Calculate estimated monthly installment
  const estimatedMonthly = watchedFixedTenor && watchedTarget ? Math.ceil(watchedTarget / watchedFixedTenor) : 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `packages/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("website-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("website-assets")
        .getPublicUrl(fileName);

      form.setValue("featured_image", urlData.publicUrl);
      setImagePreview(urlData.publicUrl);
      toast.success("Gambar berhasil diupload");
    } catch (error: any) {
      toast.error("Gagal upload gambar: " + error.message);
      setImagePreview(packageData?.featured_image || null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue("featured_image", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mutation = useMutation({
    mutationFn: async (values: SavingsPackageFormValues) => {
      const { fee_branch, fee_agent, fee_sub_agent, fee_referral, savings_target, is_tenor_flexible, fixed_tenor_months, ...rest } = values;
      const payload: any = {
        ...rest,
        package_type: "tabungan",
        code: isEditing ? rest.code : generatePackageCode(),
        includes: rest.includes ? rest.includes.split("\n").filter(Boolean) : [],
        excludes: rest.excludes ? rest.excludes.split("\n").filter(Boolean) : [],
        // For tabungan packages, we don't set prices (they're flexible)
        price_quad: 0,
        price_triple: 0,
        price_double: 0,
        price_single: 0,
        hotel_makkah_id: null,
        hotel_madinah_id: null,
        airline_id: null,
        muthawif_id: null,
        // Add savings-specific fields
        savings_target,
        is_tenor_flexible,
        fixed_tenor_months: is_tenor_flexible ? null : fixed_tenor_months,
        // Add PIC fee fields
        fee_branch,
        fee_agent,
        fee_sub_agent,
        fee_referral,
      };

      if (isEditing && packageData) {
        const updatePayload: PackageUpdate = payload;
        const { error } = await supabase.from("packages").update(updatePayload).eq("id", packageData.id);
        if (error) throw error;
      } else {
        const insertPayload: PackageInsert = payload;
        const { error } = await supabase.from("packages").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Paket tabungan berhasil diperbarui" : "Paket tabungan berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: SavingsPackageFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Info Alert */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Paket Tabungan</p>
              <p className="text-xs text-blue-800 mt-1">
                Paket tabungan memungkinkan jemaah untuk menabung secara bertahap sebelum melakukan perjalanan. 
                Harga dan detail keberangkatan akan ditentukan saat jemaah mengkonversi tabungan menjadi pemesanan aktif.
              </p>
            </div>
          </div>
        </div>

        {/* Info Dasar */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Info Dasar</h4>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Paket</FormLabel>
                  <FormControl>
                    <Input {...field} value={isEditing ? field.value : "(otomatis)"} disabled className="bg-muted" />
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
                  <FormLabel>Nama Paket</FormLabel>
                  <FormControl>
                    <Input placeholder="Tabungan Umroh 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="duration_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durasi Estimasi (Hari)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} placeholder="Estimasi durasi perjalanan, misal 9 hari" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deskripsi Singkat</FormLabel>
                <FormControl>
                  <Textarea placeholder="Deskripsi paket tabungan, benefit, dan cara kerjanya..." rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Konfigurasi Tabungan */}
        <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">Konfigurasi Tabungan</h4>
          
          <FormField
            control={form.control}
            name="savings_target"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Tabungan (Rp) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={1} 
                    placeholder="Contoh: 25000000" 
                    {...field} 
                  />
                </FormControl>
                <p className="text-xs text-amber-700 mt-1">Nominal target yang harus dikumpulkan jemaah</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_tenor_flexible"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Tenor Cicilan Fleksibel</FormLabel>
              </FormItem>
            )}
          />

          {!watchedFlexible && (
            <FormField
              control={form.control}
              name="fixed_tenor_months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durasi Cicilan Standar (Bulan)</FormLabel>
                  <FormControl>
                    <Input type="number" min={6} placeholder="Contoh: 12" {...field} />
                  </FormControl>
                  <p className="text-xs text-amber-700 mt-1">Durasi cicilan yang wajib diikuti jemaah</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {!watchedFlexible && estimatedMonthly > 0 && (
            <div className="p-3 bg-white rounded border border-amber-100">
              <p className="text-xs text-muted-foreground">Estimasi Cicilan Bulanan:</p>
              <p className="text-lg font-bold text-amber-900">
                Rp {estimatedMonthly.toLocaleString('id-ID')}
              </p>
            </div>
          )}

          {watchedFlexible && watchedTarget > 0 && (
            <div className="p-3 bg-white rounded border border-amber-100">
              <p className="text-xs text-muted-foreground">Estimasi Cicilan Bulanan (Tenor 12 bulan):</p>
              <p className="text-lg font-bold text-amber-900">
                Rp {Math.ceil(watchedTarget / 12).toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-amber-700 mt-2">Jemaah dapat memilih tenor antara 6-36 bulan</p>
            </div>
          )}
        </div>

        {/* Fasilitas */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fasilitas</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="includes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sudah Termasuk (per baris)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Konsultasi Gratis&#10;Asuransi Perjalanan&#10;Panduan Manasik" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="excludes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tidak Termasuk (per baris)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Paspor&#10;Visa (jika diperlukan)&#10;Pengeluaran Pribadi" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pengaturan Fee PIC */}
        <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-semibold text-green-900 uppercase tracking-wide">Pengaturan Fee PIC</h4>
          <p className="text-xs text-green-800 mb-4">Tentukan fee standar untuk setiap tipe PIC (dalam Rupiah)</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField
              control={form.control}
              name="fee_branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Cabang (Rp)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="Contoh: 500000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fee_agent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Agen (Rp)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="Contoh: 400000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fee_sub_agent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Sub Agen (Rp)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="Contoh: 300000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fee_referral"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Referral Jemaah (Rp)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="Contoh: 250000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Media & Pengaturan */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Media & Pengaturan</h4>
          
          <div className="space-y-2">
            <Label>Gambar Utama Paket</Label>
            <div className="flex items-center gap-4">
              <div 
                className="relative w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted overflow-hidden cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Gambar
                </Button>
                {imagePreview && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeImage} className="text-destructive">
                    <X className="h-4 w-4 mr-2" />
                    Hapus
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">Maksimal 5MB (JPG, PNG, WEBP)</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Paket Unggulan</FormLabel>
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
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending || isUploading}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Simpan Perubahan" : "Buat Paket Tabungan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
