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

const departureSchema = z.object({
  package_id: z.string().min(1, "Paket harus dipilih"),
  departure_date: z.string().min(1, "Tanggal berangkat harus diisi"),
  return_date: z.string().min(1, "Tanggal pulang harus diisi"),
  quota: z.coerce.number().min(1, "Kuota minimal 1"),
  departure_airport_id: z.string().optional().nullable(),
  arrival_airport_id: z.string().optional().nullable(),
  flight_number: z.string().optional(),
  departure_time: z.string().optional(),
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
  departureData?: any;
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

  const makkahHotels = hotels?.filter(h => h.city === 'Makkah') || [];
  const madinahHotels = hotels?.filter(h => h.city === 'Madinah') || [];

  const form = useForm<DepartureFormValues>({
    resolver: zodResolver(departureSchema),
    defaultValues: {
      package_id: departureData?.package_id || packageId || null,
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
        package_id: values.package_id || null,
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

      if (isEditing) {
        const { error } = await supabase.from("departures").update(payload).eq("id", departureData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("departures").insert(payload as any);
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
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="departed">Departed</SelectItem>
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
                          {airport.code} - {airport.city}
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
                  <FormLabel>Bandara Tujuan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bandara" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {airports?.map((airport) => (
                        <SelectItem key={airport.id} value={airport.id}>
                          {airport.code} - {airport.city}
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
              name="flight_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Penerbangan</FormLabel>
                  <FormControl>
                    <Input placeholder="GA 987" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departure_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jam Keberangkatan</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Hotels */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Hotel</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="hotel_makkah_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Makkah</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih hotel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {makkahHotels.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Belum ada hotel Makkah
                        </div>
                      ) : (
                        makkahHotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name} ({hotel.star_rating}⭐)
                          </SelectItem>
                        ))
                      )}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih hotel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {madinahHotels.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Belum ada hotel Madinah
                        </div>
                      ) : (
                        madinahHotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name} ({hotel.star_rating}⭐)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Harga per Orang</h3>

          <div className="grid gap-4 grid-cols-2">
            <FormField
              control={form.control}
              name="price_quad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quad (4 orang)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
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
                  <FormLabel>Triple (3 orang)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
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
                  <FormLabel>Double (2 orang)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
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
                  <FormLabel>Single (1 orang)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Team */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Tim Pembimbing</h3>

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
                      {muthawifs?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                  <FormLabel>Tour Leader (TL)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Tour Leader" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tourLeaders?.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Belum ada jamaah yang ditandai sebagai Tour Leader
                        </div>
                      ) : (
                        tourLeaders?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name} {c.phone ? `(${c.phone})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
