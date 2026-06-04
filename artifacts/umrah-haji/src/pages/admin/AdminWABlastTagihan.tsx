import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageSquare, Send, Users, AlertCircle, RefreshCcw,
  Eye, Wallet, Search, ChevronDown, CheckCircle2, Info,
  ArrowDownUp, Phone
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { normalisePhone } from "@/lib/whatsapp-notifier";

function formatRp(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

const TEMPLATES = [
  {
    id: "tagihan_lembut",
    label: "Pengingat Lembut",
    message: `Assalamu'alaikum Bapak/Ibu *{nama}*,

Kami dari Vinstour Travel ingin mengingatkan bahwa masih terdapat sisa pembayaran untuk paket perjalanan Anda.

📋 *Detail Tagihan:*
• Kode Booking: *{kode_booking}*
• Paket: *{nama_paket}*
• Sisa Tagihan: *{sisa_bayar}*

Mohon segera melakukan pelunasan agar proses keberangkatan Anda berjalan lancar.

Untuk informasi lebih lanjut, silakan hubungi tim kami. Jazakallah khair 🤲`,
  },
  {
    id: "tagihan_mendesak",
    label: "Pengingat Mendesak",
    message: `Assalamu'alaikum Bapak/Ibu *{nama}*,

⚠️ Kami ingatkan kembali bahwa tagihan Anda *belum dilunasi*.

📋 *Detail:*
• Kode Booking: *{kode_booking}*
• Sisa Tagihan: *{sisa_bayar}*

Pelunasan diperlukan *segera* untuk memastikan kursi dan dokumen perjalanan Anda tetap terjamin. Keterlambatan dapat mempengaruhi keberangkatan.

Silakan hubungi kami untuk konfirmasi pembayaran. Terima kasih.`,
  },
  {
    id: "konfirmasi_pembayaran",
    label: "Minta Konfirmasi Pembayaran",
    message: `Assalamu'alaikum Bapak/Ibu *{nama}*,

Kami belum menerima konfirmasi pembayaran untuk:

• Kode Booking: *{kode_booking}*
• Paket: *{nama_paket}*
• Sisa Tagihan: *{sisa_bayar}*

Jika Bapak/Ibu sudah melakukan pembayaran, mohon kirimkan bukti transfer ke nomor ini agar kami dapat segera memverifikasi.

Terima kasih atas kepercayaan Anda kepada Vinstour Travel 🌙`,
  },
  {
    id: "custom",
    label: "Pesan Kustom",
    message: "",
  },
];

const MIN_AMOUNTS = [
  { label: "Semua sisa tagihan > 0", value: "0" },
  { label: "> Rp 500.000", value: "500000" },
  { label: "> Rp 1.000.000", value: "1000000" },
  { label: "> Rp 5.000.000", value: "5000000" },
  { label: "> Rp 10.000.000", value: "10000000" },
  { label: "> Rp 25.000.000", value: "25000000" },
];

export default function AdminWABlastTagihan() {
  const [search, setSearch]                       = useState("");
  const [minAmount, setMinAmount]                 = useState("0");
  const [selectedTemplate, setSelectedTemplate]   = useState("tagihan_lembut");
  const [message, setMessage]                     = useState(TEMPLATES[0].message);
  const [selected, setSelected]                   = useState<Set<string>>(new Set());
  const [sending, setSending]                     = useState(false);
  const [sentCount, setSentCount]                 = useState(0);
  const [totalToSend, setTotalToSend]             = useState(0);
  const [sortDir, setSortDir]                     = useState<"desc" | "asc">("desc");

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ["wa-blast-tagihan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, total_price, paid_amount, remaining_amount, payment_status, created_at,
          customer:profiles(id, full_name, phone),
          departure:departures(
            departure_date,
            package:packages(name)
          )
        `)
        .gt("remaining_amount", 0)
        .not("booking_status", "eq", "cancelled")
        .order("remaining_amount", { ascending: false });
      if (error) throw error;
      return (data || []).map((b: any) => ({
        id: b.id,
        bookingCode: b.booking_code,
        totalPrice: Number(b.total_price || 0),
        paidAmount: Number(b.paid_amount || 0),
        remainingAmount: Number(b.remaining_amount || 0),
        paymentStatus: b.payment_status,
        fullName: b.customer?.full_name || "-",
        phone: b.customer?.phone || null,
        customerId: b.customer?.id,
        packageName: b.departure?.package?.name || "-",
        departureDate: b.departure?.departure_date || null,
      }));
    },
  });

  const withPhone    = useMemo(() => bookings.filter((b: any) => b.phone), [bookings]);
  const withoutPhone = useMemo(() => bookings.filter((b: any) => !b.phone), [bookings]);

  const filtered = useMemo(() => {
    const min = Number(minAmount);
    return withPhone.filter((b: any) => {
      if (b.remainingAmount <= min) return false;
      if (search && !b.fullName.toLowerCase().includes(search.toLowerCase()) &&
          !b.bookingCode.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a: any, b: any) =>
      sortDir === "desc"
        ? b.remainingAmount - a.remainingAmount
        : a.remainingAmount - b.remainingAmount
    );
  }, [withPhone, minAmount, search, sortDir]);

  const totalOutstanding = useMemo(
    () => filtered.reduce((sum: number, b: any) => sum + b.remainingAmount, 0),
    [filtered]
  );

  function selectAll()  { setSelected(new Set(filtered.map((b: any) => b.id))); }
  function selectNone() { setSelected(new Set()); }
  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function buildMessage(b: any) {
    const depDate = b.departureDate
      ? format(parseISO(b.departureDate), "dd MMMM yyyy", { locale: idLocale })
      : "-";
    return message
      .replace(/{nama}/g, b.fullName)
      .replace(/{kode_booking}/g, b.bookingCode)
      .replace(/{nama_paket}/g, b.packageName)
      .replace(/{sisa_bayar}/g, formatRp(b.remainingAmount))
      .replace(/{total_harga}/g, formatRp(b.totalPrice))
      .replace(/{terbayar}/g, formatRp(b.paidAmount))
      .replace(/{tanggal_berangkat}/g, depDate);
  }

  const previewText = useMemo(() => {
    const first = filtered[0] as any;
    return first
      ? buildMessage(first)
      : buildMessage({
          fullName: "[Nama Jamaah]",
          bookingCode: "BK-00001",
          packageName: "Paket Umroh Reguler",
          remainingAmount: 5000000,
          totalPrice: 25000000,
          paidAmount: 20000000,
          departureDate: null,
        });
  }, [message, filtered]);

  function handleTemplateChange(id: string) {
    setSelectedTemplate(id);
    const tpl = TEMPLATES.find(t => t.id === id);
    if (tpl && tpl.id !== "custom") setMessage(tpl.message);
    if (tpl?.id === "custom") setMessage("");
  }

  async function sendBlast() {
    const toSend = filtered.filter((b: any) => selected.has(b.id));
    if (!toSend.length) { toast.error("Pilih minimal satu penerima"); return; }
    if (!message.trim()) { toast.error("Pesan tidak boleh kosong"); return; }

    setSending(true);
    setSentCount(0);
    setTotalToSend(toSend.length);

    for (let i = 0; i < toSend.length; i++) {
      const b = toSend[i] as any;
      const phone = normalisePhone(b.phone);
      const text  = encodeURIComponent(buildMessage(b));
      const url   = `https://wa.me/${phone}?text=${text}`;
      if (i < 3) window.open(url, "_blank");
      setSentCount(i + 1);
      await new Promise(r => setTimeout(r, 350));
    }

    setSending(false);
    const extra = toSend.length > 3
      ? ` — ${toSend.length - 3} sisanya perlu dibuka manual atau gunakan WA Business API`
      : "";
    toast.success(`${Math.min(3, toSend.length)} tab WA dibuka${extra}`);
  }

  const selectedTotal = useMemo(
    () => filtered.filter((b: any) => selected.has(b.id)).reduce((s: number, b: any) => s + b.remainingAmount, 0),
    [filtered, selected]
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-500/10 rounded-xl">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WA Blast Tagihan Outstanding</h1>
            <p className="text-muted-foreground text-sm">Kirim follow-up ke semua jamaah yang masih punya sisa pembayaran</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Tagihan Aktif", value: bookings.length, icon: Wallet, color: "text-red-600", bg: "bg-red-50" },
          { label: "Ada Nomor HP", value: withPhone.length, icon: Phone, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Tampil (filter)", value: filtered.length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Dipilih", value: selected.size, icon: CheckCircle2, color: "text-violet-600", bg: "bg-violet-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg} flex-shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          Fitur ini membuka tab WhatsApp Web untuk 3 penerima pertama. Untuk blast massal otomatis tanpa batas, aktifkan Fonnte API di menu <strong>WhatsApp &rarr; Konfigurasi</strong>.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — template + preview */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template Pesan</CardTitle>
              <CardDescription>
                Variabel: <code className="bg-muted px-1 rounded text-xs">{"{nama}"}</code>{" "}
                <code className="bg-muted px-1 rounded text-xs">{"{kode_booking}"}</code>{" "}
                <code className="bg-muted px-1 rounded text-xs">{"{nama_paket}"}</code>{" "}
                <code className="bg-muted px-1 rounded text-xs">{"{sisa_bayar}"}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={12}
                placeholder="Ketik pesan Anda di sini..."
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">{message.length} karakter</p>
            </CardContent>
          </Card>

          {message && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-800">
                  <Eye className="h-4 w-4" /> Preview (penerima pertama)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#dcf8c6] dark:bg-emerald-900 rounded-xl p-3 text-sm whitespace-pre-wrap max-h-56 overflow-y-auto text-gray-900 shadow-inner">
                  {previewText}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — recipient list + send */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filter Penerima</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Cari nama / kode booking..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={minAmount} onValueChange={setMinAmount}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MIN_AMOUNTS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs w-full justify-between px-2"
                onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
              >
                <span className="text-muted-foreground">Urut sisa tagihan</span>
                <span className="flex items-center gap-1 font-medium">
                  <ArrowDownUp className="h-3 w-3" />
                  {sortDir === "desc" ? "Terbesar dulu" : "Terkecil dulu"}
                </span>
              </Button>
            </CardContent>
          </Card>

          {/* Recipient list */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{filtered.length} Penerima</CardTitle>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={selectAll}>Pilih Semua</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectNone}>Batal</Button>
                </div>
              </div>
              {filtered.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Total outstanding tampil: <span className="font-medium text-red-600">{formatRp(totalOutstanding)}</span>
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : !filtered.length ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Tidak ada tagihan yang cocok
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto divide-y">
                  {filtered.map((b: any) => (
                    <div
                      key={b.id}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${selected.has(b.id) ? "bg-primary/5" : ""}`}
                      onClick={() => toggle(b.id)}
                    >
                      <Checkbox className="mt-0.5 flex-shrink-0" checked={selected.has(b.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium truncate">{b.fullName}</p>
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                            {formatRp(b.remainingAmount)}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{b.bookingCode} · {b.packageName}</p>
                        <p className="text-[11px] text-muted-foreground">{b.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {withoutPhone.length > 0 && (
                <div className="px-4 py-2 bg-muted/30 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {withoutPhone.length} jamaah tidak memiliki nomor HP — tidak bisa dikirimi WA
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Send panel */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dipilih</span>
                  <span className="font-semibold">{selected.size} jamaah</span>
                </div>
                {selected.size > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total tagihan dipilih</span>
                    <span className="font-bold text-red-600">{formatRp(selectedTotal)}</span>
                  </div>
                )}
              </div>
              {sending && (
                <div className="space-y-1.5">
                  <Progress value={totalToSend > 0 ? (sentCount / totalToSend) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">{sentCount} / {totalToSend} diproses...</p>
                </div>
              )}
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={sendBlast}
                disabled={!message || selected.size === 0 || sending}
              >
                {sending ? (
                  <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Kirim ke {selected.size} Jamaah</>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                Membuka WhatsApp Web per penerima. 3 tab dibuka otomatis, sisanya perlu diklik manual.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
