import { useState, useEffect, useMemo } from "react";
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
      if (error) throw error;
      return data as CustomerMahram[];
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
          notes: m.notes || null 
        });
      if (insertError) throw insertError;

      // Jika mahram_customer_id dipilih, insert hubungan timbal balik
      if (m.mahram_customer_id) {
        const reciprocalRelation = RECIPROCAL_RELATIONS[m.mahram_relation] || m.mahram_relation;
        const { error: reciprocalError } = await supabase
          .from("customer_mahrams" as any)
          .insert({
            customer_id: m.mahram_customer_id,
            mahram_name: customer.full_name,
            mahram_relation: reciprocalRelation,
            mahram_customer_id: customer.id,
            notes: m.notes || null
          });
        if (reciprocalError) throw reciprocalError;
      }
    },
    onSuccess: () => {
      toast.success("Mahram berhasil ditambahkan");
      setNewMahram({ mahram_name: "", mahram_relation: "", notes: "", mahram_customer_id: "" });
      setMahramSearch("");
      setMahramSearchOpen(false);
      refetchMahrams();
    },
    onError: (e: any) => toast.error(e.message || "Gagal menambah mahram"),
  });

  const deleteMahramMutation = useMutation({
    mutationFn: async (mahramId: string) => {
      // Ambil data mahram yang akan dihapus
      const mahramToDelete = mahrams?.find(m => m.id === mahramId);
      
      // Hapus mahram utama
      const { error } = await supabase.from("customer_mahrams" as any).delete().eq("id", mahramId);
      if (error) throw error;

      // Jika mahram memiliki mahram_customer_id, hapus juga hubungan timbal baliknya
      if (mahramToDelete?.mahram_customer_id) {
        const { error: reciprocalDeleteError } = await supabase
          .from("customer_mahrams" as any)
          .delete()
          .eq("customer_id", mahramToDelete.mahram_customer_id)
          .eq("mahram_customer_id", customer.id);
        
        // Jangan throw error jika reciprocal tidak ditemukan (mungkin sudah dihapus)
        if (reciprocalDeleteError && reciprocalDeleteError.code !== "PGRST116") {
          throw reciprocalDeleteError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Mahram dihapus");
      refetchMahrams();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Terverifikasi</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      case "uploaded":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Menunggu Verifikasi</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const selectedMahramCustomer = useMemo(
    () => allCustomers?.find((c: any) => c.id === newMahram.mahram_customer_id),
    [allCustomers, newMahram.mahram_customer_id]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Data Jamaah</DialogTitle>
          <DialogDescription>
            Perbarui informasi dan dokumen jamaah. Pastikan data yang diisi sudah benar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">Data Diri</TabsTrigger>
              <TabsTrigger value="contact">Kontak</TabsTrigger>
              <TabsTrigger value="passport">Paspor</TabsTrigger>
              <TabsTrigger value="mahram">Mahram</TabsTrigger>
              <TabsTrigger value="emergency">Darurat</TabsTrigger>
              <TabsTrigger value="documents">Dokumen</TabsTrigger>
            </TabsList>

            {/* Data Diri Tab */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nama Lengkap *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="Sesuai paspor/KTP"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK (KTP)</Label>
                  <Input
                    id="nik"
                    value={formData.nik}
                    onChange={(e) => handleChange("nik", e.target.value)}
                    placeholder="16 digit"
                    maxLength={16}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Jenis Kelamin</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val) => handleChange("gender", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Laki-laki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_place">Tempat Lahir</Label>
                  <Input
                    id="birth_place"
                    value={formData.birth_place}
                    onChange={(e) => handleChange("birth_place", e.target.value)}
                    placeholder="Kota kelahiran"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Tanggal Lahir</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange("birth_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blood_type">Golongan Darah</Label>
                  <Select
                    value={formData.blood_type}
                    onValueChange={(val) => handleChange("blood_type", val)}
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
                <div className="space-y-2">
                  <Label htmlFor="marital_status">Status Pernikahan</Label>
                  <Select
                    value={formData.marital_status}
                    onValueChange={(val) => handleChange("marital_status", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Belum Menikah</SelectItem>
                      <SelectItem value="married">Menikah</SelectItem>
                      <SelectItem value="divorced">Cerai</SelectItem>
                      <SelectItem value="widowed">Duda/Janda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Kontak Tab */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
                  rows={3}
                />
              </div>
              <IndonesiaLocationSelect
                province={formData.province}
                city={formData.city}
                onProvinceChange={(value) => handleChange("province", value)}
                onCityChange={(value) => handleChange("city", value)}
              />
              <div className="space-y-2">
                <Label htmlFor="postal_code">Kode Pos</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
                  placeholder="12345"
                  maxLength={5}
                />
              </div>
            </TabsContent>

            {/* Paspor Tab */}
            <TabsContent value="passport" className="space-y-4 mt-4">
              {/* Passport Validation Alert */}
              {passportValidation && (
                <Alert 
                  variant={passportValidation.type === "error" ? "destructive" : "default"}
                  className={
                    passportValidation.type === "warning" 
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" 
                      : passportValidation.type === "success"
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : ""
                  }
                >
                  <passportValidation.icon className={`h-4 w-4 ${
                    passportValidation.type === "warning" 
                      ? "text-amber-600" 
                      : passportValidation.type === "success"
                      ? "text-green-600"
                      : ""
                  }`} />
                  <AlertDescription className={
                    passportValidation.type === "warning" 
                      ? "text-amber-800 dark:text-amber-200" 
                      : passportValidation.type === "success"
                      ? "text-green-800 dark:text-green-200"
                      : ""
                  }>
                    {passportValidation.message}
                    {passportValidation.type === "warning" && passportValidation.departures && passportValidation.departures.length > 1 && (
                      <div className="mt-2 text-sm">
                        <strong>Keberangkatan lain yang terpengaruh:</strong>
                        <ul className="list-disc ml-4 mt-1">
                          {passportValidation.departures.slice(1).map((dep, idx) => (
                            <li key={idx}>{dep.packageName} - {dep.date} (kurang {dep.daysShort} hari)</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="passport_number">Nomor Paspor</Label>
                  <Input
                    id="passport_number"
                    value={formData.passport_number}
                    onChange={(e) => handleChange("passport_number", e.target.value)}
                    placeholder="A1234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passport_expiry">Masa Berlaku</Label>
                  <Input
                    id="passport_expiry"
                    type="date"
                    value={formData.passport_expiry}
                    onChange={(e) => handleChange("passport_expiry", e.target.value)}
                    className={
                      passportValidation?.type === "error" 
                        ? "border-destructive" 
                        : passportValidation?.type === "warning"
                        ? "border-amber-500"
                        : ""
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="father_name">Nama Ayah</Label>
                  <Input
                    id="father_name"
                    value={formData.father_name}
                    onChange={(e) => handleChange("father_name", e.target.value)}
                    placeholder="Nama ayah kandung"
                  />
                  <p className="text-xs text-muted-foreground">Diisi otomatis dari Mahram jika ada</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mother_name">Nama Ibu</Label>
                  <Input
                    id="mother_name"
                    value={formData.mother_name}
                    onChange={(e) => handleChange("mother_name", e.target.value)}
                    placeholder="Nama ibu kandung"
                  />
                  <p className="text-xs text-muted-foreground">Diisi otomatis dari Mahram jika ada</p>
                </div>
              </div>

            </TabsContent>

            {/* Mahram Tab */}
            <TabsContent value="mahram" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-rose-500" />
                <p className="text-sm text-muted-foreground">Daftar mahram jamaah ini. Mahram adalah wali yang menemani ibadah.</p>
              </div>

              {/* Existing mahrams list */}
              {mahrams && mahrams.length > 0 ? (
                <div className="space-y-2">
                  {(mahrams as any[]).map((m: any) => (
                    <div key={m.id} className="flex items-start justify-between bg-muted/40 rounded-lg p-3 border">
                      <div>
                        <p className="font-semibold text-sm">{m.mahram_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{m.mahram_relation}</p>
                        {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteMahramMutation.mutate(m.id)}
                        disabled={deleteMahramMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                  Belum ada data mahram. Tambahkan mahram di bawah.
                </div>
              )}

              {/* Add new mahram */}
              <div className="border rounded-lg p-4 space-y-3 bg-background">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Tambah Mahram
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Mahram customer selector */}
                  <div className="space-y-1.5">
                    <Label>Pilih dari Jamaah *</Label>
                    <Popover open={mahramSearchOpen} onOpenChange={setMahramSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {selectedMahramCustomer ? (
                            <span className="truncate">
                              {selectedMahramCustomer.full_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Cari nama jamaah...
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0 z-50"
                        align="start"
                        side="bottom"
                        sideOffset={4}
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Ketik nama atau nomor telepon..."
                            value={mahramSearch}
                            onValueChange={setMahramSearch}
                          />
                          <CommandList>
                            {loadingCustomers ? (
                              <div className="py-4 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                Mencari...
                              </div>
                            ) : !allCustomers || allCustomers.length === 0 ? (
                              <CommandEmpty>Tidak ditemukan</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {allCustomers.map((c: any) => (
                                  <CommandItem
                                    key={c.id}
                                    value={c.id}
                                    onSelect={() => {
                                      setNewMahram(p => ({ ...p, mahram_customer_id: c.id }));
                                      setMahramSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        newMahram.mahram_customer_id === c.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate">
                                        {c.full_name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {c.phone || c.email}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Mahram relation */}
                  <div className="space-y-1.5">
                    <Label>Hubungan *</Label>
                    <Select value={newMahram.mahram_relation} onValueChange={v => setNewMahram(p => ({ ...p, mahram_relation: v }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih hubungan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suami">Suami</SelectItem>
                        <SelectItem value="istri">Istri</SelectItem>
                        <SelectItem value="ayah">Ayah</SelectItem>
                        <SelectItem value="ibu">Ibu</SelectItem>
                        <SelectItem value="anak">Anak</SelectItem>
                        <SelectItem value="saudara">Saudara Kandung</SelectItem>
                        <SelectItem value="paman">Paman</SelectItem>
                        <SelectItem value="kakek">Kakek</SelectItem>
                        <SelectItem value="nenek">Nenek</SelectItem>
                        <SelectItem value="cucu">Cucu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Catatan (opsional)</Label>
                  <Input
                    value={newMahram.notes}
                    onChange={e => setNewMahram(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Mis: nomor telepon, keterangan tambahan"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addMahramMutation.mutate(newMahram)}
                  disabled={addMahramMutation.isPending || !newMahram.mahram_customer_id || !newMahram.mahram_relation}
                >
                  {addMahramMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Tambah Mahram
                </Button>
              </div>


            </TabsContent>

            {/* Darurat Tab */}
            <TabsContent value="emergency" className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Nama Kontak Darurat</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleChange("emergency_contact_name", e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">No. Telepon</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleChange("emergency_contact_phone", e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_relation">Hubungan</Label>
                <Select value={formData.emergency_contact_relation} onValueChange={(val) => handleChange("emergency_contact_relation", val)}>
                  <SelectTrigger><SelectValue placeholder="Pilih hubungan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="istri">Istri</SelectItem>
                    <SelectItem value="suami">Suami</SelectItem>
                    <SelectItem value="ayah">Ayah</SelectItem>
                    <SelectItem value="ibu">Ibu</SelectItem>
                    <SelectItem value="anak">Anak</SelectItem>
                    <SelectItem value="saudara">Saudara Kandung</SelectItem>
                    <SelectItem value="paman">Paman</SelectItem>
                    <SelectItem value="kakek">Kakek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Dokumen Tab */}
            <TabsContent value="documents" className="space-y-4 mt-4">
              <div className="space-y-4">
                {documentTypes?.map((docType) => {
                  const existingDoc = existingDocs?.find(d => d.document_type_id === docType.id);
                  return (
                    <div key={docType.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{docType.name}</p>
                          <p className="text-xs text-muted-foreground">{docType.code}</p>
                        </div>
                        {existingDoc && (
                          <div className="flex items-center gap-2">
                            {getStatusBadge(existingDoc.status ?? null)}
                          </div>
                        )}
                      </div>

                      {existingDoc && existingDoc.file_url && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={existingDoc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate flex-1"
                          >
                            {existingDoc.file_name}
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                          >
                            <a href={existingDoc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      )}

                      {(!existingDoc || existingDoc.status === "rejected") && (
                        <div>
                          <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <Upload className="h-4 w-4" />
                              <span className="text-sm">
                                {uploading[docType.id] ? "Mengupload..." : "Upload dokumen"}
                              </span>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept=".jpg,.jpeg,.png,.pdf"
                              disabled={uploading[docType.id]}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error("Ukuran file maksimal 5MB");
                                    return;
                                  }
                                  handleDocumentUpload(file, docType.id);
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground mt-2">
                            Format: JPG, PNG, PDF (Maks 5MB)
                          </p>
                        </div>
                      )}

                      {existingDoc?.notes && existingDoc.status === "rejected" && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                          <strong>Alasan penolakan:</strong> {existingDoc.notes}
                        </div>
                      )}
                    </div>
                  );
                })}

                {(!documentTypes || documentTypes.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    Tidak ada jenis dokumen yang dikonfigurasi
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updateMutation.isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
