import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import {
  LayoutTemplate, Send, RefreshCw, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, Clock, Info, AlertTriangle, Search,
  Users, Eye, History, Download, Loader2, Zap, Variable
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const API = "/api/v1/whatsapp";

// ── Types ──────────────────────────────────────────────────────────────────────
interface MetaTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  components: Array<{
    type: string;   // HEADER, BODY, FOOTER, BUTTONS
    format?: string;
    text?: string;
    buttons?: any[];
    example?: { body_text?: string[][]; header_text?: string[] };
  }>;
}

interface Booking {
  id: string;
  booking_code: string;
  payment_status: string;
  status: string;
  customer: { full_name: string; phone_number: string } | null;
  package: { name: string } | null;
  departure: { departure_date: string } | null;
}

interface BroadcastRecord {
  id: string;
  name: string;
  template_name: string;
  template_lang: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  started_at: string;
  finished_at: string;
  created_at: string;
}

// Variable field options
const VAR_FIELD_OPTIONS = [
  { value: "full_name",       label: "Nama Lengkap" },
  { value: "phone_number",    label: "No. HP" },
  { value: "package_name",    label: "Nama Paket" },
  { value: "booking_code",    label: "Kode Booking" },
  { value: "departure_date",  label: "Tanggal Keberangkatan" },
  { value: "payment_status",  label: "Status Pembayaran" },
];

function extractBodyVars(template: MetaTemplate): number[] {
  const body = template.components.find(c => c.type === "BODY");
  if (!body?.text) return [];
  const matches = body.text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map(m => parseInt(m.replace(/\{\{|\}\}/g, ""))))].sort((a, b) => a - b);
}

function extractHeaderVars(template: MetaTemplate): number[] {
  const header = template.components.find(c => c.type === "HEADER" && c.format === "TEXT");
  if (!header?.text) return [];
  const matches = header.text.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map(m => parseInt(m.replace(/\{\{|\}\}/g, ""))))].sort((a, b) => a - b);
}

function buildRecipientRow(b: Booking): Record<string, string> {
  return {
    booking_id:     b.id,
    phone:          b.customer?.phone_number || "",
    full_name:      b.customer?.full_name || "",
    phone_number:   b.customer?.phone_number || "",
    package_name:   b.package?.name || "",
    booking_code:   b.booking_code || "",
    departure_date: b.departure?.departure_date
      ? format(parseISO(b.departure.departure_date), "dd MMMM yyyy", { locale: idLocale })
      : "",
    payment_status: b.payment_status || "",
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminWATemplateBroadcast() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("kirim");

  // Wizard steps: 1=template, 2=mapping, 3=recipients, 4=confirm
  const [step, setStep] = useState(1);
  const [broadcastName, setBroadcastName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [variableMap, setVariableMap] = useState<Record<string, string>>({});  // {"1": "full_name", "2": "package_name"}
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [searchRecipient, setSearchRecipient] = useState("");
  const [filterPayStatus, setFilterPayStatus] = useState<string>("all");
  const [filterBookStatus, setFilterBookStatus] = useState<string>("all");

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  // History detail
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const { data: templatesData, isLoading: templatesLoading, error: templatesError, refetch: refetchTemplates } = useQuery({
    queryKey: ["meta-templates"],
    queryFn: async () => {
      const r = await fetch(`${API}/meta-templates`);
      const d = await r.json();
      if (!r.ok) return { templates: [], error: d.error, not_meta: d.not_meta, missing_waba_id: d.missing_waba_id };
      return d;
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["wa-template-bcast-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`id, booking_code, payment_status, status,
          customer:profiles(full_name, phone_number),
          package:packages(name),
          departure:departures(departure_date)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Booking[];
    },
  });

  const { data: broadcasts = [], refetch: refetchBroadcasts } = useQuery<BroadcastRecord[]>({
    queryKey: ["template-broadcasts"],
    enabled: tab === "histori",
    queryFn: async () => {
      const r = await fetch(`${API}/template-broadcasts`);
      const d = await r.json();
      return d.broadcasts || [];
    },
  });

  const { data: historyDetail } = useQuery({
    queryKey: ["template-broadcast-recipients", historyDetailId],
    enabled: !!historyDetailId,
    queryFn: async () => {
      const r = await fetch(`${API}/template-broadcasts/${historyDetailId}/recipients`);
      const d = await r.json();
      return d.recipients || [];
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const templates: MetaTemplate[] = templatesData?.templates || [];

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!b.customer?.phone_number) return false;
      if (filterPayStatus !== "all" && b.payment_status !== filterPayStatus) return false;
      if (filterBookStatus !== "all" && b.status !== filterBookStatus) return false;
      if (searchRecipient) {
        const q = searchRecipient.toLowerCase();
        return (b.customer?.full_name || "").toLowerCase().includes(q) ||
               (b.booking_code || "").toLowerCase().includes(q) ||
               (b.customer?.phone_number || "").includes(q);
      }
      return true;
    });
  }, [bookings, filterPayStatus, filterBookStatus, searchRecipient]);

  // ── Template variable detection ───────────────────────────────────────────
  const bodyVars = selectedTemplate ? extractBodyVars(selectedTemplate) : [];
  const headerVars = selectedTemplate ? extractHeaderVars(selectedTemplate) : [];
  const allVarNums = [...new Set([...headerVars, ...bodyVars])].sort((a, b) => a - b);

  // Auto-suggest variable mapping
  function autoSuggestVars(template: MetaTemplate) {
    const body = template.components.find(c => c.type === "BODY");
    const example = body?.example?.body_text?.[0] || [];
    const newMap: Record<string, string> = {};
    const bodyV = extractBodyVars(template);
    const hints = ["full_name", "package_name", "booking_code", "departure_date"];
    bodyV.forEach((n, i) => {
      newMap[String(n)] = hints[i] || "full_name";
    });
    return newMap;
  }

  function resolvePreview(recipient: Record<string, string>): string {
    const body = selectedTemplate?.components.find(c => c.type === "BODY");
    if (!body?.text) return "";
    let text = body.text;
    for (const [num, field] of Object.entries(variableMap)) {
      text = text.replace(new RegExp(`\\{\\{${num}\\}\\}`, "g"), recipient[field] || `{{${num}}}`);
    }
    return text;
  }

  // Sample preview from first selected recipient
  const sampleRecipient = useMemo(() => {
    const ids = Array.from(selectedRecipients);
    if (!ids.length) return null;
    const b = bookings.find(b => b.id === ids[0]);
    return b ? buildRecipientRow(b) : null;
  }, [selectedRecipients, bookings]);

  // ── Send ──────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (!selectedTemplate) return;
    const toSend = filteredBookings.filter(b => selectedRecipients.has(b.id));
    if (!toSend.length) { toast.error("Pilih minimal satu penerima"); return; }

    setIsSending(true);
    setSendProgress(0);
    setSendResult(null);

    const recipients = toSend.map(buildRecipientRow);

    try {
      const r = await fetch(`${API}/broadcast-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast_name: broadcastName || `Template Broadcast ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}`,
          template_name: selectedTemplate.name,
          template_lang: selectedTemplate.language,
          variable_map: variableMap,
          recipients,
        }),
      });
      // Show progress simulation (actual progress is backend-sequential)
      const interval = setInterval(() => {
        setSendProgress(p => Math.min(p + (100 / toSend.length / 2), 95));
      }, 1200);

      const d = await r.json();
      clearInterval(interval);
      setSendProgress(100);

      if (r.ok) {
        setSendResult({ sent: d.sent, failed: d.failed });
        qc.invalidateQueries({ queryKey: ["template-broadcasts"] });
        toast.success(`✅ ${d.sent} pesan template berhasil dikirim${d.failed > 0 ? `, ${d.failed} gagal` : ""}`);
      } else {
        toast.error(d.error || "Gagal mengirim broadcast");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setIsSending(false);
  }

  function downloadHistoryCSV(detail: any[]) {
    const rows = [
      ["No", "Nama", "Nomor HP", "Status", "Waktu Kirim", "Message ID", "Error"],
      ...detail.map((r: any, i: number) => [
        i + 1, r.full_name || "-", r.phone, r.status,
        r.sent_at ? format(parseISO(r.sent_at), "dd/MM/yyyy HH:mm:ss") : "-",
        r.message_id || "-", r.error_message || "",
      ]),
    ];
    const csv = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `template-broadcast-recipients.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const providerNotMeta = templatesData?.not_meta;
  const missingWabaId  = templatesData?.missing_waba_id;
  const fetchError     = templatesData?.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6 text-emerald-600" />
            Broadcast Template Meta WABA
          </h1>
          <p className="text-muted-foreground mt-1">
            Kirim pesan template yang sudah disetujui Meta ke jamaah secara massal
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchTemplates(); refetchBroadcasts(); }}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="kirim"><Send className="h-3.5 w-3.5 mr-1.5" />Kirim Broadcast</TabsTrigger>
          <TabsTrigger value="histori"><History className="h-3.5 w-3.5 mr-1.5" />Riwayat</TabsTrigger>
        </TabsList>

        {/* ── KIRIM TAB ── */}
        <TabsContent value="kirim" className="mt-4 space-y-4">
          {/* Error states */}
          {providerNotMeta && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Provider aktif bukan Meta WABA. Fitur ini hanya berfungsi dengan{" "}
                <strong>Meta Cloud API</strong>. Ubah provider di{" "}
                <a href="/admin/wa-provider" className="underline font-medium">Konfigurasi Provider WA</a>.
              </AlertDescription>
            </Alert>
          )}
          {missingWabaId && !providerNotMeta && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>WABA ID belum diisi.</strong> Tambahkan WhatsApp Business Account ID di{" "}
                <a href="/admin/wa-provider" className="underline font-medium">Konfigurasi Provider WA → Meta → WABA ID</a>.
              </AlertDescription>
            </Alert>
          )}
          {fetchError && !providerNotMeta && !missingWabaId && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{fetchError}</AlertDescription>
            </Alert>
          )}

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            {[
              { n: 1, label: "Pilih Template" },
              { n: 2, label: "Petakan Variabel" },
              { n: 3, label: "Pilih Penerima" },
              { n: 4, label: "Konfirmasi & Kirim" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-center gap-2">
                <button
                  onClick={() => step > s.n && setStep(s.n)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    step === s.n ? "bg-emerald-600 text-white" :
                    step > s.n ? "bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200" :
                    "bg-muted text-muted-foreground",
                  )}
                >
                  {step > s.n ? <CheckCircle2 className="h-3 w-3" /> : <span>{s.n}</span>}
                  {s.label}
                </button>
                {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Template Selection ── */}
          {step === 1 && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Hanya template dengan status <strong>APPROVED</strong> dari Meta Business Manager yang bisa digunakan.
                </AlertDescription>
              </Alert>

              {templatesLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Mengambil template dari Meta...
                </div>
              ) : templates.length === 0 && !fetchError ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Tidak ada template APPROVED ditemukan.</p>
                    <p className="text-xs mt-1">Buat dan ajukan template di Meta Business Manager, tunggu persetujuan lalu refresh.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {templates.map(t => {
                    const body = t.components.find(c => c.type === "BODY");
                    const vars = extractBodyVars(t);
                    const isSelected = selectedTemplate?.name === t.name;
                    return (
                      <Card
                        key={t.name}
                        onClick={() => {
                          setSelectedTemplate(t);
                          setVariableMap(autoSuggestVars(t));
                        }}
                        className={cn(
                          "cursor-pointer border-2 transition-all hover:border-emerald-300",
                          isSelected ? "border-emerald-500 bg-emerald-50/30" : "border-border",
                        )}
                      >
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm font-mono">{t.name}</p>
                              <div className="flex gap-1.5 mt-1">
                                <Badge variant="outline" className="text-[10px] px-1.5">{t.category}</Badge>
                                <Badge variant="outline" className="text-[10px] px-1.5">{t.language}</Badge>
                                {vars.length > 0 && (
                                  <Badge className="text-[10px] px-1.5 bg-violet-100 text-violet-700 border-violet-200 border">
                                    {vars.length} variabel
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                          </div>
                          {body?.text && (
                            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                              {body.text}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {selectedTemplate && (
                <div className="flex justify-end">
                  <Button onClick={() => setStep(allVarNums.length > 0 ? 2 : 3)} className="bg-emerald-600 hover:bg-emerald-700">
                    Lanjut <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Variable Mapping ── */}
          {step === 2 && selectedTemplate && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Variable className="h-4 w-4 text-violet-500" />
                    Petakan Variabel Template
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tentukan data booking mana yang mengisi setiap variabel dalam template.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {allVarNums.map(n => (
                    <div key={n} className="space-y-1">
                      <Label className="text-xs font-mono text-violet-700">{`{{${n}}}`}</Label>
                      <Select
                        value={variableMap[String(n)] || ""}
                        onValueChange={v => setVariableMap(m => ({ ...m, [String(n)]: v }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Pilih field data..." />
                        </SelectTrigger>
                        <SelectContent>
                          {VAR_FIELD_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Kembali
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setStep(3)}
                      disabled={allVarNums.some(n => !variableMap[String(n)])}
                    >
                      Lanjut <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Template preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Preview Template
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-[#e5ddd5] rounded-lg p-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm text-xs leading-relaxed whitespace-pre-wrap font-sans max-w-[260px]">
                      {selectedTemplate.components.map(c => {
                        if (c.type === "HEADER" && c.format === "TEXT") return (
                          <p key="h" className="font-bold mb-1">{c.text}</p>
                        );
                        if (c.type === "BODY") return (
                          <p key="b">{c.text}</p>
                        );
                        if (c.type === "FOOTER") return (
                          <p key="f" className="text-gray-400 text-[10px] mt-1">{c.text}</p>
                        );
                        return null;
                      })}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Variabel <code className="bg-muted px-1 rounded">{"{{n}}"}</code> akan diisi dengan data booking masing-masing jamaah.
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── STEP 3: Recipient Selection ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9 text-sm"
                      placeholder="Cari nama, kode booking, atau no HP..."
                      value={searchRecipient}
                      onChange={e => setSearchRecipient(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={filterPayStatus} onValueChange={setFilterPayStatus}>
                  <SelectTrigger className="h-9 w-40 text-sm">
                    <SelectValue placeholder="Status bayar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status Bayar</SelectItem>
                    <SelectItem value="unpaid">Belum Bayar</SelectItem>
                    <SelectItem value="partial">Sebagian</SelectItem>
                    <SelectItem value="paid">Lunas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterBookStatus} onValueChange={setFilterBookStatus}>
                  <SelectTrigger className="h-9 w-40 text-sm">
                    <SelectValue placeholder="Status booking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <div className="p-3 bg-muted/50 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">
                    <Users className="h-4 w-4 inline mr-1.5 text-muted-foreground" />
                    {filteredBookings.length} jamaah dengan nomor HP
                    {selectedRecipients.size > 0 && (
                      <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-200 border text-xs">
                        {selectedRecipients.size} dipilih
                      </Badge>
                    )}
                  </span>
                  <Button
                    variant="ghost" size="sm" className="text-xs h-7"
                    onClick={() => {
                      if (selectedRecipients.size === filteredBookings.length)
                        setSelectedRecipients(new Set());
                      else
                        setSelectedRecipients(new Set(filteredBookings.map(b => b.id)));
                    }}
                  >
                    {selectedRecipients.size === filteredBookings.length ? "Batalkan Semua" : "Pilih Semua"}
                  </Button>
                </div>
                <ScrollArea className="h-[320px]">
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat data jamaah...
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Tidak ada jamaah sesuai filter</div>
                  ) : (
                    <div className="p-2 space-y-0.5">
                      {filteredBookings.map(b => (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-md cursor-pointer"
                          onClick={() => {
                            const next = new Set(selectedRecipients);
                            next.has(b.id) ? next.delete(b.id) : next.add(b.id);
                            setSelectedRecipients(next);
                          }}
                        >
                          <Checkbox checked={selectedRecipients.has(b.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{b.customer?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {b.customer?.phone_number} · {b.package?.name}
                              {b.departure?.departure_date && ` · ${format(parseISO(b.departure.departure_date), "dd MMM yyyy", { locale: idLocale })}`}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] shrink-0",
                              b.payment_status === "paid" ? "text-green-700 border-green-200 bg-green-50" :
                              b.payment_status === "partial" ? "text-amber-700 border-amber-200 bg-amber-50" :
                              "text-red-700 border-red-200 bg-red-50"
                            )}
                          >{b.payment_status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </Card>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setStep(allVarNums.length > 0 ? 2 : 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Kembali
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={selectedRecipients.size === 0}
                  onClick={() => setStep(4)}
                >
                  Lanjut ({selectedRecipients.size} penerima) <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Confirm & Send ── */}
          {step === 4 && selectedTemplate && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Summary & send */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ringkasan Broadcast</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nama Kampanye</Label>
                      <Input
                        className="mt-1 h-8 text-sm"
                        placeholder={`Template Broadcast ${format(new Date(), "dd MMM yyyy", { locale: idLocale })}`}
                        value={broadcastName}
                        onChange={e => setBroadcastName(e.target.value)}
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Template</span>
                      <span className="font-mono text-xs font-semibold">{selectedTemplate.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bahasa</span>
                      <span>{selectedTemplate.language}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Penerima</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                        {selectedRecipients.size} jamaah
                      </Badge>
                    </div>
                    {allVarNums.length > 0 && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Pemetaan Variabel</p>
                        <div className="bg-muted rounded p-2 space-y-1">
                          {allVarNums.map(n => (
                            <div key={n} className="flex justify-between text-xs">
                              <code className="text-violet-700">{`{{${n}}}`}</code>
                              <span className="text-muted-foreground">
                                {VAR_FIELD_OPTIONS.find(o => o.value === variableMap[String(n)])?.label || variableMap[String(n)] || "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Separator />
                    <Alert className="bg-amber-50 border-amber-200 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <AlertDescription className="text-amber-800 text-xs">
                        Pesan dikirim 1.2 detik/penerima. {selectedRecipients.size} penerima ≈{" "}
                        <strong>{Math.ceil(selectedRecipients.size * 1.2 / 60)} menit</strong>. Jangan tutup halaman.
                      </AlertDescription>
                    </Alert>

                    {isSending && (
                      <div className="space-y-2">
                        <Progress value={sendProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">
                          Mengirim... {Math.round(sendProgress)}%
                        </p>
                      </div>
                    )}

                    {sendResult && (
                      <div className="flex gap-3">
                        <div className="flex-1 text-center p-2 bg-green-50 rounded border border-green-200">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                          <div className="text-lg font-bold text-green-700">{sendResult.sent}</div>
                          <div className="text-xs text-green-600">Berhasil</div>
                        </div>
                        <div className="flex-1 text-center p-2 bg-red-50 rounded border border-red-200">
                          <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                          <div className="text-lg font-bold text-red-600">{sendResult.failed}</div>
                          <div className="text-xs text-red-500">Gagal</div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setStep(3)} disabled={isSending}>
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Kembali
                      </Button>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                        onClick={handleSend}
                        disabled={isSending || !!sendResult}
                      >
                        {isSending ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</>
                        ) : sendResult ? (
                          <><CheckCircle2 className="h-4 w-4" /> Selesai</>
                        ) : (
                          <><Zap className="h-4 w-4" /> Kirim Sekarang</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Message preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Preview Pesan
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {sampleRecipient ? `Contoh untuk: ${sampleRecipient.full_name}` : "Pilih penerima untuk contoh preview"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#e5ddd5] rounded-lg p-3 min-h-[160px]">
                    <div className="bg-white rounded-lg p-3 shadow-sm text-xs leading-relaxed whitespace-pre-wrap font-sans max-w-[260px]">
                      {sampleRecipient
                        ? resolvePreview(sampleRecipient) || selectedTemplate.components.find(c => c.type === "BODY")?.text
                        : selectedTemplate.components.find(c => c.type === "BODY")?.text
                      }
                      {selectedTemplate.components.find(c => c.type === "FOOTER") && (
                        <p className="text-gray-400 text-[10px] mt-1 border-t pt-1">
                          {selectedTemplate.components.find(c => c.type === "FOOTER")?.text}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── HISTORI TAB ── */}
        <TabsContent value="histori" className="mt-4 space-y-4">
          {broadcasts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Belum ada riwayat broadcast template.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {broadcasts.map(b => (
                <Card key={b.id} className="cursor-pointer hover:border-emerald-300 transition-colors"
                  onClick={() => setHistoryDetailId(historyDetailId === b.id ? null : b.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        b.status === "done" ? "bg-green-100" : b.status === "sending" ? "bg-blue-100" : "bg-red-100"
                      )}>
                        {b.status === "done" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                         b.status === "sending" ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" /> :
                         <XCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{b.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">{b.template_name}</Badge>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span><Users className="h-3 w-3 inline mr-0.5" />{b.total_recipients} penerima</span>
                          <span className="text-green-600">✓ {b.sent_count} berhasil</span>
                          {b.failed_count > 0 && <span className="text-red-500">✗ {b.failed_count} gagal</span>}
                          <span><Clock className="h-3 w-3 inline mr-0.5" />
                            {b.created_at ? format(parseISO(b.created_at), "dd MMM yyyy HH:mm", { locale: idLocale }) : "-"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", historyDetailId === b.id && "rotate-90")} />
                    </div>

                    {/* Recipient detail */}
                    {historyDetailId === b.id && historyDetail && (
                      <div className="mt-3 border-t pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">Detail Penerima ({historyDetail.length})</span>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                            onClick={e => { e.stopPropagation(); downloadHistoryCSV(historyDetail); }}>
                            <Download className="h-3 w-3 mr-1" /> CSV
                          </Button>
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-1">
                            {historyDetail.map((r: any) => (
                              <div key={r.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/30">
                                {r.status === "sent"
                                  ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                  : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
                                <span className="flex-1 truncate font-medium">{r.full_name || "-"}</span>
                                <span className="text-muted-foreground">{r.phone}</span>
                                {r.error_message && (
                                  <span className="text-red-500 truncate max-w-[100px]" title={r.error_message}>
                                    {r.error_message}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
