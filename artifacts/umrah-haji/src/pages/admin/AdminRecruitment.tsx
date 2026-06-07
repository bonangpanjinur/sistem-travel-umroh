import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Briefcase, Plus, Search, Users, UserCheck, ChevronRight,
  Trash2, Edit, Building2, CalendarDays, X, Eye, Phone,
  Mail, FileText, ArrowRight, CheckCircle2, XCircle, Clock,
  Star, SendHorizontal,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const JOB_STATUS = {
  draft:   { label: "Draft",    color: "bg-gray-100 text-gray-700 dark:bg-gray-800" },
  open:    { label: "Dibuka",   color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  closed:  { label: "Ditutup", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  filled:  { label: "Terisi",  color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
};

const APPLICANT_STATUS = {
  applied:    { label: "Lamaran",   color: "bg-slate-100 text-slate-700",   icon: FileText },
  screening:  { label: "Screening", color: "bg-amber-100 text-amber-800",  icon: Search },
  interview:  { label: "Interview", color: "bg-blue-100 text-blue-800",    icon: Users },
  offered:    { label: "Penawaran", color: "bg-purple-100 text-purple-800", icon: Star },
  hired:      { label: "Diterima",  color: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  rejected:   { label: "Ditolak",  color: "bg-red-100 text-red-700",      icon: XCircle },
};

const PIPELINE_ORDER = ["applied","screening","interview","offered","hired","rejected"] as const;

const EMPTY_JOB = {
  title: "", department: "", description: "", requirements: "",
  salary_min: "", salary_max: "", deadline: "", status: "draft",
};

const EMPTY_APPLICANT = {
  full_name: "", email: "", phone: "", cover_letter: "",
  status: "applied", interview_date: "", notes: "",
};

export default function AdminRecruitment() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("postings");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [jobDialog, setJobDialog] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState({ ...EMPTY_JOB });

  const [applicantDialog, setApplicantDialog] = useState(false);
  const [editingApplicantId, setEditingApplicantId] = useState<string | null>(null);
  const [applicantForm, setApplicantForm] = useState({ ...EMPTY_APPLICANT });

  const [viewApplicantId, setViewApplicantId] = useState<string | null>(null);

  const { data: postings = [], isLoading: loadingPostings } = useQuery({
    queryKey: ["job-postings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_postings")
        .select("*, branch:branches(name)")
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: applicants = [], isLoading: loadingApplicants } = useQuery({
    queryKey: ["job-applicants", selectedJobId],
    enabled: !!selectedJobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applicants")
        .select("*")
        .eq("job_posting_id", selectedJobId)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: allApplicants = [] } = useQuery({
    queryKey: ["job-applicants-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_applicants")
        .select("id, job_posting_id, status");
      return data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").order("name");
      return data || [];
    },
  });

  const saveJobMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: jobForm.title, department: jobForm.department || null,
        description: jobForm.description || null, requirements: jobForm.requirements || null,
        salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : null,
        salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : null,
        deadline: jobForm.deadline || null, status: jobForm.status,
      };
      if (editingJobId) {
        const { error } = await supabase.from("job_postings").update(payload).eq("id", editingJobId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_postings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-postings"] });
      setJobDialog(false); setEditingJobId(null); setJobForm({ ...EMPTY_JOB });
      toast.success(editingJobId ? "Lowongan diperbarui" : "Lowongan baru ditambahkan");
    },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan"),
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_postings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-postings"] });
      if (selectedJobId) setSelectedJobId(null);
      toast.success("Lowongan dihapus");
    },
    onError: (e: any) => toast.error(e.message || "Gagal menghapus"),
  });

  const saveApplicantMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        job_posting_id: selectedJobId,
        full_name: applicantForm.full_name, email: applicantForm.email,
        phone: applicantForm.phone || null, cover_letter: applicantForm.cover_letter || null,
        status: applicantForm.status, notes: applicantForm.notes || null,
        interview_date: applicantForm.interview_date || null,
      };
      if (editingApplicantId) {
        const { error } = await supabase.from("job_applicants").update(payload).eq("id", editingApplicantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_applicants").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applicants", selectedJobId] });
      qc.invalidateQueries({ queryKey: ["job-applicants-all"] });
      setApplicantDialog(false); setEditingApplicantId(null); setApplicantForm({ ...EMPTY_APPLICANT });
      toast.success(editingApplicantId ? "Pelamar diperbarui" : "Pelamar ditambahkan");
    },
    onError: (e: any) => toast.error(e.message || "Gagal menyimpan"),
  });

  const updateApplicantStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("job_applicants").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applicants", selectedJobId] });
      qc.invalidateQueries({ queryKey: ["job-applicants-all"] });
      toast.success("Status pelamar diperbarui");
    },
    onError: (e: any) => toast.error(e.message || "Gagal memperbarui"),
  });

  const deleteApplicantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_applicants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applicants", selectedJobId] });
      qc.invalidateQueries({ queryKey: ["job-applicants-all"] });
      toast.success("Pelamar dihapus");
    },
    onError: (e: any) => toast.error(e.message || "Gagal menghapus"),
  });

  const applicantCountPerJob = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    (allApplicants as any[]).forEach((a: any) => {
      if (!map[a.job_posting_id]) map[a.job_posting_id] = {};
      map[a.job_posting_id][a.status] = (map[a.job_posting_id][a.status] || 0) + 1;
    });
    return map;
  }, [allApplicants]);

  const filteredPostings = useMemo(() => {
    let list = postings as any[];
    if (statusFilter !== "all") list = list.filter((p: any) => p.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.title?.toLowerCase().includes(q) || p.department?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [postings, statusFilter, search]);

  const selectedJob = useMemo(() => (postings as any[]).find((p: any) => p.id === selectedJobId), [postings, selectedJobId]);

  const kanbanColumns = useMemo(() => {
    const cols: Record<string, any[]> = {};
    PIPELINE_ORDER.forEach(s => { cols[s] = []; });
    (applicants as any[]).forEach((a: any) => {
      if (cols[a.status]) cols[a.status].push(a);
    });
    return cols;
  }, [applicants]);

  const openEditJob = (job: any) => {
    setEditingJobId(job.id);
    setJobForm({
      title: job.title, department: job.department || "", description: job.description || "",
      requirements: job.requirements || "", salary_min: job.salary_min?.toString() || "",
      salary_max: job.salary_max?.toString() || "", deadline: job.deadline || "", status: job.status,
    });
    setJobDialog(true);
  };

  const openEditApplicant = (a: any) => {
    setEditingApplicantId(a.id);
    setApplicantForm({
      full_name: a.full_name, email: a.email || "", phone: a.phone || "",
      cover_letter: a.cover_letter || "", status: a.status,
      interview_date: a.interview_date ? a.interview_date.slice(0, 16) : "",
      notes: a.notes || "",
    });
    setApplicantDialog(true);
  };

  const viewApplicant = useMemo(() =>
    viewApplicantId ? (applicants as any[]).find((a: any) => a.id === viewApplicantId) : null,
    [viewApplicantId, applicants]
  );

  const stats = useMemo(() => {
    const open = (postings as any[]).filter((p: any) => p.status === "open").length;
    const allApps = allApplicants as any[];
    const totalApps = allApps.length;
    const hired = allApps.filter((a: any) => a.status === "hired").length;
    const pending = allApps.filter((a: any) => ["applied","screening","interview","offered"].includes(a.status)).length;
    return { open, totalApps, hired, pending };
  }, [postings, allApplicants]);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl">
            <Briefcase className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rekrutmen & ATS</h1>
            <p className="text-muted-foreground text-sm">Kelola lowongan dan tracking pelamar dari lamaran hingga onboarding</p>
          </div>
        </div>
        {tab === "postings" && (
          <Button onClick={() => { setEditingJobId(null); setJobForm({ ...EMPTY_JOB }); setJobDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Buka Lowongan
          </Button>
        )}
        {tab === "applicants" && selectedJobId && (
          <Button onClick={() => { setEditingApplicantId(null); setApplicantForm({ ...EMPTY_APPLICANT }); setApplicantDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Pelamar
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Lowongan Aktif", value: stats.open, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Total Pelamar", value: stats.totalApps, icon: Users, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900/30" },
          { label: "Proses Seleksi", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Diterima (Hired)", value: stats.hired, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className={`border-none shadow-sm ${bg}`}>
            <CardContent className="pt-3 pb-3 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color} shrink-0`} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v); if (v === "postings") setSelectedJobId(null); }}>
        <TabsList>
          <TabsTrigger value="postings" className="gap-2">
            <Briefcase className="h-4 w-4" /> Lowongan Kerja
          </TabsTrigger>
          <TabsTrigger value="applicants" className="gap-2" disabled={!selectedJobId}>
            <Users className="h-4 w-4" />
            {selectedJobId ? `Pelamar — ${selectedJob?.title || ""}` : "Pilih Lowongan dulu"}
          </TabsTrigger>
        </TabsList>

        {/* ─── Postings Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="postings" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari posisi atau departemen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(JOB_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingPostings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
            </div>
          ) : filteredPostings.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Belum ada lowongan</p>
              <p className="text-sm mt-1">Klik "Buka Lowongan" untuk membuat posisi baru</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPostings.map((job: any) => {
                const counts = applicantCountPerJob[job.id] || {};
                const total = Object.values(counts).reduce((a: any, b: any) => a + b, 0);
                const statusInfo = JOB_STATUS[job.status as keyof typeof JOB_STATUS];
                return (
                  <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => { setSelectedJobId(job.id); setTab("applicants"); }}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm leading-tight">{job.title}</p>
                          {job.department && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {job.department}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusInfo?.color}`}>
                          {statusInfo?.label}
                        </span>
                      </div>

                      <div className="flex gap-2 flex-wrap mb-3">
                        {(["applied","screening","interview"] as const).map(s => (
                          <div key={s} className="text-[10px] text-muted-foreground">
                            {APPLICANT_STATUS[s].label}: <strong>{counts[s] || 0}</strong>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{total} pelamar</span>
                        </div>
                        {job.deadline && (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            <span>{format(parseISO(job.deadline), "dd MMM yyyy", { locale: idLocale })}</span>
                          </div>
                        )}
                      </div>

                      {(job.salary_min || job.salary_max) && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-2">
                          {job.salary_min && job.salary_max
                            ? `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`
                            : job.salary_min ? `min. ${formatCurrency(job.salary_min)}`
                            : `max. ${formatCurrency(job.salary_max)}`}
                        </p>
                      )}

                      <div className="flex gap-1 mt-3 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={e => { e.stopPropagation(); openEditJob(job); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                          onClick={e => { e.stopPropagation(); if (confirm("Hapus lowongan ini?")) deleteJobMutation.mutate(job.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                          onClick={e => { e.stopPropagation(); setSelectedJobId(job.id); setTab("applicants"); }}>
                          Pelamar <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Applicants Kanban Tab ────────────────────────────────────────── */}
        <TabsContent value="applicants" className="mt-4">
          {!selectedJobId ? (
            <div className="py-20 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Pilih lowongan kerja terlebih dahulu</p>
            </div>
          ) : loadingApplicants ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-52 h-64 shrink-0" />)}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setTab("postings"); }}>
                  Lowongan
                </Button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-foreground">{selectedJob?.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {(applicants as any[]).length} pelamar
                </Badge>
              </div>

              {(applicants as any[]).length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Belum ada pelamar</p>
                  <p className="text-sm mt-1">Klik "Tambah Pelamar" untuk mencatat pelamar baru</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-6">
                  {PIPELINE_ORDER.map(status => {
                    const info = APPLICANT_STATUS[status];
                    const IconComp = info.icon;
                    const cols = kanbanColumns[status] || [];
                    return (
                      <div key={status} className="w-56 shrink-0">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${info.color} mb-2`}>
                          <IconComp className="h-3.5 w-3.5" />
                          <span className="text-xs font-bold">{info.label}</span>
                          <span className="ml-auto text-xs font-bold">{cols.length}</span>
                        </div>
                        <div className="space-y-2 min-h-24">
                          {cols.map((a: any) => (
                            <div key={a.id}
                              className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between gap-1 mb-1.5">
                                <p className="font-semibold text-xs leading-tight">{a.full_name}</p>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0"
                                  onClick={() => setViewApplicantId(a.id)}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                              {a.email && (
                                <p className="text-[10px] text-muted-foreground truncate">{a.email}</p>
                              )}
                              {a.interview_date && (
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                                  🗓 {format(parseISO(a.interview_date), "dd MMM HH:mm", { locale: idLocale })}
                                </p>
                              )}
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {PIPELINE_ORDER.filter(s => s !== status && s !== "rejected").slice(0, 2).map(nextStatus => (
                                  <button
                                    key={nextStatus}
                                    onClick={() => updateApplicantStatusMutation.mutate({ id: a.id, status: nextStatus })}
                                    className="text-[9px] border rounded px-1.5 py-0.5 hover:bg-muted transition-colors"
                                    title={`Pindah ke ${APPLICANT_STATUS[nextStatus as keyof typeof APPLICANT_STATUS].label}`}
                                  >
                                    → {APPLICANT_STATUS[nextStatus as keyof typeof APPLICANT_STATUS].label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-1 mt-1.5 justify-end">
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0"
                                  onClick={() => openEditApplicant(a)}>
                                  <Edit className="h-2.5 w-2.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-500"
                                  onClick={() => { if (confirm("Hapus?")) deleteApplicantMutation.mutate(a.id); }}>
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Job Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={jobDialog} onOpenChange={setJobDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJobId ? "Edit Lowongan" : "Buka Lowongan Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Posisi / Jabatan *</Label>
              <Input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
                placeholder="cth: Marketing Executive" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Departemen</Label>
                <Input value={jobForm.department} onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))}
                  placeholder="cth: Penjualan" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={jobForm.status} onValueChange={v => setJobForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(JOB_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Deskripsi Pekerjaan</Label>
              <Textarea value={jobForm.description}
                onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Tulis tanggung jawab, tugas, dan scope pekerjaan..." />
            </div>
            <div>
              <Label>Persyaratan</Label>
              <Textarea value={jobForm.requirements}
                onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))}
                rows={3} placeholder="Pendidikan minimum, pengalaman, keahlian yang dibutuhkan..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gaji Minimum (IDR)</Label>
                <Input type="number" value={jobForm.salary_min}
                  onChange={e => setJobForm(f => ({ ...f, salary_min: e.target.value }))}
                  placeholder="3000000" />
              </div>
              <div>
                <Label>Gaji Maksimum (IDR)</Label>
                <Input type="number" value={jobForm.salary_max}
                  onChange={e => setJobForm(f => ({ ...f, salary_max: e.target.value }))}
                  placeholder="6000000" />
              </div>
            </div>
            <div>
              <Label>Batas Lamaran</Label>
              <Input type="date" value={jobForm.deadline}
                onChange={e => setJobForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobDialog(false)}>Batal</Button>
            <Button onClick={() => saveJobMutation.mutate()}
              disabled={saveJobMutation.isPending || !jobForm.title}>
              {saveJobMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Applicant Dialog ────────────────────────────────────────────────── */}
      <Dialog open={applicantDialog} onOpenChange={setApplicantDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingApplicantId ? "Edit Pelamar" : "Tambah Pelamar"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Lengkap *</Label>
              <Input value={applicantForm.full_name}
                onChange={e => setApplicantForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={applicantForm.email}
                  onChange={e => setApplicantForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label>No HP</Label>
                <Input value={applicantForm.phone}
                  onChange={e => setApplicantForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={applicantForm.status} onValueChange={v => setApplicantForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(APPLICANT_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {applicantForm.status === "interview" && (
              <div>
                <Label>Jadwal Interview</Label>
                <Input type="datetime-local" value={applicantForm.interview_date}
                  onChange={e => setApplicantForm(f => ({ ...f, interview_date: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Cover Letter / Ringkasan</Label>
              <Textarea rows={3} value={applicantForm.cover_letter}
                onChange={e => setApplicantForm(f => ({ ...f, cover_letter: e.target.value }))}
                placeholder="Ringkasan singkat atau catatan pelamar..." />
            </div>
            <div>
              <Label>Catatan Rekruter</Label>
              <Textarea rows={2} value={applicantForm.notes}
                onChange={e => setApplicantForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Kesan, kelebihan, kekurangan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplicantDialog(false)}>Batal</Button>
            <Button onClick={() => saveApplicantMutation.mutate()}
              disabled={saveApplicantMutation.isPending || !applicantForm.full_name}>
              {saveApplicantMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Applicant Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!viewApplicantId} onOpenChange={() => setViewApplicantId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pelamar</DialogTitle>
          </DialogHeader>
          {viewApplicant && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {viewApplicant.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-base">{viewApplicant.full_name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${APPLICANT_STATUS[viewApplicant.status as keyof typeof APPLICANT_STATUS]?.color}`}>
                    {APPLICANT_STATUS[viewApplicant.status as keyof typeof APPLICANT_STATUS]?.label}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {viewApplicant.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <a href={`mailto:${viewApplicant.email}`} className="hover:text-foreground">{viewApplicant.email}</a>
                  </div>
                )}
                {viewApplicant.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <a href={`tel:${viewApplicant.phone}`} className="hover:text-foreground">{viewApplicant.phone}</a>
                  </div>
                )}
                {viewApplicant.interview_date && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>{format(parseISO(viewApplicant.interview_date), "dd MMMM yyyy, HH:mm", { locale: idLocale })}</span>
                  </div>
                )}
              </div>
              {viewApplicant.cover_letter && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Cover Letter</p>
                  <p className="text-sm whitespace-pre-wrap">{viewApplicant.cover_letter}</p>
                </div>
              )}
              {viewApplicant.notes && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">Catatan Rekruter</p>
                  <p className="text-sm">{viewApplicant.notes}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Melamar: {format(parseISO(viewApplicant.created_at), "dd MMMM yyyy", { locale: idLocale })}
              </p>
              <div className="flex gap-2 flex-wrap">
                {PIPELINE_ORDER.filter(s => s !== viewApplicant.status).map(s => (
                  <Button key={s} size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => { updateApplicantStatusMutation.mutate({ id: viewApplicant.id, status: s }); setViewApplicantId(null); }}>
                    <ArrowRight className="h-3 w-3 mr-1" />
                    {APPLICANT_STATUS[s as keyof typeof APPLICANT_STATUS].label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
