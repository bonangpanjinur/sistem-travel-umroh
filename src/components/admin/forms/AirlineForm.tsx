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

  const onSubmit = (values: AirlineFormValues) => {
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
                <FormLabel>Kode Maskapai</FormLabel>
                <FormControl>
                  <Input placeholder="GA" maxLength={3} {...field} />
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
                <FormLabel>Nama Maskapai</FormLabel>
                <FormControl>
                  <Input placeholder="Garuda Indonesia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Logo</FormLabel>
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
            {isEditing ? "Simpan Perubahan" : "Tambah Maskapai"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
