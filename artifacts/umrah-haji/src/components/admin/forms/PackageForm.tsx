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
import { Loader2, Upload, X, ImageIcon, Info, Search } from "lucide-react";
import { useState, useRef } from "react";
import type { Database } from "@/integrations/supabase/types";

type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type PackageInsert = Database["public"]["Tables"]["packages"]["Insert"];
type PackageUpdate = Database["public"]["Tables"]["packages"]["Update"];

const generatePackageCode = (type: string) => {
  const prefixMap: Record<string, string> = {
    umroh: "UMR",
    umroh_plus: "UMP",
    haji: "HAJ",
    haji_plus: "HJP",
    tabungan: "TAB",
  };
  const prefix = prefixMap[type] || "PKG";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${timestamp}${random}`;
};

const packageSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Nama paket harus diisi"),
  package_type: z.enum(["umroh", "haji", "haji_plus", "umroh_plus", "tabungan"]),
  description: z.string().optional(),
  duration_days: z.coerce.number().min(1, "Durasi minimal 1 hari"),
  featured_image: z.string().optional().nullable(),
  includes: z.string().optional(),
  excludes: z.string().optional(),
  is_featured: z.boolean().default(false),
  is_popular: z.boolean().default(false),
  is_cheapest: z.boolean().default(false),
  is_active: z.boolean().default(true),

  // PIC Fee fields
  fee_branch: z.coerce.number().min(0, "Fee cabang tidak boleh negatif").default(0),
  fee_agent: z.coerce.number().min(0, "Fee agen tidak boleh negatif").default(0),
  fee_sub_agent: z.coerce.number().min(0, "Fee sub agen tidak boleh negatif").default(0),
  fee_referral: z.coerce.number().min(0, "Fee referral jemaah tidak boleh negatif").default(0),
  child_price_percent: z.coerce.number().min(0).max(100).default(75),
  infant_price_percent: z.coerce.number().min(0).max(100).default(10),

  // SEO fields
  meta_title: z.string().max(70, "Meta title maksimal 70 karakter").optional(),
  meta_description: z.string().max(160, "Meta description maksimal 160 karakter").optional(),
  keywords: z.string().optional(),
});

type PackageFormValues = z.infer<typeof packageSchema>;

interface PackageFormProps {
  packageData?: PackageRow;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PackageForm({ packageData, onSuccess, onCancel }: PackageFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!packageData;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(packageData?.featured_image || null);
  const [isUploading, setIsUploading] = useState(false);



  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      code: packageData?.code || "",
      name: packageData?.name || "",
      package_type: (packageData?.package_type as PackageFormValues["package_type"]) || "umroh",
      description: packageData?.description || "",
      duration_days: packageData?.duration_days || 9,
      featured_image: packageData?.featured_image || "",
      includes: packageData?.includes?.join("\n") || "",
      excludes: packageData?.excludes?.join("\n") || "",
      is_featured: packageData?.is_featured || false,
      is_popular: (packageData as any)?.is_popular || false,
      is_cheapest: (packageData as any)?.is_cheapest || false,
      is_active: packageData?.is_active ?? true,

      fee_branch: (packageData as any)?.fee_branch || 0,
      fee_agent: (packageData as any)?.fee_agent || 0,
      fee_sub_agent: (packageData as any)?.fee_sub_agent || 0,
      fee_referral: (packageData as any)?.fee_referral || 0,
      child_price_percent: (packageData as any)?.child_price_percent ?? 75,
      infant_price_percent: (packageData as any)?.infant_price_percent ?? 10,

      meta_title: (packageData as any)?.meta_title || "",
      meta_description: (packageData as any)?.meta_description || "",
      keywords: (packageData as any)?.keywords?.join(", ") || "",
    },
  });



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
    mutationFn: async (values: PackageFormValues) => {
      const { fee_branch, fee_agent, fee_sub_agent, fee_referral, keywords, ...rest } = values;
      const payload: any = {
        ...rest,
        code: isEditing ? rest.code : generatePackageCode(rest.package_type),
        includes: rest.includes ? rest.includes.split("\n").filter(Boolean) : [],
        excludes: rest.excludes ? rest.excludes.split("\n").filter(Boolean) : [],
        // Set price/hotel/airline to null - these are managed on departures
        price_quad: 0,
        price_triple: 0,
        price_double: 0,
        price_single: 0,
        hotel_makkah_id: null,
        hotel_madinah_id: null,
        airline_id: null,
        muthawif_id: null,
        // Add PIC fee fields
        fee_branch,
        fee_agent,
        fee_sub_agent,
        fee_referral,
        // SEO fields
        meta_title: rest.meta_title || null,
        meta_description: rest.meta_description || null,
        keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
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
      toast.success(isEditing ? "Paket berhasil diperbarui" : "Paket berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: PackageFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <Input placeholder="Umroh Reguler 9 Hari" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="package_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Paket</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="umroh">Umroh</SelectItem>
                      <SelectItem value="umroh_plus">Umroh Plus</SelectItem>
                      <SelectItem value="haji">Haji</SelectItem>
                      <SelectItem value="haji_plus">Haji Plus</SelectItem>
                      <SelectItem value="tabungan">Tabungan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durasi (Hari)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
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
                <FormLabel>Deskripsi Singkat</FormLabel>
                <FormControl>
                  <Textarea placeholder="Deskripsi paket..." rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Info: Harga & Hotel dikelola di Keberangkatan */}
        <div className="p-4 bg-muted/50 border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Harga, Hotel, Maskapai & Muthawif</p>
              <p className="text-xs text-muted-foreground mt-1">
                Data harga per tipe kamar, hotel Makkah/Madinah, maskapai, dan muthawif dikelola pada menu <strong>Keberangkatan</strong>. 
                Setiap tanggal keberangkatan dapat memiliki harga dan akomodasi yang berbeda.
              </p>
            </div>
          </div>
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
                    <Textarea placeholder="Tiket Pesawat&#10;Visa&#10;Makan 3x sehari" rows={4} {...field} />
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
                    <Textarea placeholder="Paspor&#10;Kelebihan Bagasi&#10;Pengeluaran Pribadi" rows={4} {...field} />
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
                    <Input type="number" min={0} placeholder="Contoh: 4000000" {...field} />
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
                    <Input type="number" min={0} placeholder="Contoh: 3000000" {...field} />
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
                    <Input type="number" min={0} placeholder="Contoh: 2500000" {...field} />
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
                    <Input type="number" min={0} placeholder="Contoh: 2000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Persentase Harga Anak/Balita */}
        <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div>
            <h4 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">Default Harga Anak &amp; Balita</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              Persentase ini digunakan sebagai kalkulasi otomatis harga anak/balita saat harga spesifik tidak diisi di keberangkatan.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="child_price_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>% Harga Anak dari Kamar</FormLabel>
                  <div className="flex items-center gap-1">
                    <FormControl>
                      <Input type="number" min={0} max={100} placeholder="75" {...field} />
                    </FormControl>
                    <span className="text-sm font-bold text-amber-700">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Default: 75% dari harga kamar</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="infant_price_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>% Harga Balita dari Kamar</FormLabel>
                  <div className="flex items-center gap-1">
                    <FormControl>
                      <Input type="number" min={0} max={100} placeholder="10" {...field} />
                    </FormControl>
                    <span className="text-sm font-bold text-amber-700">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Default: 10% dari harga kamar</p>
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
              name="is_popular"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Paket Terpopuler</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_cheapest"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Paket Termurah</FormLabel>
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

        {/* SEO */}
        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-700" />
              <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">SEO & Mesin Pencari</h4>
            </div>
            <p className="text-xs text-blue-800 mt-0.5">
              Isi field ini agar paket mudah ditemukan di Google. Jika kosong, sistem akan menggunakan nama paket dan deskripsi secara otomatis.
            </p>
          </div>

          <FormField
            control={form.control}
            name="meta_title"
            render={({ field }) => {
              const len = field.value?.length ?? 0;
              return (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Paket Umroh Reguler 9 Hari — Vinstour Travel" {...field} />
                  </FormControl>
                  <div className="flex justify-between">
                    <p className="text-[10px] text-muted-foreground">Judul yang tampil di hasil pencarian Google. Idealnya 50–60 karakter.</p>
                    <span className={`text-[10px] ${len > 70 ? "text-destructive" : "text-muted-foreground"}`}>{len}/70</span>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="meta_description"
            render={({ field }) => {
              const len = field.value?.length ?? 0;
              return (
                <FormItem>
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contoh: Nikmati perjalanan umroh 9 hari bersama Vinstour Travel dengan fasilitas hotel bintang 4, muthawif berpengalaman, dan harga terjangkau."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between">
                    <p className="text-[10px] text-muted-foreground">Ringkasan yang muncul di bawah judul di Google. Idealnya 120–160 karakter.</p>
                    <span className={`text-[10px] ${len > 160 ? "text-destructive" : "text-muted-foreground"}`}>{len}/160</span>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Keywords (Kata Kunci)</FormLabel>
                <FormControl>
                  <Input placeholder="umroh murah, paket umroh jakarta, umroh reguler 2025" {...field} />
                </FormControl>
                <p className="text-[10px] text-muted-foreground">Pisahkan dengan koma. Contoh: umroh murah, paket umroh jakarta</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending || isUploading}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Simpan Perubahan" : "Buat Paket"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
