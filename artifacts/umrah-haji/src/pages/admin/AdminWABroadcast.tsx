import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Megaphone, Send, Users, AlertCircle, RefreshCcw, Eye,
  CalendarClock, Filter, CheckCircle2, XCircle, Clock,
  ChevronRight, Package, Plane, Wallet, Phone, RotateCw,
  History, Plus, Info, ListFilter
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRp(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
function fmtDate(d: string | null, short = false) {
  if (!d) return "-";
  return format(parseISO(d), short ? "dd MMM yy" : "dd MMMM yyyy", { locale: idLocale });
}
function statusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    draft:     { label: "Draft",     class: "bg-gray-100 text-gray-700" },
    scheduled: { label: "Dijadwal",  class: "bg-blue-100 text-blue-700" },
    sending:   { label: "Mengirim",  class: "bg-amber-100 text-amber-700" },
    done:      { label: "Selesai",   class: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Dibatal",   class: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, class: "bg-gray-100 text-gray-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${s.class}`}>{s.label}</span>;
}

const PAYMENT_STATUS_OPTIONS = [
  { value: "pending",  label: "Belum Bayar" },
  { value: "partial",  label: "Bayar Sebagian" },
  { value: "paid",     label: "Lunas" },
];

const BOOKING_STATUS_OPTIONS = [
  { value: "pending",   label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing",label: "Processing" },
  { value: "completed", label: "Completed" },
];

const TEMPLATES = [
  {
    id: "pengingat_keberangkatan",
    label: "Pengingat Keberangkatan",
    vars: ["{nama}", "{tanggal_berangkat}", "{nama_paket}"],
    message: `Assalamu'alaikum Bapak/Ibu *{nama}*,

Kami mengingatkan bahwa keberangkatan *{nama_paket}* Anda pada *{tanggal_berangkat}* sudah semakin dekat.

📋 *Persiapan yang perlu dilakukan:*
• Pastikan paspor masih berlaku min. 6 bulan
• Siapkan dokumen: KTP, KK, buku nikah
• Vaksin meningitis (jika belum)
• Lunasi sisa pembayaran (jika ada)

Informasi lebih lanjut hubungi kami. Jazakallah khair 🤲`,
  },
  {
    id: "tagihan_outstanding",
    label: "Tagihan Outstanding",
    vars: ["{nama}", "{kode_booking}", "{nama_paket}", "{sisa_bayar}"],
    message: `Assalamu'alaikum Bapak/Ibu *{nama}*,

Kami dari Vinstour Travel ingin mengingatkan bahwa masih terdapat sisa pembayaran untuk paket perjalanan Anda.

📋 *Detail Tagihan:*
• Kode Booking: *{kode_booking}*
• Paket: *{nama_paket}*
• Sisa Tagihan: *{sisa_bayar}*

Mohon segera melakukan pelunasan agar proses keberangkatan berjalan lancar.

Jazakallah khair 🤲`,
  },
  {
    id: "info_promo",
    label: "Info Promo / Pengumuman",
    vars: ["{nama}"],
    message: `Assalamu'alaikum Bapak/Ibu *{nama}*,

Kami dari *Vinstour Travel* ingin menyampaikan informasi penting untuk Anda.

[Tulis isi pengumuman / promo di sini]

Untuk informasi lebih lanjut silakan hubungi kami.

Barakallahu fiikum 🌙`,
  },
  {
    id: "konfirmasi_lunas",
    label: "Konfirmasi Pembayaran Lunas",
    vars: ["{nama}", "{kode_booking}", "{nama_paket}", "{tanggal_berangkat}"],
    message: `Assalamu'alaikum Bapak/Ibu *{nama}*,

*Alhamdulillah*, pembayaran Anda telah kami terima dan dinyatakan *LUNAS* ✅

📋 *Detail:*
• Kode Booking: *{kode_booking}*
• Paket: *{nama_paket}*
• Keberangkatan: *{tanggal_berangkat}*

Selamat! Persiapkan diri Anda untuk perjalanan ibadah yang penuh berkah 🕋

_Tim Vinstour Travel_`,
  },
  {
    id: "custom",
    label: "Pesan Kustom",
    vars: [],
    message: "",
  },
];

// ─── MultiSelect chip component ───────────────────────────────────────────────
function MultiSelectChips({
  label, icon: Icon, options, selected, onToggle, emptyLabel,
}: {
  label: string;
  icon: any;
  options: { value: string; label: string; sub?: string }[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  emptyLabel: string;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
        {selected.size > 0 && (
          <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1.5">{selected.size}</Badge>
        )}
      </Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyLabel}</p>
      ) : (
        <ScrollArea className="max-h-40">
          <div className="space-y-1 pr-2">
            {options.map(opt => (
              <div
                key={opt.value}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm
                  ${selected.has(opt.value) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50 border border-transparent"}`}
                onClick={() => onToggle(opt.value)}
              >
                <Checkbox checked={selected.has(opt.value)} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm leading-tight truncate">{opt.label}</p>
                  {opt.sub && <p className="text-[11px] text-muted-foreground">{opt.sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Recipient preview bubble ──────────────────────────────────────────────────
function WaPreviewBubble({ text }: { text: string }) {
  return (
    <div className="bg-[#dcf8c6] dark:bg-emerald-900 rounded-xl rounded-br-sm p-3.5 text-sm whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100 shadow-sm max-h-64 overflow-y-auto leading-relaxed">
      {text || <span className="italic text-muted-foreground">Ketik pesan di atas untuk melihat preview</span>}
    </div>
  );
}

// ─── Recipient row ─────────────────────────────────────────────────────────────
function RecipientRow({
  r, checked, onToggle,
}: {
  r: any; checked: boolean; onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors border-b last:border-0
        ${checked ? "bg-primary/5" : ""}`}
      onClick={onToggle}
    >
      <Checkbox checked={checked} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{r.fullName}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {r.phone} · {r.packageName} · {fmtDate(r.departureDate, true)}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <Badge
          variant={r.paymentStatus === "paid" ? "outline" : "destructive"}
          className="text-[10px] px-1.5 py-0"
        >
          {r.paymentStatus === "paid" ? "Lunas" : r.paymentStatus === "partial" ? "Sebagian" : "Belum"}
        </Badge>
        {r.remainingAmount > 0 && (
          <p className="text-[10px] text-red-600 mt-0.5">{formatRp(r.remainingAmount)}</p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminWABroadcast() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"baru" | "histori">("baru");

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // Step 1 — Segmentasi
  const [selectedPackages,    setSelectedPackages]    = useState<Set<string>>(new Set());
  const [selectedDepartures,  setSelectedDepartures]  = useState<Set<string>>(new Set());
  const [selectedPayStatus,   setSelectedPayStatus]   = useState<Set<string>>(new Set());
  const [selectedBookStatus,  setSelectedBookStatus]  = useState<Set<string>>(new Set(["pending","confirmed","processing","completed"]));

  // Step 2 — Pesan
  const [campaignName,        setCampaignName]        = useState("");
  const [templateId,          setTemplateId]          = useState("pengingat_keberangkatan");
  const [message,             setMessage]             = useState(TEMPLATES[0].message);

  // Step 3 — Jadwal & Kirim
  const [selectedRecipients,  setSelectedRecipients]  = useState<Set<string>>(new Set());
  const [scheduleMode,        setScheduleMode]        = useState<"now" | "later">("now");
  const [scheduledAt,         setScheduledAt]         = useState("");
  const [sending,             setSending]             = useState(false);
  const [sentCount,           setSentCount]           = useState(0);
  const [totalToSend,         setTotalToSend]         = useState(0);

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: packages = [] } = useQuery({
    queryKey: ["broadcast-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("packages").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: departures = [] } = useQuery({
    queryKey: ["broadcast-departures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(id, name)")
        .order("departure_date", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Filter departures by selected packages (for display, not DB filtering)
  const visibleDepartures = useMemo(() => {
    if (selectedPackages.size === 0) return departures;
    return departures.filter((d: any) => selectedPackages.has(d.package?.id));
  }, [departures, selectedPackages]);

  // ── Recipients query (responds to filter changes) ──────────────────────────
  const filterKey = JSON.stringify({
    packages: [...selectedPackages].sort(),
    departures: [...selectedDepartures].sort(),
    payStatus: [...selectedPayStatus].sort(),
    bookStatus: [...selectedBookStatus].sort(),
  });

  const { data: recipients = [], isLoading: recipientsLoading, refetch } = useQuery({
    queryKey: ["broadcast-recipients", filterKey],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select(`
          id, booking_code, total_price, paid_amount, remaining_amount,
          payment_status, booking_status, departure_id,
          customer:profiles(id, full_name, phone),
          departure:departures(
            id, departure_date,
            package:packages(id, name)
          )
        `)
        .limit(500);

      // booking_status filter
      if (selectedBookStatus.size > 0 && selectedBookStatus.size < 4) {
        q = q.in("booking_status", [...selectedBookStatus]);
      } else {
        q = q.not("booking_status", "eq", "cancelled");
      }

      // payment_status filter
      if (selectedPayStatus.size > 0) {
        q = q.in("payment_status", [...selectedPayStatus]);
      }

      // departure filter
      const depIds: string[] = [];
      if (selectedDepartures.size > 0) {
        depIds.push(...selectedDepartures);
      } else if (selectedPackages.size > 0) {
        // derive departure IDs from package filter
        departures
          .filter((d: any) => selectedPackages.has(d.package?.id))
          .forEach((d: any) => depIds.push(d.id));
      }
      if (depIds.length > 0) {
        q = q.in("departure_id", depIds);
      }

      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;

      return (data || []).map((b: any) => ({
        id: b.id,
        bookingCode: b.booking_code,
        totalPrice: Number(b.total_price || 0),
        paidAmount: Number(b.paid_amount || 0),
        remainingAmount: Number(b.remaining_amount || 0),
        paymentStatus: b.payment_status,
        bookingStatus: b.booking_status,
        fullName: b.customer?.full_name || "-",
        phone: b.customer?.phone || null,
        customerId: b.customer?.id,
        packageName: b.departure?.package?.name || "-",
        packageId: b.departure?.package?.id || null,
        departureId: b.departure?.id || b.departure_id,
        departureDate: b.departure?.departure_date || null,
      }));
    },
  });

  const withPhone    = useMemo(() => recipients.filter((r: any) => r.phone), [recipients]);
  const withoutPhone = useMemo(() => recipients.filter((r: any) => !r.phone), [recipients]);

  // Auto-select all when recipients load
  const prevFilterKey = useState(filterKey)[0];
  useMemo(() => {
    setSelectedRecipients(new Set(withPhone.map((r: any) => r.id)));
  }, [filterKey]);

  function toggleRecipient(id: string) {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Message building ────────────────────────────────────────────────────────
  function buildMessage(r: any) {
    const depDate = fmtDate(r.departureDate);
    return message
      .replace(/{nama}/g, r.fullName)
      .replace(/{kode_booking}/g, r.bookingCode)
      .replace(/{nama_paket}/g, r.packageName)
      .replace(/{sisa_bayar}/g, formatRp(r.remainingAmount))
      .replace(/{total_harga}/g, formatRp(r.totalPrice))
      .replace(/{terbayar}/g, formatRp(r.paidAmount))
      .replace(/{tanggal_berangkat}/g, depDate);
  }

  const previewText = useMemo(() => {
    const first = withPhone[0];
    return first
      ? buildMessage(first)
      : buildMessage({
          fullName: "[Nama Jamaah]", bookingCode: "BK-00001",
          packageName: "Paket Umroh Reguler", remainingAmount: 5000000,
          totalPrice: 25000000, paidAmount: 20000000, departureDate: null,
        });
  }, [message, withPhone]);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tpl = TEMPLATES.find(t => t.id === id);
    if (tpl && tpl.id !== "custom") setMessage(tpl.message);
    if (tpl?.id === "custom") setMessage("");
  }

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  function toggleSet(set: Set<string>, val: string, setter: (s: Set<string>) => void) {
    setter(prev => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  }

  // ── Campaign save mutation ──────────────────────────────────────────────────
  const saveCampaign = useMutation({
    mutationFn: async (status: "draft" | "scheduled") => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        name: campaignName || `Broadcast ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}`,
        segment_filters: {
          package_ids: [...selectedPackages],
          departure_ids: [...selectedDepartures],
          payment_statuses: [...selectedPayStatus],
          booking_statuses: [...selectedBookStatus],
        },
        message_template: message,
        status,
        total_recipients: selectedRecipients.size,
        created_by: user?.id,
      };
      if (status === "scheduled" && scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      }
      const { data, error } = await supabase
        .from("wa_broadcast_campaigns")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
  });

  // ── Send blast ──────────────────────────────────────────────────────────────
  async function handleSend() {
    const toSend = withPhone.filter((r: any) => selectedRecipients.has(r.id));
    if (!toSend.length) { toast.error("Pilih minimal satu penerima"); return; }
    if (!message.trim()) { toast.error("Pesan tidak boleh kosong"); return; }

    setSending(true);
    setSentCount(0);
    setTotalToSend(toSend.length);

    // Save campaign first
    let campaignId: string | null = null;
    try {
      campaignId = await saveCampaign.mutateAsync("sending" as any);
    } catch (e) {
      // Campaign save failed but continue with send
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toSend.length; i++) {
      const r = toSend[i] as any;
      try {
        const resp = await fetch("/api/v1/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: r.phone,
            message: buildMessage(r),
          }),
        });
        const result = await resp.json().catch(() => ({ success: false }));
        if (result.success || resp.ok) successCount++;
        else failCount++;

        // Log per recipient
        if (campaignId) {
          supabase.from("wa_broadcast_logs").insert({
            campaign_id: campaignId,
            booking_id: r.id,
            phone: r.phone,
            message: buildMessage(r),
            status: (result.success || resp.ok) ? "sent" : "failed",
            sent_at: new Date().toISOString(),
            error_msg: result.message || null,
          }).then(() => {});
        }
      } catch {
        failCount++;
      }
      setSentCount(i + 1);
      if (i < toSend.length - 1) await new Promise(res => setTimeout(res, 1200));
    }

    // Update campaign status
    if (campaignId) {
      await supabase.from("wa_broadcast_campaigns").update({
        status: "done",
        sent_at: new Date().toISOString(),
        success_count: successCount,
        fail_count: failCount,
      }).eq("id", campaignId);
    }

    setSending(false);
    qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });

    if (failCount === 0) {
      toast.success(`✅ ${successCount} pesan WA berhasil dikirim`);
    } else if (successCount > 0) {
      toast.success(`${successCount} berhasil, ${failCount} gagal`);
    } else {
      toast.error("Semua pesan gagal. Pastikan Provider WA sudah dikonfigurasi.");
    }
  }

  async function handleSchedule() {
    if (!scheduledAt) { toast.error("Pilih waktu penjadwalan"); return; }
    try {
      await saveCampaign.mutateAsync("scheduled");
      qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
      toast.success("Kampanye dijadwalkan");
      setTab("histori");
    } catch (e: any) {
      toast.error("Gagal menyimpan jadwal: " + e.message);
    }
  }

  // ── Campaign history ────────────────────────────────────────────────────────
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["broadcast-campaigns"],
    enabled: tab === "histori",
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_broadcast_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // ── Execute-from-history state ────────────────────────────────────────────
  const [executingId,  setExecutingId]  = useState<string | null>(null);
  const [execSent,     setExecSent]     = useState(0);
  const [execTotal,    setExecTotal]    = useState(0);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [confirmId,    setConfirmId]    = useState<string | null>(null);

  // ── Fetch recipients from saved segment_filters ──────────────────────────
  async function fetchRecipientsForFilters(filters: any) {
    const {
      package_ids    = [] as string[],
      departure_ids  = [] as string[],
      payment_statuses  = [] as string[],
      booking_statuses  = [] as string[],
    } = filters || {};

    let q = supabase
      .from("bookings")
      .select(`
        id, booking_code, total_price, paid_amount, remaining_amount,
        payment_status, booking_status,
        customer:profiles(id, full_name, phone),
        departure:departures(id, departure_date, package:packages(id, name))
      `)
      .limit(500);

    if (booking_statuses.length > 0) {
      q = q.in("booking_status", booking_statuses);
    } else {
      q = q.not("booking_status", "eq", "cancelled");
    }
    if (payment_statuses.length > 0) {
      q = q.in("payment_status", payment_statuses);
    }

    const depIds: string[] = [...departure_ids];
    if (depIds.length === 0 && package_ids.length > 0) {
      const { data: deps } = await supabase
        .from("departures").select("id").in("package_id", package_ids);
      (deps || []).forEach((d: any) => depIds.push(d.id));
    }
    if (depIds.length > 0) q = q.in("departure_id", depIds);

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;

    return (data || [])
      .filter((b: any) => b.customer?.phone)
      .map((b: any) => ({
        id:              b.id,
        bookingCode:     b.booking_code,
        totalPrice:      Number(b.total_price   || 0),
        paidAmount:      Number(b.paid_amount    || 0),
        remainingAmount: Number(b.remaining_amount || 0),
        paymentStatus:   b.payment_status,
        fullName:        b.customer?.full_name || "-",
        phone:           b.customer?.phone,
        packageName:     b.departure?.package?.name || "-",
        departureDate:   b.departure?.departure_date || null,
      }));
  }

  // ── Build message from saved template ────────────────────────────────────
  function buildFromTemplate(template: string, r: any) {
    return template
      .replace(/{nama}/g,              r.fullName)
      .replace(/{kode_booking}/g,      r.bookingCode)
      .replace(/{nama_paket}/g,        r.packageName)
      .replace(/{sisa_bayar}/g,        formatRp(r.remainingAmount))
      .replace(/{total_harga}/g,       formatRp(r.totalPrice))
      .replace(/{terbayar}/g,          formatRp(r.paidAmount))
      .replace(/{tanggal_berangkat}/g, fmtDate(r.departureDate));
  }

  // ── Execute a scheduled campaign from history ────────────────────────────
  async function executeScheduledCampaign(campaign: any) {
    setConfirmId(null);
    if (executingId) { toast.error("Sedang mengirim kampanye lain. Tunggu selesai."); return; }

    setExecutingId(campaign.id);
    setExecSent(0);
    setExecTotal(0);

    try {
      await supabase.from("wa_broadcast_campaigns")
        .update({ status: "sending" }).eq("id", campaign.id);
      qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });

      const recipients = await fetchRecipientsForFilters(campaign.segment_filters);
      if (recipients.length === 0) {
        toast.error("Tidak ada penerima yang cocok dengan filter kampanye ini");
        await supabase.from("wa_broadcast_campaigns")
          .update({ status: "scheduled" }).eq("id", campaign.id);
        qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
        return;
      }

      setExecTotal(recipients.length);
      let successCount = 0;
      let failCount    = 0;

      for (let i = 0; i < recipients.length; i++) {
        const r   = recipients[i] as any;
        const msg = buildFromTemplate(campaign.message_template, r);
        try {
          const resp   = await fetch("/api/v1/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: r.phone, message: msg }),
          });
          const result = await resp.json().catch(() => ({ success: false }));
          const ok     = result.success || resp.ok;
          if (ok) successCount++; else failCount++;
          supabase.from("wa_broadcast_logs").insert({
            campaign_id: campaign.id,
            booking_id:  r.id,
            phone:       r.phone,
            message:     msg,
            status:      ok ? "sent" : "failed",
            sent_at:     new Date().toISOString(),
            error_msg:   result.message || null,
          }).then(() => {});
        } catch {
          failCount++;
        }
        setExecSent(i + 1);
        if (i < recipients.length - 1) await new Promise(res => setTimeout(res, 1200));
      }

      await supabase.from("wa_broadcast_campaigns").update({
        status:           "done",
        sent_at:          new Date().toISOString(),
        total_recipients: recipients.length,
        success_count:    successCount,
        fail_count:       failCount,
      }).eq("id", campaign.id);

      qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });

      if (failCount === 0)        toast.success(`✅ ${successCount} pesan berhasil dikirim`);
      else if (successCount > 0)  toast.success(`${successCount} berhasil, ${failCount} gagal`);
      else                        toast.error("Semua pesan gagal. Periksa konfigurasi Provider WA.");
    } catch (e: any) {
      toast.error("Error: " + e.message);
      await supabase.from("wa_broadcast_campaigns")
        .update({ status: "scheduled" }).eq("id", campaign.id);
      qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
    } finally {
      setExecutingId(null);
      setExecSent(0);
      setExecTotal(0);
    }
  }

  // ── Cancel a scheduled campaign ──────────────────────────────────────────
  async function cancelCampaign(campaignId: string) {
    await supabase.from("wa_broadcast_campaigns")
      .update({ status: "cancelled" }).eq("id", campaignId);
    qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
    toast.success("Kampanye dibatalkan");
  }

  // ── Step nav ────────────────────────────────────────────────────────────────
  const filtersActive = selectedPackages.size > 0 || selectedDepartures.size > 0 || selectedPayStatus.size > 0;
  const stepDone = [
    true,                               // step 1 always accessible
    true,                               // step 2 after filter
    message.trim().length > 0,          // step 3 after message
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl">
            <Megaphone className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Broadcast Tersegmentasi</h1>
            <p className="text-muted-foreground text-sm">
              Kirim WA massal ke segmen jamaah tertentu — by paket, keberangkatan, atau status bayar
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="baru" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Buat Kampanye</TabsTrigger>
          <TabsTrigger value="histori" className="gap-1.5"><History className="h-3.5 w-3.5" /> Histori</TabsTrigger>
        </TabsList>

        {/* ── TAB: Buat kampanye ──────────────────────────────────────────── */}
        <TabsContent value="baru" className="mt-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[
              { n: 1, label: "Segmentasi" },
              { n: 2, label: "Pesan" },
              { n: 3, label: "Jadwal & Kirim" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <button
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${step === s.n ? "bg-primary text-primary-foreground" : step > s.n ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                  onClick={() => setStep(s.n)}
                >
                  {step > s.n ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="w-4 text-center text-xs">{s.n}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Segmentasi ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left: Filter cards */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      Filter Segmen
                    </CardTitle>
                    <CardDescription>
                      Kosongkan semua filter = kirim ke seluruh jamaah aktif.
                      Kombinasikan filter untuk segmentasi spesifik.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <MultiSelectChips
                      label="Paket"
                      icon={Package}
                      options={packages.map((p: any) => ({ value: p.id, label: p.name }))}
                      selected={selectedPackages}
                      onToggle={v => { toggleSet(selectedPackages, v, setSelectedPackages); setSelectedDepartures(new Set()); }}
                      emptyLabel="Tidak ada paket"
                    />
                    <Separator />
                    <MultiSelectChips
                      label="Keberangkatan"
                      icon={Plane}
                      options={visibleDepartures.map((d: any) => ({
                        value: d.id,
                        label: d.package?.name || "Paket",
                        sub: fmtDate(d.departure_date),
                      }))}
                      selected={selectedDepartures}
                      onToggle={v => toggleSet(selectedDepartures, v, setSelectedDepartures)}
                      emptyLabel={selectedPackages.size > 0 ? "Tidak ada keberangkatan untuk paket ini" : "Tidak ada keberangkatan"}
                    />
                    <Separator />
                    <MultiSelectChips
                      label="Status Pembayaran"
                      icon={Wallet}
                      options={PAYMENT_STATUS_OPTIONS}
                      selected={selectedPayStatus}
                      onToggle={v => toggleSet(selectedPayStatus, v, setSelectedPayStatus)}
                      emptyLabel=""
                    />
                    <Separator />
                    <MultiSelectChips
                      label="Status Booking"
                      icon={CheckCircle2}
                      options={BOOKING_STATUS_OPTIONS}
                      selected={selectedBookStatus}
                      onToggle={v => toggleSet(selectedBookStatus, v, setSelectedBookStatus)}
                      emptyLabel=""
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right: Preview count */}
              <div className="space-y-4">
                <Card className="sticky top-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" /> Preview Penerima
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recipientsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="text-center py-3">
                          <p className="text-4xl font-bold text-emerald-600">{withPhone.length}</p>
                          <p className="text-sm text-muted-foreground mt-1">dapat dikirimi WA</p>
                        </div>
                        {withoutPhone.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{withoutPhone.length} jamaah tidak punya nomor HP</span>
                          </div>
                        )}
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {filtersActive ? (
                            <div className="flex flex-wrap gap-1">
                              {selectedPackages.size > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {selectedPackages.size} paket
                                </Badge>
                              )}
                              {selectedDepartures.size > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {selectedDepartures.size} keberangkatan
                                </Badge>
                              )}
                              {selectedPayStatus.size > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {[...selectedPayStatus].join(", ")}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <p className="italic">Semua jamaah aktif (tanpa filter)</p>
                          )}
                        </div>
                        <Button className="w-full" onClick={() => setStep(2)} disabled={withPhone.length === 0}>
                          Lanjut Buat Pesan <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => refetch()}>
                          <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── STEP 2: Pesan ──────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Editor */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Nama Kampanye</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      placeholder="Contoh: Reminder Keberangkatan Maret 2025"
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Template Pesan</CardTitle>
                    <CardDescription className="text-xs">
                      Variabel: <code className="bg-muted px-1 rounded">{"{nama}"}</code>{" "}
                      <code className="bg-muted px-1 rounded">{"{kode_booking}"}</code>{" "}
                      <code className="bg-muted px-1 rounded">{"{nama_paket}"}</code>{" "}
                      <code className="bg-muted px-1 rounded">{"{sisa_bayar}"}</code>{" "}
                      <code className="bg-muted px-1 rounded">{"{tanggal_berangkat}"}</code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors
                            ${templateId === t.id ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/40 hover:bg-muted/50"}`}
                          onClick={() => handleTemplateChange(t.id)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
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
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <Card className="border-emerald-200 bg-emerald-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-800">
                      <Eye className="h-4 w-4" /> Preview Pesan
                      {withPhone.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground ml-auto">
                          untuk: {(withPhone[0] as any).fullName}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WaPreviewBubble text={previewText} />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Siap dikirim ke</span>
                      <span className="font-bold text-emerald-700">{withPhone.length} jamaah</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                        ← Kembali
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={!message.trim()}
                        onClick={() => setStep(3)}
                      >
                        Lanjut <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── STEP 3: Jadwal & Kirim ───────────────────────────────────── */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Left: Recipient list */}
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ListFilter className="h-4 w-4" />
                        Daftar Penerima ({withPhone.length})
                      </CardTitle>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setSelectedRecipients(new Set(withPhone.map((r: any) => r.id)))}>
                          Semua
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => setSelectedRecipients(new Set())}>
                          Batal
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedRecipients.size} dipilih</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recipientsLoading ? (
                      <div className="p-4 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : withPhone.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-sm">
                        <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Tidak ada jamaah dengan nomor HP
                      </div>
                    ) : (
                      <ScrollArea className="max-h-[500px]">
                        {withPhone.map((r: any) => (
                          <RecipientRow
                            key={r.id}
                            r={r}
                            checked={selectedRecipients.has(r.id)}
                            onToggle={() => toggleRecipient(r.id)}
                          />
                        ))}
                      </ScrollArea>
                    )}
                    {withoutPhone.length > 0 && (
                      <div className="px-4 py-2 bg-muted/30 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          {withoutPhone.length} jamaah tidak punya nomor HP — dilewati
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Schedule + Send panel */}
              <div className="lg:col-span-2 space-y-4">
                {/* Preview bubble */}
                <Card className="border-emerald-200 bg-emerald-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-emerald-800 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Preview Pesan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WaPreviewBubble text={previewText} />
                  </CardContent>
                </Card>

                {/* Schedule mode */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" /> Waktu Pengiriman
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className={`px-3 py-2.5 rounded-lg border text-sm transition-colors font-medium
                          ${scheduleMode === "now" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        onClick={() => setScheduleMode("now")}
                      >
                        <Send className="h-4 w-4 mb-0.5 mx-auto" />
                        Kirim Sekarang
                      </button>
                      <button
                        className={`px-3 py-2.5 rounded-lg border text-sm transition-colors font-medium
                          ${scheduleMode === "later" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        onClick={() => setScheduleMode("later")}
                      >
                        <CalendarClock className="h-4 w-4 mb-0.5 mx-auto" />
                        Jadwalkan
                      </button>
                    </div>

                    {scheduleMode === "later" && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Waktu Pengiriman</Label>
                        <Input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={e => setScheduledAt(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="mt-1"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Kampanye akan disimpan dan bisa dikirim manual dari Histori pada waktu yang ditentukan.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary + send button */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kampanye</span>
                        <span className="font-medium truncate max-w-[180px] text-right">
                          {campaignName || "Tanpa nama"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dipilih</span>
                        <span className="font-bold text-emerald-700">{selectedRecipients.size} jamaah</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimasi waktu</span>
                        <span className="text-xs">
                          ~{Math.ceil(selectedRecipients.size * 1.2 / 60)} menit
                        </span>
                      </div>
                    </div>

                    {sending && (
                      <div className="space-y-1.5">
                        <Progress
                          value={totalToSend > 0 ? (sentCount / totalToSend) * 100 : 0}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          {sentCount} / {totalToSend} dikirim...
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={sending}>
                        ← Pesan
                      </Button>
                      {scheduleMode === "now" ? (
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleSend}
                          disabled={selectedRecipients.size === 0 || !message.trim() || sending}
                        >
                          {sending ? (
                            <><RefreshCcw className="h-4 w-4 mr-1.5 animate-spin" />Mengirim...</>
                          ) : (
                            <><Send className="h-4 w-4 mr-1.5" />Kirim</>
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="flex-1"
                          onClick={handleSchedule}
                          disabled={!scheduledAt || saveCampaign.isPending}
                        >
                          {saveCampaign.isPending ? (
                            <><RefreshCcw className="h-4 w-4 mr-1.5 animate-spin" />Menyimpan...</>
                          ) : (
                            <><CalendarClock className="h-4 w-4 mr-1.5" />Jadwalkan</>
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                      Pesan dikirim via Provider WA yang aktif (Fonnte/Wablas/dll).
                      Jarak antar pesan ±1,2 detik untuk menghindari blokir.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Histori ────────────────────────────────────────────────── */}
        <TabsContent value="histori" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <History className="h-4 w-4" /> Histori Kampanye Broadcast
            </h2>
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] })}>
              <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
          </div>

          {/* Global sending banner */}
          {executingId && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <RefreshCcw className="h-4 w-4 text-amber-600 animate-spin flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Mengirim kampanye…</p>
                <Progress
                  value={execTotal > 0 ? (execSent / execTotal) * 100 : 0}
                  className="h-1.5 mt-1.5"
                />
                <p className="text-xs text-amber-700 mt-1">{execSent} / {execTotal} pesan dikirim</p>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {campaignsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Belum ada kampanye</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setTab("baru")}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Buat Kampanye Pertama
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {campaigns.map((c: any) => {
                    const isRunning  = executingId === c.id;
                    const isExpanded = expandedId   === c.id;
                    const isConfirm  = confirmId    === c.id;
                    const filters    = c.segment_filters || {};
                    const hasPkgs    = (filters.package_ids   || []).length > 0;
                    const hasDeps    = (filters.departure_ids || []).length > 0;
                    const hasPay     = (filters.payment_statuses || []).length > 0;
                    const noFilter   = !hasPkgs && !hasDeps && !hasPay;

                    return (
                      <div
                        key={c.id}
                        className={`px-5 py-4 transition-colors ${isRunning ? "bg-amber-50/60" : "hover:bg-muted/20"}`}
                      >
                        {/* ─ Row header ───────────────────────────────────── */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{c.name}</p>
                              {statusBadge(c.status)}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Dibuat: {fmtDate(c.created_at)}
                              {c.scheduled_at && <> · <CalendarClock className="inline h-2.5 w-2.5 mx-0.5" />Dijadwal: {fmtDate(c.scheduled_at)}</>}
                              {c.sent_at      && <> · Terkirim: {fmtDate(c.sent_at)}</>}
                            </p>
                          </div>

                          {/* Stats (done) */}
                          {c.status === "done" && c.total_recipients != null && (
                            <div className="flex items-center gap-3 text-xs flex-shrink-0">
                              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="h-3 w-3" />{c.success_count}
                              </span>
                              {c.fail_count > 0 && (
                                <span className="flex items-center gap-1 text-red-600 font-medium">
                                  <XCircle className="h-3 w-3" />{c.fail_count}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Users className="h-3 w-3" />{c.total_recipients}
                              </span>
                            </div>
                          )}

                          {/* Expand toggle */}
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            title={isExpanded ? "Tutup" : "Detail"}
                          >
                            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </button>
                        </div>

                        {/* ─ Sending progress bar (inline) ────────────────── */}
                        {isRunning && (
                          <div className="mt-3">
                            <Progress
                              value={execTotal > 0 ? (execSent / execTotal) * 100 : 5}
                              className="h-2"
                            />
                            <p className="text-xs text-amber-700 mt-1 text-center">
                              {execSent} / {execTotal} dikirim…
                            </p>
                          </div>
                        )}

                        {/* ─ Expanded detail ──────────────────────────────── */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3 border-t pt-4">
                            {/* Segment filters */}
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                Filter Segmen
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {noFilter && (
                                  <Badge variant="outline" className="text-[11px]">Semua jamaah aktif</Badge>
                                )}
                                {hasPkgs && (
                                  <Badge variant="secondary" className="text-[11px] gap-1">
                                    <Package className="h-2.5 w-2.5" />
                                    {filters.package_ids.length} paket
                                  </Badge>
                                )}
                                {hasDeps && (
                                  <Badge variant="secondary" className="text-[11px] gap-1">
                                    <Plane className="h-2.5 w-2.5" />
                                    {filters.departure_ids.length} keberangkatan
                                  </Badge>
                                )}
                                {hasPay && filters.payment_statuses.map((s: string) => (
                                  <Badge key={s} variant="outline" className="text-[11px]">
                                    {s === "paid" ? "Lunas" : s === "partial" ? "Sebagian" : "Belum Bayar"}
                                  </Badge>
                                ))}
                                {(filters.booking_statuses || []).length > 0 && (
                                  <Badge variant="outline" className="text-[11px]">
                                    Booking: {filters.booking_statuses.join(", ")}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Message preview */}
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                Template Pesan
                              </p>
                              <div className="bg-[#dcf8c6] dark:bg-emerald-900 rounded-xl rounded-br-sm p-3 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto text-gray-900 dark:text-gray-100 shadow-sm leading-relaxed">
                                {c.message_template
                                  ? c.message_template.slice(0, 300) + (c.message_template.length > 300 ? "…" : "")
                                  : <span className="italic text-muted-foreground">Tidak ada template</span>
                                }
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ─ Action row (scheduled) ───────────────────────── */}
                        {c.status === "scheduled" && !isRunning && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {isConfirm ? (
                              /* Inline confirmation */
                              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg w-full">
                                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                <p className="text-xs text-amber-800 flex-1">
                                  Kirim ke semua penerima yang cocok sekarang?{" "}
                                  {c.total_recipients != null && (
                                    <span className="font-semibold">~{c.total_recipients} jamaah</span>
                                  )}
                                </p>
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                                    onClick={() => executeScheduledCampaign(c)}
                                    disabled={!!executingId}
                                  >
                                    <Send className="h-3 w-3" /> Ya, Kirim
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => setConfirmId(null)}
                                  >
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => setConfirmId(c.id)}
                                  disabled={!!executingId}
                                >
                                  <Send className="h-3 w-3" /> Kirim Sekarang
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => cancelCampaign(c.id)}
                                  disabled={!!executingId}
                                >
                                  <XCircle className="h-3 w-3" /> Batalkan
                                </Button>
                                {c.scheduled_at && (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <CalendarClock className="h-3 w-3" />
                                    Dijadwal {fmtDate(c.scheduled_at)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* ─ Sending state ────────────────────────────────── */}
                        {c.status === "sending" && !isRunning && (
                          <p className="mt-2 text-xs text-amber-700 flex items-center gap-1.5">
                            <RefreshCcw className="h-3 w-3 animate-spin" />
                            Sedang dikirim di sesi lain…
                          </p>
                        )}

                        {/* ─ Done result bar ──────────────────────────────── */}
                        {c.status === "done" && c.total_recipients > 0 && (
                          <div className="mt-2">
                            <Progress
                              value={(c.success_count / c.total_recipients) * 100}
                              className="h-1.5"
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {c.success_count} berhasil · {c.fail_count} gagal · {c.total_recipients} total
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
