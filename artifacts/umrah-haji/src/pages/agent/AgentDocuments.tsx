import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import {
  FileText, Ticket, Award, Receipt, Heart,
  MessageCircle, Download, Loader2, Search, Calendar,
  Users, ChevronDown, ChevronUp
} from "lucide-react";
import {
  generateInvoice, generateETicket, generateUmrahCertificate, generateSuratLunas,
  generateJamaahLeaveLetter,
  type InvoiceDataExtended, type ETicketData, type UmrahCertificateData,
  type SuratLunasData, type JamaahLeaveLetterData,
} from "@/lib/document-generator";
import { cn } from "@/lib/utils";

const supabase: any = supabaseRaw;

const ROMAN_MONTHS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

function genDocNumber(prefix: string) {
  const d = new Date();
  return `${Math.floor(Math.random()*900+100)}/${prefix}/UHT/${ROMAN_MONTHS[d.getMonth()]}/${d.getFullYear()}`;
}

type DocType = "eticket" | "invoice" | "sertifikat" | "lunas" | "surat-izin";

const DOC_META: Record<DocType, { label: string; icon: any; color: string }> = {
  eticket:    { label: "E-Ticket",    icon: Ticket,   color: "text-sky-600" },
  invoice:    { label: "Invoice",     icon: Receipt,  color: "text-violet-600" },
  sertifikat: { label: "Sertifikat",  icon: Award,    color: "text-amber-600" },
  lunas:      { label: "Ket. Lunas",  icon: FileText, color: "text-green-600" },
  "surat-izin": { label: "Surat Izin", icon: Heart,   color: "text-rose-600" },
};

export default function AgentDocuments() {
  const { user } = useAuth();
  const { company, bankAccount } = useCompanyInfo();

  const [selectedDep, setSelectedDep] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Generate & send state
  const [genLoading, setGenLoading] = useState<Record<string, boolean>>({});
  const [sendDialog, setSendDialog] = useState<{ open: boolean; phone: string; blob: Blob | null; name: string }>({
    open: false, phone: "", blob: null, name: ""
  });
  const [sendingWA, setSendingWA] = useState(false);

  // Surat izin form (minimal)
  const [suratIzinDialog, setSuratIzinDialog] = useState<{ open: boolean; bookingId: string }>({ open: false, bookingId: "" });
  const [suratIzinForm, setSuratIzinForm] = useState({ employerName: "", employerPosition: "", employerInstitution: "", employerAddress: "", purpose: "Ibadah Umrah" });

  // Get agent profile
  const { data: agentData } = useQuery({
    queryKey: ["agent-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, agent_code, company_name").eq("user_id", user!.id).single();
      return data;
    },
  });

  // Get agent's bookings with full join data
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["agent-doc-bookings", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, total_price, total_pax, base_price, discount_amount,
          paid_amount, remaining_amount, payment_status, booking_status, room_type, created_at,
          customer:customers(id, full_name, phone, email, nik, birth_place, birth_date, address, passport_number),
          departure:departures(
            id, departure_date, return_date, departure_time, flight_number, quota, booked_count,
            airline:airlines(name, code),
            departure_airport:airports!departures_departure_airport_id_fkey(name, city, code),
            arrival_airport:airports!departures_arrival_airport_id_fkey(name, city, code),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name),
            package:packages(name, price_quad, price_triple, price_double, price_single)
          )
        `)
        .eq("agent_id", agentData!.id)
        .not("booking_status", "eq", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Unique departures from bookings
  const departures = useMemo(() => {
    const seen = new Map<string, any>();
    bookings.forEach((b: any) => {
      if (b.departure && !seen.has(b.departure.id)) seen.set(b.departure.id, b.departure);
    });
    return Array.from(seen.values()).sort((a: any, b: any) =>
      new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime()
    );
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (selectedDep) list = list.filter((b: any) => b.departure?.id === selectedDep);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((b: any) =>
        b.customer?.full_name?.toLowerCase().includes(s) ||
        b.booking_code?.toLowerCase().includes(s) ||
        b.customer?.phone?.includes(s)
      );
    }
    return list;
  }, [bookings, selectedDep, search]);

  // ── PDF helpers ──
  const uploadAndGetUrl = async (blob: Blob, filename: string): Promise<string> => {
    const path = `temp-wa/${Date.now()}_${filename}.pdf`;
    await supabase.storage.from("customer-documents").upload(path, blob, { contentType: "application/pdf", upsert: true });
    const { data: signed } = await supabase.storage.from("customer-documents").createSignedUrl(path, 3600);
    return signed?.signedUrl || "";
  };

  const handleGenerate = async (booking: any, docType: DocType) => {
    const key = `${booking.id}-${docType}`;
    setGenLoading(prev => ({ ...prev, [key]: true }));
    try {
      const customer = booking.customer;
      const dep = booking.departure;
      const pkg = dep?.package;
      let doc: any = null;
      let filename = "";

      if (docType === "eticket") {
        const data = {
          bookingCode: booking.booking_code,
          passengerName: customer?.full_name || "-",
          passportNumber: customer?.passport_number || "-",
          packageName: pkg?.name || "-",
          departureDate: dep?.departure_date ? new Date(dep.departure_date) : new Date(),
          returnDate: dep?.return_date ? new Date(dep.return_date) : new Date(),
          departureTime: dep?.departure_time || "-",
          airline: (dep?.airline as any)?.name || "-",
          flightNumber: dep?.flight_number || "-",
          departureAirport: (dep?.departure_airport as any)?.name || "-",
          arrivalAirport: (dep?.arrival_airport as any)?.name || "-",
          hotelMakkah: (dep?.hotel_makkah as any)?.name || "-",
          hotelMadinah: (dep?.hotel_madinah as any)?.name || "-",
          roomType: booking.room_type || "quad",
          itinerary: [],
        } as ETicketData;
        doc = await generateETicket(data, company);
        filename = `eticket-${booking.booking_code}`;
      } else if (docType === "invoice") {
        const roomMap: Record<string, string> = { quad: "Quad (4 orang)", triple: "Triple (3 orang)", double: "Double (2 orang)", single: "Single (1 orang)" };
        const priceMap: Record<string, number> = { quad: pkg?.price_quad || 0, triple: pkg?.price_triple || 0, double: pkg?.price_double || 0, single: pkg?.price_single || 0 };
        const roomType = booking.room_type || "quad";
        const data = {
          invoiceNumber: genDocNumber("INV"),
          invoiceDate: new Date(),
          dueDate: new Date(),
          customer: {
            name: customer?.full_name || "-",
            address: customer?.address || "-",
            phone: customer?.phone || "-",
            email: customer?.email || undefined,
          },
          items: [{ description: `Paket ${pkg?.name || ""} - ${roomMap[roomType] || roomType}`, quantity: booking.total_pax || 1, unitPrice: priceMap[roomType], total: booking.total_price || 0 }],
          subtotal: booking.total_price || 0,
          total: booking.total_price || 0,
          notes: "",
          packageName: pkg?.name || "-",
          departureDate: dep?.departure_date || undefined,
          paidAmount: booking.paid_amount || 0,
          remainingAmount: booking.remaining_amount || 0,
          paymentStatus: booking.payment_status || "pending",
          agentName: agentData?.company_name || undefined,
          agentCode: agentData?.agent_code || undefined,
        } as InvoiceDataExtended;
        doc = await generateInvoice(data, company);
        filename = `invoice-${booking.booking_code}`;
      } else if (docType === "sertifikat") {
        const data = {
          participantName: customer?.full_name || "-",
          passportNumber: customer?.passport_number || customer?.nik || "-",
          birthPlace: customer?.birth_place || "-",
          birthDate: customer?.birth_date ? new Date(customer.birth_date) : new Date(),
          departureDate: dep?.departure_date ? new Date(dep.departure_date) : new Date(),
          returnDate: dep?.return_date ? new Date(dep.return_date) : new Date(),
          packageName: pkg?.name || "-",
          certificateNumber: genDocNumber("SERTIF"),
        } as UmrahCertificateData;
        doc = await generateUmrahCertificate(data, company);
        filename = `sertifikat-${booking.booking_code}`;
      } else if (docType === "lunas") {
        const data: SuratLunasData = {
          bookingCode: booking.booking_code, customerName: customer?.full_name || "-",
          customerNik: customer?.nik || undefined, packageName: pkg?.name || "-",
          departureDate: dep?.departure_date || undefined,
          totalAmount: booking.total_price || 0, paidAmount: booking.paid_amount || 0,
        };
        doc = await generateSuratLunas(data, genDocNumber("LUNAS"), company);
        filename = `lunas-${booking.booking_code}`;
      }

      if (doc) {
        doc.save(`${filename}.pdf`);
        const blob: Blob = doc.output("blob");
        const phone = customer?.phone || "";
        setSendDialog({ open: true, phone, blob, name: filename });
        toast.success("PDF berhasil dibuat. Siap dikirim via WA.");
      }
    } catch (err: any) {
      toast.error(`Gagal generate dokumen: ${err.message}`);
    } finally {
      setGenLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleOpenSuratIzin = (bookingId: string) => {
    setSuratIzinDialog({ open: true, bookingId });
  };

  const handleGenerateSuratIzin = async () => {
    const booking = bookings.find((b: any) => b.id === suratIzinDialog.bookingId);
    if (!booking) return;
    setGenLoading(prev => ({ ...prev, [`${booking.id}-surat-izin`]: true }));
    try {
      const customer = booking.customer;
      const dep = booking.departure;
      const data: JamaahLeaveLetterData = {
        jamaahName: customer?.full_name || "-", nik: customer?.nik || "-",
        birthPlace: customer?.birth_place || "-",
        birthDate: customer?.birth_date ? new Date(customer.birth_date) : new Date(),
        address: customer?.address || "-",
        employerName: suratIzinForm.employerName, employerPosition: suratIzinForm.employerPosition,
        employerInstitution: suratIzinForm.employerInstitution, employerAddress: suratIzinForm.employerAddress,
        startDate: dep?.departure_date ? new Date(dep.departure_date) : new Date(),
        endDate: dep?.return_date ? new Date(dep.return_date) : new Date(),
        purpose: suratIzinForm.purpose,
      };
      const doc = await generateJamaahLeaveLetter(data, genDocNumber("CUTI-JMH"), company);
      doc.save(`surat-izin-${booking.booking_code}.pdf`);
      const blob: Blob = doc.output("blob");
      setSuratIzinDialog({ open: false, bookingId: "" });
      setSendDialog({ open: true, phone: customer?.phone || "", blob, name: `surat-izin-${booking.booking_code}` });
      toast.success("Surat izin berhasil dibuat");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenLoading(prev => ({ ...prev, [`${suratIzinDialog.bookingId}-surat-izin`]: false }));
    }
  };

  const handleSendWA = async () => {
    if (!sendDialog.phone.trim() || !sendDialog.blob) { toast.error("Nomor HP harus diisi"); return; }
    setSendingWA(true);
    try {
      const url = await uploadAndGetUrl(sendDialog.blob, sendDialog.name);
      const msg = url
        ? `Halo, berikut dokumen *${sendDialog.name}* dari Vinstour Travel:\n\n${url}\n\n_Link aktif 1 jam._`
        : `Dokumen *${sendDialog.name}* sudah siap. Silakan login ke portal jamaah.`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch("/api/documents/send-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ phone: sendDialog.phone.trim(), message: msg }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Dokumen berhasil dikirim via WhatsApp ke ${sendDialog.phone}`);
        setSendDialog({ open: false, phone: "", blob: null, name: "" });
      } else {
        toast.error(json.error || "Gagal kirim WA");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingWA(false);
    }
  };

  const toggleExpand = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Dokumen Jamaah Saya
        </h1>
        <p className="text-muted-foreground mt-1">Generate dan kirim dokumen untuk jamaah yang Anda kelola</p>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama jamaah atau kode booking..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDep} onValueChange={setSelectedDep}>
              <SelectTrigger className="w-full md:w-72">
                <SelectValue placeholder="Semua keberangkatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Keberangkatan</SelectItem>
                {departures.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {new Date(d.departure_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} — {(d.package as any)?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Jamaah", value: filteredBookings.length, icon: Users, color: "text-primary" },
          { label: "Keberangkatan", value: departures.length, icon: Calendar, color: "text-sky-600" },
          { label: "Konfirmasi", value: filteredBookings.filter((b: any) => b.booking_status === "confirmed").length, icon: FileText, color: "text-green-600" },
          { label: "Lunas", value: filteredBookings.filter((b: any) => b.payment_status === "paid").length, icon: Receipt, color: "text-violet-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={cn("h-8 w-8", stat.color)} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada data jamaah</p>
          <p className="text-sm mt-1">Data jamaah akan muncul setelah ada booking yang masuk</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking: any) => {
            const customer = booking.customer;
            const dep = booking.departure;
            const isExp = expanded.has(booking.id);
            return (
              <Card key={booking.id} className="border-none shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(booking.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {(customer?.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{customer?.full_name || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.booking_code} ·{" "}
                        {dep?.departure_date ? new Date(dep.departure_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"} ·{" "}
                        {(dep?.package as any)?.name || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2">
                      <Badge variant={booking.booking_status === "confirmed" ? "default" : "outline"} className="text-[10px]">
                        {booking.booking_status}
                      </Badge>
                      <Badge
                        className={cn("text-[10px]",
                          booking.payment_status === "paid" ? "bg-green-100 text-green-700" :
                          booking.payment_status === "dp_paid" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        )}
                        variant="outline"
                      >
                        {booking.payment_status === "paid" ? "Lunas" : booking.payment_status === "dp_paid" ? "DP" : "Belum Bayar"}
                      </Badge>
                      <span className="text-sm font-semibold text-muted-foreground">{formatCurrency(booking.total_price || 0)}</span>
                    </div>
                    {isExp ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExp && (
                  <div className="border-t bg-muted/20 p-4">
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Generate Dokumen</p>
                      <div className="flex flex-wrap gap-2">
                        {(["eticket", "invoice", "sertifikat", "lunas"] as DocType[]).map(docType => {
                          const meta = DOC_META[docType];
                          const key = `${booking.id}-${docType}`;
                          const isLoading = genLoading[key];
                          return (
                            <Button
                              key={docType}
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={isLoading}
                              onClick={() => handleGenerate(booking, docType)}
                            >
                              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <meta.icon className={cn("h-3.5 w-3.5", meta.color)} />}
                              {meta.label}
                            </Button>
                          );
                        })}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          disabled={genLoading[`${booking.id}-surat-izin`]}
                          onClick={() => handleOpenSuratIzin(booking.id)}
                        >
                          <Heart className={cn("h-3.5 w-3.5", DOC_META["surat-izin"].color)} />
                          Surat Izin Jamaah
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                      <span>📱 {customer?.phone || "-"}</span>
                      <span>✉️ {customer?.email || "-"}</span>
                      <span>🛂 {customer?.passport_number || "Paspor belum diisi"}</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Send WA Dialog */}
      <Dialog open={sendDialog.open} onOpenChange={open => setSendDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Kirim via WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">File: <span className="font-medium text-foreground">{sendDialog.name}.pdf</span></p>
            <div className="space-y-2">
              <Label>Nomor WhatsApp Jamaah</Label>
              <Input
                type="tel"
                value={sendDialog.phone}
                onChange={e => setSendDialog(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Contoh: 08123456789"
              />
            </div>
            <p className="text-xs text-muted-foreground bg-green-50 border border-green-200 rounded-lg p-2">
              PDF akan diupload sementara dan link dikirim ke nomor WA jamaah. Link aktif selama 1 jam.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog({ open: false, phone: "", blob: null, name: "" })}>Lewati</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                if (sendDialog.blob) {
                  const url = URL.createObjectURL(sendDialog.blob);
                  const a = document.createElement("a"); a.href = url; a.download = `${sendDialog.name}.pdf`; a.click();
                  URL.revokeObjectURL(url);
                }
              }}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
              <Button onClick={handleSendWA} disabled={sendingWA} className="bg-green-600 hover:bg-green-700">
                {sendingWA ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                {sendingWA ? "Mengirim..." : "Kirim WA"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Surat Izin Form Dialog */}
      <Dialog open={suratIzinDialog.open} onOpenChange={open => setSuratIzinDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Data Surat Izin Jamaah</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: "employerName", label: "Nama Instansi/Perusahaan", placeholder: "PT. Contoh Jaya" },
              { key: "employerPosition", label: "Jabatan Pimpinan", placeholder: "Direktur / HRD Manager" },
              { key: "employerInstitution", label: "Nama Pimpinan (opsional)", placeholder: "Bpk. Ahmad" },
              { key: "employerAddress", label: "Alamat Instansi", placeholder: "Jl. Contoh No. 1" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}</Label>
                <Input
                  value={(suratIzinForm as any)[f.key]}
                  onChange={e => setSuratIzinForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuratIzinDialog({ open: false, bookingId: "" })}>Batal</Button>
            <Button onClick={handleGenerateSuratIzin} disabled={!suratIzinForm.employerName}>
              <FileText className="h-4 w-4 mr-2" /> Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
