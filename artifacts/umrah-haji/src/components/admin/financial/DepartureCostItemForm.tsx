import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, BookOpen } from "lucide-react";

const CATEGORIES = [
  { value: "airline",        label: "✈️ Tiket Pesawat",      defaultCoa: "5100" },
  { value: "hotel",          label: "🏨 Hotel",               defaultCoa: "5200" },
  { value: "land_transport", label: "🚌 Transportasi Darat",  defaultCoa: "5300" },
  { value: "visa",           label: "🛂 Visa & Dokumen",      defaultCoa: "5400" },
  { value: "handling",       label: "🧳 Handling & Porter",   defaultCoa: "5500" },
  { value: "muthawif",       label: "👨‍💼 Muthawif / Guide",   defaultCoa: "5600" },
  { value: "equipment",      label: "📦 Perlengkapan Jamaah", defaultCoa: "5700" },
  { value: "manasik",        label: "🎓 Manasik",             defaultCoa: "5800" },
  { value: "insurance",      label: "🔒 Asuransi",            defaultCoa: "5420" },
  { value: "document",       label: "📄 Dokumen & Legalisasi", defaultCoa: "5400" },
  { value: "marketing",      label: "📢 Marketing & Promosi", defaultCoa: "5900" },
  { value: "pic_fee",        label: "💼 Komisi PIC / Agen",   defaultCoa: "5910" },
  { value: "overhead",       label: "🏢 Overhead Kantor",     defaultCoa: "6000" },
  { value: "other",          label: "📝 Lainnya",             defaultCoa: "5990" },
];

const UNITS = [
  { value: "per_pax",   label: "Per Jamaah (pax)" },
  { value: "per_seat",  label: "Per Seat" },
  { value: "per_room",  label: "Per Kamar" },
  { value: "per_night", label: "Per Malam" },
  { value: "fixed",     label: "Biaya Tetap (fixed)" },
];

const CURRENCIES = [
  { value: "IDR", label: "IDR (Rupiah)" },
  { value: "SAR", label: "SAR (Riyal)" },
  { value: "USD", label: "USD (Dollar)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "TRY", label: "TRY (Lira)" },
  { value: "AED", label: "AED (Dirham)" },
  { value: "MYR", label: "MYR (Ringgit)" },
];

const ROOM_TYPES = [
  { value: "quad",   label: "Quad (4 orang)" },
  { value: "triple", label: "Triple (3 orang)" },
  { value: "double", label: "Double (2 orang)" },
  { value: "single", label: "Single (1 orang)" },
  { value: "suite",  label: "Suite" },
];

const FLIGHT_CLASSES = [
  { value: "economy",  label: "Economy" },
  { value: "business", label: "Business" },
  { value: "first",    label: "First Class" },
];

const schema = z.object({
  category:       z.string().min(1, "Pilih kategori"),
  sub_category:   z.string().optional(),
  description:    z.string().min(1, "Deskripsi harus diisi"),
  account_code:   z.string().optional(),
  // Hotel fields
  location:       z.string().optional(),
  nights:         z.coerce.number().int().min(0).optional(),
  room_type:      z.string().optional(),
  check_in_date:  z.string().optional(),
  check_out_date: z.string().optional(),
  // Airline fields
  flight_route:   z.string().optional(),
  flight_class:   z.string().optional(),
  // Cost fields
  unit:           z.string().default("per_pax"),
  quantity:       z.coerce.number().min(0),
  unit_cost:      z.coerce.number().min(0),
  currency:       z.string().default("IDR"),
  exchange_rate:  z.coerce.number().min(0).default(1),
  sort_order:     z.coerce.number().int().default(0),
  notes:          z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  departureId: string;
  paxCount?: number;
  item?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DepartureCostItemForm({ departureId, paxCount = 1, item, onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category:       item?.category       ?? "hotel",
      sub_category:   item?.sub_category   ?? "",
      description:    item?.description    ?? "",
      account_code:   item?.account_code   ?? "",
      location:       item?.location       ?? "",
      nights:         item?.nights         ?? undefined,
      room_type:      item?.room_type      ?? "",
      check_in_date:  item?.check_in_date  ?? "",
      check_out_date: item?.check_out_date ?? "",
      flight_route:   item?.flight_route   ?? "",
      flight_class:   item?.flight_class   ?? "",
      unit:           item?.unit           ?? "per_pax",
      quantity:       item?.quantity       ?? paxCount,
      unit_cost:      item?.unit_cost      ?? 0,
      currency:       item?.currency       ?? "IDR",
      exchange_rate:  item?.exchange_rate  ?? 1,
      sort_order:     item?.sort_order     ?? 0,
      notes:          item?.notes          ?? "",
    },
  });

  const category     = form.watch("category");
  const accountCode  = form.watch("account_code");
  const unit_cost    = form.watch("unit_cost") || 0;
  const quantity     = form.watch("quantity") || 0;
  const exchange_rate = form.watch("exchange_rate") || 1;
  const currency     = form.watch("currency");

  const totalIDR = quantity * unit_cost * exchange_rate;

  // Auto-suggest account_code when category changes (only if field is empty or was the previous auto-suggested value)
  useEffect(() => {
    if (isEdit) return; // don't auto-suggest on edit
    const suggested = CATEGORIES.find(c => c.value === category)?.defaultCoa;
    if (suggested) {
      form.setValue("account_code", suggested);
    }
  }, [category]);

  // Fetch COA categories for the dropdown
  const { data: coaCategories } = useQuery({
    queryKey: ["coa-categories"],
    queryFn: async () => {
      const db = supabase as any;
      const { data } = await db
        .from("coa_categories")
        .select("code, name, category_key")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  // Resolve display name for current account_code
  const selectedCoa = coaCategories?.find((c: any) => c.code === accountCode);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const db = supabase as any;
      const payload = {
        departure_id:   departureId,
        category:       data.category,
        sub_category:   data.sub_category || null,
        description:    data.description,
        account_code:   data.account_code || null,
        location:       data.location || null,
        nights:         data.nights || null,
        room_type:      data.room_type || null,
        check_in_date:  data.check_in_date || null,
        check_out_date: data.check_out_date || null,
        flight_route:   data.flight_route || null,
        flight_class:   data.flight_class || null,
        unit:           data.unit,
        quantity:       data.quantity,
        unit_cost:      data.unit_cost,
        currency:       data.currency,
        exchange_rate:  data.exchange_rate,
        sort_order:     data.sort_order,
        notes:          data.notes || null,
      };

      if (isEdit) {
        const { error } = await db.from("departure_cost_items").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("departure_cost_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Item HPP diperbarui" : "Item HPP ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["departure-cost-items", departureId] });
      queryClient.invalidateQueries({ queryKey: ["departure-financial-summary", departureId] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan"),
  });

  const isHotel   = category === "hotel";
  const isAirline = category === "airline";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">

        {/* Category */}
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Kategori</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Description */}
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Deskripsi</FormLabel>
            <FormControl>
              <Input placeholder={
                isHotel   ? "Cth: Grand Zam Zam Hotel Makkah" :
                isAirline ? "Cth: Qatar Airways QR960 CGK-DOH-JED" :
                "Deskripsi item biaya..."
              } {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Hotel Fields */}
        {isHotel && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Detail Hotel</p>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Kota / Lokasi</FormLabel>
                  <FormControl>
                    <Input placeholder="Cth: Makkah, Madinah, Istanbul, Dubai, Jeddah Transit..." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription className="text-[10px]">Bebas isi nama kota/destinasi</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="nights" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Jumlah Malam</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="Cth: 4" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="room_type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Tipe Kamar</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih tipe..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROOM_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sub_category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Kelas Hotel (opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Cth: Bintang 5, Budget, Transit" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="check_in_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Check-in</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="check_out_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Check-out</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
        )}

        {/* Airline Fields */}
        {isAirline && (
          <div className="rounded-lg border border-sky-100 bg-sky-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Detail Penerbangan</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="flight_route" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Rute Penerbangan</FormLabel>
                  <FormControl>
                    <Input placeholder="Cth: CGK → DOH → JED" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="flight_class" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Kelas</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {FLIGHT_CLASSES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
        )}

        {/* COA / Account Code */}
        <div className="rounded-lg border border-violet-100 bg-violet-50/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-violet-600" />
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Kode Akun (COA)</p>
          </div>

          <FormField control={form.control} name="account_code" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Kode Akun</FormLabel>
              {coaCategories && coaCategories.length > 0 ? (
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kode akun COA...">
                        {field.value ? (
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">{field.value}</span>
                            <span className="text-sm">{selectedCoa?.name || field.value}</span>
                          </span>
                        ) : null}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">— Tanpa kode akun —</SelectItem>
                    {coaCategories.map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                          <span>{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <FormControl>
                  <Input
                    placeholder="Cth: 5100, 5200, ..."
                    {...field}
                    value={field.value ?? ""}
                    className="font-mono"
                  />
                </FormControl>
              )}
              <FormDescription className="text-[10px]">
                Kode akun dari Chart of Accounts untuk laporan keuangan. Otomatis diisi berdasarkan kategori.
              </FormDescription>
              {field.value && selectedCoa && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] font-mono text-violet-700 border-violet-200 bg-violet-50">
                    {selectedCoa.code}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{selectedCoa.name}</span>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Cost Fields */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rincian Biaya</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="unit" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Satuan</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Jumlah</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Mata Uang</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="unit_cost" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Biaya per Satuan</FormLabel>
                <FormControl><Input type="number" min={0} step="1000" placeholder="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="exchange_rate" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Kurs ke IDR</FormLabel>
                <FormControl><Input type="number" min={0} step="1" {...field} /></FormControl>
                <FormDescription className="text-[10px]">1 IDR = 1</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Total Preview */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Total: {quantity} × {currency !== "IDR" ? `${currency} ` : "Rp "}
              {Number(unit_cost).toLocaleString("id-ID")}
              {currency !== "IDR" && ` × ${exchange_rate}`}
            </span>
            <span className="font-bold text-primary text-base">
              = Rp {Math.round(totalIDR).toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Notes */}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Catatan (opsional)</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder="Informasi tambahan, nomor kontrak, dll." {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Perbarui" : "Simpan"} Item HPP
          </Button>
        </div>
      </form>
    </Form>
  );
}
