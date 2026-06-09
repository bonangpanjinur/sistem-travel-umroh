import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  GraduationCap, Plus, Trash2, Search, CheckCircle2, Clock,
  Users, BookOpen, BarChart3, UserCheck, AlertCircle, ChevronDown,
  ChevronUp, Play, RefreshCw, Briefcase, Building2, Edit,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
  position?: string;
  department?: string;
  created_at?: string;
}

interface TrainingModule {
  id: string;
  title: string;
  category: string;
  content_type: string;
  is_mandatory: boolean;
  target_audience: string;
  duration_minutes?: number;
  is_active: boolean;
}

interface CurriculumItem {
  id: string;
  position_name: string;
  module_id: string;
  is_mandatory: boolean;
  due_days: number;
  sort_order: number;
  module?: TrainingModule;
}

interface EmployeeProgress {
  id: string;
  employee_id: string;
  module_id: string;
  status: string;
  quiz_score?: number;
  completed_at?: string;
  notes?: string;
  updated_at?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  not_started: { label: "Belum Mulai",    color: "bg-gray-100 text-gray-600",    icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "Sedang Belajar", color: "bg-blue-100 text-blue-700",    icon: <Play className="h-3 w-3" /> },
  completed:   { label: "Selesai",        color: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="h-3 w-3" /> },
  failed:      { label: "Gagal",          color: "bg-red-100 text-red-700",      icon: <AlertCircle className="h-3 w-3" /> },
};

const EMPTY_CURRICULUM = { position_name: "", module_id: "", is_mandatory: true, due_days: 30, sort_order: 0 };
const EMPTY_PROGRESS = { employee_id: "", module_id: "", status: "in_progress", quiz_score: "", notes: "" };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminHRTraining() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterPos, setFilterPos] = useState("all");
  const [expandedPos, setExpandedPos] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState("");

  // Dialogs
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [curriculumForm, setCurriculumForm] = useState({ ...EMPTY_CURRICULUM });
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressForm, setProgressForm] = useState<typeof EMPTY_PROGRESS & { editing_id?: string }>({ ...EMPTY_PROGRESS });

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["hr-training-employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id,full_name,employee_code,position,department,created_at")
        .eq("is_active", true)
        .order("full_name");
      if (error) return [];
      return data ?? [];
    },
  });

  const { data: staffModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["hr-training-staff-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("id,title,category,content_type,is_mandatory,target_audience,duration_minutes,is_active")
        .in("target_audience", ["staff", "all"])
        .eq("is_active", true)
        .order("order_index");
      if (error) return [];
      return data ?? [];
    },
  });

  const { data: curricula = [], isLoading: loadingCurricula } = useQuery<CurriculumItem[]>({
    queryKey: ["position-training-curricula"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("position_training_curricula")
        .select("*, module:training_modules(id,title,category,is_mandatory)")
        .order("sort_order");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data ?? [];
    },
  });

  const { data: allProgress = [], isLoading: loadingProgress } = useQuery<EmployeeProgress[]>({
    queryKey: ["hr-training-all-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_training_progress")
        .select("id,employee_id,module_id,status,quiz_score,completed_at,notes,updated_at");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data ?? [];
    },
  });

  // ─── Derived Data ─────────────────────────────────────────────────────────────
  const departments = useMemo(() =>
    ["all", ...Array.from(new Set(employees.map(e => e.department).filter(Boolean) as string[]))],
    [employees]
  );

  const positions = useMemo(() =>
    ["all", ...Array.from(new Set(employees.map(e => e.position).filter(Boolean) as string[]))],
    [employees]
  );

  const curriculaByPosition = useMemo(() => {
    const map = new Map<string, CurriculumItem[]>();
    curricula.forEach(c => {
      if (!map.has(c.position_name)) map.set(c.position_name, []);
      map.get(c.position_name)!.push(c);
    });
    return map;
  }, [curricula]);

  const progressByEmployee = useMemo(() => {
    const map = new Map<string, EmployeeProgress[]>();
    allProgress.forEach(p => {
      if (!map.has(p.employee_id)) map.set(p.employee_id, []);
      map.get(p.employee_id)!.push(p);
    });
    return map;
  }, [allProgress]);

  const employeeStats = useMemo(() => {
    return employees.map(emp => {
      const required = curriculaByPosition.get(emp.position ?? "") ?? [];
      const empProgress = progressByEmployee.get(emp.id) ?? [];
      const total = required.length;
      const completed = empProgress.filter(p =>
        p.status === "completed" && required.some(r => r.module_id === p.module_id)
      ).length;
      const inProgress = empProgress.filter(p =>
        p.status === "in_progress" && required.some(r => r.module_id === p.module_id)
      ).length;
      const notStarted = total - completed - inProgress;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const statusLabel =
        total === 0 ? "no_curriculum" :
        pct === 100 ? "completed" :
        inProgress > 0 ? "in_progress" : "not_started";
      return { emp, total, completed, inProgress, notStarted, pct, statusLabel };
    });
  }, [employees, curriculaByPosition, progressByEmployee]);

  const filteredStats = useMemo(() => {
    return employeeStats.filter(({ emp }) => {
      const q = search.toLowerCase();
      if (q && !emp.full_name.toLowerCase().includes(q) && !(emp.employee_code ?? "").toLowerCase().includes(q)) return false;
      if (filterDept !== "all" && emp.department !== filterDept) return false;
      if (filterPos !== "all" && emp.position !== filterPos) return false;
      return true;
    });
  }, [employeeStats, search, filterDept, filterPos]);

  const overallStats = useMemo(() => {
    const withCurriculum = employeeStats.filter(s => s.total > 0);
    return {
      totalModules: staffModules.length,
      totalCurriculum: curricula.length,
      employeesWithCurriculum: withCurriculum.length,
      completed: withCurriculum.filter(s => s.statusLabel === "completed").length,
      inProgress: withCurriculum.filter(s => s.statusLabel === "in_progress").length,
    };
  }, [employeeStats, staffModules, curricula]);

  const selectedEmpData = useMemo(() => {
    if (!selectedEmpId) return null;
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) return null;
    const required = curriculaByPosition.get(emp.position ?? "") ?? [];
    const empProgress = progressByEmployee.get(emp.id) ?? [];
    const modules = required.map(r => {
      const prog = empProgress.find(p => p.module_id === r.module_id);
      return {
        curriculum: r,
        module: r.module ?? staffModules.find(m => m.id === r.module_id),
        progress: prog,
      };
    });
    // Also add progress for modules not in curriculum
    const extraProgress = empProgress.filter(p => !required.some(r => r.module_id === p.module_id));
    return { emp, modules, extraProgress };
  }, [selectedEmpId, employees, curriculaByPosition, progressByEmployee, staffModules]);

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const saveCurriculumMutation = useMutation({
    mutationFn: async () => {
      if (!curriculumForm.position_name || !curriculumForm.module_id)
        throw new Error("Jabatan dan modul wajib dipilih");
      const payload = {
        position_name: curriculumForm.position_name.trim(),
        module_id: curriculumForm.module_id,
        is_mandatory: curriculumForm.is_mandatory,
        due_days: Number(curriculumForm.due_days) || 30,
        sort_order: Number(curriculumForm.sort_order) || 0,
      };
      const { error } = await supabase
        .from("position_training_curricula")
        .upsert(payload, { onConflict: "position_name,module_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["position-training-curricula"] });
      toast.success("Kurikulum jabatan disimpan");
      setIsCurriculumOpen(false);
      setCurriculumForm({ ...EMPTY_CURRICULUM });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCurriculumMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("position_training_curricula").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["position-training-curricula"] });
      toast.success("Item kurikulum dihapus");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const applyToPositionMutation = useMutation({
    mutationFn: async (positionName: string) => {
      const mods = curriculaByPosition.get(positionName) ?? [];
      if (!mods.length) throw new Error("Tidak ada modul di kurikulum ini");
      const empsWithPos = employees.filter(e => e.position === positionName);
      if (!empsWithPos.length) throw new Error("Tidak ada karyawan dengan jabatan ini");
      const rows: any[] = [];
      empsWithPos.forEach(emp => {
        const empProg = progressByEmployee.get(emp.id) ?? [];
        mods.forEach(m => {
          const already = empProg.find(p => p.module_id === m.module_id);
          if (!already) {
            rows.push({ employee_id: emp.id, module_id: m.module_id, status: "not_started" });
          }
        });
      });
      if (!rows.length) throw new Error("Semua karyawan sudah memiliki kurikulum ini");
      const { error } = await supabase.from("employee_training_progress").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["hr-training-all-progress"] });
      toast.success(`Kurikulum diterapkan ke ${count} karyawan`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignToEmployeeMutation = useMutation({
    mutationFn: async (empId: string) => {
      const emp = employees.find(e => e.id === empId);
      if (!emp) throw new Error("Karyawan tidak ditemukan");
      const mods = curriculaByPosition.get(emp.position ?? "") ?? [];
      if (!mods.length) throw new Error("Tidak ada kurikulum untuk jabatan ini");
      const empProg = progressByEmployee.get(empId) ?? [];
      const rows = mods
        .filter(m => !empProg.find(p => p.module_id === m.module_id))
        .map(m => ({ employee_id: empId, module_id: m.module_id, status: "not_started" }));
      if (!rows.length) throw new Error("Semua modul sudah ditugaskan");
      const { error } = await supabase.from("employee_training_progress").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["hr-training-all-progress"] });
      toast.success(`${count} modul berhasil ditugaskan`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveProgressMutation = useMutation({
    mutationFn: async () => {
      if (!progressForm.employee_id || !progressForm.module_id)
        throw new Error("Pilih karyawan dan modul");
      const payload: any = {
        employee_id: progressForm.employee_id,
        module_id: progressForm.module_id,
        status: progressForm.status,
        quiz_score: progressForm.quiz_score ? parseFloat(progressForm.quiz_score) : null,
        notes: progressForm.notes || null,
        updated_at: new Date().toISOString(),
      };
      if (progressForm.status === "completed") payload.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("employee_training_progress")
        .upsert(payload, { onConflict: "employee_id,module_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-training-all-progress"] });
      setIsProgressOpen(false);
      setProgressForm({ ...EMPTY_PROGRESS });
      toast.success("Progress training diperbarui");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProgressMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_training_progress").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-training-all-progress"] });
      toast.success("Data progress dihapus");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function openProgressDialog(empId?: string, modId?: string, existing?: EmployeeProgress) {
    setProgressForm({
      employee_id: empId ?? "",
      module_id: modId ?? "",
      status: existing?.status ?? "in_progress",
      quiz_score: existing?.quiz_score != null ? String(existing.quiz_score) : "",
      notes: existing?.notes ?? "",
      editing_id: existing?.id,
    });
    setIsProgressOpen(true);
  }

  const statusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
        {cfg.icon}{cfg.label}
      </span>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Training Staf Internal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola kurikulum pelatihan per jabatan, pantau progress onboarding karyawan baru
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => qc.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
          <Button onClick={() => { setCurriculumForm({ ...EMPTY_CURRICULUM }); setIsCurriculumOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Tambah Kurikulum
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100"><BookOpen className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Modul Staf</p><p className="text-2xl font-bold">{overallStats.totalModules}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100"><Briefcase className="h-5 w-5 text-purple-600" /></div>
            <div><p className="text-xs text-muted-foreground">Kurikulum Jabatan</p><p className="text-2xl font-bold">{overallStats.totalCurriculum}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100"><Users className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Karyawan Terlatih</p><p className="text-2xl font-bold">{overallStats.employeesWithCurriculum}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">Selesai Semua</p><p className="text-2xl font-bold">{overallStats.completed}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Progress Karyawan</TabsTrigger>
          <TabsTrigger value="curriculum"><BookOpen className="h-4 w-4 mr-1" />Kurikulum Per Jabatan</TabsTrigger>
          <TabsTrigger value="individual"><UserCheck className="h-4 w-4 mr-1" />Detail Karyawan</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Dashboard Progress ─────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama / kode karyawan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[180px]"><Building2 className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d} value={d}>{d === "all" ? "Semua Departemen" : d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPos} onValueChange={setFilterPos}>
              <SelectTrigger className="w-[180px]"><Briefcase className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {positions.map(p => <SelectItem key={p} value={p}>{p === "all" ? "Semua Jabatan" : p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Jabatan / Dept</TableHead>
                    <TableHead className="text-center">Modul Selesai</TableHead>
                    <TableHead className="w-[180px]">Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Tidak ada karyawan ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredStats.map(({ emp, total, completed, inProgress, pct, statusLabel }) => (
                    <TableRow key={emp.id} className="hover:bg-muted/40">
                      <TableCell>
                        <p className="font-medium text-sm">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{emp.position || <span className="text-muted-foreground">—</span>}</p>
                        <p className="text-xs text-muted-foreground">{emp.department}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        {total > 0
                          ? <span className="font-semibold">{completed}<span className="text-muted-foreground font-normal">/{total}</span></span>
                          : <span className="text-xs text-muted-foreground">Belum ada kurikulum</span>}
                      </TableCell>
                      <TableCell>
                        {total > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className="text-xs font-mono w-8 text-right">{pct}%</span>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {statusLabel === "no_curriculum" && <span className="text-xs text-muted-foreground">Belum diatur</span>}
                        {statusLabel === "completed" && statusBadge("completed")}
                        {statusLabel === "in_progress" && (
                          <div className="space-y-0.5">
                            {statusBadge("in_progress")}
                            {inProgress > 0 && <p className="text-xs text-muted-foreground">{inProgress} sedang berjalan</p>}
                          </div>
                        )}
                        {statusLabel === "not_started" && statusBadge("not_started")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => { setSelectedEmpId(emp.id); setTab("individual"); }}
                          >
                            Detail
                          </Button>
                          {total === 0 && emp.position && (
                            <Button
                              size="sm" variant="outline"
                              disabled={assignToEmployeeMutation.isPending}
                              onClick={() => assignToEmployeeMutation.mutate(emp.id)}
                            >
                              Assign
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Kurikulum Per Jabatan ──────────────────────────────────────── */}
        <TabsContent value="curriculum" className="space-y-4 mt-4">
          {loadingCurricula ? (
            <p className="text-sm text-muted-foreground text-center py-10">Memuat kurikulum...</p>
          ) : curriculaByPosition.size === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada kurikulum jabatan</p>
              <p className="text-sm mt-1">Klik "Tambah Kurikulum" untuk mulai memetakan modul ke jabatan tertentu.</p>
            </Card>
          ) : (
            Array.from(curriculaByPosition.entries()).map(([posName, items]) => {
              const isExpanded = expandedPos === posName;
              const empCount = employees.filter(e => e.position === posName).length;
              return (
                <Card key={posName} className="overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => setExpandedPos(isExpanded ? null : posName)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{posName}</p>
                        <p className="text-xs text-muted-foreground">
                          {items.length} modul · {empCount} karyawan
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm" variant="default"
                        onClick={e => { e.stopPropagation(); applyToPositionMutation.mutate(posName); }}
                        disabled={applyToPositionMutation.isPending}
                      >
                        <Play className="h-3 w-3 mr-1" />Terapkan ke Karyawan
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama Modul</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-center">Tipe</TableHead>
                            <TableHead className="text-center">Wajib</TableHead>
                            <TableHead className="text-center">Due (hari)</TableHead>
                            <TableHead className="text-right">Hapus</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium text-sm">{item.module?.title ?? item.module_id}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{item.module?.category ?? "—"}</Badge></TableCell>
                              <TableCell className="text-center text-xs">{item.module?.content_type ?? "—"}</TableCell>
                              <TableCell className="text-center">
                                {item.is_mandatory
                                  ? <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">Wajib</Badge>
                                  : <Badge variant="outline" className="text-xs">Opsional</Badge>}
                              </TableCell>
                              <TableCell className="text-center text-sm font-mono">{item.due_days}h</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="icon" variant="ghost"
                                  onClick={() => { if (confirm("Hapus modul dari kurikulum ini?")) deleteCurriculumMutation.mutate(item.id); }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="p-3 border-t bg-muted/30">
                        <Button
                          size="sm" variant="outline"
                          onClick={() => { setCurriculumForm({ ...EMPTY_CURRICULUM, position_name: posName }); setIsCurriculumOpen(true); }}
                        >
                          <Plus className="h-3 w-3 mr-1" />Tambah Modul ke Jabatan Ini
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Tab 3: Detail Karyawan ─────────────────────────────────────────────── */}
        <TabsContent value="individual" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 space-y-1">
              <Label>Pilih Karyawan</Label>
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder="— Pilih karyawan —" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code}) — {e.position ?? "Jabatan belum diatur"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmpId && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { openProgressDialog(selectedEmpId); }}
                >
                  <Plus className="h-4 w-4 mr-1" />Input Progress Manual
                </Button>
                <Button
                  onClick={() => assignToEmployeeMutation.mutate(selectedEmpId)}
                  disabled={assignToEmployeeMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-1" />Assign Kurikulum Jabatan
                </Button>
              </div>
            )}
          </div>

          {selectedEmpData ? (
            <div className="space-y-4">
              {/* Employee Info Card */}
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {selectedEmpData.emp.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{selectedEmpData.emp.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmpData.emp.employee_code} · {selectedEmpData.emp.position ?? "—"} · {selectedEmpData.emp.department ?? "—"}
                    </p>
                  </div>
                  {selectedEmpData.modules.length > 0 && (() => {
                    const total = selectedEmpData.modules.length;
                    const done = selectedEmpData.modules.filter(m => m.progress?.status === "completed").length;
                    const pct = Math.round((done / total) * 100);
                    return (
                      <div className="text-right">
                        <p className="text-2xl font-bold">{pct}%</p>
                        <p className="text-xs text-muted-foreground">{done}/{total} modul selesai</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Required Modules from Curriculum */}
              {selectedEmpData.modules.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Modul dari Kurikulum Jabatan
                      <Badge className="ml-2 text-xs" variant="secondary">{selectedEmpData.emp.position}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Modul</TableHead>
                          <TableHead className="text-center">Tipe</TableHead>
                          <TableHead className="text-center">Wajib</TableHead>
                          <TableHead className="text-center">Due</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Skor</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmpData.modules.map(({ curriculum, module, progress }) => (
                          <TableRow key={curriculum.id}>
                            <TableCell>
                              <p className="font-medium text-sm">{module?.title ?? curriculum.module_id}</p>
                              {module?.category && <p className="text-xs text-muted-foreground">{module.category}</p>}
                            </TableCell>
                            <TableCell className="text-center text-xs">{module?.content_type ?? "—"}</TableCell>
                            <TableCell className="text-center">
                              {curriculum.is_mandatory
                                ? <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">Wajib</Badge>
                                : <Badge variant="outline" className="text-xs">Opsional</Badge>}
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono">{curriculum.due_days}h</TableCell>
                            <TableCell>{statusBadge(progress?.status ?? "not_started")}</TableCell>
                            <TableCell className="text-center text-sm font-mono">
                              {progress?.quiz_score != null ? `${progress.quiz_score}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => openProgressDialog(selectedEmpData.emp.id, curriculum.module_id, progress)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />Update
                                </Button>
                                {progress?.id && (
                                  <Button
                                    size="icon" variant="ghost"
                                    onClick={() => deleteProgressMutation.mutate(progress.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Extra progress not in curriculum */}
              {selectedEmpData.extraProgress.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Modul Tambahan (di luar kurikulum jabatan)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Modul</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Skor</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEmpData.extraProgress.map(prog => {
                          const mod = staffModules.find(m => m.id === prog.module_id);
                          return (
                            <TableRow key={prog.id}>
                              <TableCell className="text-sm">{mod?.title ?? prog.module_id}</TableCell>
                              <TableCell>{statusBadge(prog.status)}</TableCell>
                              <TableCell className="text-center text-sm font-mono">
                                {prog.quiz_score != null ? `${prog.quiz_score}%` : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm" variant="ghost"
                                  onClick={() => openProgressDialog(selectedEmpData.emp.id, prog.module_id, prog)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />Update
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {selectedEmpData.modules.length === 0 && selectedEmpData.extraProgress.length === 0 && (
                <Card className="p-10 text-center text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Belum ada modul untuk karyawan ini</p>
                  <p className="text-sm mt-1">
                    {selectedEmpData.emp.position
                      ? `Klik "Assign Kurikulum Jabatan" untuk menerapkan kurikulum jabatan "${selectedEmpData.emp.position}"`
                      : "Jabatan karyawan belum diatur. Atur jabatan di halaman SDM/HR terlebih dahulu."}
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => assignToEmployeeMutation.mutate(selectedEmpData.emp.id)}
                    disabled={assignToEmployeeMutation.isPending || !selectedEmpData.emp.position}
                  >
                    <Play className="h-4 w-4 mr-1" />Assign Kurikulum Jabatan
                  </Button>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-10 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Pilih karyawan di atas untuk melihat detail progress training mereka</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Tambah Kurikulum ─────────────────────────────────────────── */}
      <Dialog open={isCurriculumOpen} onOpenChange={setIsCurriculumOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Tambah Kurikulum Jabatan
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Jabatan *</Label>
              <Input
                placeholder="Contoh: Sales, Operasional, Finance..."
                value={curriculumForm.position_name}
                onChange={e => setCurriculumForm(f => ({ ...f, position_name: e.target.value }))}
                list="existing-positions"
              />
              <datalist id="existing-positions">
                {positions.filter(p => p !== "all").map(p => <option key={p} value={p} />)}
              </datalist>
              <p className="text-xs text-muted-foreground">Masukkan jabatan yang sudah ada atau jabatan baru</p>
            </div>
            <div className="space-y-1.5">
              <Label>Modul Training *</Label>
              <Select value={curriculumForm.module_id} onValueChange={v => setCurriculumForm(f => ({ ...f, module_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih modul training..." /></SelectTrigger>
                <SelectContent>
                  {staffModules.length === 0 && (
                    <SelectItem value="_none" disabled>Belum ada modul staf. Buat di halaman Pelatihan Staf.</SelectItem>
                  )}
                  {staffModules.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title} {m.is_mandatory ? "⭐" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due (hari dari penugasan)</Label>
                <Input
                  type="number" min="1" max="365"
                  value={curriculumForm.due_days}
                  onChange={e => setCurriculumForm(f => ({ ...f, due_days: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Urutan</Label>
                <Input
                  type="number" min="0"
                  value={curriculumForm.sort_order}
                  onChange={e => setCurriculumForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={curriculumForm.is_mandatory}
                onCheckedChange={v => setCurriculumForm(f => ({ ...f, is_mandatory: v }))}
              />
              <Label>Wajib diselesaikan (mandatory)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCurriculumOpen(false)}>Batal</Button>
            <Button
              onClick={() => saveCurriculumMutation.mutate()}
              disabled={saveCurriculumMutation.isPending || !curriculumForm.position_name || !curriculumForm.module_id}
            >
              {saveCurriculumMutation.isPending ? "Menyimpan..." : "Simpan Kurikulum"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Update Progress ──────────────────────────────────────────── */}
      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Update Progress Training
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!progressForm.employee_id && (
              <div className="space-y-1.5">
                <Label>Karyawan *</Label>
                <Select value={progressForm.employee_id} onValueChange={v => setProgressForm(f => ({ ...f, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!progressForm.module_id && (
              <div className="space-y-1.5">
                <Label>Modul *</Label>
                <Select value={progressForm.module_id} onValueChange={v => setProgressForm(f => ({ ...f, module_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih modul..." /></SelectTrigger>
                  <SelectContent>
                    {staffModules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={progressForm.status} onValueChange={v => setProgressForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Skor Quiz (%)</Label>
              <Input
                type="number" min="0" max="100"
                placeholder="0 – 100"
                value={progressForm.quiz_score}
                onChange={e => setProgressForm(f => ({ ...f, quiz_score: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                rows={2}
                placeholder="Catatan tambahan..."
                value={progressForm.notes}
                onChange={e => setProgressForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProgressOpen(false)}>Batal</Button>
            <Button
              onClick={() => saveProgressMutation.mutate()}
              disabled={saveProgressMutation.isPending || !progressForm.employee_id || !progressForm.module_id}
            >
              {saveProgressMutation.isPending ? "Menyimpan..." : "Simpan Progress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
