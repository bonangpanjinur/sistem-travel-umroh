import { useState } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Upload, X, Plane, CheckCircle2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type AirlineInsert = Database["public"]["Tables"]["airlines"]["Insert"];
type AirlineUpdate = Database["public"]["Tables"]["airlines"]["Update"];

const airlineSchema = z.object({
  code: z.string().min(2, "Kode maskapai minimal 2 karakter").max(3),
  name: z.string().min(1, "Nama maskapai harus diisi"),
  logo_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type AirlineFormValues = z.infer<typeof airlineSchema>;

interface AirlineFormProps {
  airlineData?: Database["public"]["Tables"]["airlines"]["Row"];
  onSuccess: () => void;
  onCancel: () => void;
}

export function AirlineForm({ airlineData, onSuccess, onCancel }: AirlineFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const isEditing = !!airlineData;

  const form = useForm<AirlineFormValues>({
    resolver: zodResolver(airlineSchema),
    defaultValues: {
      code: airlineData?.code || "",
      name: airlineData?.name || "",
      logo_url: airlineData?.logo_url || "",
      is_active: airlineData?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: AirlineFormValues) => {
      if (isEditing && airlineData) {
        const payload: AirlineUpdate = {
          ...values,
          logo_url: values.logo_url || null,
        };
        const { error } = await supabase.from("airlines").update(payload).eq("id", airlineData.id);
        if (error) throw error;
      } else {
        const payload = {
          ...values,
          logo_url: values.logo_url || null,
        } as unknown as AirlineInsert;
        const { error } = await supabase.from("airlines").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Maskapai berhasil diperbarui" : "Maskapai berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-airlines"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("File harus berupa gambar");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `airline-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('package_images') // Using existing bucket if available, or assume 'package_images' is general purpose
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('package_images')
        .getPublicUrl(filePath);

      form.setValue('logo_url', publicUrl);
      toast.success("Logo berhasil diunggah");
    } catch (error: any) {
      toast.error("Gagal mengunggah logo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (values: AirlineFormValues) => {
    mutation.mutate(values);
  };

  const currentLogo = form.watch('logo_url');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                    Kode Maskapai
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="GA" maxLength={3} className="h-9 uppercase" {...field} />
                  </FormControl>
                  <FormDescription className="text-[10px]">Contoh: GA, SV, EK</FormDescription>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nama Maskapai</FormLabel>
                  <FormControl>
                    <Input placeholder="Garuda Indonesia" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="logo_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Logo Maskapai</FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    {currentLogo ? (
                      <div className="relative w-32 h-20 border rounded-lg bg-muted/20 flex items-center justify-center overflow-hidden group">
                        <img 
                          src={currentLogo} 
                          alt="Logo Preview" 
                          className="max-w-full max-h-full object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={() => form.setValue('logo_url', '')}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-32 h-20 border-2 border-dashed rounded-lg bg-muted/10">
                        <label className="cursor-pointer flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                          {isUploading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-5 w-5" />
                              <span className="text-[10px]">Upload Logo</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    )}
                    <Input type="hidden" {...field} value={field.value || ""} />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border p-2.5 shadow-sm bg-muted/20">
                <div className="space-y-0.5">
                  <FormLabel className="text-xs">Status Aktif</FormLabel>
                  <p className="text-[10px] text-muted-foreground">Tampilkan maskapai di pilihan paket</p>
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

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={onCancel}
            className="h-9 px-4 text-xs"
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            size="sm"
            disabled={mutation.isPending || isUploading}
            className="h-9 px-6 text-xs"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            {isEditing ? "Simpan Perubahan" : "Tambah Maskapai"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
