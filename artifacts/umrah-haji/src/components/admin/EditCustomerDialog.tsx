import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addMonths, differenceInDays, format, parseISO, isAfter, isBefore } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndonesiaLocationSelect } from "@/components/ui/indonesia-location-select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Pencil, Upload, FileText, CheckCircle, Clock, XCircle, Eye, Trash2, AlertTriangle, AlertCircle, Plus, Heart, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type CustomerMahram = Database["public"]["Tables"]["customer_mahrams"]["Row"];
type GenderType = Database["public"]["Enums"]["gender_type"];

// Mapping hubungan mahram timbal balik
const RECIPROCAL_RELATIONS: Record<string, string> = {
  suami: "istri",
  istri: "suami",
  ayah: "anak",
  ibu: "anak",
  anak: "ayah", // atau ibu, tapi untuk simplifikasi pakai ayah
  saudara: "saudara",
  paman: "keponakan",
  kakek: "cucu",
  nenek: "cucu",
  cucu: "kakek", // atau nenek
  keponakan: "paman",
};

interface EditCustomerDialogProps {
  customer: Customer;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditCustomerDialog({ customer, trigger, onSuccess }: EditCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    // Data Diri
    full_name: "",
    nik: "",
    gender: "" as GenderType | "",
    birth_place: "",
    birth_date: "",
    blood_type: "",
    marital_status: "",
    // Kontak
    phone: "",
    email: "",
    // Alamat
    address: "",
    city: "",
    province: "",
    postal_code: "",
    // Paspor
    passport_number: "",
    passport_expiry: "",
    // Keluarga
    father_name: "",
    mother_name: "",
    mahram_name: "",
    mahram_relation: "",
    // Kontak Darurat
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
  });

  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [mahramSearch, setMahramSearch] = useState("");
  const [mahramSearchOpen, setMahramSearchOpen] = useState(false);

  // Fetch document types
  const { data: documentTypes } = useQuery({
    queryKey: ["document-types"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing documents for this customer
  const { data: existingDocs, refetch: refetchDocs } = useQuery({
    queryKey: ["customer-documents", customer.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_documents")
        .select(`
          *,
          document_type:document_types(id, name, code)
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch upcoming departures for this customer to validate passport expiry
  const { data: upcomingDepartures } = useQuery({
    queryKey: ["customer-departures", customer.id],
    enabled: open,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          booking:bookings!inner(
            id,
            departure:departures!inner(
              id,
              departure_date,
              package:packages(name)
            )
          )
        `)
        .eq("customer_id", customer.id)
        .gte("booking.departure.departure_date", today);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all customers for mahram selection
  const { data: allCustomers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers-for-mahram", mahramSearch],
    enabled: open && mahramSearchOpen,
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, full_name, phone, email")
        .neq("id", customer.id)
        .order("full_name");

      if (mahramSearch.trim()) {
        const sanitized = mahramSearch.replace(/[%_()\\*?{}[\]]/g, "");
        if (sanitized.trim()) {
          query = query.or(
            `full_name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
          );
        }
      }
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate passport validation status
  const passportValidation = useMemo(() => {
    if (!formData.passport_expiry || !upcomingDepartures?.length) {
      return null;
    }

    const passportExpiry = parseISO(formData.passport_expiry);
    const today = new Date();

    // Check if passport is already expired
    if (isBefore(passportExpiry, today)) {
      return {
        type: "error" as const,
        message: "Paspor sudah kadaluarsa! Segera perpanjang paspor.",
        icon: AlertCircle,
      };
    }

    // Check against each upcoming departure
    const invalidDepartures: { date: string; packageName: string; daysShort: number }[] = [];
    
    upcomingDepartures.forEach((item: any) => {
      const departure = item.booking?.departure;
      if (!departure?.departure_date) return;

      const departureDate = parseISO(departure.departure_date);
      const minValidDate = addMonths(departureDate, 6);

      if (isBefore(passportExpiry, minValidDate)) {
        const daysShort = differenceInDays(minValidDate, passportExpiry);
        invalidDepartures.push({
          date: format(departureDate, "d MMMM yyyy", { locale: idLocale }),
          packageName: departure.package?.name || "Paket",
          daysShort,
        });
      }
    });

    if (invalidDepartures.length > 0) {
      const first = invalidDepartures[0];
      return {
        type: "warning" as const,
        message: `Paspor harus berlaku minimal 6 bulan dari keberangkatan ${first.date} (${first.packageName}). Kurang ${first.daysShort} hari.`,
        icon: AlertTriangle,
        departures: invalidDepartures,
      };
    }

    // Passport is valid for all departures
    return {
      type: "success" as const,
      message: "Masa berlaku paspor valid untuk semua keberangkatan yang terdaftar.",
      icon: CheckCircle,
    };
  }, [formData.passport_expiry, upcomingDepartures]);

  // Populate form when customer changes
  useEffect(() => {
    if (customer && open) {
      setFormData({
        full_name: customer.full_name || "",
        nik: customer.nik || "",
        gender: (customer.gender as GenderType) || "",
        birth_place: customer.birth_place || "",
        birth_date: customer.birth_date || "",
        blood_type: customer.blood_type || "",
        marital_status: customer.marital_status || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        city: customer.city || "",
        province: customer.province || "",
        postal_code: customer.postal_code || "",
        passport_number: customer.passport_number || "",
        passport_expiry: customer.passport_expiry || "",
        father_name: customer.father_name || "",
        mother_name: customer.mother_name || "",
        mahram_name: customer.mahram_name || "",
        mahram_relation: customer.mahram_relation || "",
        emergency_contact_name: customer.emergency_contact_name || "",
        emergency_contact_phone: customer.emergency_contact_phone || "",
        emergency_contact_relation: customer.emergency_contact_relation || "",
      });
    }
  }, [customer, open]);

  // Fetch mahrams for this customer
  const { data: mahrams, refetch: refetchMahrams } = useQuery({
    queryKey: ["customer-mahrams", customer.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase.from("customer_mahrams" as any)
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at") as any);
      
      if (error) {
        // Table might not exist yet — return empty
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data as unknown as CustomerMahram[]) || [];
    },
  });

  // Sync Mahram data with father_name and mother_name
  useEffect(() => {
    if (mahrams && mahrams.length > 0) {
      const fatherMahram = mahrams.find(m => m.mahram_relation === "ayah");
      const motherMahram = mahrams.find(m => m.mahram_relation === "ibu");

      setFormData(prev => ({
        ...prev,
        father_name: fatherMahram?.mahram_name || prev.father_name,
        mother_name: motherMahram?.mahram_name || prev.mother_name,
      }));
    }
  }, [mahrams]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const updatePayload: any = { ...data };
      
      // Clean up empty strings for optional fields
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === "") {
          updatePayload[key] = null;
        }
      });

      // Ensure full_name is not null
      if (!updatePayload.full_name) {
        throw new Error("Nama lengkap wajib diisi");
      }

      const { error } = await supabase
        .from("customers")
        .update(updatePayload)
        .eq("id", customer.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Data jamaah berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-customer"] });
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      queryClient.invalidateQueries({ queryKey: ["booking-passengers"] });
      queryClient.invalidateQueries({ queryKey: ["agent-jamaah"] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memperbarui data jamaah");
    },
  });

  // Upload document mutation
  const handleDocumentUpload = async (file: File, documentTypeId: string) => {
    setUploading(prev => ({ ...prev, [documentTypeId]: true }));

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${customer.id}/${documentTypeId}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("customer-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(fileName);

      // Check if document already exists
      const existingDoc = existingDocs?.find(d => d.document_type_id === documentTypeId);

      if (existingDoc) {
        // Update existing document
        const { error: updateError } = await supabase
          .from("customer_documents")
          .update({
            file_url: urlData.publicUrl,
            file_name: file.name,
            status: "uploaded",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDoc.id);

        if (updateError) throw updateError;
      } else {
        // Insert new document
        const { error: insertError } = await supabase
          .from("customer_documents")
          .insert({
            customer_id: customer.id,
            document_type_id: documentTypeId,
            file_url: urlData.publicUrl,
            file_name: file.name,
            status: "uploaded",
          });

        if (insertError) throw insertError;
      }

      toast.success("Dokumen berhasil diupload");
      refetchDocs();
      queryClient.invalidateQueries({ queryKey: ["admin-customer-documents"] });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Gagal upload dokumen");
    } finally {
      setUploading(prev => ({ ...prev, [documentTypeId]: false }));
    }
  };

  const [newMahram, setNewMahram] = useState({ mahram_name: "", mahram_relation: "", notes: "", mahram_customer_id: "" });

  const addMahramMutation = useMutation({
    mutationFn: async (m: typeof newMahram) => {
      // If mahram_customer_id is provided, fetch the customer name
      let mahramName = m.mahram_name;
      if (m.mahram_customer_id) {
        const selectedCustomer = allCustomers?.find(c => c.id === m.mahram_customer_id);
        if (selectedCustomer) {
          mahramName = selectedCustomer.full_name;
        }
      }

      // Insert mahram untuk customer A
      const { error: insertError } = await supabase
        .from("customer_mahrams" as any)
        .insert({
          customer_id: customer.id,
          mahram_name: mahramName,
          mahram_relation: m.mahram_relation,
          mahram_customer_id: m.mahram_customer_id || null,
          notes: m.notes
        });

      if (insertError) throw insertError;

      // Jika ada mahram_customer_id, buat hubungan timbal balik untuk customer B
      if (m.mahram_customer_id) {
        const reciprocalRelation = RECIPROCAL_RELATIONS[m.mahram_relation] || "lainnya";
        
        const { error: reciprocalError } = await supabase
          .from("customer_mahrams" as any)
          .insert({
            customer_id: m.mahram_customer_id,
            mahram_name: customer.full_name,
            mahram_relation: reciprocalRelation,
            mahram_customer_id: customer.id,
            notes: "Hubungan timbal balik otomatis"
          });
          
        if (reciprocalError) {
          console.warn("Gagal membuat hubungan timbal balik:", reciprocalError);
        }
      }
    },
    onSuccess: () => {
      toast.success("Mahram berhasil ditambahkan");
      setNewMahram({ mahram_name: "", mahram_relation: "", notes: "", mahram_customer_id: "" });
      refetchMahrams();
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menambah mahram");
    }
  });

  const deleteMahramMutation = useMutation({
    mutationFn: async (mahramId: string) => {
      // Find the mahram to get the reciprocal info
      const mahramToDelete = mahrams?.find(m => m.id === mahramId);
      
      // Delete the primary mahram record
      const { error } = await supabase.from("customer_mahrams" as any).delete().eq("id", mahramId);
      if (error) throw error;

      // If it has a reciprocal customer link, try to delete that too
      if (mahramToDelete?.mahram_customer_id) {
        await supabase
          .from("customer_mahrams" as any)
          .delete()
          .eq("customer_id", mahramToDelete.mahram_customer_id)
          .eq("mahram_customer_id", customer.id);
      }
    },
    onSuccess: () => {
      toast.success("Mahram berhasil dihapus");
      refetchMahrams();
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus mahram");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Data Jamaah</DialogTitle>
          <DialogDescription>
            Perbarui informasi lengkap jamaah {customer.full_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="personal">Data Diri</TabsTrigger>
            <TabsTrigger value="contact">Kontak & Alamat</TabsTrigger>
            <TabsTrigger value="passport">Paspor</TabsTrigger>
            <TabsTrigger value="family">Keluarga & Mahram</TabsTrigger>
            <TabsTrigger value="documents">Dokumen</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap (Sesuai Paspor) *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nik">NIK</Label>
                <Input
                  id="nik"
                  value={formData.nik}
                  onChange={e => setFormData({ ...formData, nik: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <Select
                  value={formData.gender}
                  onValueChange={value => setFormData({ ...formData, gender: value as GenderType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marital_status">Status Pernikahan</Label>
                <Select
                  value={formData.marital_status}
                  onValueChange={value => setFormData({ ...formData, marital_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Belum Kawin">Belum Kawin</SelectItem>
                    <SelectItem value="Kawin">Kawin</SelectItem>
                    <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                    <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_place">Tempat Lahir</Label>
                <Input
                  id="birth_place"
                  value={formData.birth_place}
                  onChange={e => setFormData({ ...formData, birth_place: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Tanggal Lahir</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood_type">Golongan Darah</Label>
                <Select
                  value={formData.blood_type}
                  onValueChange={value => setFormData({ ...formData, blood_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih golongan darah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="AB">AB</SelectItem>
                    <SelectItem value="O">O</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">No. WhatsApp</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat Lengkap</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <IndonesiaLocationSelect
              province={formData.province}
              city={formData.city}
              onProvinceChange={val => setFormData({ ...formData, province: val })}
              onCityChange={val => setFormData({ ...formData, city: val })}
            />
            <div className="space-y-2">
              <Label htmlFor="postal_code">Kode Pos</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>

            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-medium mb-4">Kontak Darurat</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_name">Nama Kontak Darurat</Label>
                  <Input
                    id="emergency_name"
                    value={formData.emergency_contact_name}
                    onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">No. Telp Darurat</Label>
                  <Input
                    id="emergency_phone"
                    value={formData.emergency_contact_phone}
                    onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_relation">Hubungan</Label>
                  <Input
                    id="emergency_relation"
                    value={formData.emergency_contact_relation}
                    onChange={e => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="passport" className="space-y-4 py-4">
            {passportValidation && (
              <Alert variant={passportValidation.type === "error" ? "destructive" : "default"} className={cn(
                passportValidation.type === "warning" && "border-yellow-500 bg-yellow-50 text-yellow-900",
                passportValidation.type === "success" && "border-green-500 bg-green-50 text-green-900"
              )}>
                <passportValidation.icon className="h-4 w-4" />
                <AlertDescription>
                  {passportValidation.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passport_number">Nomor Paspor</Label>
                <Input
                  id="passport_number"
                  value={formData.passport_number}
                  onChange={e => setFormData({ ...formData, passport_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passport_expiry">Masa Berlaku Paspor</Label>
                <Input
                  id="passport_expiry"
                  type="date"
                  value={formData.passport_expiry}
                  onChange={e => setFormData({ ...formData, passport_expiry: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="family" className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="father_name">Nama Ayah Kandung</Label>
                <Input
                  id="father_name"
                  value={formData.father_name}
                  onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_name">Nama Ibu Kandung</Label>
                <Input
                  id="mother_name"
                  value={formData.mother_name}
                  onChange={e => setFormData({ ...formData, mother_name: e.target.value })}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                Daftar Mahram / Pendamping
              </h4>

              {/* Existing mahrams list */}
              {mahrams && mahrams.length > 0 ? (
                <div className="space-y-2">
                  {(mahrams as any[]).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">
                          {m.mahram_relation}
                        </Badge>
                        <span className="font-medium">{m.mahram_name}</span>
                        {m.notes && <span className="text-muted-foreground text-xs italic">({m.notes})</span>}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMahramMutation.mutate(m.id)}
                        disabled={deleteMahramMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-md">
                  Belum ada data mahram yang ditambahkan.
                </div>
              )}

              {/* Add new mahram form */}
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm font-medium">Tambah Mahram Baru</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Hubungan</Label>
                    <Select
                      value={newMahram.mahram_relation}
                      onValueChange={v => setNewMahram({ ...newMahram, mahram_relation: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih hubungan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(RECIPROCAL_RELATIONS).map(rel => (
                          <SelectItem key={rel} value={rel} className="capitalize">{rel}</SelectItem>
                        ))}
                        <SelectItem value="lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Cari Jamaah Lain (Opsional)</Label>
                    <Popover open={mahramSearchOpen} onOpenChange={setMahramSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={mahramSearchOpen}
                          className="w-full justify-between font-normal"
                        >
                          {newMahram.mahram_customer_id
                            ? allCustomers?.find((c) => c.id === newMahram.mahram_customer_id)?.full_name
                            : "Pilih dari database..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Cari nama/WA..." 
                            value={mahramSearch}
                            onValueChange={setMahramSearch}
                          />
                          <CommandList>
                            {loadingCustomers && <CommandEmpty>Mencari...</CommandEmpty>}
                            {!loadingCustomers && allCustomers?.length === 0 && (
                              <CommandEmpty>Jamaah tidak ditemukan.</CommandEmpty>
                            )}
                            <CommandGroup>
                              {allCustomers?.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={c.id}
                                  onSelect={(currentValue) => {
                                    setNewMahram({ 
                                      ...newMahram, 
                                      mahram_customer_id: currentValue,
                                      mahram_name: c.full_name
                                    });
                                    setMahramSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      newMahram.mahram_customer_id === c.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{c.full_name}</span>
                                    <span className="text-xs text-muted-foreground">{c.phone || c.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Nama Mahram (Jika tidak ada di database)</Label>
                  <Input
                    placeholder="Masukkan nama lengkap"
                    value={newMahram.mahram_name}
                    onChange={e => setNewMahram({ ...newMahram, mahram_name: e.target.value })}
                    disabled={!!newMahram.mahram_customer_id}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Catatan Tambahan</Label>
                  <Input
                    placeholder="Contoh: Menantu, Kakak Ipar, dll"
                    value={newMahram.notes}
                    onChange={e => setNewMahram({ ...newMahram, notes: e.target.value })}
                  />
                </div>

                <Button 
                  type="button" 
                  className="w-full" 
                  size="sm"
                  onClick={() => addMahramMutation.mutate(newMahram)}
                  disabled={addMahramMutation.isPending || (!newMahram.mahram_name && !newMahram.mahram_customer_id) || !newMahram.mahram_relation}
                >
                  {addMahramMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Tambah ke Daftar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              {documentTypes?.map(type => {
                const doc = existingDocs?.find(d => d.document_type_id === type.id);
                return (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{type.name}</p>
                        {doc ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4 bg-green-50 text-green-700 border-green-200">
                              Sudah Upload
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(doc.updated_at || doc.created_at), "d MMM yyyy", { locale: idLocale })}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-4 bg-yellow-50 text-yellow-700 border-yellow-200">
                            Belum Ada
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.file_url, "_blank")}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Lihat
                        </Button>
                      )}
                      <div className="relative">
                        <input
                          type="file"
                          id={`file-${type.id}`}
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentUpload(file, type.id);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploading[type.id]}
                          onClick={() => document.getElementById(`file-${type.id}`)?.click()}
                        >
                          {uploading[type.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {doc ? "Update" : "Upload"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
