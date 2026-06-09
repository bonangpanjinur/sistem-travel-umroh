import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Plus, Search, BookText, ChevronDown, ChevronRight,
  RefreshCw, Trash2, AlertCircle, CheckCircle2,
  Download, Eye, Layers, X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatCurrency } from "@/lib/format";

// ── types ─────────────────────────────────────────────────────
interface JournalLine {
  id?: string;
  line_number: number;
  account_code: string;
  account_name: string;
  description: string;
  debit: string | number;
  credit: string | number;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  ref_type: string | null;
  ref_code: string | null;
  status: "draft" | "posted" | "voided";
  total_debit: number;
  total_credit: number;
  created_by_name: string | null;
  created_at: string;
  lines: JournalLine[];
}

interface COAAccount {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

// ── helpers ───────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || "";
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...opts?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

const fmtDate = (d: string) => {
  try { return format(new Date(d), "dd MMM yyyy", { locale: localeId }); } catch { return d; }
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  posted: { label: "Posted",  variant: "default" },
  draft:  { label: "Draft",   variant: "secondary" },
  voided: { label: "Batal",   variant: "destructive" },
};

const REF_TYPE_OPTIONS = [
  { value: "manual",      label: "Manual / Jurnal Koreksi" },
  { value: "booking",     label: "Booking Jamaah" },
  { value: "payment",     label: "Pembayaran" },
  { value: "vendor_cost", label: "Biaya Vendor" },
  { value: "cash",        label: "Transaksi Kas" },
  { value: "payroll",     label: "Penggajian" },
  { value: "other",       label: "Lainnya" },
];

const emptyLine = (): JournalLine => ({
  line_number: 0,
  account_code: "",
  account_name: "",
  description: "",
  debit: "",
  credit: "",
});

const emptyForm = {
  entry_date: new Date().toISOString().slice(0, 10),
  description: "",
  ref_type: "manual",
  ref_code: "",
  status: "posted" as const,
};

// ── sub-component: baris jurnal dalam form ────────────────────
function JournalLineRow({
  line,
  index,
  accounts,
  onChange,
  onRemove,
  canRemove,
}: {
  line: JournalLine;
  index: number;
  accounts: COAAccount[];
  onChange: (idx: number, field: keyof JournalLine, value: string) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
}) {
  const debitNum  = parseFloat(String(line.debit))  || 0;
  const creditNum = parseFloat(String(line.credit)) || 0;
  const bothFilled = debitNum > 0 && creditNum > 0;

  return (
    <TableRow className={bothFilled ? "bg-red-50 dark:bg-red-950/20" : ""}>
      <TableCell className="w-8 text-center text-muted-foreground text-xs">{index + 1}</TableCell>
      <TableCell className="min-w-[200px]">
        <Select
          value={line.account_code || "__none__"}
          onValueChange={(v) => {
            const acc = accounts.find(a => a.code === v);
            onChange(index, "account_code", v === "__none__" ? "" : v);
            if (acc) onChange(index, "account_name", acc.name);
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Pilih akun…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Pilih Akun COA —</SelectItem>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.code}>
                {a.code} — {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[140px]">
        <Input
          className="h-8 text-xs"
          placeholder="Keterangan baris…"
          value={line.description}
          onChange={e => onChange(index, "description", e.target.value)}
        />
      </TableCell>
      <TableCell className="w-36">
        <Input
          className="h-8 text-xs text-right"
          type="number"
          min="0"
          placeholder="0"
          value={line.debit}
          onChange={e => {
            onChange(index, "debit", e.target.value);
            if (parseFloat(e.target.value) > 0) onChange(index, "credit", "");
          }}
        />
      </TableCell>
      <TableCell className="w-36">
        <Input
          className="h-8 text-xs text-right"
          type="number"
          min="0"
          placeholder="0"
          value={line.credit}
          onChange={e => {
            onChange(index, "credit", e.target.value);
            if (parseFloat(e.target.value) > 0) onChange(index, "debit", "");
          }}
        />
      </TableCell>
      <TableCell className="w-8">
        {canRemove && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onRemove(index)}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── main component ────────────────────────────────────────────
export default function AdminJurnalUmum() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canEdit = hasRole("super_admin") || hasRole("owner") || hasRole("finance");

  // list filters
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState("all");
  const [dateStart, setDateStart]   = useState("");
  const [dateEnd, setDateEnd]       = useState("");
  const [expandedIds, setExpanded]  = useState<Set<string>>(new Set());

  // form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry]   = useState<JournalEntry | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [lines, setLines]           = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [voidDialog, setVoidDialog] = useState<JournalEntry | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // ── queries ────────────────────────────────────────────────
  const { data: coaAccounts = [] } = useQuery<COAAccount[]>({
    queryKey: ["coa-accounts-list"],
    queryFn: async () => {
      const r = await apiFetch("/api/coa");
      return (r.data ?? []).filter((a: COAAccount) => a.is_active);
    },
    staleTime: 5 * 60_000,
  });

  const queryKey = ["journal-entries", search, filterStatus, dateStart, dateEnd];
  const { data, isLoading, refetch } = useQuery<{ data: JournalEntry[]; total: number }>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search)       params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (dateStart)    params.set("start", dateStart);
      if (dateEnd)      params.set("end", dateEnd);
      params.set("limit", "200");
      return apiFetch(`/api/journal?${params}`);
    },
  });

  const entries: JournalEntry[] = data?.data ?? [];

  // ── computed balance ────────────────────────────────────────
  const totalDebit  = useMemo(() => lines.reduce((s, l) => s + (parseFloat(String(l.debit))  || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0), [lines]);
  const diff        = totalDebit - totalCredit;
  const isBalanced  = Math.abs(diff) < 0.01;
  const canSave     = isBalanced && totalDebit > 0 && lines.some(l => l.account_code);

  // ── mutations ───────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (body: object) => apiFetch("/api/journal", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { toast.success("Jurnal berhasil disimpan"); queryClient.invalidateQueries({ queryKey: ["journal-entries"] }); closeDialog(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => apiFetch(`/api/journal/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => { toast.success("Jurnal diperbarui"); queryClient.invalidateQueries({ queryKey: ["journal-entries"] }); closeDialog(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const voidMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/api/journal/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) }),
    onSuccess: () => { toast.success("Jurnal dibatalkan"); queryClient.invalidateQueries({ queryKey: ["journal-entries"] }); setVoidDialog(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── form helpers ────────────────────────────────────────────
  const openCreate = () => {
    setEditEntry(null);
    setForm(emptyForm);
    setLines([emptyLine(), emptyLine()]);
    setDialogOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditEntry(entry);
    setForm({
      entry_date:  entry.entry_date.slice(0, 10),
      description: entry.description,
      ref_type:    entry.ref_type ?? "manual",
      ref_code:    entry.ref_code ?? "",
      status:      entry.status === "voided" ? "posted" : entry.status,
    });
    setLines(entry.lines.map(l => ({
      ...l,
      debit:  l.debit  > 0 ? String(l.debit)  : "",
      credit: l.credit > 0 ? String(l.credit) : "",
    })));
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditEntry(null); };

  const lineChange = useCallback((idx: number, field: keyof JournalLine, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }, []);

  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    const cleanLines = lines.filter(l => l.account_code).map((l, i) => ({
      ...l,
      line_number: i + 1,
      debit:  parseFloat(String(l.debit))  || 0,
      credit: parseFloat(String(l.credit)) || 0,
    }));
    const body = { ...form, lines: cleanLines };
    if (editEntry) {
      updateMut.mutate({ id: editEntry.id, body });
    } else {
      createMut.mutate(body);
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── stats ───────────────────────────────────────────────────
  const statsPosted = entries.filter(e => e.status === "posted");
  const totalPostedDebit = statsPosted.reduce((s, e) => s + Number(e.total_debit), 0);

  // ── export ──────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = entries.flatMap(e =>
      e.lines.map(l => ({
        "No Jurnal": e.entry_number,
        "Tanggal": fmtDate(e.entry_date),
        "Keterangan": e.description,
        "Status": e.status,
        "Kode Akun": l.account_code,
        "Nama Akun": l.account_name,
        "Ket. Baris": l.description,
        "Debit": l.debit,
        "Kredit": l.credit,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jurnal Umum");
    XLSX.writeFile(wb, `jurnal-umum-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookText className="h-6 w-6 text-primary" />
            Jurnal Umum
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pencatatan akuntansi double-entry — setiap transaksi debit = kredit
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={entries.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Buat Jurnal
            </Button>
          )}
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Entri",  value: entries.length,                         sub: "semua status" },
          { label: "Terposting",   value: statsPosted.length,                     sub: "status posted" },
          { label: "Total Debit",  value: formatCurrency(totalPostedDebit),       sub: "posted" },
          { label: "Dibatalkan",   value: entries.filter(e=>e.status==="voided").length, sub: "void" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold mt-1 truncate">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* filter bar */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Cari no. jurnal, keterangan…" value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilter}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="voided">Batal</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-36 h-9" value={dateStart} onChange={e => setDateStart(e.target.value)} />
            <span className="text-muted-foreground text-sm">s/d</span>
            <Input type="date" className="w-36 h-9" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <BookText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Belum ada entri jurnal</p>
              {canEdit && (
                <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Buat Jurnal Pertama</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead className="w-36">No. Jurnal</TableHead>
                    <TableHead className="w-28">Tanggal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="w-28">Referensi</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-32 text-right">Debit</TableHead>
                    <TableHead className="w-32 text-right">Kredit</TableHead>
                    <TableHead className="w-20 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => {
                    const isExpanded = expandedIds.has(entry.id);
                    const sb = STATUS_BADGE[entry.status] ?? STATUS_BADGE.posted;
                    return [
                      <TableRow
                        key={entry.id}
                        className={`cursor-pointer hover:bg-muted/50 ${entry.status === "voided" ? "opacity-50 line-through" : ""}`}
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <TableCell>
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-primary">{entry.entry_number}</TableCell>
                        <TableCell className="text-sm">{fmtDate(entry.entry_date)}</TableCell>
                        <TableCell className="text-sm max-w-[240px] truncate">{entry.description}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entry.ref_code || entry.ref_type || "—"}</TableCell>
                        <TableCell><Badge variant={sb.variant}>{sb.label}</Badge></TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.total_debit)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(entry.total_credit)}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {canEdit && entry.status !== "voided" && (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7"
                                  onClick={() => openEdit(entry)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                  onClick={() => { setVoidDialog(entry); setVoidReason(""); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>,
                      isExpanded && (
                        <TableRow key={`${entry.id}-lines`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-0">
                            <div className="px-12 py-3">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-muted-foreground border-b">
                                    <th className="text-left pb-1 w-6">#</th>
                                    <th className="text-left pb-1 w-28">Kode Akun</th>
                                    <th className="text-left pb-1">Nama Akun</th>
                                    <th className="text-left pb-1">Keterangan</th>
                                    <th className="text-right pb-1 w-32">Debit</th>
                                    <th className="text-right pb-1 w-32">Kredit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entry.lines.map(l => (
                                    <tr key={l.id} className="border-b border-dashed last:border-0">
                                      <td className="py-1 text-muted-foreground">{l.line_number}</td>
                                      <td className="py-1 font-mono text-primary">{l.account_code}</td>
                                      <td className="py-1 font-medium">{l.account_name}</td>
                                      <td className="py-1 text-muted-foreground">{l.description || "—"}</td>
                                      <td className="py-1 text-right font-mono">
                                        {Number(l.debit) > 0 ? formatCurrency(Number(l.debit)) : ""}
                                      </td>
                                      <td className="py-1 text-right font-mono text-muted-foreground">
                                        {Number(l.credit) > 0 ? formatCurrency(Number(l.credit)) : ""}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="font-semibold text-xs bg-muted/50">
                                    <td colSpan={4} className="py-1 text-right pr-4">Total</td>
                                    <td className="py-1 text-right font-mono">{formatCurrency(entry.total_debit)}</td>
                                    <td className="py-1 text-right font-mono">{formatCurrency(entry.total_credit)}</td>
                                  </tr>
                                </tbody>
                              </table>
                              {entry.created_by_name && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Dibuat oleh: {entry.created_by_name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ),
                    ];
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create / Edit Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editEntry ? `Edit Jurnal — ${editEntry.entry_number}` : "Buat Jurnal Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* header fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Keterangan Jurnal *</Label>
                <Input
                  placeholder="mis. Pencatatan pembayaran invoice vendor Hotel Makkah…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal *</Label>
                <Input type="date" value={form.entry_date}
                  onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as "draft" | "posted" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jenis Referensi</Label>
                <Select value={form.ref_type} onValueChange={v => setForm(f => ({ ...f, ref_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REF_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-3">
                <Label>Kode Referensi</Label>
                <Input placeholder="mis. BK-2026-0042, INV-001…" value={form.ref_code}
                  onChange={e => setForm(f => ({ ...f, ref_code: e.target.value }))} />
              </div>
            </div>

            <Separator />

            {/* lines table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Baris Jurnal</Label>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Baris
                </Button>
              </div>

              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-8 text-center">#</TableHead>
                      <TableHead>Akun COA *</TableHead>
                      <TableHead>Keterangan Baris</TableHead>
                      <TableHead className="w-36 text-right">Debit (Rp)</TableHead>
                      <TableHead className="w-36 text-right">Kredit (Rp)</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <JournalLineRow
                        key={idx}
                        line={line}
                        index={idx}
                        accounts={coaAccounts}
                        onChange={lineChange}
                        onRemove={removeLine}
                        canRemove={lines.length > 2}
                      />
                    ))}
                    {/* total row */}
                    <TableRow className={`font-semibold text-sm ${isBalanced && totalDebit > 0 ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-amber-50 dark:bg-amber-950/20"}`}>
                      <TableCell colSpan={3} className="text-right pr-3">Total</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totalDebit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(totalCredit)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* balance indicator */}
              <div className={`mt-2 flex items-center gap-2 text-sm px-2 py-1.5 rounded ${
                isBalanced && totalDebit > 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              }`}>
                {isBalanced && totalDebit > 0
                  ? <><CheckCircle2 className="h-4 w-4" /> Jurnal balance — siap disimpan</>
                  : totalDebit === 0 && totalCredit === 0
                    ? <><AlertCircle className="h-4 w-4" /> Masukkan nominal debit dan kredit</>
                    : <><AlertCircle className="h-4 w-4" />
                        Belum balance — selisih: {formatCurrency(Math.abs(diff))}
                        {diff > 0 ? " (kredit kurang)" : " (debit kurang)"}
                      </>
                }
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !canSave || !form.description}>
              {isSaving ? "Menyimpan…" : editEntry ? "Simpan Perubahan" : "Posting Jurnal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Void Dialog ──────────────────────────────────────── */}
      <Dialog open={!!voidDialog} onOpenChange={v => { if (!v) setVoidDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Batalkan Jurnal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Jurnal <span className="font-mono font-semibold text-foreground">{voidDialog?.entry_number}</span> akan dibatalkan (void).
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="space-y-1.5">
              <Label>Alasan Pembatalan</Label>
              <Textarea
                placeholder="Jelaskan alasan pembatalan jurnal ini…"
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>Batal</Button>
            <Button variant="destructive" disabled={voidMut.isPending}
              onClick={() => voidMut.mutate({ id: voidDialog!.id, reason: voidReason })}>
              {voidMut.isPending ? "Membatalkan…" : "Ya, Batalkan Jurnal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
