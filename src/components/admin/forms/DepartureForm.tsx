import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Calendar, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Database } from "@/integrations/supabase/types";
import { MultiSelect } from "@/components/ui/multi-select";
import { Plus, X as XIcon } from "lucide-react";

type DepartureRow = Database["public"]["Tables"]["departures"]["Row"];

interface AdditionalHotel {
  id?: string;
  hotel_id: string;
  hotel_role: string;
  check_in_date?: string | null;
  check_out_date?: string | null;
  nights?: number | null;
  notes?: string | null;
}
type DepartureInsert = Database["public"]["Tables"]["departures"]["Insert"];
type DepartureUpdate = Database["public"]["Tables"]["departures"]["Update"];

const departureSchema = z.object({
  package_id: z.string().min(1, "Paket harus dipilih"),
  departure_date: z.string().optional().nullable(),
  return_date: z.string().optional().nullable(),
  month: z.string().optional().nullable(),
  quota: z.coerce.number().min(1, "Kuota minimal 1"),
  departure_airport_id: z.string().optional().nullable(),
  arrival_airport_id: z.string().optional().nullable(),
  flight_number: z.string().optional().nullable(),
  departure_time: z.string().optional().nullable(),
  status: z.string().default("open"),
  muthawif_id: z.string().optional().nullable(),
  team_leader_id: z.string().optional().nullable(),
  // New fields
  airline_id: z.string().optional().nullable(),
  hotel_makkah_id: z.string().optional().nullable(),
  hotel_madinah_id: z.string().optional().nullable(),
  price_quad: z.coerce.number().min(0).default(0),
  price_triple: z.coerce.number().min(0).default(0),
  price_double: z.coerce.number().min(0).default(0),
  price_single: z.coerce.number().min(0).default(0),
  // Age-based pricing
  price_adult: z.coerce.number().min(0).default(0),
  price_child: z.coerce.number().min(0).default(0),
  price_infant: z.coerce.number().min(0).default(0),
  // Phase 3: Milestone & Deadline Alert Tracker
  document_deadline: z.string().optional().nullable(),
  payment_deadline: z.string().optional().nullable(),
  visa_deadline: z.string().optional().nullable(),
  // Phase 5: Break-even Indicator
  break_even_pax: z.coerce.number().min(0).default(0),
  operational_cost_per_pax: z.coerce.number().min(0).default(0),
}).refine((data) => {
  // Either departure_date or month must be filled
  return (data.departure_date && data.return_date) || data.month;
}, {
  message: "Harus mengisi Tanggal Berangkat atau Pilih Bulan",
  path: ["departure_date"],
});

type DepartureFormValues = z.infer<typeof departureSchema>;

interface DepartureFormProps {
  departureData?: DepartureRow;
  packageId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export function DepartureForm({ departureData, packageId, onSuccess, onCancel }: DepartureFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!departureData;

  const { data: packages } = useQuery({
    queryKey: ["packages-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("id, code, name, package_type_id, package_types(code, name)")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: airports } = useQuery({
    queryKey: ["airports-list"],
    queryFn: async () => {
      const { data } = await supabase.from("airports").select("id, code, name, city").eq("is_active", true);
      return data || [];
    },
  });

  const { data: airlines } = useQuery({
    queryKey: ["airlines-list"],
    queryFn: async () => {
      const { data } = await supabase.from("airlines").select("id, code, name").eq("is_active", true);
      return data || [];
    },
  });

  const { data: hotels } = useQuery({
    queryKey: ["hotels-list"],
    queryFn: async () => {
      const { data } = await supabase.from("hotels").select("id, name, city, star_rating").eq("is_active", true);
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

  const { data: tourLeaders } = useQuery({
    queryKey: ["tour-leaders-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, phone")
        .eq("is_tour_leader", true)
        .order("full_name");
      return data || [];
    },
  });

  // Filter hotels based on common city names, but allow all hotels if needed
  const makkahHotels = hotels?.filter(h => h.city.toLowerCase() === 'makkah') || [];
  const madinahHotels = hotels?.filter(h => h.city.toLowerCase() === 'madinah') || [];

  // Additional hotels state (transit, umroh plus, haji, etc)
  const [additionalHotels, setAdditionalHotels] = useState<AdditionalHotel[]>([]);

  // Load existing additional hotels when editing
  useQuery({
    queryKey: ["departure-hotels", departureData?.id],
    enabled: !!departureData?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("departure_hotels")
        .select("*")
        .eq("departure_id", departureData!.id)
        .order("sort_order", { ascending: true });
      if (data) setAdditionalHotels(data as AdditionalHotel[]);
      return data;
    },
  });

  const form = useForm<DepartureFormValues>({
    resolver: zodResolver(departureSchema),
    defaultValues: {
      package_id: departureData?.package_id || packageId || "",
      departure_date: departureData?.departure_date || "",
      return_date: departureData?.return_date || "",
      month: (departureData as any)?.month || "",
      quota: departureData?.quota || 45,
      departure_airport_id: departureData?.departure_airport_id || null,
      arrival_airport_id: departureData?.arrival_airport_id || null,
      flight_number: departureData?.flight_number || "",
      departure_time: departureData?.departure_time || "",
      status: departureData?.status || "open",
      muthawif_id: departureData?.muthawif_id || null,
      team_leader_id: departureData?.team_leader_id || null,
      airline_id: departureData?.airline_id || null,
      hotel_makkah_id: departureData?.hotel_makkah_id || null,
      hotel_madinah_id: departureData?.hotel_madinah_id || null,
      price_quad: departureData?.price_quad || 0,
      price_triple: departureData?.price_triple || 0,
      price_double: departureData?.price_double || 0,
      price_single: departureData?.price_single || 0,
      price_adult: (departureData as any)?.price_adult || 0,
      price_child: (departureData as any)?.price_child || 0,
      price_infant: (departureData as any)?.price_infant || 0,
      document_deadline: (departureData as any)?.document_deadline || "",
      payment_deadline: (departureData as any)?.payment_deadline || "",
      visa_deadline: (departureData as any)?.visa_deadline || "",
      break_even_pax: (departureData as any)?.break_even_pax || 0,
      operational_cost_per_pax: (departureData as any)?.operational_cost_per_pax || 0,
    },
  });

  const watchedDepartureDate = form.watch("departure_date");
  const watchedMonth = form.watch("month");
  const watchedPackageId = form.watch("package_id");

  const selectedPackage = useMemo(() => {
    return packages?.find(p => p.id === watchedPackageId);
  }, [packages, watchedPackageId]);

  const isTourPackage = useMemo(() => {
    const typeCode = (selectedPackage as any)?.package_types?.code?.toLowerCase();
    return typeCode === 'tour';
  }, [selectedPackage]);

  const mutation = useMutation({
    mutationFn: async (values: DepartureFormValues) => {
      const payload = {
        ...values,
        package_id: values.package_id,
        departure_airport_id: values.departure_airport_id || null,
        arrival_airport_id: values.arrival_airport_id || null,
        flight_number: values.flight_number || null,
        departure_time: values.departure_time || null,
        airline_id: values.airline_id || null,
        hotel_makkah_id: isTourPackage ? null : (values.hotel_makkah_id || null),
        hotel_madinah_id: isTourPackage ? null : (values.hotel_madinah_id || null),
        muthawif_id: isTourPackage ? null : (values.muthawif_id || null),
        team_leader_id: isTourPackage ? null : (values.team_leader_id || null),
        document_deadline: values.document_deadline || null,
        payment_deadline: values.payment_deadline || null,
        visa_deadline: values.visa_deadline || null,
        break_even_pax: values.break_even_pax || 0,
        operational_cost_per_pax: values.operational_cost_per_pax || 0,
        // Ensure either date or month is sent, and the other is null
        departure_date: values.departure_date || null,
        return_date: values.return_date || null,
        month: values.month || null,
      };

      let departureId: string;
      if (isEditing && departureData) {
        const { error } = await supabase.from("departures").update(payload as any).eq("id", departureData.id);
        if (error) throw error;
        departureId = departureData.id;
      } else {
        const { data, error } = await supabase.from("departures").insert(payload as any).select("id").single();
        if (error) throw error;
        departureId = (data as any).id;
      }

      // Sync additional hotels (transit/umroh plus/haji): delete all then re-insert
      await (supabase as any).from("departure_hotels").delete().eq("departure_id", departureId);
      const validAdditional = additionalHotels.filter(h => h.hotel_id);
      if (validAdditional.length > 0) {
        const rows = validAdditional.map((h, idx) => ({
          departure_id: departureId,
          hotel_id: h.hotel_id,
          hotel_role: isTourPackage ? 'tour' : (h.hotel_role || 'additional'),
          check_in_date: h.check_in_date || null,
          check_out_date: h.check_out_date || null,
          nights: h.nights || null,
          notes: h.notes || null,
          sort_order: idx,
        }));
        const { error: insErr } = await (supabase as any).from("departure_hotels").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Jadwal berhasil diperbarui" : "Jadwal berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-all-departures"] });
      queryClient.invalidateQueries({ queryKey: ["admin-departures"] });
      queryClient.invalidateQueries({ queryKey: ["departures"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Terjadi kesalahan");
    },
  });

  const onSubmit = (values: DepartureFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Phase 3: Milestone & Deadline Alert Tracker */}
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50/30">
          <h3 className="font-medium text-sm text-blue-700 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Fase 3: Milestone & Deadline Tracker
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="document_deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batas Dokumen</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batas Pelunasan</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visa_deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batas Visa</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Phase 5: Break-even Indicator */}
        <div className="space-y-4 p-4 border rounded-lg bg-green-50/30">
          <h3 className="font-medium text-sm text-green-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Fase 5: Break-even Indicator
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="break_even_pax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titik Impas (Pax)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operational_cost_per_pax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biaya Ops per Pax</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Informasi Dasar</h3>
          
          <FormField
            control={form.control}
            name="package_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paket <span className="text-destructive">*</span></FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value || undefined}
                  disabled={!!packageId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih paket" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {packages?.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.code} - {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="departure_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Berangkat</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value || ""} 
                      disabled={!!watchedMonth}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="return_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Pulang</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value || ""} 
                      disabled={!!watchedMonth}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atau Pilih Bulan</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""}
                    disabled={!!watchedDepartureDate}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bulan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">-- Kosongkan --</SelectItem>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
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
              name="quota"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kuota</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="open">Buka (Open)</SelectItem>
                      <SelectItem value="closed">Tutup (Closed)</SelectItem>
                      <SelectItem value="full">Penuh (Full)</SelectItem>
                      <SelectItem value="cancelled">Dibatalkan (Cancelled)</SelectItem>
                      <SelectItem value="completed">Selesai (Completed)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Flight Info */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Penerbangan</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="airline_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maskapai</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih maskapai" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {airlines?.map((airline) => (
                        <SelectItem key={airline.id} value={airline.id}>
                          {airline.name} ({airline.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="flight_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Penerbangan</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: GA-980" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="departure_airport_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bandara Keberangkatan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bandara" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {airports?.map((airport) => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.city} - {airport.name} ({airport.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="arrival_airport_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bandara Kedatangan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bandara" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {airports?.map((airport) => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.city} - {airport.name} ({airport.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="departure_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Waktu Keberangkatan</FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Hotel & Staff Info */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Hotel & Petugas</h3>
          
          {!isTourPackage && (
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
                        {makkahHotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name} ({hotel.star_rating}★)
                          </SelectItem>
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
                        {madinahHotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name} ({hotel.star_rating}★)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Additional Hotels (Transit, Umroh Plus, Haji, dll) */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">{isTourPackage ? "Daftar Hotel" : "Hotel Tambahan"}</h4>
                <p className="text-xs text-muted-foreground">
                  {isTourPackage 
                    ? "Daftar hotel yang akan digunakan selama tour" 
                    : "Untuk hotel transit, Umroh Plus, Haji, atau city tour"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setAdditionalHotels((prev) => [
                    ...prev,
                    { hotel_id: "", hotel_role: "transit", check_in_date: "", check_out_date: "", nights: null, notes: "" },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Hotel
              </Button>
            </div>

            {additionalHotels.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {isTourPackage ? "Belum ada hotel yang ditambahkan." : "Belum ada hotel tambahan."}
              </p>
            ) : (
              <div className="space-y-3">
                {additionalHotels.map((row, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-12 items-end p-3 rounded-md border bg-background">
                    <div className={isTourPackage ? "sm:col-span-7" : "sm:col-span-4"}>
                      <label className="text-xs text-muted-foreground">Hotel</label>
                      <Select
                        value={row.hotel_id || undefined}
                        onValueChange={(v) =>
                          setAdditionalHotels((prev) => prev.map((r, i) => (i === idx ? { ...r, hotel_id: v } : r)))
                        }
                      >
                        <SelectTrigger><SelectValue placeholder="Pilih hotel" /></SelectTrigger>
                        <SelectContent>
                          {hotels?.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.name} — {h.city} ({h.star_rating}★)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!isTourPackage && (
                      <div className="sm:col-span-3">
                        <label className="text-xs text-muted-foreground">Peran</label>
                        <Select
                          value={row.hotel_role}
                          onValueChange={(v) =>
                            setAdditionalHotels((prev) => prev.map((r, i) => (i === idx ? { ...r, hotel_role: v } : r)))
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transit">Transit</SelectItem>
                            <SelectItem value="umroh_plus">Umroh Plus</SelectItem>
                            <SelectItem value="haji">Haji</SelectItem>
                            <SelectItem value="city_tour">City Tour</SelectItem>
                            <SelectItem value="additional">Tambahan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Check-in</label>
                      <Input
                        type="date"
                        value={row.check_in_date || ""}
                        onChange={(e) =>
                          setAdditionalHotels((prev) => prev.map((r, i) => (i === idx ? { ...r, check_in_date: e.target.value } : r)))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Malam</label>
                      <Input
                        type="number"
                        min={0}
                        value={row.nights ?? ""}
                        onChange={(e) =>
                          setAdditionalHotels((prev) => prev.map((r, i) => (i === idx ? { ...r, nights: e.target.value ? Number(e.target.value) : null } : r)))
                        }
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setAdditionalHotels((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <XIcon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isTourPackage && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="muthawif_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Muthawif</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih muthawif" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {muthawifs?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="team_leader_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tour Leader</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tour leader" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tourLeaders?.map((tl) => (
                          <SelectItem key={tl.id} value={tl.id}>
                            {tl.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Pricing Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground">Harga Khusus Keberangkatan (Override)</h3>
            <p className="text-[10px] text-muted-foreground italic">* Kosongkan atau set 0 untuk menggunakan harga paket</p>
          </div>
          
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <FormField
              control={form.control}
              name="price_quad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Quad (4)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel className="text-xs">Triple (3)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel className="text-xs">Double (2)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel className="text-xs">Single (1)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Age-based Pricing */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground">Harga Berdasarkan Usia</h3>
            <p className="text-[10px] text-muted-foreground italic">* Kosongkan atau set 0 untuk tidak menggunakan harga usia</p>
          </div>
          
          <div className="grid gap-4 grid-cols-3">
            <FormField
              control={form.control}
              name="price_adult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Dewasa (&gt; 12 th)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price_child"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Anak (2-12 th)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price_infant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Balita (&lt; 2 th)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Simpan Perubahan" : "Tambah Jadwal"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
