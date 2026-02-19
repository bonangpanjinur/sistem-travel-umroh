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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const branchSchema = z.object({
  code: z.string().min(1, "Kode cabang harus diisi"),
  name: z.string().min(1, "Nama cabang harus diisi"),
  slug: z.string()
    .optional()
    .refine((val) => !val || /^[a-z0-9-]+$/.test(val), {
      message: "Hanya huruf kecil, angka, dan strip (-) yang diperbolehkan",
    }),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

type BranchFormValues = z.infer<typeof branchSchema>;

interface BranchFormProps {
  branchData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BranchForm({ branchData, onSuccess, onCancel }: BranchFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!branchData;

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      code: branchData?.code || "",
      name: branchData?.name || "",
      slug: branchData?.slug || "",
      address: branchData?.address || "",
      city: branchData?.city || "",
      province: branchData?.province || "",
      phone: branchData?.phone || "",
      email: branchData?.email || "",
      is_active: branchData?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: BranchFormValues) => {
      const payload = {
        ...values,
        slug: values.slug || null,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        city: values.city || null,
        province: values.province || null,
      };

      if (isEditing) {
        const { error } = await supabase.from("branches").update(payload).eq("id", branchData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("branches").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Cabang berhasil diperbarui" : "Cabang berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: BranchFormValues) => {
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
                <FormLabel>Kode Cabang</FormLabel>
                <FormControl>
                  <Input placeholder="JKT" {...field} />
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
                <FormLabel>Nama Cabang</FormLabel>
                <FormControl>
                  <Input placeholder="Cabang Jakarta Pusat" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subdomain Website</FormLabel>
              <FormControl>
                <Input placeholder="jakarta-pusat" {...field} />
              </FormControl>
              {field.value && (
                <p className="text-xs text-muted-foreground">
                  URL: <span className="font-mono text-primary">{window.location.origin}/b/{field.value}</span>
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alamat</FormLabel>
              <FormControl>
                <Textarea placeholder="Alamat lengkap cabang" rows={2} {...field} />
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
                <FormControl>
                  <Input placeholder="Jakarta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="province"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provinsi</FormLabel>
                <FormControl>
                  <Input placeholder="DKI Jakarta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>No. Telepon</FormLabel>
                <FormControl>
                  <Input placeholder="021-1234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="cabang@email.com" {...field} />
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
            {isEditing ? "Simpan Perubahan" : "Tambah Cabang"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
