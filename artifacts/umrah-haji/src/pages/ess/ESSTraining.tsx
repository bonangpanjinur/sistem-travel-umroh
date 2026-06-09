import { useEffect, useState, useMemo } from "react";
import { ESSLayout } from "@/components/ess/ESSLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, CheckCircle2, Clock, Play, BookOpen,
  ExternalLink, BarChart3, Trophy, Layers, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrainingModule {
  id: string;
  title: string;
  description?: string;
  category: string;
  content_type: string;
  content_url?: string;
  duration_minutes?: number;
  is_mandatory: boolean;
  target_audience: string;
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

interface MyProgress {
  id: string;
  employee_id: string;
  module_id: string;
  status: string;
  quiz_score?: number;
  completed_at?: string;
  notes?: string;
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  not_started: { label: "Belum Dimulai",  cls: "bg-slate-100 text-slate-600",   icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: "Sedang Belajar", cls: "bg-blue-100 text-blue-700",     icon: <Play className="w-3.5 h-3.5" /> },
  completed:   { label: "Selesai",        cls: "bg-green-100 text-green-700",   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  failed:      { label: "Perlu Diulang",  cls: "bg-red-100 text-red-700",       icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const CATEGORY_COLORS: Record<string, string> = {
  orientation:  "bg-violet-100 text-violet-700",
  compliance:   "bg-red-100 text-red-700",
  product:      "bg-amber-100 text-amber-700",
  skills:       "bg-blue-100 text-blue-700",
  safety:       "bg-orange-100 text-orange-700",
  default:      "bg-slate-100 text-slate-600",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  video: "Video", pdf: "PDF", quiz: "Kuis", article: "Artikel",
  presentation: "Presentasi", link: "Tautan",
};

export default function ESSTraining() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("employees")
      .select("id,full_name,position,department,employee_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => setEmployee(data));
  }, [user]);

  const empId: string | undefined = employee?.id;

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: curricula = [] } = useQuery<CurriculumItem[]>({
    queryKey: ["ess-curricula", employee?.position],
    enabled: !!employee?.position,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("position_training_curricula")
        .select("*, module:training_modules(id,title,description,category,content_type,content_url,duration_minutes,is_mandatory,target_audience)")
        .eq("position_name", employee.position)
        .order("sort_order");
      if (error) {
        if (error.code === "42P01") return [];
        return [];
      }
      return data ?? [];
    },
  });

  const { data: myProgress = [] } = useQuery<MyProgress[]>({
    queryKey: ["ess-my-training-progress", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_training_progress")
        .select("id,employee_id,module_id,status,quiz_score,completed_at,notes")
        .eq("employee_id", empId);
      if (error) {
        if (error.code === "42P01") return [];
        return [];
      }
      return data ?? [];
    },
  });

  const { data: extraModules = [] } = useQuery<TrainingModule[]>({
    queryKey: ["ess-extra-modules", empId],
    enabled: !!empId && myProgress.length > 0,
    queryFn: async () => {
      const curriculumModuleIds = new Set(curricula.map(c => c.module_id));
      const extraIds = myProgress
        .map(p => p.module_id)
        .filter(id => !curriculumModuleIds.has(id));
      if (!extraIds.length) return [];
      const { data } = await supabase
        .from("training_modules")
        .select("id,title,description,category,content_type,content_url,duration_minutes,is_mandatory")
        .in("id", extraIds);
      return data ?? [];
    },
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: async ({ moduleId, status }: { moduleId: string; status: string }) => {
      if (!empId) throw new Error("Data karyawan tidak ditemukan");
      const payload: any = {
        employee_id: empId,
        module_id: moduleId,
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "completed") payload.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("employee_training_progress")
        .upsert(payload, { onConflict: "employee_id,module_id" });
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["ess-my-training-progress", empId] });
      if (status === "in_progress") toast.success("Modul ditandai sedang dipelajari");
      if (status === "completed")   toast.success("Selamat! Modul berhasil diselesaikan 🎉");
    },
    onError: (e: any) => toast.error("Gagal memperbarui: " + e.message),
  });

  // ─── Derived ───────────────────────────────────────────────────────────────
  const progressMap = useMemo(() => {
    const m = new Map<string, MyProgress>();
    myProgress.forEach(p => m.set(p.module_id, p));
    return m;
  }, [myProgress]);

  const curriculumWithProgress = useMemo(() =>
    curricula.map(c => ({ curriculum: c, module: c.module!, progress: progressMap.get(c.module_id) }))
    .filter(item => !!item.module),
    [curricula, progressMap]
  );

  const extraWithProgress = useMemo(() => {
    const curriculumIds = new Set(curricula.map(c => c.module_id));
    return extraModules
      .map(m => ({ module: m, progress: progressMap.get(m.id) }))
      .filter(item => !curriculumIds.has(item.module.id));
  }, [extraModules, curricula, progressMap]);

  const stats = useMemo(() => {
    const total = curriculumWithProgress.length;
    const completed = curriculumWithProgress.filter(i => i.progress?.status === "completed").length;
    const inProgress = curriculumWithProgress.filter(i => i.progress?.status === "in_progress").length;
    const mandatory = curriculumWithProgress.filter(i => i.curriculum.is_mandatory).length;
    const mandatoryDone = curriculumWithProgress.filter(i => i.curriculum.is_mandatory && i.progress?.status === "completed").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, mandatory, mandatoryDone, pct };
  }, [curriculumWithProgress]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function statusBadge(status?: string) {
    const cfg = STATUS_CFG[status ?? "not_started"] ?? STATUS_CFG.not_started;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
        {cfg.icon}{cfg.label}
      </span>
    );
  }

  function categoryBadge(cat: string) {
    const cls = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default;
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>{cat}</span>;
  }

  function ModuleCard({ module, progress, isMandatory, dueDays }: {
    module: TrainingModule;
    progress?: MyProgress;
    isMandatory?: boolean;
    dueDays?: number;
  }) {
    const status = progress?.status ?? "not_started";
    const isDone = status === "completed";
    const isStarted = status === "in_progress";
    const isPending = updateStatusMutation.isPending;

    return (
      <Card className={`transition-all border ${isDone ? "border-green-200 bg-green-50/40" : isStarted ? "border-blue-200" : "border-slate-200"}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {categoryBadge(module.category)}
                {isMandatory && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Wajib</span>
                )}
                {dueDays && <span className="text-xs text-slate-400">Due: {dueDays} hari</span>}
              </div>
              <h3 className="font-semibold text-slate-800 text-sm leading-snug">{module.title}</h3>
              {module.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{module.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                {module.content_type && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {CONTENT_TYPE_LABELS[module.content_type] ?? module.content_type}
                  </span>
                )}
                {module.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {module.duration_minutes} menit
                  </span>
                )}
                {progress?.quiz_score != null && (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Trophy className="w-3 h-3" />
                    Skor: {progress.quiz_score}%
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0">{statusBadge(status)}</div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {module.content_url && (
              <Button
                size="sm" variant="outline"
                className="text-xs h-7 gap-1"
                onClick={() => window.open(module.content_url, "_blank")}
              >
                <ExternalLink className="w-3 h-3" />Buka Materi
              </Button>
            )}
            {!isDone && !isStarted && (
              <Button
                size="sm" variant="default"
                className="text-xs h-7 bg-blue-600 hover:bg-blue-700 gap-1"
                disabled={isPending}
                onClick={() => updateStatusMutation.mutate({ moduleId: module.id, status: "in_progress" })}
              >
                <Play className="w-3 h-3" />Mulai Belajar
              </Button>
            )}
            {isStarted && (
              <Button
                size="sm" variant="default"
                className="text-xs h-7 bg-green-600 hover:bg-green-700 gap-1"
                disabled={isPending}
                onClick={() => updateStatusMutation.mutate({ moduleId: module.id, status: "completed" })}
              >
                <CheckCircle2 className="w-3 h-3" />Tandai Selesai
              </Button>
            )}
            {isDone && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />Selesai
                {progress?.completed_at && (
                  <span className="text-slate-400 font-normal ml-1">
                    {new Date(progress.completed_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ESSLayout title="Training Saya">
      <div className="space-y-6 max-w-3xl">

        {/* Header + progress summary */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-5 h-5 text-blue-200" />
            <p className="text-blue-100 text-sm">Kurikulum Jabatan</p>
          </div>
          <h2 className="text-xl font-bold">{employee?.position ?? "—"}</h2>
          <p className="text-blue-200 text-sm mt-0.5">{employee?.department}</p>

          {stats.total > 0 ? (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-100">{stats.completed} dari {stats.total} modul selesai</span>
                <span className="font-bold">{stats.pct}%</span>
              </div>
              <Progress value={stats.pct} className="h-2.5 bg-blue-800/50 [&>div]:bg-white" />
              <div className="flex gap-4 text-xs text-blue-200 mt-1">
                {stats.inProgress > 0 && <span><Play className="w-3 h-3 inline mr-0.5" />{stats.inProgress} sedang berjalan</span>}
                <span><AlertCircle className="w-3 h-3 inline mr-0.5" />{stats.mandatory} modul wajib · {stats.mandatoryDone} selesai</span>
              </div>
            </div>
          ) : (
            <p className="text-blue-200 text-sm mt-3">
              {employee?.position ? "Kurikulum untuk jabatan ini belum ditetapkan" : "Jabatan belum diatur, hubungi HR"}
            </p>
          )}
        </div>

        {/* Stats cards */}
        {stats.total > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <CardContent className="p-3">
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-400 mt-0.5">Total Modul</p>
              </CardContent>
            </Card>
            <Card className="text-center border-green-200 bg-green-50/40">
              <CardContent className="p-3">
                <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                <p className="text-xs text-slate-400 mt-0.5">Selesai</p>
              </CardContent>
            </Card>
            <Card className="text-center border-blue-200 bg-blue-50/40">
              <CardContent className="p-3">
                <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
                <p className="text-xs text-slate-400 mt-0.5">Sedang Belajar</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Curriculum modules */}
        {curriculumWithProgress.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-700">Modul Kurikulum Jabatan</h2>
              <Badge variant="secondary" className="text-xs">{curriculumWithProgress.length} modul</Badge>
            </div>
            {curriculumWithProgress.map(({ curriculum, module, progress }) => (
              <ModuleCard
                key={curriculum.id}
                module={module}
                progress={progress}
                isMandatory={curriculum.is_mandatory}
                dueDays={curriculum.due_days}
              />
            ))}
          </section>
        ) : (
          employee && (
            <Card className="p-8 text-center text-slate-400">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-600">Belum ada kurikulum training</p>
              <p className="text-sm mt-1">
                {employee.position
                  ? `Kurikulum untuk jabatan "${employee.position}" belum ditetapkan oleh HR.`
                  : "Jabatan Anda belum diatur. Hubungi HR untuk informasi lebih lanjut."}
              </p>
            </Card>
          )
        )}

        {/* Extra modules */}
        {extraWithProgress.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-700">Modul Tambahan</h2>
              <Badge variant="secondary" className="text-xs">{extraWithProgress.length} modul</Badge>
            </div>
            {extraWithProgress.map(({ module, progress }) => (
              <ModuleCard key={module.id} module={module} progress={progress} />
            ))}
          </section>
        )}

        {/* Completion message */}
        {stats.total > 0 && stats.pct === 100 && (
          <Card className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-5 flex items-center gap-4">
              <Trophy className="w-10 h-10 text-amber-500 shrink-0" />
              <div>
                <p className="font-bold text-green-800">Selamat! Anda telah menyelesaikan semua modul 🎉</p>
                <p className="text-sm text-green-600 mt-0.5">Capaian Anda telah tercatat dan akan ditinjau oleh tim HR.</p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </ESSLayout>
  );
}
