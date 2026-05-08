import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Send, Users, Plane, CheckCircle2, AlertCircle,
  RefreshCcw, Eye, CalendarDays, Megaphone
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

const TEMPLATE_MESSAGES = [
  {
    id: "pengingat_keberangkatan",
    label: "Pengingat Keberangkatan",
    message: `Assalamu'alaikum Bapak/Ibu {nama},

Kami ingatkan bahwa keberangkatan Umroh/Haji Anda pada *{tanggal_berangkat}* sudah semakin dekat.

📋 *Persiapan yang perlu dilakukan:*
• Pastikan paspor masih berlaku minimal 6 bulan
• Siapkan dokumen: KTP, kartu keluarga, buku nikah
• Vaksin meningitis (jika belum)
• Lunasi sisa pembayaran (jika ada)

Informasi lebih lanjut hubungi kami. Jazakallah khair 🤲`,
  },
  {
    id: "info_kumpul",
    label: "Info Titik Kumpul",
    message: `Assalamu'alaikum Bapak/Ibu {nama},

Kami informasikan titik kumpul keberangkatan:

📍 *Titik Kumpul:* [Nama Tempat]
🕐 *Waktu Berkumpul:* [Jam WIB]
📅 *Tanggal:* {tanggal_berangkat}

Harap hadir tepat waktu. Bawa dokumen perjalanan Anda.

Barakallahu fiikum 🌙`,
  },
  {
    id: "ucapan_selamat",
    label: "Ucapan Selamat Berangkat",
    message: `Assalamu'alaikum Bapak/Ibu {nama},

*Selamat menunaikan ibadah Umroh/Haji!* 🕋

Semoga perjalanan Bapak/Ibu menjadi mabrur, diterima Allah SWT, dan kembali dengan keselamatan.

Kami selalu mendukung dan mendoakan Anda. Jika ada yang dibutuhkan, hubungi muthawif kami.

_Tim Vinstour Travel_ 🤲`,
  },
  {
    id: "custom",
    label: "Pesan Kustom",
    message: "",
  },
];

export default function AdminWABlastKeberangkatan() {
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("pengingat_keberangkatan");
  const [message, setMessage] = useState(TEMPLATE_MESSAGES[0].message);
  const [selectedPassengers, setSelectedPassengers] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [preview, setPreview] = useState(false);

  // Departures
  const { data: departures = [] } = useQuery({
    queryKey: ["wa-blast-departures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, package:packages(name)")
        .order("departure_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const departure = departures.find((d: any) => d.id === selectedDeparture) as any;

  // Passengers for this departure
  const { data: passengers = [], isLoading } = useQuery({
    queryKey: ["wa-blast-passengers", selectedDeparture],
    enabled: !!selectedDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code,
          customer:profiles(id, full_name, phone)
        `)
        .eq("departure_id", selectedDeparture)
        .not("booking_status", "eq", "cancelled");
      if (error) throw error;
      return (data || []).map((b: any) => ({
        id: b.id,
        customerId: b.customer?.id,
        fullName: b.customer?.full_name || "-",
        phone: b.customer?.phone || null,
        bookingCode: b.booking_code,
      }));
    },
  });

  const withPhone = useMemo(() => passengers.filter((p: any) => p.phone), [passengers]);
  const withoutPhone = useMemo(() => passengers.filter((p: any) => !p.phone), [passengers]);

  // Select all / none
  function selectAll() {
    setSelectedPassengers(new Set(withPhone.map((p: any) => p.id)));
  }
  function selectNone() {
    setSelectedPassengers(new Set());
  }
  function togglePassenger(id: string) {
    setSelectedPassengers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Build personalized message
  function buildMessage(name: string) {
    const depDate = departure?.departure_date
      ? format(parseISO(departure.departure_date), "dd MMMM yyyy", { locale: idLocale })
      : "[tanggal]";
    return message
      .replace(/{nama}/g, name)
      .replace(/{tanggal_berangkat}/g, depDate);
  }

  // Preview message
  const previewText = useMemo(() => {
    const first = withPhone[0] as any;
    return first ? buildMessage(first.fullName) : buildMessage("[Nama Jamaah]");
  }, [message, departure, withPhone]);

  // Send WA blast
  async function sendBlast() {
    const toSend = withPhone.filter((p: any) => selectedPassengers.has(p.id));
    if (!toSend.length) {
      toast.error("Pilih minimal satu penerima");
      return;
    }
    setSending(true);
    setSentCount(0);
    setTotalToSend(toSend.length);

    for (let i = 0; i < toSend.length; i++) {
      const p = toSend[i] as any;
      const phone = p.phone.replace(/\D/g, "").replace(/^0/, "62");
      const text = encodeURIComponent(buildMessage(p.fullName));
      const url = `https://wa.me/${phone}?text=${text}`;

      // Open first 3 as tabs, rest show as notification
      if (i < 3) {
        window.open(url, "_blank");
      }

      setSentCount(i + 1);
      await new Promise(r => setTimeout(r, 300));
    }

    setSending(false);
    const msg = toSend.length > 3
      ? `${toSend.length} pesan disiapkan (3 tab terbuka, sisanya perlu dibuka manual atau gunakan WA Business API)`
      : `${toSend.length} pesan WA berhasil dibuka`;
    toast.success(msg);
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId);
    const tpl = TEMPLATE_MESSAGES.find(t => t.id === templateId);
    if (tpl && tpl.id !== "custom") setMessage(tpl.message);
    if (tpl?.id === "custom") setMessage("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Broadcast WhatsApp</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Kirim pesan massal ke semua jamaah satu keberangkatan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Config */}
        <div className="lg:col-span-3 space-y-4">
          {/* Departure */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pilih Keberangkatan</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDeparture} onValueChange={v => { setSelectedDeparture(v); setSelectedPassengers(new Set()); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keberangkatan..." />
                </SelectTrigger>
                <SelectContent>
                  {departures.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        <Plane className="h-3.5 w-3.5" />
                        {d.package?.name} — {d.departure_date ? format(parseISO(d.departure_date), "dd MMM yyyy", { locale: idLocale }) : "TBD"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Message template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template Pesan</CardTitle>
              <CardDescription>Gunakan {"{nama}"} dan {"{tanggal_berangkat}"} untuk personalisasi otomatis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_MESSAGES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={10}
                placeholder="Ketik pesan Anda di sini..."
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">{message.length} karakter</p>
            </CardContent>
          </Card>

          {/* Preview */}
          {message && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Preview Pesan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#dcf8c6] dark:bg-emerald-900 rounded-lg p-3 text-sm whitespace-pre-wrap font-sans text-foreground max-h-48 overflow-y-auto">
                  {previewText}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Recipient list */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Penerima</CardTitle>
                {withPhone.length > 0 && (
                  <div className="flex gap-1.5 text-xs">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectAll}>Pilih Semua</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectNone}>Batal</Button>
                  </div>
                )}
              </div>
              {selectedDeparture && !isLoading && (
                <p className="text-xs text-muted-foreground">
                  {withPhone.length} punya nomor HP, {withoutPhone.length} tidak
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {!selectedDeparture ? (
                <div className="py-10 text-center text-muted-foreground text-sm p-4">
                  Pilih keberangkatan terlebih dahulu
                </div>
              ) : isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {withPhone.map((p: any) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${selectedPassengers.has(p.id) ? "bg-primary/5" : ""}`}
                      onClick={() => togglePassenger(p.id)}
                    >
                      <Checkbox checked={selectedPassengers.has(p.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.fullName}</p>
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                      </div>
                    </div>
                  ))}
                  {withoutPhone.length > 0 && (
                    <div className="px-4 py-2 bg-muted/30 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {withoutPhone.length} jamaah tidak punya nomor HP
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Send button */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dipilih</span>
                <span className="font-semibold">{selectedPassengers.size} jamaah</span>
              </div>
              {sending && (
                <div className="space-y-1.5">
                  <Progress value={totalToSend > 0 ? (sentCount / totalToSend) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">{sentCount} / {totalToSend} dikirim...</p>
                </div>
              )}
              <Button
                className="w-full"
                onClick={sendBlast}
                disabled={!selectedDeparture || !message || selectedPassengers.size === 0 || sending}
              >
                {sending ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" /> Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Kirim ke {selectedPassengers.size} Jamaah
                  </>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Pesan dibuka via WhatsApp Web. Untuk blast otomatis, gunakan WA Business API di menu WhatsApp.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
