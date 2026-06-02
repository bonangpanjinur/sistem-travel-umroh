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

const EXPENSE_CATEGORIES = [
  { value: "airline_ticket", label: "✈️ Tiket Pesawat (tambahan/change)" },
  { value: "hotel",          label: "🏨 Hotel (realisasi)" },
  { value: "transport",      label: "🚌 Transportasi" },
  { value: "visa_fee",       label: "🛂 Biaya Visa / Darurat" },
  { value: "guide",          label: "👨‍💼 Honor Guide / Muthawif" },
  { value: "meals",          label: "🍽️ Konsumsi / Makan" },
  { value: "tips",           label: "💵 Tips Guide & Porter" },
  { value: "souvenir",       label: "🎁 Souvenir / Oleh-oleh" },
  { value: "printing",       label: "🖨️ Cetak & Percetakan" },
  { value: "refund",         label: "↩️ Refund ke Jamaah" },
  { value: "penalty",        label: "⚠️ Denda / Penalti" },
  { value: "medical",        label: "🏥 Biaya Medis Darurat" },
  { value: "operational",    label: "🏢 Operasional Kantor" },
  { value: "other",          label: "📝 Lainnya" },
];

const CURRENCIES = [
  { value: "IDR", label: "IDR" }, { value: "SAR", label: "SAR" },
  { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" },
  { value: "TRY", label: "TRY" }, { value: "AED", label: "AED" },
];

const PAYMENT_METHODS = [
  { value: "transfer", label: "Transfer Bank" },
  { value: "cash",     label: "Tunai" },
  { value: "card",     label: "Kartu" },
  { value: "other",    label: "Lainnya" },
];

const schema = z.object({
  expense_date:   z.string().min(1, "Tanggal harus diisi"),
  category:       z.string().min(1, "Pilih kategori"),
  location:       z.string().optional(),
  description:    z.string().min(1, "Deskripsi harus diisi"),
  amount:         z.coerce.number().min(0),
  currency:       z.string().default("IDR"),
  exchange_rate:  z.coerce.number().min(0).default(1),
  payment_method: z.string().default("transfer"),
  notes:          z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  departureId: string;
  item?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DepartureExpenseForm({ departureId, item, onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      expense_date:   item?.expense_date   ?? new Date().toISOString().split("T")[0],
      category:       item?.category       ?? "operational",
      location:       item?.location       ?? "",
      description:    item?.description    ?? "",
      amount:         item?.amount         ?? 0,
      currency:       item?.currency       ?? "IDR",
      exchange_rate:  item?.exchange_rate  ?? 1,
      payment_method: item?.payment_method ?? "transfer",
      notes:          item?.notes          ?? "",
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
        departure_id:   departureId,
        expense_date:   data.expense_date,
        category:       data.category,
        location:       data.location || null,
        description:    data.description,
        amount:         data.amount,
        currency:       data.currency,
        exchange_rate:  data.exchange_rate,
        payment_method: data.payment_method,
        notes:          data.notes || null,
      };
      if (isEdit) {
        const { error } = await db.from("departure_expenses").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("departure_expenses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Pengeluaran diperbarui" : "Pengeluaran ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["departure-expenses", departureId] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", departureId] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="expense_date" render={({ field }) => (
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
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Lokasi / Kota (opsional)</FormLabel>
              <FormControl><Input placeholder="Cth: Makkah, Istanbul..." {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="payment_method" render={({ field }) => (
            <FormItem>
              <FormLabel>Metode Bayar</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Deskripsi</FormLabel>
            <FormControl><Input placeholder="Cth: Makan siang jamaah di Madinah hari ke-3" {...field} /></FormControl>
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
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {currency !== "IDR" ? `${currency} ${Number(amount).toLocaleString("id-ID")} × ${exchange_rate}` : "Total"}
            </span>
            <span className="font-bold text-orange-700">= Rp {Math.round(totalIDR).toLocaleString("id-ID")}</span>
          </div>
        )}

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Catatan (opsional)</FormLabel>
            <FormControl><Textarea rows={2} placeholder="Detail tambahan, nomor kwitansi, dll." {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Perbarui" : "Simpan"} Pengeluaran
          </Button>
        </div>
      </form>
    </Form>
  );
}
