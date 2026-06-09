import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  MessageCircle, Send, CheckCircle2, XCircle, Loader2,
  Users, Plane, Calendar, AlertCircle
} from "lucide-react";
import {
  generateETicket, generateInvoice,
  type ETicketData, type InvoiceDataExtended,
} from "@/lib/document-generator";

const supabase: any = supabaseRaw;

type DocType = "eticket" | "invoice";

const DOC_LABELS: Record<DocType, string> = {
  eticket: "E-Ticket",
  invoice: "Invoice / Kwitansi",
};

interface SendStatus {
  bookingId: string;
  customerName: string;
  phone: string;
  status: "pending" | "sending" | "done" | "failed";
  error?: string;
}

interface Props {
  packages?: any[];
  allDepartures?: any[];
  company?: any;
  bankAccount?: any;
}

export function BulkSendTab({ packages, allDepartures, company, bankAccount }: Props) {
  const [filterPkg, setFilterPkg] = useState("");
  const [filterDep, setFilterDep] = useState("");
  const [docType, setDocType] = useState<DocType>("eticket");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendStatuses, setSendStatuses] = useState<SendStatus[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  // Load bookings for selected departure
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bulk-send-bookings", filterDep],
    enabled: !!filterDep,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, total_price, total_pax, base_price, discount_amount,
          paid_amount, remaining_amount, payment_status, booking_status, room_type,
          customer:customers(id, full_name, phone, email, nik, birth_place, birth_date, address, passport_number),
          departure:departures(
            id, departure_date, return_date, departure_time, flight_number,
            airline:airlines(name, code),
            departure_airport:airports!departures_departure_airport_id_fkey(name, city, code),
            arrival_airport:airports!departures_arrival_airport_id_fkey(name, city, code),
            hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name),
            hotel_madinah:hotels!departures_hotel_madinah_id_fkey(name),
            package:packages(name, price_quad, price_triple, price_double, price_single)
          )
        `)
        .eq("departure_id", filterDep)
        .not("booking_status", "eq", "cancelled")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredDeps = useMemo(() =>
    (allDepartures || []).filter((d: any) => !filterPkg || d.package_id === filterPkg),
    [allDepartures, filterPkg]
  );

  const bookingsWithPhone = useMemo(() =>
    bookings.filter((b: any) => b.customer?.phone),
    [bookings]
  );
  const bookingsNoPhone = useMemo(() =>
    bookings.filter((b: any) => !b.customer?.phone),
    [bookings]
  );

  const uploadAndGetUrl = async (blob: Blob, filename: string): Promise<string> => {
    const path = `temp-wa/${Date.now()}_${filename}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("customer-documents")
      .upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (upErr) return "";
    const { data: signed } = await supabase.storage
      .from("customer-documents")
      .createSignedUrl(path, 3600);
    return signed?.signedUrl || "";
  };

  const generateDoc = async (booking: any): Promise<Blob | null> => {
    const customer = booking.customer;
    const dep = booking.departure;
    const pkg = dep?.package;
    const roomMap: Record<string, string> = {
      quad: "Quad (4 orang)", triple: "Triple (3 orang)",
      double: "Double (2 orang)", single: "Single (1 orang)"
    };
    const priceMap: Record<string, number> = {
      quad: pkg?.price_quad || 0, triple: pkg?.price_triple || 0,
      double: pkg?.price_double || 0, single: pkg?.price_single || 0
    };
    const roomType = booking.room_type || "quad";

    let doc: any = null;
    if (docType === "eticket") {
      const data: ETicketData = {
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
        roomType, itinerary: [],
      };
      doc = await generateETicket(data, company);
    } else if (docType === "invoice") {
      const d = new Date();
      const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
      const num = `${Math.floor(Math.random()*900+100)}/INV/UHT/${ROMAN[d.getMonth()]}/${d.getFullYear()}`;
      const data: InvoiceDataExtended = {
        invoiceNumber: num,
        invoiceDate: d,
        dueDate: d,
        customer: {
          name: customer?.full_name || "-",
          address: customer?.address || "-",
          phone: customer?.phone || "-",
          email: customer?.email || undefined,
        },
        items: [{
          description: `Paket ${pkg?.name || ""} - ${roomMap[roomType] || roomType}`,
          quantity: booking.total_pax || 1,
          unitPrice: priceMap[roomType],
          total: booking.total_price || 0,
        }],
        subtotal: booking.total_price || 0,
        total: booking.total_price || 0,
        notes: "",
        bankInfo: bankAccount ? {
          bankName: bankAccount.bank_name || bankAccount.bankName || "-",
          accountNumber: bankAccount.account_number || bankAccount.accountNumber || "-",
          accountName: bankAccount.account_name || bankAccount.accountName || "-",
        } : undefined,
        packageName: pkg?.name || "-",
        departureDate: dep?.departure_date || undefined,
        paidAmount: booking.paid_amount || 0,
        remainingAmount: booking.remaining_amount || 0,
        paymentStatus: booking.payment_status || "pending",
      };
      doc = await generateInvoice(data, company);
    }

    return doc ? (doc.output("blob") as Blob) : null;
  };

  const handleBulkSend = async () => {
    if (!filterDep || bookingsWithPhone.length === 0) {
      toast.error("Pilih keberangkatan dengan jamaah yang memiliki nomor HP");
      return;
    }
    setIsSending(true);
    setDoneCount(0);

    const statuses: SendStatus[] = bookingsWithPhone.map((b: any) => ({
      bookingId: b.id,
      customerName: b.customer?.full_name || "-",
      phone: b.customer?.phone || "",
      status: "pending" as const,
    }));
    setSendStatuses(statuses);

    const session = (await supabase.auth.getSession()).data.session;

    for (let i = 0; i < bookingsWithPhone.length; i++) {
      const booking = bookingsWithPhone[i];
      const phone = booking.customer?.phone;

      setSendStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, status: "sending" } : s));

      try {
        const blob = await generateDoc(booking);
        if (!blob) throw new Error("Gagal generate PDF");

        const filename = `${docType}-${booking.booking_code}`;
        const url = await uploadAndGetUrl(blob, filename);

        const dep = booking.departure;
        const pkg = dep?.package;
        const defaultMsg = `Halo *${booking.customer?.full_name}*, berikut *${DOC_LABELS[docType]}* untuk perjalanan *${pkg?.name || ""}* keberangkatan *${dep?.departure_date ? format(new Date(dep.departure_date), "dd MMMM yyyy", { locale: localeId }) : "-"}* dari Vinstour Travel.\n\n${url ? `📄 *Download dokumen:*\n${url}\n\n_Link aktif selama 1 jam._` : "Silakan login ke portal jamaah untuk download dokumen Anda."}`;

        const message = customMessage.trim()
          ? customMessage
              .replace("{nama}", booking.customer?.full_name || "")
              .replace("{paket}", pkg?.name || "")
              .replace("{link}", url || "")
          : defaultMsg;

        const res = await fetch("/api/documents/send-wa", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ phone, message }),
        });
        const json = await res.json();

        if (json.success) {
          setSendStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, status: "done" } : s));
        } else {
          throw new Error(json.error || "Gagal kirim");
        }
      } catch (err: any) {
        setSendStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, status: "failed", error: err.message } : s));
      }

      setDoneCount(i + 1);
      // Small delay to avoid rate limiting
      if (i < bookingsWithPhone.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    setIsSending(false);
    const doneStats = sendStatuses.filter(s => s.status === "done").length;
    toast.success(`Selesai! ${bookingsWithPhone.length} dokumen terproses.`);
  };

  const dep = filteredDeps.find((d: any) => d.id === filterDep);
  const progressPct = bookingsWithPhone.length > 0 ? Math.round((doneCount / bookingsWithPhone.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-green-600" />
          Kirim Massal via WhatsApp
        </CardTitle>
        <CardDescription>
          Generate dan kirim dokumen (E-Ticket atau Invoice) ke seluruh jamaah dalam satu keberangkatan secara otomatis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Paket</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={filterPkg}
              onChange={e => { setFilterPkg(e.target.value); setFilterDep(""); }}
            >
              <option value="">Semua Paket</option>
              {(packages || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Keberangkatan</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={filterDep}
              onChange={e => { setFilterDep(e.target.value); setSendStatuses([]); setDoneCount(0); }}
            >
              <option value="">Pilih keberangkatan...</option>
              {filteredDeps.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {format(new Date(d.departure_date), "dd MMM yyyy", { locale: localeId })} — {(d.package as any)?.name || "Paket"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Jenis Dokumen</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={docType}
              onChange={e => setDocType(e.target.value as DocType)}
            >
              {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Custom message */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Pesan Kustom WA (opsional)
          </label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none h-20"
            placeholder={"Kosongkan untuk menggunakan pesan default. Gunakan {nama}, {paket}, {link} untuk variabel."}
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
          />
        </div>

        {/* Stats */}
        {filterDep && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{bookings.length} total jamaah</span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">{bookingsWithPhone.length} ada no. WA</span>
            </div>
            {bookingsNoPhone.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">{bookingsNoPhone.length} tanpa no. HP</span>
              </div>
            )}
            {dep && (
              <div className="flex items-center gap-2 bg-sky-50 rounded-lg px-3 py-2">
                <Plane className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-medium text-sky-700">
                  {format(new Date(dep.departure_date), "dd MMM yyyy", { locale: localeId })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {sendStatuses.length > 0 && (
          <div className="space-y-3 border rounded-xl p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                {isSending ? `Mengirim... (${doneCount}/${bookingsWithPhone.length})` : `Selesai (${doneCount}/${bookingsWithPhone.length})`}
              </span>
              <span className="text-sm text-muted-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {sendStatuses.map(s => (
                <div key={s.bookingId} className="flex items-center gap-3 text-sm py-1 border-b last:border-0">
                  <div className="shrink-0">
                    {s.status === "pending" && <div className="h-4 w-4 rounded-full bg-muted border-2" />}
                    {s.status === "sending" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {s.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {s.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <span className="flex-1 font-medium">{s.customerName}</span>
                  <span className="text-xs text-muted-foreground">{s.phone}</span>
                  {s.status === "failed" && s.error && (
                    <span className="text-xs text-destructive">{s.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action */}
        {!filterDep ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Pilih keberangkatan untuk memulai</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={handleBulkSend}
              disabled={isSending || bookingsWithPhone.length === 0}
            >
              {isSending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim {doneCount}/{bookingsWithPhone.length}...</>
              ) : (
                <><MessageCircle className="h-4 w-4" /> Kirim {DOC_LABELS[docType]} ke {bookingsWithPhone.length} Jamaah</>
              )}
            </Button>
            {!isSending && sendStatuses.some(s => s.status === "done") && (
              <Button variant="outline" onClick={() => { setSendStatuses([]); setDoneCount(0); }}>
                Reset
              </Button>
            )}
          </div>
        )}

        {bookingsNoPhone.length > 0 && filterDep && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> {bookingsNoPhone.length} jamaah tidak akan menerima dokumen
            </p>
            <p className="text-xs text-amber-700">Jamaah berikut tidak memiliki nomor HP yang tercatat:</p>
            <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
              {bookingsNoPhone.map((b: any) => (
                <li key={b.id}>{b.customer?.full_name || b.booking_code}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
