import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Pencil, Trash2, Users, CheckCircle2,
  Clock, AlertCircle, ChevronDown, ChevronUp, Search,
  LayoutTemplate, UserCheck, Calendar, RefreshCw, FileDown,
} from "lucide-react";
import OnboardingReportDialog from "@/components/hr/OnboardingReportDialog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Employee { id: string; full_name: string; employee_code: string; position?: string; department?: string }
interface OnboardingTemplate { id: string; name: string; description?: string; category: string; is_active: boolean; items?: TemplateItem[] }
interface TemplateItem { id: string; template_id: string; title: string; description?: string; category: string; due_days: number; is_required: boolean; sort_order: number }
interface OnboardingTask { id: string; employee_id: string; template_item_id?: string; title: string; description?: string; category: string; due_date?: string; status: string; completed_at?: string; notes?: string; sort_order: number }

const TASK_CATEGORY_LABELS: Record<string, string> = {
  orientasi: "Orientasi", administrasi: "Administrasi",
  akses_sistem: "Akses Sistem", pelatihan: "Pelatihan", lainnya: "Lainnya",
};
const TASK_CATEGORY_COLORS: Record<string, string> = {
  orientasi: "bg-blue-100 text-blue-800",
  administrasi: "bg-yellow-100 text-yellow-800",
  akses_sistem: "bg-purple-100 text-purple-800",
  pelatihan: "bg-green-100 text-green-800",
  lainnya: "bg-gray-100 text-gray-700",
};
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "Belum",       color: "bg-gray-100 text-gray-600",   icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "Sedang",      color: "bg-blue-100 text-blue-700",   icon: <RefreshCw className="h-3 w-3" /> },
  done:        { label: "Selesai",     color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  skipped:     { label: "Dilewati",   color: "bg-orange-100 text-orange-700", icon: <AlertCircle className="h-3 w-3" /> },
};

const EMPTY_TEMPLATE = { name: "", description: "", category: "general", is_active: true };
const EMPTY_ITEM = { title: "", description: "", category: "orientasi", due_days: 1, is_required: true, sort_order: 0 };
const EMPTY_TASK = { title: "", description: "", category: "orientasi", due_date: "", status: "pending", notes: "", sort_order: 0 };

export default function AdminOnboarding() {
  const qc = useQueryClient();

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("dashboard");

  // ── Search / filter ───────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Employee detail expansion ─────────────────────────────────────────────
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // ── Report dialog ──────────────────────────────────────────────────────────
  const [isReportOpen, setIsReportOpen] = useState(false);

  // ── Assign template dialog ─────────────────────────────────────────────────
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().split("T")[0]);

  // ── Template dialog ────────────────────────────────────────────────────────
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<typeof EMPTY_TEMPLATE>({ ...EMPTY_TEMPLATE });

  // ── Template Item dialog ───────────────────────────────────────────────────
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<typeof EMPTY_ITEM>({ ...EMPTY_ITEM });

  // ── Manual task dialog ─────────────────────────────────────────────────────
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEmployeeId, setTaskEmployeeId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<typeof EMPTY_TASK>({ ...EMPTY_TASK });

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id,full_name,employee_code,position,department")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return (data ?? []).map((e) => ({
        ...e,
        position: e.position ?? undefined,
        department: e.department ?? undefined,
      }));
    },
  });

  const supabaseAny = supabase as any;

  const { data: templates = [] } = useQuery<OnboardingTemplate[]>({
    queryKey: ["onboarding-templates"],
    queryFn: async () => {

      const { data, error } = await (supabase as any)

      const { data, error } = await supabaseAny

        .from("onboarding_templates")
        .select("*, items:onboarding_template_items(*)")
        .order("name");
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        items: (t.items ?? []).sort((a: TemplateItem, b: TemplateItem) => a.sort_order - b.sort_order),
      }));
    },
  });

  const { data: allTasks = [] } = useQuery<OnboardingTask[]>({
    queryKey: ["employee-onboarding-tasks"],
    queryFn: async () => {

      const { data, error } = await (supabase as any)

      const { data, error } = await supabaseAny

        .from("employee_onboarding_tasks")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── Derived: employees with tasks ────────────────────────────────────────
  const employeesWithTasks = employees.filter(e =>
    allTasks.some(t => t.employee_id === e.id)
  );
  const employeesWithoutTasks = employees.filter(e =>
    !allTasks.some(t => t.employee_id === e.id)
  );

  const getEmployeeTasks = (empId: string) =>
    allTasks.filter(t => t.employee_id === empId).sort((a, b) => a.sort_order - b.sort_order);

  const calcProgress = (tasks: OnboardingTask[]) => {
    if (!tasks.length) return 0;
    const done = tasks.filter(t => t.status === "done" || t.status === "skipped").length;
    return Math.round((done / tasks.length) * 100);
  };

  const overallStats = {
    total: employeesWithTasks.length,
    completed: employeesWithTasks.filter(e => calcProgress(getEmployeeTasks(e.id)) === 100).length,
    inProgress: employeesWithTasks.filter(e => {
      const p = calcProgress(getEmployeeTasks(e.id));
      return p > 0 && p < 100;
    }).length,
    notStarted: employeesWithTasks.filter(e => calcProgress(getEmployeeTasks(e.id)) === 0).length,
  };

  // filtered employees (dashboard tab)
  const filteredEmployees = employeesWithTasks.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (statusFilter === "all") return true;
    const p = calcProgress(getEmployeeTasks(e.id));
    if (statusFilter === "completed") return p === 100;
    if (statusFilter === "in_progress") return p > 0 && p < 100;
    if (statusFilter === "not_started") return p === 0;
    return true;
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!assignEmployeeId || !assignTemplateId) throw new Error("Pilih karyawan dan template");
      const tmpl = templates.find(t => t.id === assignTemplateId);
      if (!tmpl?.items?.length) throw new Error("Template tidak memiliki item");
      const startDate = new Date(assignStartDate);
      const rows = tmpl.items.map((item, idx) => {
        const due = new Date(startDate);
        due.setDate(due.getDate() + item.due_days - 1);
        return {
          employee_id: assignEmployeeId,
          template_item_id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          due_date: due.toISOString().split("T")[0],
          status: "pending",
          sort_order: idx,
        };
      });

      const { error } = await (supabase as any).from("employee_onboarding_tasks").insert(rows);

      const { error } = await supabaseAny.from("employee_onboarding_tasks").insert(rows);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-onboarding-tasks"] });
      toast.success("Checklist onboarding berhasil ditetapkan!");
      setIsAssignOpen(false);
      setAssignEmployeeId("");
      setAssignTemplateId("");
      setActiveTab("dashboard");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {

      const { error } = await (supabase as any).from("employee_onboarding_tasks").update({ status }).eq("id", id);

      const { error } = await supabaseAny.from("employee_onboarding_tasks").update({ status }).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-onboarding-tasks"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const saveTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskEmployeeId || !taskForm.title) throw new Error("Judul task wajib diisi");
      const payload = { ...taskForm, employee_id: taskEmployeeId };
      if (editingTaskId) {

        const { error } = await (supabase as any).from("employee_onboarding_tasks").update(payload).eq("id", editingTaskId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("employee_onboarding_tasks").insert(payload);

        const { error } = await supabaseAny.from("employee_onboarding_tasks").update(payload).eq("id", editingTaskId);
        if (error) throw error;
      } else {
        const { error } = await supabaseAny.from("employee_onboarding_tasks").insert(payload);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-onboarding-tasks"] });
      toast.success(editingTaskId ? "Task diperbarui" : "Task ditambahkan");
      setIsTaskOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {

      const { error } = await (supabase as any).from("employee_onboarding_tasks").delete().eq("id", id);

      const { error } = await supabaseAny.from("employee_onboarding_tasks").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-onboarding-tasks"] });
      toast.success("Task dihapus");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!templateForm.name) throw new Error("Nama template wajib diisi");
      if (editingTemplateId) {

        const { error } = await (supabase as any).from("onboarding_templates").update(templateForm).eq("id", editingTemplateId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("onboarding_templates").insert(templateForm);

        const { error } = await supabaseAny.from("onboarding_templates").update(templateForm).eq("id", editingTemplateId);
        if (error) throw error;
      } else {
        const { error } = await supabaseAny.from("onboarding_templates").insert(templateForm);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      toast.success(editingTemplateId ? "Template diperbarui" : "Template dibuat");
      setIsTemplateOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {

      const { error } = await (supabase as any).from("onboarding_templates").delete().eq("id", id);

      const { error } = await supabaseAny.from("onboarding_templates").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      toast.success("Template dihapus");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveItemMutation = useMutation({
    mutationFn: async () => {
      if (!activeTemplateId || !itemForm.title) throw new Error("Judul item wajib diisi");
      const payload = { ...itemForm, template_id: activeTemplateId };
      if (editingItemId) {

        const { error } = await (supabase as any).from("onboarding_template_items").update(payload).eq("id", editingItemId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("onboarding_template_items").insert(payload);

        const { error } = await supabaseAny.from("onboarding_template_items").update(payload).eq("id", editingItemId);
        if (error) throw error;
      } else {
        const { error } = await supabaseAny.from("onboarding_template_items").insert(payload);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-templates"] });
      toast.success(editingItemId ? "Item diperbarui" : "Item ditambahkan");
      setIsItemOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {

      const { error } = await (supabase as any).from("onboarding_template_items").delete().eq("id", id);

      const { error } = await supabaseAny.from("onboarding_template_items").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding-templates"] }),
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const openAddTemplate = () => {
    setEditingTemplateId(null);
    setTemplateForm({ ...EMPTY_TEMPLATE });
    setIsTemplateOpen(true);
  };
  const openEditTemplate = (t: OnboardingTemplate) => {
    setEditingTemplateId(t.id);
    setTemplateForm({ name: t.name, description: t.description ?? "", category: t.category, is_active: t.is_active });
    setIsTemplateOpen(true);
  };
  const openAddItem = (templateId: string) => {
    setActiveTemplateId(templateId);
    setEditingItemId(null);
    setItemForm({ ...EMPTY_ITEM });
    setIsItemOpen(true);
  };
  const openEditItem = (item: TemplateItem) => {
    setActiveTemplateId(item.template_id);
    setEditingItemId(item.id);
    setItemForm({ title: item.title, description: item.description ?? "", category: item.category, due_days: item.due_days, is_required: item.is_required, sort_order: item.sort_order });
    setIsItemOpen(true);
  };
  const openAddTask = (empId: string) => {
    setTaskEmployeeId(empId);
    setEditingTaskId(null);
    setTaskForm({ ...EMPTY_TASK });
    setIsTaskOpen(true);
  };
  const openEditTask = (task: OnboardingTask) => {
    setTaskEmployeeId(task.employee_id);
    setEditingTaskId(task.id);
    setTaskForm({ title: task.title, description: task.description ?? "", category: task.category, due_date: task.due_date ?? "", status: task.status, notes: task.notes ?? "", sort_order: task.sort_order });
    setIsTaskOpen(true);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-blue-600" />
              Onboarding Karyawan Baru
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Pantau dan kelola checklist onboarding setiap karyawan baru
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIsReportOpen(true)}>
              <FileDown className="h-4 w-4 mr-1.5" /> Laporan & Ekspor PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setIsAssignOpen(true); setAssignEmployeeId(""); setAssignTemplateId(""); }}>
              <UserCheck className="h-4 w-4 mr-1.5" /> Tetapkan Checklist
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Onboarding", val: overallStats.total, icon: <Users className="h-5 w-5 text-blue-500" />, color: "bg-blue-50" },
            { label: "Selesai",          val: overallStats.completed, icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, color: "bg-green-50" },
            { label: "Sedang Proses",   val: overallStats.inProgress, icon: <RefreshCw className="h-5 w-5 text-yellow-500" />, color: "bg-yellow-50" },
            { label: "Belum Mulai",     val: overallStats.notStarted, icon: <Clock className="h-5 w-5 text-gray-500" />, color: "bg-gray-50" },
          ].map(s => (
            <Card key={s.label} className={`${s.color} border-0`}>
              <CardContent className="p-4 flex items-center gap-3">
                {s.icon}
                <div>
                  <div className="text-2xl font-bold">{s.val}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard"><Users className="h-4 w-4 mr-1.5" />Dashboard Karyawan</TabsTrigger>
            <TabsTrigger value="templates"><LayoutTemplate className="h-4 w-4 mr-1.5" />Template Checklist</TabsTrigger>
          </TabsList>

          {/* ── Tab: Dashboard ─────────────────────────────────────────────── */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="in_progress">Sedang Proses</SelectItem>
                  <SelectItem value="not_started">Belum Mulai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee cards */}
            {filteredEmployees.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Belum ada onboarding aktif</p>
                  <p className="text-sm mt-1">Klik "Tetapkan Checklist" untuk mulai</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredEmployees.map(emp => {
                  const tasks = getEmployeeTasks(emp.id);
                  const progress = calcProgress(tasks);
                  const isExpanded = expandedEmployee === emp.id;
                  const doneCount = tasks.filter(t => t.status === "done").length;
                  const overdueCount = tasks.filter(t =>
                    t.status === "pending" && t.due_date && new Date(t.due_date) < new Date()
                  ).length;

                  return (
                    <Card key={emp.id} className="overflow-hidden">
                      <CardHeader
                        className="py-3 px-4 cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setExpandedEmployee(isExpanded ? null : emp.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{emp.full_name}</span>
                              <span className="text-xs text-muted-foreground">{emp.employee_code}</span>
                              {emp.department && <Badge variant="outline" className="text-xs">{emp.department}</Badge>}
                              {overdueCount > 0 && (
                                <Badge className="bg-red-100 text-red-700 text-xs">
                                  {overdueCount} terlambat
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <Progress value={progress} className="flex-1 h-2" />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {doneCount}/{tasks.length} ({progress}%)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openAddTask(emp.id); }}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="px-4 pb-4 pt-0">
                          <div className="space-y-2">
                            {/* Group by category */}
                            {Object.entries(TASK_CATEGORY_LABELS).map(([cat, catLabel]) => {
                              const catTasks = tasks.filter(t => t.category === cat);
                              if (!catTasks.length) return null;
                              return (
                                <div key={cat}>
                                  <div className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1.5 font-medium ${TASK_CATEGORY_COLORS[cat]}`}>
                                    {catLabel}
                                  </div>
                                  <div className="space-y-1.5 pl-1">
                                    {catTasks.map(task => {
                                      const isDone = task.status === "done";
                                      const isOverdue = task.status === "pending" && task.due_date && new Date(task.due_date) < new Date();
                                      const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
                                      return (
                                        <div key={task.id} className={`flex items-start gap-3 p-2 rounded-md border transition-colors ${isDone ? "bg-green-50/50 border-green-100" : isOverdue ? "bg-red-50/50 border-red-100" : "bg-white border-gray-100"}`}>
                                          <Checkbox
                                            checked={isDone}
                                            onCheckedChange={checked =>
                                              updateTaskStatusMutation.mutate({ id: task.id, status: checked ? "done" : "pending" })
                                            }
                                            className="mt-0.5"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                              {task.title}
                                            </div>
                                            {task.description && (
                                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</div>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                              <Badge className={`text-xs gap-1 ${cfg.color}`}>
                                                {cfg.icon}{cfg.label}
                                              </Badge>
                                              {task.due_date && (
                                                <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                                  <Calendar className="h-3 w-3" />
                                                  {new Date(task.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex gap-1 shrink-0">
                                            <Select value={task.status} onValueChange={val => updateTaskStatusMutation.mutate({ id: task.id, status: val })}>
                                              <SelectTrigger className="h-7 w-[110px] text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="pending">Belum</SelectItem>
                                                <SelectItem value="in_progress">Sedang</SelectItem>
                                                <SelectItem value="done">Selesai</SelectItem>
                                                <SelectItem value="skipped">Dilewati</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditTask(task)}>
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTaskMutation.mutate(task.id)}>
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Employees without checklist */}
            {employeesWithoutTasks.length > 0 && (
              <Card className="border-dashed border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {employeesWithoutTasks.length} karyawan belum memiliki checklist onboarding
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {employeesWithoutTasks.map(e => (
                    <Button key={e.id} size="sm" variant="outline" className="text-xs h-7 border-orange-200"
                      onClick={() => { setAssignEmployeeId(e.id); setAssignTemplateId(""); setIsAssignOpen(true); }}>
                      <Plus className="h-3 w-3 mr-1" />{e.full_name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab: Templates ─────────────────────────────────────────────── */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={openAddTemplate}>
                <Plus className="h-4 w-4 mr-1.5" /> Template Baru
              </Button>
            </div>

            {templates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Belum ada template. Buat template pertama Anda.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {templates.map(tmpl => (
                  <Card key={tmpl.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base">{tmpl.name}</CardTitle>
                            <Badge variant="outline" className="text-xs capitalize">{tmpl.category}</Badge>
                            {!tmpl.is_active && <Badge className="bg-gray-100 text-gray-500 text-xs">Nonaktif</Badge>}
                          </div>
                          {tmpl.description && <p className="text-sm text-muted-foreground mt-1">{tmpl.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{tmpl.items?.length ?? 0} item checklist</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => openAddItem(tmpl.id)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Item
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditTemplate(tmpl)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTemplateMutation.mutate(tmpl.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {(tmpl.items?.length ?? 0) > 0 && (
                      <CardContent>
                        <div className="space-y-1.5">
                          {tmpl.items?.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{item.title}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge className={`text-xs ${TASK_CATEGORY_COLORS[item.category]}`}>
                                    {TASK_CATEGORY_LABELS[item.category]}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">Hari ke-{item.due_days}</span>
                                  {item.is_required && <span className="text-xs text-red-500">*wajib</span>}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditItem(item)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteItemMutation.mutate(item.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog: Assign Template ──────────────────────────────────────────── */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              Tetapkan Checklist Onboarding
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Karyawan *</Label>
              <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Template Checklist *</Label>
              <Select value={assignTemplateId} onValueChange={setAssignTemplateId}>
                <SelectTrigger><SelectValue placeholder="Pilih template..." /></SelectTrigger>
                <SelectContent>
                  {templates.filter(t => t.is_active).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.items?.length ?? 0} item)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Mulai *</Label>
              <Input type="date" value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Due date setiap task dihitung dari tanggal ini</p>
            </div>
            {assignTemplateId && (() => {
              const tmpl = templates.find(t => t.id === assignTemplateId);
              return tmpl?.items?.length ? (
                <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                  <div className="font-medium text-muted-foreground mb-1">{tmpl.items.length} task akan dibuat:</div>
                  {tmpl.items.slice(0, 4).map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded-full ${TASK_CATEGORY_COLORS[item.category]}`}>
                        {TASK_CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                  {tmpl.items.length > 4 && <div className="text-muted-foreground">+{tmpl.items.length - 4} lainnya...</div>}
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Batal</Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending || !assignEmployeeId || !assignTemplateId}
            >
              {assignMutation.isPending ? "Menetapkan..." : "Tetapkan Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Template ────────────────────────────────────────────────── */}
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-blue-500" />
              {editingTemplateId ? "Edit Template" : "Buat Template Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Template *</Label>
              <Input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="cth. Onboarding Staf Cabang" />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={templateForm.category} onValueChange={v => setTemplateForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Umum</SelectItem>
                  <SelectItem value="staff">Staf</SelectItem>
                  <SelectItem value="agent">Agen</SelectItem>
                  <SelectItem value="manager">Manajer</SelectItem>
                  <SelectItem value="it">IT / Teknis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea rows={2} value={templateForm.description} onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi singkat template ini..." />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={templateForm.is_active}
                onCheckedChange={v => setTemplateForm(f => ({ ...f, is_active: !!v }))}
              />
              <Label className="cursor-pointer">Template aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateOpen(false)}>Batal</Button>
            <Button onClick={() => saveTemplateMutation.mutate()} disabled={saveTemplateMutation.isPending || !templateForm.name}>
              {saveTemplateMutation.isPending ? "Menyimpan..." : editingTemplateId ? "Perbarui" : "Buat Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Template Item ────────────────────────────────────────────── */}
      <Dialog open={isItemOpen} onOpenChange={setIsItemOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              {editingItemId ? "Edit Item Checklist" : "Tambah Item Checklist"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Judul Task *</Label>
              <Input value={itemForm.title} onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))} placeholder="cth. Penandatanganan kontrak kerja" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_CATEGORY_LABELS).map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hari ke-</Label>
                <Input type="number" min={1} max={365} value={itemForm.due_days}
                  onChange={e => setItemForm(f => ({ ...f, due_days: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea rows={2} value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Penjelasan singkat task ini..." />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={itemForm.is_required} onCheckedChange={v => setItemForm(f => ({ ...f, is_required: !!v }))} />
              <Label className="cursor-pointer">Task wajib diselesaikan</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemOpen(false)}>Batal</Button>
            <Button onClick={() => saveItemMutation.mutate()} disabled={saveItemMutation.isPending || !itemForm.title}>
              {saveItemMutation.isPending ? "Menyimpan..." : editingItemId ? "Perbarui Item" : "Tambah Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Manual Task ──────────────────────────────────────────────── */}
      <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              {editingTaskId ? "Edit Task" : "Tambah Task Manual"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Judul Task *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Judul task..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={taskForm.category} onValueChange={v => setTaskForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_CATEGORY_LABELS).map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tenggat Waktu</Label>
              <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea rows={2} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea rows={1} value={taskForm.notes} onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan tambahan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskOpen(false)}>Batal</Button>
            <Button onClick={() => saveTaskMutation.mutate()} disabled={saveTaskMutation.isPending || !taskForm.title}>
              {saveTaskMutation.isPending ? "Menyimpan..." : editingTaskId ? "Perbarui Task" : "Tambah Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report Dialog ────────────────────────────────────────────────────── */}
      <OnboardingReportDialog
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        employees={employees as Employee[]}
        allTasks={allTasks as OnboardingTask[]}
      />
    </>
  );
}
