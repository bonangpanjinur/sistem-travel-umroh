import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
const supabaseAny: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  GraduationCap, Plus, Edit, Trash2, Search, Play,
  CheckCircle2, Clock, Users, BookOpen, Target, BarChart3,
  User, Building2
} from "lucide-react";
import { format } from "date-fns";


const CATEGORIES = [
  { value: "product_knowledge", label: "Product Knowledge" },
  { value: "script_penjualan",  label: "Script Penjualan" },
  { value: "sop",               label: "SOP Operasional" },
  { value: "regulasi",          label: "Regulasi Haji/Umroh" },
  { value: "lainnya",           label: "Lainnya" },
];

const CONTENT_TYPES = [
  { value: "text",  label: "Teks / Markdown" },
  { value: "video", label: "Video YouTube" },
  { value: "pdf",   label: "PDF" },
  { value: "mixed", label: "Campuran" },
];

const EMPTY_FORM = {
  title: "", description: "", category: "product_knowledge", content_type: "text",
  content_url: "", content_text: "", duration_minutes: "", is_mandatory: false,
  order_index: "0", is_active: true,
};

const STATUS_BADGE: Record<string, { label: string; variant: "default"|"secondary"|"destructive"|"outline" }> = {
  not_started:  { label: "Belum Mulai",    variant: "outline" },
  in_progress:  { label: "Sedang Belajar", variant: "secondary" },
  completed:    { label: "Selesai",        variant: "default" },
  failed:       { label: "Gagal",          variant: "destructive" },
};

export default function AdminTraining() {
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState("");
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [tab, setTab]                 = useState("modules");

  const [empProgressDialogOpen, setEmpProgressDialogOpen] = useState(false);
  const [empProgressForm, setEmpProgressForm] = useState({
    employee_id: "", module_id: "", status: "completed", quiz_score: "",
  });

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["training-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .order("order_index");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("employees")
        .select("id, full_name, employee_code, position")
        .eq("is_active", true)
        .order("full_name");
      if (error) return [];
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: employeeProgress = [] } = useQuery({
    queryKey: ["employee-training-progress"],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from("employee_training_progress")
        .select("*, employee:employees(id, full_name, employee_code), module:training_modules(title)");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const saveEmpProgressMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        employee_id: empProgressForm.employee_id,
        module_id: empProgressForm.module_id,
        status: empProgressForm.status,
        quiz_score: empProgressForm.quiz_score ? parseFloat(empProgressForm.quiz_score) : null,
        updated_at: new Date().toISOString(),
      };
      if (empProgressForm.status === "completed") {
        payload.completed_at = new Date().toISOString();
      }
      const { error } = await supabaseAny
        .from("employee_training_progress")
        .upsert(payload, { onConflict: "employee_id,module_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-training-progress"] });
      setEmpProgressDialogOpen(false);
      setEmpProgressForm({ employee_id: "", module_id: "", status: "completed", quiz_score: "" });
      toast.success("Progress training staf disimpan");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteEmpProgressMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny.from("employee_training_progress").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-training-progress"] });
      toast.success("Data progress dihapus");
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["agent-training-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_training_progress")
        .select("*, agent:agents(id, full_name), module:training_modules(title)");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title, description: form.description || null,
        category: form.category, content_type: form.content_type,
        content_url: form.content_url || null, content_text: form.content_text || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        is_mandatory: form.is_mandatory, order_index: parseInt(form.order_index) || 0,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("training_modules").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_modules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      setDialogOpen(false); setEditingId(null); setForm({ ...EMPTY_FORM });
      toast.success(editingId ? "Modul diperbarui" : "Modul baru ditambahkan");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      toast.success("Modul dihapus");
    },
  });

  const filtered = modules.filter((m: any) =>
    !search || m.title?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({
      title: m.title, description: m.description || "", category: m.category,
      content_type: m.content_type, content_url: m.content_url || "",
      content_text: m.content_text || "", duration_minutes: m.duration_minutes?.toString() || "",
      is_mandatory: m.is_mandatory, order_index: m.order_index?.toString() || "0", is_active: m.is_active,
    });
    setDialogOpen(true);
  };

  const mandatory   = modules.filter((m: any) => m.is_mandatory).length;
  const totalAgents = [...new Set(progress.map((p: any) => p.agent_id))].length;
  const completed   = progress.filter((p: any) => p.status === "completed").length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 rounded-xl">
            <GraduationCap className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Modul Pelatihan Agen</h1>
            <p className="text-muted-foreground text-sm">Buat modul pelatihan, quiz, dan pantau progress agen</p>
          </div>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Modul Baru
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Modul",   value: modules.length, icon: BookOpen,    color: "text-blue-600" },
          { label: "Wajib",         value: mandatory,       icon: Target,      color: "text-red-600" },
          { label: "Agen Aktif",    value: totalAgents,     icon: Users,       color: "text-green-600" },
          { label: "Sudah Lulus",   value: completed,       icon: CheckCircle2,color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color}`} />
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="modules" className="gap-2"><BookOpen className="h-4 w-4" /> Daftar Modul</TabsTrigger>
          <TabsTrigger value="progress" className="gap-2"><BarChart3 className="h-4 w-4" /> Progress Agen</TabsTrigger>
          <TabsTrigger value="staf" className="gap-2"><Building2 className="h-4 w-4" /> Staf Internal</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari modul..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Memuat...</CardContent></Card>
            ) : !filtered.length ? (
              <Card className="col-span-full"><CardContent className="py-10 text-center text-muted-foreground">
                <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                Belum ada modul. Pastikan tabel training_modules sudah dibuat di Supabase.
              </CardContent></Card>
            ) : filtered.map((m: any) => (
              <Card key={m.id} className={`relative ${!m.is_active ? "opacity-60" : ""}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm line-clamp-2">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{CATEGORIES.find(c => c.value === m.category)?.label}</p>
                    </div>
                    <div className="flex gap-1">
                      {m.is_mandatory && <Badge variant="destructive" className="text-[9px]">Wajib</Badge>}
                      {!m.is_active && <Badge variant="outline" className="text-[9px]">Nonaktif</Badge>}
                    </div>
                  </div>
                  {m.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{CONTENT_TYPES.find(c => c.value === m.content_type)?.label}</Badge>
                      {m.duration_minutes && <span>{m.duration_minutes} menit</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(m)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => deleteMutation.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agen</TableHead>
                    <TableHead>Modul</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nilai Quiz</TableHead>
                    <TableHead>Selesai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!progress.length ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data progress agen</TableCell></TableRow>
                  ) : progress.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.agent?.full_name || "—"}</TableCell>
                      <TableCell className="text-sm">{p.module?.title || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "completed" ? "secondary" : p.status === "failed" ? "destructive" : "outline"} className="text-xs">
                          {p.status === "completed" ? "Selesai" : p.status === "in_progress" ? "Sedang Belajar" : p.status === "failed" ? "Gagal" : "Belum Mulai"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.quiz_score != null ? `${p.quiz_score}%` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.completed_at ? format(new Date(p.completed_at), "dd MMM yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Staf Internal Tab ─── */}
        <TabsContent value="staf" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Pantau progress pelatihan karyawan internal. Berbeda dengan progress agen.
            </p>
            <Button size="sm" onClick={() => {
              setEmpProgressForm({ employee_id: "", module_id: "", status: "completed", quiz_score: "" });
              setEmpProgressDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" /> Catat Progress
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Staf Dilatih", value: [...new Set((employeeProgress as any[]).map((p: any) => p.employee_id))].length, icon: Users },
              { label: "Sudah Selesai",       value: (employeeProgress as any[]).filter((p: any) => p.status === "completed").length, icon: CheckCircle2 },
              { label: "Sedang Berjalan",     value: (employeeProgress as any[]).filter((p: any) => p.status === "in_progress").length, icon: Clock },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-4 flex items-center gap-3">
                  <s.icon className="h-6 w-6 text-muted-foreground" />
                  <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Modul</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nilai Quiz</TableHead>
                    <TableHead>Selesai</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!(employeeProgress as any[]).length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        Belum ada data progress pelatihan staf internal
                      </TableCell>
                    </TableRow>
                  ) : (employeeProgress as any[]).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{p.employee?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{p.employee?.employee_code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.module?.title || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[p.status]?.variant ?? "outline"} className="text-xs">
                          {STATUS_BADGE[p.status]?.label ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.quiz_score != null ? `${p.quiz_score}%` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.completed_at ? format(new Date(p.completed_at), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => deleteEmpProgressMutation.mutate(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Dialog Catat Progress Staf ─── */}
      <Dialog open={empProgressDialogOpen} onOpenChange={setEmpProgressDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Catat Progress Pelatihan Staf</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Karyawan *</Label>
              <Select value={empProgressForm.employee_id} onValueChange={v => setEmpProgressForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                <SelectContent>
                  {(employees as any[]).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name} — {e.employee_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modul *</Label>
              <Select value={empProgressForm.module_id} onValueChange={v => setEmpProgressForm(f => ({ ...f, module_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih modul..." /></SelectTrigger>
                <SelectContent>
                  {(modules as any[]).filter((m: any) => m.is_active).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={empProgressForm.status} onValueChange={v => setEmpProgressForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Belum Mulai</SelectItem>
                    <SelectItem value="in_progress">Sedang Belajar</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="failed">Gagal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nilai Quiz (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={empProgressForm.quiz_score}
                  onChange={e => setEmpProgressForm(f => ({ ...f, quiz_score: e.target.value }))}
                  placeholder="0–100"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpProgressDialogOpen(false)}>Batal</Button>
            <Button
              onClick={() => saveEmpProgressMutation.mutate()}
              disabled={saveEmpProgressMutation.isPending || !empProgressForm.employee_id || !empProgressForm.module_id}
            >
              {saveEmpProgressMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Modul" : "Modul Pelatihan Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Judul Modul *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Deskripsi</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipe Konten</Label>
                <Select value={form.content_type} onValueChange={v => setForm(f => ({ ...f, content_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTENT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {(form.content_type === "video" || form.content_type === "pdf") && (
              <div><Label>URL Konten</Label><Input value={form.content_url} onChange={e => setForm(f => ({ ...f, content_url: e.target.value }))} placeholder="https://youtube.com/... atau URL PDF" /></div>
            )}
            {(form.content_type === "text" || form.content_type === "mixed") && (
              <div><Label>Konten Teks</Label><Textarea value={form.content_text} onChange={e => setForm(f => ({ ...f, content_text: e.target.value }))} rows={4} placeholder="Tulis materi di sini..." /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Durasi (menit)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} /></div>
              <div><Label>Urutan</Label><Input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: e.target.value }))} /></div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_mandatory} onCheckedChange={v => setForm(f => ({ ...f, is_mandatory: v }))} />
                <Label>Wajib</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Aktif</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
