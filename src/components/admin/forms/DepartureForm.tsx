import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Database } from "@/integrations/supabase/types";
import { MultiSelect } from "@/components/ui/multi-select";

type DepartureRow = Database["public"]["Tables"]["departures"]["Row"];
type DepartureInsert = Database["public"]["Tables"]["departures"]["Insert"];
type DepartureUpdate = Database["public"]["Tables"]["departures"]["Update"];

const departureSchema = z.object({
  package_id: z.string().min(1, "Paket harus dipilih"),
  departure_date: z.string().min(1, "Tanggal berangkat harus diisi"),
  return_date: z.string().min(1, "Tanggal pulang harus diisi"),
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
});

type DepartureFormValues = z.infer<typeof departureSchema>;

interface DepartureFormProps {
  departureData?: DepartureRow;
  packageId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DepartureForm({ departureData, packageId, onSuccess, onCancel }: DepartureFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!departureData;

  const { data: packages } = useQuery({
    queryKey: ["packages-list"],
    queryFn: async () => {
      const { data } = await supabase.from("packages").select("id, code, name").eq("is_active", true);
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

  const form = useForm<DepartureFormValues>({
    resolver: zodResolver(departureSchema),
    defaultValues: {
      package_id: departureData?.package_id || packageId || "",
      departure_date: departureData?.departure_date || "",
      return_date: departureData?.return_date || "",
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
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: DepartureFormValues) => {
      const payload = {
        ...values,
        package_id: values.package_id,
        departure_airport_id: values.departure_airport_id || null,
        arrival_airport_id: values.arrival_airport_id || null,
        flight_number: values.flight_number || null,
        departure_time: values.departure_time || null,
        muthawif_id: values.muthawif_id || null,
        team_leader_id: values.team_leader_id || null,
        airline_id: values.airline_id || null,
        hotel_makkah_id: values.hotel_makkah_id || null,
        hotel_madinah_id: values.hotel_madinah_id || null,
      };

      if (isEditing && departureData) {
        const updatePayload: DepartureUpdate = payload;
        const { error } = await supabase.from("departures").update(updatePayload).eq("id", departureData.id);
        if (error) throw error;
      } else {
        const insertPayload = payload as unknown as DepartureInsert;
        const { error } = await supabase.from("departures").insert(insertPayload);
        if (error) throw error;
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

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="departure_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Berangkat</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                    <Input type="date" {...field} />
                  </FormControl>
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
                      <SelectItem value="cancelled">Dibatalkan</SelectItem>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih maskapai" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {airlines?.map((airline) => (
                        <SelectItem key={airline.id} value={airline.id}>
                          {airline.code} - {airline.name}
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
                    <Input placeholder="Contoh: SV-817" {...field} value={field.value || ""} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bandara" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {airports?.map((airport) => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.code} - {airport.city} ({airport.name})
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bandara" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {airports?.map((airport) => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.code} - {airport.city} ({airport.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Accomodation Info */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Akomodasi & Tim</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="hotel_makkah_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Makkah / Kota 1</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={makkahHotels.map(h => ({
                        label: `${h.name} (${h.star_rating}⭐)`,
                        value: h.id
                      }))}
                      selected={field.value ? field.value.split(",") : []}
                      onChange={(selected) => field.onChange(selected.join(","))}
                      placeholder="Pilih hotel makkah"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hotel_madinah_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Madinah / Kota 2</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={madinahHotels.map(h => ({
                        label: `${h.name} (${h.star_rating}⭐)`,
                        value: h.id
                      }))}
                      selected={field.value ? field.value.split(",") : []}
                      onChange={(selected) => field.onChange(selected.join(","))}
                      placeholder="Pilih hotel madinah"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="muthawif_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Muthawif</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih muthawif" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {muthawifs?.map((muthawif) => (
                        <SelectItem key={muthawif.id} value={muthawif.id}>
                          {muthawif.name}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih TL" />
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
