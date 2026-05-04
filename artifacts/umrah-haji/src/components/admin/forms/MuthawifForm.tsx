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

type MuthawifRow = Database["public"]["Tables"]["muthawifs"]["Row"];
type MuthawifInsert = Database["public"]["Tables"]["muthawifs"]["Insert"];
type MuthawifUpdate = Database["public"]["Tables"]["muthawifs"]["Update"];

const muthawifSchema = z.object({
  name: z.string().min(1, "Nama muthawif harus diisi"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  experience_years: z.coerce.number().min(0).default(0),
  languages: z.string().optional(),
  photo_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type MuthawifFormValues = z.infer<typeof muthawifSchema>;

interface MuthawifFormProps {
  muthawifData?: MuthawifRow;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MuthawifForm({ muthawifData, onSuccess, onCancel }: MuthawifFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!muthawifData;

  const form = useForm<MuthawifFormValues>({
    resolver: zodResolver(muthawifSchema),
    defaultValues: {
      name: muthawifData?.name || "",
      phone: muthawifData?.phone || "",
      email: muthawifData?.email || "",
      experience_years: muthawifData?.experience_years || 0,
      languages: muthawifData?.languages?.join(", ") || "",
      photo_url: muthawifData?.photo_url || "",
      is_active: muthawifData?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: MuthawifFormValues) => {
      const payload = {
        name: values.name,
        experience_years: values.experience_years,
        languages: values.languages ? values.languages.split(",").map(l => l.trim()).filter(Boolean) : [],
        photo_url: values.photo_url || null,
        email: values.email || null,
        phone: values.phone || null,
        is_active: values.is_active,
      };

      if (isEditing && muthawifData) {
        const updatePayload: MuthawifUpdate = payload;
        const { error } = await supabase.from("muthawifs").update(updatePayload).eq("id", muthawifData.id);
        if (error) throw error;
      } else {
        const insertPayload: MuthawifInsert = payload;
        const { error } = await supabase.from("muthawifs").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Muthawif berhasil diperbarui" : "Muthawif berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-muthawifs"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: MuthawifFormValues) => {
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
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl>
                <Input placeholder="Ustadz Ahmad" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>No. Telepon</FormLabel>
                <FormControl>
                  <Input placeholder="+62812345678" {...field} />
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
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="experience_years"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pengalaman (Tahun)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="languages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bahasa (pisahkan koma)</FormLabel>
                <FormControl>
                  <Input placeholder="Indonesia, Arab, Inggris" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="photo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Foto</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} value={field.value || ""} />
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
            {isEditing ? "Simpan Perubahan" : "Tambah Muthawif"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
