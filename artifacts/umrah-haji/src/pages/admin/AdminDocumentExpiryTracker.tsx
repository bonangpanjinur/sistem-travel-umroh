import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Download,
  RefreshCw,
  ExternalLink,
  FileText,
  CreditCard,
  Calendar,
  Users,
  ChevronDown,
  MessageCircle,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format, parseISO, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";

type UrgencyLevel = "expired" | "critical" | "warning" | "upcoming" | "ok";
type DocFilter = "all" | "passport" | "visa";
type UrgencyFilter = "all" | "expired" | "critical" | "warning" | "upcoming" | "ok";

interface ExpiryRecord {
  customerId: string;
  customerName: string;
  phone: string | null;
  bookingId: string | null;
  bookingCode: string | null;
  departureDate: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  passportDaysLeft: number | null;
  passportUrgency: UrgencyLevel;
  visaNumber: string | null;
  visaExpiry: string | null;
  visaDaysLeft: number | null;
  visaUrgency: UrgencyLevel;
  overallUrgency: UrgencyLevel;
}

function calcUrgency(daysLeft: number | null): UrgencyLevel {
  if (daysLeft === null) return "ok";
  if (daysLeft < 0) return "expired";
  if (daysLeft < 30) return "critical";
  if (daysLeft < 60) return "warning";
  if (daysLeft < 90) return "upcoming";
  return "ok";
}

function daysLeft(expiry: string | null): number | null {
  if (!expiry) return null;
  const d = parseISO(expiry);
  if (!isValid(d)) return null;
  return differenceInDays(d, new Date());
}

const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
  upcoming: 3,
  ok: 4,
};

function worstUrgency(a: UrgencyLevel, b: UrgencyLevel): UrgencyLevel {
  return URGENCY_ORDER[a] <= URGENCY_ORDER[b] ? a : b;
}

const URGENCY_BADGE: Record<UrgencyLevel, { label: string; bg: string; text: string; dot: string }> = {
  expired:  { label: "Kedaluwarsa",    bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
  critical: { label: "< 30 Hari",      bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  warning:  { label: "< 60 Hari",      bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  upcoming: { label: "< 90 Hari",      bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  ok:       { label: "Aman",           bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
};

const ROW_URGENCY_BG: Record<UrgencyLevel, string> = {
  expired:  "bg-red-50 hover:bg-red-100",
  critical: "bg-orange-50 hover:bg-orange-100",
  warning:  "bg-yellow-50 hover:bg-yellow-100",
  upcoming: "bg-blue-50 hover:bg-blue-100",
  ok:       "bg-white hover:bg-gray-50",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const parsed = parseISO(d);
  if (!isValid(parsed)) return d;
  return format(parsed, "d MMM yyyy", { locale: localeId });
}

function formatDays(days: number | null) {
  if (days === null) return "—";
  if (days < 0) return `${Math.abs(days)} hari lalu`;
  return `${days} hari lagi`;
}

export default function AdminDocumentExpiryTracker() {
  const [search, setSearch] = useState("");
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [sortField, setSortField] = useState<"name" | "passport" | "visa" | "urgency">("urgency");
  const [sortAsc, setSortAsc] = useState(true);

  // WA Reminder state (F-06)
  const [reminderThreshold, setReminderThreshold] = useState<number>(90);
  const [reminderDocType, setReminderDocType] = useState<"all" | "passport" | "visa">("all");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const { data: rawData = [], isLoading, refetch } = useQuery({
    queryKey: ["document-expiry-tracker"],
    queryFn: async () => {
      // 1. Get all customers with passport info (only those with passport_number or passport_expiry)
      const { data: customers, error: custErr } = await supabase
        .from("customers")
        .select("id, full_name, phone, passport_number, passport_expiry")
        .not("passport_expiry", "is", null);

      if (custErr) throw custErr;

      // 2. Get latest visa for each customer
      const { data: visas, error: visaErr } = await supabase
        .from("visa_applications")
        .select("customer_id, visa_number, visa_expiry, passport_expiry");

      if (visaErr) throw visaErr;

      // 3. Get latest booking per customer
      const { data: bookings, error: bookErr } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          customer_id,
          departure_id,
          departures:departures(departure_date)
        `)
        .in("booking_status", ["confirmed", "pending", "processing", "completed"])
        .order("created_at", { ascending: false });

      if (bookErr) throw bookErr;

      // Build visa map: most recent per customer_id
      const visaMap = new Map<string, (typeof visas)[0]>();
      for (const v of visas ?? []) {
        if (!visaMap.has(v.customer_id)) visaMap.set(v.customer_id, v);
      }

      // Build booking map: latest per customer_id
      const bookingMap = new Map<string, (typeof bookings)[0]>();
      for (const b of bookings ?? []) {
        if (!bookingMap.has(b.customer_id)) bookingMap.set(b.customer_id, b);
      }

      const records: ExpiryRecord[] = (customers ?? []).map((c) => {
        const visa = visaMap.get(c.id);
        const booking = bookingMap.get(c.id);
        const dep = booking?.departures as { departure_date?: string } | null;

        const passportDays = daysLeft(c.passport_expiry);
        const visaDays = daysLeft(visa?.visa_expiry ?? null);
        const passportUrg = calcUrgency(passportDays);
        const visaUrg = calcUrgency(visaDays);

        return {
          customerId: c.id,
          customerName: c.full_name ?? "—",
          phone: c.phone,
          bookingId: booking?.id ?? null,
          bookingCode: booking?.booking_code ?? null,
          departureDate: dep?.departure_date ?? null,
          passportNumber: c.passport_number,
          passportExpiry: c.passport_expiry,
          passportDaysLeft: passportDays,
          passportUrgency: passportUrg,
          visaNumber: visa?.visa_number ?? null,
          visaExpiry: visa?.visa_expiry ?? null,
          visaDaysLeft: visaDays,
          visaUrgency: visaUrg,
          overallUrgency: worstUrgency(passportUrg, visaUrg),
        };
      });

      return records;
    },
  });

  // Summary counters
  const summary = useMemo(() => {
    const counts = { expired: 0, critical: 0, warning: 0, upcoming: 0, ok: 0 };
    for (const r of rawData) counts[r.overallUrgency]++;
    return counts;
  }, [rawData]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = rawData;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.bookingCode?.toLowerCase().includes(q) ||
          r.passportNumber?.toLowerCase().includes(q) ||
          r.phone?.includes(q)
      );
    }

    if (urgencyFilter !== "all") {
      list = list.filter((r) => {
        if (docFilter === "passport") return r.passportUrgency === urgencyFilter;
        if (docFilter === "visa") return r.visaUrgency === urgencyFilter;
        return r.overallUrgency === urgencyFilter;
      });
    } else if (docFilter === "passport") {
      list = list.filter((r) => r.passportExpiry !== null);
    } else if (docFilter === "visa") {
      list = list.filter((r) => r.visaExpiry !== null);
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.customerName.localeCompare(b.customerName);
      else if (sortField === "passport") cmp = (a.passportDaysLeft ?? 9999) - (b.passportDaysLeft ?? 9999);
      else if (sortField === "visa") cmp = (a.visaDaysLeft ?? 9999) - (b.visaDaysLeft ?? 9999);
      else cmp = URGENCY_ORDER[a.overallUrgency] - URGENCY_ORDER[b.overallUrgency];
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [rawData, search, docFilter, urgencyFilter, sortField, sortAsc]);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  }

  function exportCSV() {
    const header = ["Nama Jamaah", "No HP", "Kode Booking", "Tgl Keberangkatan", "No Paspor", "Kedaluwarsa Paspor", "Sisa Hari Paspor", "No Visa", "Kedaluwarsa Visa", "Sisa Hari Visa", "Status"];
    const rows = filtered.map((r) => [
      r.customerName,
      r.phone ?? "",
      r.bookingCode ?? "",
      r.departureDate ? formatDate(r.departureDate) : "",
      r.passportNumber ?? "",
      r.passportExpiry ? formatDate(r.passportExpiry) : "",
      r.passportDaysLeft !== null ? String(r.passportDaysLeft) : "",
      r.visaNumber ?? "",
      r.visaExpiry ? formatDate(r.visaExpiry) : "",
      r.visaDaysLeft !== null ? String(r.visaDaysLeft) : "",
      URGENCY_BADGE[r.overallUrgency].label,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracker-dokumen-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSendReminder() {
    setSendingReminder(true);
    setReminderResult(null);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const resp = await fetch(`${apiBase}/api/reminders/document-expiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: reminderThreshold, type: reminderDocType }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Gagal mengirim reminder');
      setReminderResult({ sent: json.sent, failed: json.failed, total: json.total });
      if (json.sent > 0) toast.success(`${json.sent} reminder WA berhasil dikirim`);
      if (json.failed > 0) toast.error(`${json.failed} reminder gagal terkirim`);
      if (json.total === 0) toast.info('Tidak ada jamaah dengan dokumen kadaluarsa dalam threshold ini');
    } catch (e: any) {
      toast.error('Gagal mengirim reminder: ' + e.message);
    } finally {
      setSendingReminder(false);
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (
      <ChevronDown className={`inline w-3 h-3 ml-1 transition-transform ${!sortAsc ? "rotate-180" : ""}`} />
    ) : (
      <ChevronDown className="inline w-3 h-3 ml-1 opacity-30" />
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-orange-500" />
            Tracker Dokumen Jamaah
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau kedaluwarsa paspor dan visa seluruh jamaah secara real-time
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-600 text-sm text-green-700 hover:bg-green-50 transition"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(["expired", "critical", "warning", "upcoming", "ok"] as UrgencyLevel[]).map((level) => {
          const info = URGENCY_BADGE[level];
          const icons: Record<UrgencyLevel, React.ReactNode> = {
            expired:  <AlertTriangle className="w-5 h-5 text-red-500" />,
            critical: <AlertTriangle className="w-5 h-5 text-orange-500" />,
            warning:  <Clock className="w-5 h-5 text-yellow-500" />,
            upcoming: <Clock className="w-5 h-5 text-blue-500" />,
            ok:       <CheckCircle2 className="w-5 h-5 text-green-500" />,
          };
          return (
            <button
              key={level}
              onClick={() => setUrgencyFilter(urgencyFilter === level ? "all" : level)}
              className={`rounded-xl p-4 text-left border-2 transition ${
                urgencyFilter === level
                  ? `${info.bg} border-current ${info.text}`
                  : "bg-white border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {icons[level]}
                <span className={`text-2xl font-bold ${info.text}`}>{summary[level]}</span>
              </div>
              <p className="text-xs text-gray-600 font-medium">{info.label}</p>
            </button>
          );
        })}
      </div>

      {/* WA Reminder Panel (F-06) */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-sm">Kirim Reminder Kadaluarsa via WhatsApp</p>
              <p className="text-xs text-green-700 mt-0.5">Kirim notifikasi WA massal ke jamaah dengan dokumen hampir kadaluarsa</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={reminderThreshold}
              onChange={e => setReminderThreshold(Number(e.target.value))}
              className="text-sm border border-green-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value={30}>Dalam 30 hari</option>
              <option value={60}>Dalam 60 hari</option>
              <option value={90}>Dalam 90 hari</option>
            </select>
            <select
              value={reminderDocType}
              onChange={e => setReminderDocType(e.target.value as any)}
              className="text-sm border border-green-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="all">Paspor & Visa</option>
              <option value="passport">Paspor saja</option>
              <option value="visa">Visa saja</option>
            </select>
            <button
              onClick={handleSendReminder}
              disabled={sendingReminder}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition"
            >
              {sendingReminder ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Mengirim...</>
              ) : (
                <><Send className="w-4 h-4" />Kirim Reminder WA</>
              )}
            </button>
          </div>
        </div>
        {reminderResult && (
          <div className="mt-3 flex gap-3 flex-wrap text-sm">
            <span className="flex items-center gap-1.5 bg-white border border-green-200 rounded-full px-3 py-0.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Total: <span className="font-bold">{reminderResult.total}</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-green-200 rounded-full px-3 py-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Terkirim: <span className="font-bold text-green-700">{reminderResult.sent}</span>
            </span>
            {reminderResult.failed > 0 && (
              <span className="flex items-center gap-1.5 bg-white border border-red-200 rounded-full px-3 py-0.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Gagal: <span className="font-bold text-red-700">{reminderResult.failed}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Cari nama, no booking, no paspor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(["all", "passport", "visa"] as DocFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDocFilter(f)}
              className={`px-4 py-2 flex items-center gap-1.5 transition ${
                docFilter === f ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "all" && <Users className="w-3.5 h-3.5" />}
              {f === "passport" && <FileText className="w-3.5 h-3.5" />}
              {f === "visa" && <CreditCard className="w-3.5 h-3.5" />}
              {f === "all" ? "Semua" : f === "passport" ? "Paspor" : "Visa"}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          {filtered.length} jamaah ditemukan
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Memuat data dokumen...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
            <p className="text-base font-medium text-gray-600">Tidak ada dokumen yang perlu diperhatikan</p>
            <p className="text-sm">Semua dokumen jamaah dalam kondisi aman</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort("name")} className="flex items-center hover:text-gray-900">
                      Jamaah <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">Booking & Keberangkatan</th>
                  <th className="text-left px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort("passport")} className="flex items-center hover:text-gray-900">
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Paspor <SortIcon field="passport" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort("visa")} className="flex items-center hover:text-gray-900">
                      <CreditCard className="w-3.5 h-3.5 mr-1" />
                      Visa <SortIcon field="visa" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold">
                    <button onClick={() => toggleSort("urgency")} className="flex items-center hover:text-gray-900">
                      Status <SortIcon field="urgency" />
                    </button>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => {
                  const badge = URGENCY_BADGE[r.overallUrgency];
                  const rowBg = ROW_URGENCY_BG[r.overallUrgency];
                  const ppBadge = URGENCY_BADGE[r.passportUrgency];
                  const visaBadge = URGENCY_BADGE[r.visaUrgency];
                  return (
                    <tr key={r.customerId} className={`transition ${rowBg}`}>
                      {/* Jamaah */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{r.customerName}</div>
                        {r.phone && <div className="text-xs text-gray-500">{r.phone}</div>}
                      </td>

                      {/* Booking */}
                      <td className="px-4 py-3">
                        {r.bookingCode ? (
                          <>
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                              {r.bookingCode}
                            </span>
                            {r.departureDate && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                {formatDate(r.departureDate)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Paspor */}
                      <td className="px-4 py-3">
                        {r.passportExpiry ? (
                          <>
                            <div className="text-gray-800 font-medium">{formatDate(r.passportExpiry)}</div>
                            <div className={`text-xs mt-0.5 font-medium ${ppBadge.text}`}>
                              {formatDays(r.passportDaysLeft)}
                            </div>
                            {r.passportNumber && (
                              <div className="text-xs text-gray-400 mt-0.5">{r.passportNumber}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">Belum ada data</span>
                        )}
                      </td>

                      {/* Visa */}
                      <td className="px-4 py-3">
                        {r.visaExpiry ? (
                          <>
                            <div className="text-gray-800 font-medium">{formatDate(r.visaExpiry)}</div>
                            <div className={`text-xs mt-0.5 font-medium ${visaBadge.text}`}>
                              {formatDays(r.visaDaysLeft)}
                            </div>
                            {r.visaNumber && (
                              <div className="text-xs text-gray-400 mt-0.5">{r.visaNumber}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">Belum ada data</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Link
                            to={`/admin/customers/${r.customerId}`}
                            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
                            title="Lihat profil jamaah"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          {r.bookingId && (
                            <Link
                              to={`/admin/bookings/${r.bookingId}`}
                              className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition"
                              title="Lihat detail booking"
                            >
                              <FileText className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="font-semibold text-gray-600">Keterangan:</span>
        {(["expired", "critical", "warning", "upcoming", "ok"] as UrgencyLevel[]).map((l) => {
          const b = URGENCY_BADGE[l];
          return (
            <span key={l} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${b.dot}`} />
              <span className={b.text}>{b.label}</span>
              {l === "expired" && "— sudah lewat"}
              {l === "critical" && "— di bawah 30 hari"}
              {l === "warning" && "— di bawah 60 hari"}
              {l === "upcoming" && "— di bawah 90 hari"}
              {l === "ok" && "— lebih dari 90 hari"}
            </span>
          );
        })}
      </div>
    </div>
  );
}
