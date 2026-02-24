import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
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
  hotel_makkah_id: z.string().optional().nullable(),
  hotel_madinah_id: z.string().optional().nullable(),
  airline_id: z.string().optional().nullable(),
  muthawif_id: z.string().optional().nullable(),
  price_quad: z.coerce.number().min(0),
  price_triple: z.coerce.number().min(0),
  price_double: z.coerce.number().min(0),
  price_single: z.coerce.number().min(0),
  featured_image: z.string().optional().nullable(),
  includes: z.string().optional(),
  excludes: z.string().optional(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  // Tabungan-specific fields (stored in description/metadata for now)
  target_amount: z.coerce.number().optional(),
  monthly_installment: z.coerce.number().optional(),
  savings_duration_months: z.coerce.number().optional(),
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

  const { data: hotels } = useQuery({
    queryKey: ["hotels-list"],
    queryFn: async () => {
      const { data } = await supabase.from("hotels").select("id, name, city").eq("is_active", true);
      return data || [];
    },
  });

  const { data: airlines } = useQuery({
    queryKey: ["airlines-list"],
    queryFn: async () => {
      const { data } = await supabase.from("airlines").select("id, name, code").eq("is_active", true);
      return data || [];
    },
  });

  const { data: muthawifs } = useQuery({
    queryKey: ["muthawifs-list"],
    queryFn: async () => {
      const { data } = await supabase.from("muthawifs").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  // Parse tabungan metadata from existing package
  const parseSavingsMetadata = () => {
    if (packageData?.package_type !== 'tabungan') return {};
    // Try to parse from description or a metadata convention
    try {
      const meta = (packageData as PackageRow & { metadata?: any })?.metadata;
      if (meta) return meta;
    } catch {}
    return {};
  };
  const savingsMeta = parseSavingsMetadata();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      code: packageData?.code || "",
      name: packageData?.name || "",
      package_type: (packageData?.package_type as PackageFormValues["package_type"]) || "umroh",
      description: packageData?.description || "",
      duration_days: packageData?.duration_days || 9,
      hotel_makkah_id: packageData?.hotel_makkah_id || null,
      hotel_madinah_id: packageData?.hotel_madinah_id || null,
      airline_id: packageData?.airline_id || null,
      muthawif_id: packageData?.muthawif_id || null,
      price_quad: packageData?.price_quad || 0,
      price_triple: packageData?.price_triple || 0,
      price_double: packageData?.price_double || 0,
      price_single: packageData?.price_single || 0,
      featured_image: packageData?.featured_image || "",
      includes: packageData?.includes?.join("\n") || "",
      excludes: packageData?.excludes?.join("\n") || "",
      is_featured: packageData?.is_featured || false,
      is_active: packageData?.is_active ?? true,
      target_amount: savingsMeta.target_amount || 0,
      monthly_installment: savingsMeta.monthly_installment || 0,
      savings_duration_months: savingsMeta.savings_duration_months || 12,
    },
  });

  const watchedType = form.watch("package_type");
  const isTabungan = watchedType === "tabungan";

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    // Upload to Supabase storage
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
      const { target_amount, monthly_installment, savings_duration_months, ...rest } = values;
      const payload: any = {
        ...rest,
        code: isEditing ? rest.code : generatePackageCode(rest.package_type),
        includes: rest.includes ? rest.includes.split("\n").filter(Boolean) : [],
        excludes: rest.excludes ? rest.excludes.split("\n").filter(Boolean) : [],
        hotel_makkah_id: rest.hotel_makkah_id || null,
        hotel_madinah_id: rest.hotel_madinah_id || null,
        airline_id: rest.airline_id || null,
        muthawif_id: rest.muthawif_id || null,
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
        {/* Step 1: Info Dasar */}
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
                  <Textarea placeholder="Tuliskan deskripsi paket..." rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Step 2: Harga */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Harga Paket</h4>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <FormField
              control={form.control}
              name="price_quad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quad (4)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price_triple"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Triple (3)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price_double"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Double (2)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price_single"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Single (1)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Step 3: Akomodasi & Fasilitas */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Akomodasi & Fasilitas</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="hotel_makkah_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Makkah</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih hotel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hotels?.filter(h => h.city === 'Makkah').map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hotel_madinah_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Madinah</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih hotel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hotels?.filter(h => h.city === 'Madinah').map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="airline_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maskapai Utama</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih maskapai" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {airlines?.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="muthawif_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Muthawif Default</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih muthawif" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {muthawifs?.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

        {/* Step 4: Gambar & Pengaturan */}
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
            {isEditing ? "Simpan Perubahan" : "Buat Paket"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
