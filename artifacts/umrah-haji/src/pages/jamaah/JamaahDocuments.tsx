import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Eye,
  Loader2,
  ShieldCheck,
  Download,
  Ticket,
  Receipt,
  Award,
  Plane,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { generateETicket, generateInvoice, generateUmrahCertificate } from "@/lib/document-generator";
import { formatCurrency } from "@/lib/format";

type DocumentStatus = "pending" | "verified" | "rejected";

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; color: string }
> = {
  verified: {
    label: "Terverifikasi",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "text-green-600",
  },
  pending: {
    label: "Menunggu Verifikasi",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
    color: "text-yellow-600",
  },
  rejected: {
    label: "Ditolak",
    variant: "destructive",
    icon: <AlertCircle className="h-3 w-3" />,
    color: "text-red-600",
  },
};

export default function JamaahDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { company, bankAccount } = useCompanyInfo();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const [packageFilter, setPackageFilter] = useState<"all" | "haji" | "umroh">("all");

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: activeBookingPackage } = useQuery({
    queryKey: ["jamaah-booking-package", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data } = await supabase
        .from("bookings")
        .select("departure:departures(package:packages(name, code))")
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const name: string = (data as any)?.departure?.package?.name || "";
      if (name.toLowerCase().includes("haji")) return "haji";
      if (name.toLowerCase().includes("umroh") || name.toLowerCase().includes("umrah")) return "umroh";
      return null;
    },
    enabled: !!customer?.id,
  });

  // ── Bookings query (untuk download e-ticket/invoice/sertifikat) ──
  const { data: bookings } = useQuery({
    queryKey: ["jamaah-bookings-for-docs", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, booking_status, room_type, total_price, paid_amount,
          remaining_amount, base_price, discount_amount, payment_status, total_pax,
          departure:departures(
            id, departure_date, return_date, flight_number, departure_time,
            package:packages(name),
            airline:airlines(name),
            departure_airport:airports!departures_departure_airport_id_fkey(name, city, code),
            arrival_airport:airports!departures_arrival_airport_id_fkey(name, city, code),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name)
          )
        `)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "processing", "completed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customer?.id,
  });

  // ── Download handlers ──
  const handleDownloadETicket = async (booking: any) => {
    const key = `eticket-${booking.id}`;
    setDownloadingDoc(key);
    try {
      const dep = booking.departure as any;
      const doc = await generateETicket({
        bookingCode: booking.booking_code,
        passengerName: customer?.full_name || '-',
        passportNumber: '-',
        packageName: dep?.package?.name || 'Paket Umrah',
        departureDate: new Date(dep?.departure_date),
        returnDate: new Date(dep?.return_date),
        departureAirport: dep?.departure_airport ? `${dep.departure_airport.name} (${dep.departure_airport.code})` : '-',
        arrivalAirport: dep?.arrival_airport ? `${dep.arrival_airport.name} (${dep.arrival_airport.code})` : '-',
        flightNumber: dep?.flight_number,
        airline: dep?.airline?.name,
        departureTime: dep?.departure_time,
        hotelMakkah: dep?.hotel_makkah?.name,
        hotelMadinah: dep?.hotel_madinah?.name,
        roomType: ({ quad: 'Quad (4 orang)', triple: 'Triple (3 orang)', double: 'Double (2 orang)', single: 'Single (1 orang)' } as Record<string, string>)[booking.room_type] || booking.room_type,
      }, company);
      doc.save(`e-ticket-${booking.booking_code}.pdf`);
      toast.success("E-Ticket berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal generate e-ticket");
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDownloadInvoice = async (booking: any) => {
    const key = `invoice-${booking.id}`;
    setDownloadingDoc(key);
    try {
      const dep = booking.departure as any;
      const pkg = dep?.package as any;
      const paxCount = booking.total_pax || 1;
      const pricePerPax = booking.base_price || 0;
      const doc = await generateInvoice({
        invoiceNumber: `INV-${booking.booking_code}`,
        invoiceDate: new Date(),
        dueDate: new Date(),
        customer: { name: customer?.full_name || '-', address: '-', phone: '-' },
        items: [{ description: `Paket ${pkg?.name || 'Umrah'} - Kamar ${booking.room_type}`, quantity: paxCount, unitPrice: pricePerPax, total: pricePerPax * paxCount }],
        subtotal: pricePerPax * paxCount,
        discount: booking.discount_amount || 0,
        total: booking.total_price,
        paidAmount: booking.paid_amount || 0,
        remainingAmount: booking.remaining_amount || 0,
        paymentStatus: (booking.paid_amount || 0) >= booking.total_price ? 'paid' : (booking.paid_amount || 0) > 0 ? 'partial' : 'pending',
        packageName: pkg?.name,
        departureDate: dep?.departure_date ? new Date(dep.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined,
        passengerSummary: { adult: paxCount },
        notes: 'Terima kasih telah mempercayai Vinstour Travel untuk perjalanan ibadah Anda.',
        bankInfo: bankAccount ? { bankName: bankAccount.bank_name, accountNumber: bankAccount.account_number, accountName: bankAccount.account_name } : undefined,
      }, company);
      doc.save(`invoice-${booking.booking_code}.pdf`);
      toast.success("Invoice berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal generate invoice");
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDownloadCertificate = async (booking: any) => {
    const key = `cert-${booking.id}`;
    setDownloadingDoc(key);
    try {
      const dep = booking.departure as any;
      const doc = await generateUmrahCertificate({
        participantName: customer?.full_name || '-',
        passportNumber: '-',
        birthPlace: '-',
        birthDate: new Date(),
        packageName: dep?.package?.name || 'Paket Umrah',
        departureDate: new Date(dep?.departure_date),
        returnDate: new Date(dep?.return_date),
        certificateNumber: `CERT-${booking.booking_code}`,
      }, company);
      doc.save(`sertifikat-umrah-${booking.booking_code}.pdf`);
      toast.success("Sertifikat berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal generate sertifikat");
    } finally {
      setDownloadingDoc(null);
    }
  };

  const { data: documentTypes } = useQuery({
    queryKey: ["document-types"],
    queryFn: async () => {
      const query = supabase.from("document_types").select("*");
      
      // Try to order by sort_order, fallback to name if it fails
      const { data, error } = await query
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      
      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("document_types")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });
          
        if (fallbackError) throw fallbackError;
        return fallbackData ?? [];
      }
      
      return data ?? [];
    },
  });

  const selectedType = useMemo(
    () => documentTypes?.find((t: any) => t.id === selectedTypeId),
    [documentTypes, selectedTypeId]
  );
  const maxFileSize = (selectedType?.max_file_size_mb ?? 5) * 1024 * 1024;
  const allowedExts: string[] = selectedType?.allowed_extensions ?? ["jpg", "jpeg", "png", "pdf"];
  const acceptAttr = allowedExts.map((e) => `.${e}`).join(",");

  const { data: documentsRaw, isLoading } = useQuery({
    queryKey: ["jamaah-documents", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("customer_documents")
        .select("*, document_type:document_types(id, name, code, is_required)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customer?.id,
  });
  // J3 — offline cache: fallback ke localStorage jika offline / belum ada data
  const documents = useOfflineCache<any[]>(
    `jamaah-documents:${customer?.id || "guest"}`,
    documentsRaw,
  );

  // Required document checklist progress
  const requiredProgress = useMemo(() => {
    if (!documentTypes || !documents) return { uploaded: 0, total: 0, verified: 0 };
    const required = documentTypes.filter((t: any) => t.is_required);
    const uploadedTypes = new Set(
      documents
        .filter((d: any) => d.status !== "rejected")
        .map((d: any) => d.document_type?.id)
    );
    const verifiedTypes = new Set(
      documents
        .filter((d: any) => d.status === "verified")
        .map((d: any) => d.document_type?.id)
    );
    return {
      total: required.length,
      uploaded: required.filter((t: any) => uploadedTypes.has(t.id)).length,
      verified: required.filter((t: any) => verifiedTypes.has(t.id)).length,
    };
  }, [documentTypes, documents]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user || !customer || !file || !selectedTypeId) {
        throw new Error("Lengkapi data terlebih dahulu");
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExts.includes(ext)) {
        throw new Error(`Format harus salah satu: ${allowedExts.join(", ")}`);
      }
      if (file.size > maxFileSize) {
        throw new Error(`Ukuran file maksimal ${selectedType?.max_file_size_mb ?? 5} MB`);
      }
      const path = `${user.id}/${customer.id}/${selectedTypeId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("customer-documents")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("customer-documents")
        .getPublicUrl(path);

      const { error: insErr } = await supabase.from("customer_documents").insert({
        customer_id: customer.id,
        document_type_id: selectedTypeId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        status: "pending",
        notes: notes || null,
      });
      if (insErr) throw insErr;

      // Kirim notifikasi realtime ke admin via tabel notifications (payload channel)
      try {
        await (supabase as any).from('notifications').insert({
          type: 'document',
          title: 'Dokumen Baru Diunggah',
          message: `${customer?.full_name || 'Jamaah'} mengunggah dokumen baru. Silakan verifikasi.`,
          is_read: false,
          link: '/admin/document-verification',
        }).then(() => {});
      } catch {}
    },
    onSuccess: () => {
      toast.success("Dokumen berhasil diunggah. Menunggu verifikasi staff.");
      queryClient.invalidateQueries({ queryKey: ["jamaah-documents", customer?.id] });
      setUploadOpen(false);
      setFile(null);
      setSelectedTypeId("");
      setNotes("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengunggah dokumen");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }
    if (!selectedTypeId) {
      toast.error("Pilih jenis dokumen");
      return;
    }
    if (file.size > maxFileSize) {
      toast.error(`Ukuran file maksimal ${selectedType?.max_file_size_mb ?? 5} MB`);
      return;
    }
    setUploading(true);
    try {
      await uploadMutation.mutateAsync();
    } finally {
      setUploading(false);
    }
  };

  const progressPct = requiredProgress.total
    ? Math.round((requiredProgress.verified / requiredProgress.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/jamaah">
            <Button variant="ghost" size="icon" className="text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold">Dokumen Saya</h1>
            <p className="text-xs opacity-80">Upload & pantau status verifikasi</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <OfflineBanner />

        {/* ── DOKUMEN PERJALANAN — Download E-Ticket / Invoice / Sertifikat ── */}
        {bookings && bookings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                Dokumen Perjalanan
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Download e-ticket, invoice, dan sertifikat langsung dari sini
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(bookings as any[]).map((booking) => {
                const dep = booking.departure as any;
                const pkgName = dep?.package?.name || 'Paket Umrah';
                const depDate = dep?.departure_date ? format(new Date(dep.departure_date), 'd MMM yyyy', { locale: localeId }) : '-';
                const retDate = dep?.return_date ? new Date(dep.return_date) : null;
                const tripEnded = retDate && retDate <= new Date();
                const eticketKey = `eticket-${booking.id}`;
                const invoiceKey = `invoice-${booking.id}`;
                const certKey = `cert-${booking.id}`;
                return (
                  <div key={booking.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{pkgName}</p>
                        <p className="text-xs text-muted-foreground">Berangkat: {depDate} · {booking.booking_code}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {booking.booking_status === 'confirmed' ? 'Terkonfirmasi' : booking.booking_status === 'completed' ? 'Selesai' : 'Diproses'}
                      </Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => handleDownloadInvoice(booking)}
                        disabled={downloadingDoc === invoiceKey}
                      >
                        {downloadingDoc === invoiceKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
                        Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => handleDownloadETicket(booking)}
                        disabled={downloadingDoc === eticketKey || !dep?.departure_date}
                      >
                        {downloadingDoc === eticketKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ticket className="h-3 w-3" />}
                        E-Ticket
                      </Button>
                      {tripEnded && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => handleDownloadCertificate(booking)}
                          disabled={downloadingDoc === certKey}
                        >
                          {downloadingDoc === certKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Award className="h-3 w-3" />}
                          Sertifikat
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Package Type Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeBookingPackage && (
            <Badge variant="outline" className={activeBookingPackage === 'haji' ? 'border-green-500 text-green-700 bg-green-50' : 'border-blue-500 text-blue-700 bg-blue-50'}>
              Paket {activeBookingPackage === 'haji' ? 'Haji' : 'Umroh'} Aktif
            </Badge>
          )}
          <div className="flex gap-1 ml-auto">
            {(["all", "haji", "umroh"] as const).map(f => (
              <button
                key={f}
                onClick={() => setPackageFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${packageFilter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-muted text-muted-foreground hover:border-primary/40'}`}
              >
                {f === 'all' ? 'Semua' : f === 'haji' ? 'Haji' : 'Umroh'}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Kelengkapan Dokumen
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {requiredProgress.verified} dari {requiredProgress.total} dokumen wajib terverifikasi
                </p>
              </div>
              <span className="text-2xl font-bold text-primary">{progressPct}%</span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {requiredProgress.uploaded > requiredProgress.verified && (
              <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {requiredProgress.uploaded - requiredProgress.verified} dokumen menunggu verifikasi staff
              </p>
            )}
          </CardContent>
        </Card>

        {/* F8: Checklist Dokumen Wajib */}
        {documentTypes && documentTypes.filter((t: any) => t.is_required).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Checklist Dokumen Wajib
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documentTypes
                .filter((t: any) => {
                  if (!t.is_required) return false;
                  if (packageFilter === "all") return true;
                  const n = (t.name || "").toLowerCase();
                  const c = (t.code || "").toLowerCase();
                  if (packageFilter === "haji") return n.includes("haji") || c.includes("haji") || (!n.includes("umroh") && !n.includes("umrah") && !c.includes("umroh") && !c.includes("umrah"));
                  if (packageFilter === "umroh") return n.includes("umroh") || n.includes("umrah") || c.includes("umroh") || c.includes("umrah") || (!n.includes("haji") && !c.includes("haji"));
                  return true;
                })
                .map((docType: any) => {
                  const uploaded = documents?.find(
                    (d: any) => d.document_type?.id === docType.id && d.status !== "rejected"
                  );
                  const verified = uploaded?.status === "verified";
                  const pending = uploaded?.status === "pending";
                  const rejected = documents?.find(
                    (d: any) => d.document_type?.id === docType.id && d.status === "rejected"
                  );

                  return (
                    <div
                      key={docType.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        verified
                          ? "bg-green-50 border-green-200"
                          : pending
                          ? "bg-yellow-50 border-yellow-200"
                          : rejected
                          ? "bg-red-50 border-red-200"
                          : "bg-muted/30 border-muted"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {verified ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : pending ? (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        ) : rejected ? (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{docType.name}</p>
                        {docType.description && (
                          <p className="text-xs text-muted-foreground">{docType.description}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                          verified
                            ? "bg-green-100 text-green-700"
                            : pending
                            ? "bg-yellow-100 text-yellow-700"
                            : rejected
                            ? "bg-red-100 text-red-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {verified ? "✓ Terverifikasi" : pending ? "Menunggu" : rejected ? "Ditolak" : "Belum Upload"}
                      </span>
                    </div>
                  );
                })}
              {progressPct === 100 && (
                <div className="text-center py-2">
                  <p className="text-sm font-semibold text-green-700">
                    🎉 Semua dokumen wajib sudah terverifikasi!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload Button */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Upload className="h-4 w-4 mr-2" />
              Unggah Dokumen Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Unggah Dokumen</DialogTitle>
              <DialogDescription>
                Upload paspor, KTP, atau dokumen pendukung lainnya. Staff akan memverifikasi dalam 1x24 jam.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="doc-type">Jenis Dokumen *</Label>
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                  <SelectTrigger id="doc-type" className="mt-1">
                    <SelectValue placeholder="Pilih jenis dokumen" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_required && <span className="text-red-500">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="doc-file">File *</Label>
                <Input
                  id="doc-file"
                  type="file"
                  accept={acceptAttr || "image/*,application/pdf"}
                  className="mt-1"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > maxFileSize) {
                      toast.error(`Ukuran file maksimal ${selectedType?.max_file_size_mb ?? 5} MB`);
                      e.target.value = "";
                      return;
                    }
                    setFile(f ?? null);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: {allowedExts.map((e) => e.toUpperCase()).join(", ")} (maks {selectedType?.max_file_size_mb ?? 5} MB)
                </p>
              </div>

              <div>
                <Label htmlFor="doc-notes">Catatan (opsional)</Label>
                <Textarea
                  id="doc-notes"
                  className="mt-1"
                  rows={2}
                  placeholder="Misal: paspor terbit ulang"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUploadOpen(false)}
                  disabled={uploading}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={uploading || !file || !selectedTypeId}>
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Unggah
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Documents List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground px-1">
            Dokumen Terunggah
          </h2>
          {isLoading ? (
            <LoadingState />
          ) : !documents || documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Belum ada dokumen"
              description="Unggah dokumen Anda untuk diverifikasi oleh staff"
            />
          ) : (
            documents.map((doc: any) => {
              const status = statusConfig[(doc.status as DocumentStatus) || "pending"];
              return (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg bg-primary/10 shrink-0`}>
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {doc.document_type?.name || "Dokumen"}
                          </p>
                          {doc.file_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.file_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Diunggah:{" "}
                            {doc.created_at
                              ? format(new Date(doc.created_at), "d MMM yyyy, HH:mm", {
                                  locale: localeId,
                                })
                              : "-"}
                          </p>
                          {doc.status === "verified" && doc.verified_at && (
                            <p className="text-xs text-green-600 mt-0.5">
                              Diverifikasi:{" "}
                              {format(new Date(doc.verified_at), "d MMM yyyy", {
                                locale: localeId,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={status.variant} className="gap-1 shrink-0">
                        {status.icon}
                        <span className="text-xs">{status.label}</span>
                      </Badge>
                    </div>

                    {/* Notes from staff */}
                    {doc.notes && (
                      <div
                        className={`mt-3 p-2 rounded-md text-xs ${
                          doc.status === "rejected"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <p className="font-medium mb-0.5">
                          {doc.status === "rejected" ? "Alasan penolakan:" : "Catatan:"}
                        </p>
                        {doc.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {doc.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Lihat
                          </a>
                        </Button>
                      )}
                      {doc.status === "rejected" && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedTypeId(doc.document_type?.id || "");
                            setUploadOpen(true);
                          }}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Unggah Ulang
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <JamaahBottomNav />
    </div>
  );
}
