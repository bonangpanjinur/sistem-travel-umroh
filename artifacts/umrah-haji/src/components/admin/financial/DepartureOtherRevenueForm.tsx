import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const REVENUE_CATEGORIES = [
  { value: "room_upgrade",     label: "🛏️ Upgrade Kamar" },
  { value: "extra_night",      label: "🌙 Malam Tambahan" },
  { value: "addon_service",    label: "➕ Layanan Tambahan (city tour, ziarah extra)" },
  { value: "visa_extra",       label: "🛂 Visa Tambahan" },
  { value: "transport_extra",  label: "🚌 Transport Tambahan" },
  { value: "insurance_extra",  label: "🔒 Upgrade Asuransi" },
  { value: "equipment_extra",  label: "📦 Perlengkapan Tambahan" },
  { value: "penalty_fee",      label: "⚠️ Biaya Pembatalan (masuk pendapatan)" },
  { value: "other",            label: "📝 Lainnya" },
];

const CURRENCIES = [
  { value: "IDR", label: "IDR" }, { value: "SAR", label: "SAR" },
  { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" },
  { value: "TRY", label: "TRY" }, { value: "AED", label: "AED" },
];

const schema = z.object({
  revenue_date:  z.string().min(1, "Tanggal harus diisi"),
  category:      z.string().min(1, "Pilih kategori"),
  location:      z.string().optional(),
  description:   z.string().min(1, "Deskripsi harus diisi"),
  amount:        z.coerce.number().min(0),
  currency:      z.string().default("IDR"),
  exchange_rate: z.coerce.number().min(0).default(1),
  notes:         z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  departureId: string;
  item?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DepartureOtherRevenueForm({ departureId, item, onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenue_date:  item?.revenue_date  ?? new Date().toISOString().split("T")[0],
      category:      item?.category      ?? "addon_service",
      location:      item?.location      ?? "",
      description:   item?.description   ?? "",
      amount:        item?.amount        ?? 0,
      currency:      item?.currency      ?? "IDR",
      exchange_rate: item?.exchange_rate ?? 1,
      notes:         item?.notes         ?? "",
    },
  });

  const amount = form.watch("amount") || 0;
  const exchange_rate = form.watch("exchange_rate") || 1;
  const currency = form.watch("currency");
  const totalIDR = amount * exchange_rate;

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const db = supabase as any;
      const payload = {
        departure_id:  departureId,
        revenue_date:  data.revenue_date,
        category:      data.category,
        location:      data.location || null,
        description:   data.description,
        amount:        data.amount,
        currency:      data.currency,
        exchange_rate: data.exchange_rate,
        notes:         data.notes || null,
      };
      if (isEdit) {
        const { error } = await db.from("departure_other_revenues").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("departure_other_revenues").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Pendapatan diperbarui" : "Pendapatan tambahan dicatat");
      queryClient.invalidateQueries({ queryKey: ["departure-other-revenues", departureId] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", departureId] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="revenue_date" render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {REVENUE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Deskripsi</FormLabel>
            <FormControl><Input placeholder="Cth: Upgrade kamar Double ke Single — Bpk Ahmad" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="location" render={({ field }) => (
          <FormItem>
            <FormLabel>Lokasi (opsional)</FormLabel>
            <FormControl><Input placeholder="Cth: Istanbul, Dubai..." {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem>
              <FormLabel>Mata Uang</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah</FormLabel>
              <FormControl><Input type="number" min={0} step="1000" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="exchange_rate" render={({ field }) => (
            <FormItem>
              <FormLabel>Kurs ke IDR</FormLabel>
              <FormControl><Input type="number" min={0} step="1" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {totalIDR > 0 && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {currency !== "IDR" ? `${currency} ${Number(amount).toLocaleString("id-ID")} × ${exchange_rate}` : "Total Pendapatan"}
            </span>
            <span className="font-bold text-green-700">= Rp {Math.round(totalIDR).toLocaleString("id-ID")}</span>
          </div>
        )}

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Catatan (opsional)</FormLabel>
            <FormControl><Textarea rows={2} placeholder="Detail tambahan..." {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
          <Button type="submit" disabled={mutation.isPending} className="bg-green-600 hover:bg-green-700">
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Perbarui" : "Simpan"} Pendapatan
          </Button>
        </div>
      </form>
    </Form>
  );
}
