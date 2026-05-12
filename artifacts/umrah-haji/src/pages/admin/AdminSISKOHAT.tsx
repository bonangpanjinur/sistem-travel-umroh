import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Database, Download, Search, RefreshCcw, Info, Users,
  CheckCircle2, Clock, AlertCircle, MapPin, Edit, Save, X,
  Upload, Printer, FileText, Eye
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const EMBARKASI = [
  { kode: "JKG", nama: "Jakarta - Pondok Gede",               kuota: 21000 },
  { kode: "SUB", nama: "Surabaya - Juanda",                    kuota: 35905 },
  { kode: "SOC", nama: "Solo - Adi Soemarmo",                  kuota: 35705 },
  { kode: "UPG", nama: "Makassar - Sultan Hasanuddin",         kuota: 14000 },
  { kode: "MES", nama: "Medan - Kualanamu",                    kuota: 14000 },
  { kode: "BTH", nama: "Batam - Hang Nadim",                   kuota: 8500 },
  { kode: "BPN", nama: "Balikpapan - SAMS",                   kuota: 6000 },
  { kode: "LOP", nama: "Lombok - Zainuddin Abdul Madjid",      kuota: 6000 },
  { kode: "BDJ", nama: "Banjarmasin - Syamsudin Noor",         kuota: 5500 },
  { kode: "PLM", nama: "Palembang - SMB II",                   kuota: 5000 },
  { kode: "AMD", nama: "Aceh - Sultan Iskandar Muda",          kuota: 4500 },
  { kode: "MDN", nama: "Padang - Minangkabau",                 kuota: 4000 },
];

export default function AdminSISKOHAT() {
  const queryClient = useQueryClient();
  const [search, setSearch]                   = useState("");
  const [embFilter, setEmbFilter]             = useState("all");
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editForm, setEditForm]               = useState({ nomor_porsi_haji: "", embarkasi_kode: "", estimasi_keberangkatan_haji: "" });
  const [importDialog, setImportDialog]       = useState(false);
  const [importPreview, setImportPreview]     = useState<any[]>([]);
  const [importing, setImporting]             = useState(false);
  const [printCustomer, setPrintCustomer]     = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["siskohat-customers", embFilter],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("id, full_name, phone, nik, date_of_birth, nomor_porsi_haji, embarkasi_kode, estimasi_keberangkatan_haji, created_at")
        .order("full_name");
      if (embFilter !== "all") q = q.eq("embarkasi_kode", embFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ["siskohat-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("siskohat_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("customers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siskohat-customers"] });
      setEditingId(null);
      toast.success("Data SISKOHAT diperbarui");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const logExport = useMutation({
    mutationFn: async ({ count, type }: { count: number; type: string }) => {
      await supabase.from("siskohat_sync_logs").insert({
        sync_type: type,
        record_count: count,
        status: "success",
      });
    },
  });

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("File CSV kosong atau tidak valid"); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
      const preview = lines.slice(1, 21).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const row: any = {};
        headers.forEach((h, i) => { row[h] = cols[i] || ""; });
        return {
          full_name: row["nama_lengkap"] || row["nama"] || row["full_name"] || "",
          nik: row["nik"] || "",
          nomor_porsi_haji: row["nomor_porsi"] || row["nomor_porsi_haji"] || row["porsi"] || "",
          embarkasi_kode: row["embarkasi"] || row["embarkasi_kode"] || row["kode_embarkasi"] || "",
          estimasi_keberangkatan_haji: parseInt(row["estimasi_tahun"] || row["estimasi"] || row["tahun"] || "0") || null,
        };
      }).filter(r => r.full_name || r.nik || r.nomor_porsi_haji);
      setImportPreview(preview);
      setImportDialog(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function executeImport() {
    if (importPreview.length === 0) return;
    setImporting(true);
    let success = 0; let failed = 0;
    for (const row of importPreview) {
      if (!row.nik && !row.full_name) { failed++; continue; }
      const query = row.nik
        ? supabase.from("customers").select("id").eq("nik", row.nik).maybeSingle()
        : supabase.from("customers").select("id").ilike("full_name", row.full_name).maybeSingle();
      const { data: existing } = await query;
      if (existing?.id) {
        const update: any = {};
        if (row.nomor_porsi_haji) update.nomor_porsi_haji = row.nomor_porsi_haji;
        if (row.embarkasi_kode) update.embarkasi_kode = row.embarkasi_kode;
        if (row.estimasi_keberangkatan_haji) update.estimasi_keberangkatan_haji = row.estimasi_keberangkatan_haji;
        const { error } = await supabase.from("customers").update(update).eq("id", existing.id);
        if (error) failed++; else success++;
      } else { failed++; }
    }
    await logExport.mutateAsync({ count: success, type: "import" });
    queryClient.invalidateQueries({ queryKey: ["siskohat-customers"] });
    setImporting(false);
    setImportDialog(false);
    setImportPreview([]);
    toast.success(`Import selesai: ${success} diperbarui, ${failed} tidak ditemukan`);
  }

  function printCard(c: any) {
    const embarkasi = EMBARKASI.find(e => e.kode === c.embarkasi_kode);
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kartu SISKOHAT</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .card { width: 90mm; min-height: 54mm; border: 2px solid #1e3a8a; border-radius: 6px; padding: 10px; box-sizing: border-box; }
  .header { background: #1e3a8a; color: white; padding: 6px 10px; margin: -10px -10px 8px; border-radius: 4px 4px 0 0; }
  .header h2 { margin: 0; font-size: 11px; }
  .header p { margin: 0; font-size: 9px; opacity: 0.8; }
  .row { display: flex; margin-bottom: 4px; font-size: 10px; }
  .lbl { color: #555; width: 38mm; flex-shrink: 0; }
  .val { font-weight: bold; color: #111; }
  .badge { background: #d4af37; color: #111; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block; margin-top: 4px; }
  .status { display: flex; gap: 6px; margin-top: 6px; }
  .ok { background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
  .miss { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
  @media print { body { margin: 0; } button { display: none; } }
</style></head><body>
<div class="card">
  <div class="header"><h2>KARTU DATA SISKOHAT KEMENAG</h2><p>Vinstour Travel — Data Haji</p></div>
  <div class="row"><span class="lbl">Nama Lengkap</span><span class="val">${c.full_name || "—"}</span></div>
  <div class="row"><span class="lbl">NIK</span><span class="val">${c.nik || "—"}</span></div>
  <div class="row"><span class="lbl">Tanggal Lahir</span><span class="val">${c.date_of_birth || "—"}</span></div>
  <div class="row"><span class="lbl">Nomor Porsi Haji</span><span class="val">${c.nomor_porsi_haji || "<em style='color:#aaa'>Belum diisi</em>"}</span></div>
  <div class="row"><span class="lbl">Embarkasi</span><span class="val">${c.embarkasi_kode ? c.embarkasi_kode + (embarkasi ? " — " + embarkasi.nama.split(" - ")[0] : "") : "<em style='color:#aaa'>Belum diisi</em>"}</span></div>
  <div class="row"><span class="lbl">Est. Keberangkatan</span><span class="val">${c.estimasi_keberangkatan_haji || "—"}</span></div>
  <div class="status">
    ${c.nomor_porsi_haji ? '<span class="ok">✓ Nomor Porsi</span>' : '<span class="miss">✗ Nomor Porsi</span>'}
    ${c.embarkasi_kode ? '<span class="ok">✓ Embarkasi</span>' : '<span class="miss">✗ Embarkasi</span>'}
    ${c.estimasi_keberangkatan_haji ? '<span class="ok">✓ Est. Tahun</span>' : '<span class="miss">✗ Est. Tahun</span>'}
  </div>
</div>
<br><button onclick="window.print()">Cetak</button>
</body></html>`;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  const filtered = customers.filter((c: any) =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.nomor_porsi_haji?.includes(search) ||
    c.nik?.includes(search)
  );

  const withPorsi    = customers.filter((c: any) => !!c.nomor_porsi_haji).length;
  const withEmbark   = customers.filter((c: any) => !!c.embarkasi_kode).length;

  const handleExportCSV = () => {
    const headers = ["Nama Lengkap", "NIK", "Tanggal Lahir", "Nomor Porsi", "Embarkasi", "Estimasi Tahun"];
    const rows = filtered.map((c: any) => [
      c.full_name || "", c.nik || "", c.date_of_birth || "",
      c.nomor_porsi_haji || "", c.embarkasi_kode || "", c.estimasi_keberangkatan_haji || "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `SISKOHAT_Export_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    logExport.mutate({ count: filtered.length, type: "export" });
    toast.success(`Exported ${filtered.length} data jamaah ke CSV`);
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm({
      nomor_porsi_haji: c.nomor_porsi_haji || "",
      embarkasi_kode: c.embarkasi_kode || "",
      estimasi_keberangkatan_haji: c.estimasi_keberangkatan_haji?.toString() || "",
    });
  };

  const saveEdit = (id: string) => {
    updateCustomer.mutate({
      id,
      data: {
        nomor_porsi_haji: editForm.nomor_porsi_haji || null,
        embarkasi_kode: editForm.embarkasi_kode || null,
        estimasi_keberangkatan_haji: editForm.estimasi_keberangkatan_haji ? parseInt(editForm.estimasi_keberangkatan_haji) : null,
      },
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl">
            <Database className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Integrasi SISKOHAT</h1>
            <p className="text-muted-foreground text-sm">Kelola data porsi & embarkasi jamaah Haji — sinkronisasi dengan Kemenag</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />Import CSV
          </Button>
          <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="h-4 w-4 mr-2" />Export Template Kemenag
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          Data ini digunakan untuk pelaporan ke SISKOHAT Kemenag. Pastikan nomor porsi, embarkasi, dan estimasi keberangkatan sudah terisi untuk semua jamaah Haji.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Jamaah",      value: customers.length, icon: Users,       color: "text-blue-600" },
          { label: "Ada Nomor Porsi",   value: withPorsi,        icon: CheckCircle2, color: "text-green-600" },
          { label: "Ada Embarkasi",     value: withEmbark,       icon: MapPin,       color: "text-amber-600" },
          { label: "Belum Lengkap",     value: customers.length - withPorsi, icon: AlertCircle, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color} flex-shrink-0`} />
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="data-porsi">
        <TabsList>
          <TabsTrigger value="data-porsi">Data Porsi Jamaah</TabsTrigger>
          <TabsTrigger value="kuota-embarkasi">Kuota Embarkasi</TabsTrigger>
          <TabsTrigger value="riwayat-sync">Riwayat Export</TabsTrigger>
        </TabsList>

        <TabsContent value="data-porsi" className="space-y-4 mt-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari nama / NIK / nomor porsi..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={embFilter} onValueChange={setEmbFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter Embarkasi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Embarkasi</SelectItem>
                {EMBARKASI.map(e => <SelectItem key={e.kode} value={e.kode}>{e.kode} — {e.nama.split(" - ")[0]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCcw className="h-4 w-4" /></Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Jamaah</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Nomor Porsi</TableHead>
                    <TableHead>Embarkasi</TableHead>
                    <TableHead>Est. Keberangkatan</TableHead>
                    <TableHead>Kelengkapan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat...</TableCell></TableRow>
                  ) : !filtered.length ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                  ) : filtered.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="font-mono text-sm">{c.nik || "-"}</TableCell>
                      <TableCell>
                        {editingId === c.id ? (
                          <Input className="h-7 text-xs w-36" value={editForm.nomor_porsi_haji} onChange={e => setEditForm(f => ({ ...f, nomor_porsi_haji: e.target.value }))} placeholder="Nomor porsi..." />
                        ) : (
                          <span className={`font-mono text-sm ${!c.nomor_porsi_haji ? "text-muted-foreground" : ""}`}>{c.nomor_porsi_haji || "Belum diisi"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === c.id ? (
                          <Select value={editForm.embarkasi_kode} onValueChange={v => setEditForm(f => ({ ...f, embarkasi_kode: v }))}>
                            <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent>{EMBARKASI.map(e => <SelectItem key={e.kode} value={e.kode}>{e.kode}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={c.embarkasi_kode ? "secondary" : "outline"} className="text-xs">{c.embarkasi_kode || "—"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === c.id ? (
                          <Input className="h-7 text-xs w-24" type="number" min={2024} max={2050} value={editForm.estimasi_keberangkatan_haji} onChange={e => setEditForm(f => ({ ...f, estimasi_keberangkatan_haji: e.target.value }))} placeholder="Tahun" />
                        ) : (
                          <span className="text-sm">{c.estimasi_keberangkatan_haji || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const score = [c.nomor_porsi_haji, c.embarkasi_kode, c.estimasi_keberangkatan_haji].filter(Boolean).length;
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-0.5">
                                {[0, 1, 2].map(i => (
                                  <div key={i} className={`h-2 w-4 rounded-sm ${i < score ? "bg-emerald-500" : "bg-muted"}`} />
                                ))}
                              </div>
                              <span className={`text-xs ${score === 3 ? "text-emerald-600 font-medium" : score === 0 ? "text-red-500" : "text-amber-600"}`}>
                                {score}/3
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {editingId === c.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(c.id)} disabled={updateCustomer.isPending}><Save className="h-3 w-3 mr-1" />Simpan</Button>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => startEdit(c)}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => printCard(c)} title="Cetak kartu SISKOHAT"><Printer className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kuota-embarkasi" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EMBARKASI.map(e => {
              const count = customers.filter((c: any) => c.embarkasi_kode === e.kode).length;
              const pct   = Math.min(100, Math.round((count / e.kuota) * 100));
              return (
                <Card key={e.kode}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-lg">{e.kode}</p>
                        <p className="text-xs text-muted-foreground">{e.nama}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{count} jamaah</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Terisi: {count.toLocaleString("id")}</span>
                        <span>Kuota: {e.kuota.toLocaleString("id")}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-right text-muted-foreground">{pct}%</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="riwayat-sync" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu Export</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Jumlah Record</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!syncLogs.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Belum ada riwayat export. Pastikan tabel siskohat_sync_logs sudah dibuat di Supabase.</TableCell></TableRow>
                  ) : syncLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: localeId })}</TableCell>
                      <TableCell className="capitalize">{log.sync_type}</TableCell>
                      <TableCell>{log.record_count?.toLocaleString("id") || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "secondary" : "destructive"} className="text-xs">{log.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import CSV Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />Import Data SISKOHAT dari CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                CSV akan dicocokkan berdasarkan NIK atau nama jamaah. Hanya field yang ada di CSV yang akan diperbarui.
                Kolom yang dikenali: <code className="bg-amber-100 px-1 rounded text-xs">nama_lengkap, nik, nomor_porsi, embarkasi, estimasi_tahun</code>
              </AlertDescription>
            </Alert>
            {importPreview.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview {importPreview.length} baris pertama:</p>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nama</TableHead>
                        <TableHead className="text-xs">NIK</TableHead>
                        <TableHead className="text-xs">Nomor Porsi</TableHead>
                        <TableHead className="text-xs">Embarkasi</TableHead>
                        <TableHead className="text-xs">Est. Tahun</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{row.full_name || "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{row.nik || "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{row.nomor_porsi_haji || "—"}</TableCell>
                          <TableCell className="text-xs">{row.embarkasi_kode || "—"}</TableCell>
                          <TableCell className="text-xs">{row.estimasi_keberangkatan_haji || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada data valid ditemukan</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialog(false); setImportPreview([]); }}>Batal</Button>
            <Button onClick={executeImport} disabled={importing || importPreview.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
              {importing ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Mengimport...</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Import {importPreview.length} Data</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
