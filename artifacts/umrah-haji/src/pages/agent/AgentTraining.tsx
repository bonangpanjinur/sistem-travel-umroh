import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  GraduationCap, BookOpen, Play, CheckCircle2, Clock, Lock,
  Target, ArrowLeft, ExternalLink, Award, RefreshCcw, ChevronRight
} from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  product_knowledge: "Product Knowledge",
  script_penjualan: "Script Penjualan",
  sop: "SOP",
  regulasi: "Regulasi",
  lainnya: "Lainnya",
};

export default function AgentTraining() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [quizAnswers, setQuizAnswers]       = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted]   = useState(false);
  const [quizScore, setQuizScore]           = useState(0);
  const [viewMode, setViewMode]             = useState<"list" | "content" | "quiz">("list");

  const { data: agentData } = useQuery({
    queryKey: ["agent-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, full_name").eq("user_id", user?.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["training-modules-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: myProgress = [], refetch: refetchProgress } = useQuery({
    queryKey: ["my-training-progress", agentData?.id],
    queryFn: async () => {
      if (!agentData?.id) return [];
      const { data, error } = await supabase
        .from("agent_training_progress")
        .select("*")
        .eq("agent_id", agentData.id);
      if (error) {
        if (error.code === "42P01") return [];
        return [];
      }
      return data || [];
    },
    enabled: !!agentData?.id,
  });

  const { data: quizQuestions = [] } = useQuery({
    queryKey: ["training-quiz", selectedModule?.id],
    queryFn: async () => {
      if (!selectedModule?.id) return [];
      const { data, error } = await supabase
        .from("training_quizzes")
        .select("*")
        .eq("module_id", selectedModule.id)
        .order("order_index");
      if (error) {
        if (error.code === "42P01") return [];
        return [];
      }
      return data || [];
    },
    enabled: !!selectedModule?.id,
  });

  const startModule = useMutation({
    mutationFn: async (moduleId: string) => {
      if (!agentData?.id) throw new Error("Agent data tidak ditemukan");
      const existing = myProgress.find((p: any) => p.module_id === moduleId);
      if (!existing) {
        const { error } = await supabase.from("agent_training_progress").insert({
          agent_id: agentData.id, module_id: moduleId,
          status: "in_progress", started_at: new Date().toISOString(),
        });
        if (error && error.code !== "23505") throw error;
      }
    },
    onSuccess: () => {
      refetchProgress();
      setViewMode("content");
    },
  });

  const submitQuiz = useMutation({
    mutationFn: async ({ moduleId, score }: { moduleId: string; score: number }) => {
      if (!agentData?.id) throw new Error("Agent tidak ditemukan");
      const passed = score >= 70;
      const { error } = await supabase.from("agent_training_progress").upsert({
        agent_id: agentData.id, module_id: moduleId,
        status: passed ? "completed" : "failed",
        quiz_score: score,
        completed_at: passed ? new Date().toISOString() : null,
      }, { onConflict: "agent_id,module_id" });
      if (error) throw error;
      return { passed, score };
    },
    onSuccess: (result) => {
      refetchProgress();
      setQuizSubmitted(true);
      setQuizScore(result.score);
      if (result.passed) toast.success(`Selamat! Anda lulus dengan nilai ${result.score}%`);
      else toast.error(`Nilai Anda ${result.score}% — minimum 70% untuk lulus`);
    },
  });

  const getProgress = (moduleId: string) => myProgress.find((p: any) => p.module_id === moduleId);

  const totalModules    = modules.length;
  const completedCount  = myProgress.filter((p: any) => p.status === "completed").length;
  const mandatoryCount  = modules.filter((m: any) => m.is_mandatory).length;
  const mandatoryDone   = myProgress.filter((p: any) => {
    const mod = modules.find((m: any) => m.id === p.module_id);
    return mod?.is_mandatory && p.status === "completed";
  }).length;

  const openModule = (mod: any) => {
    setSelectedModule(mod);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setViewMode("content");
    startModule.mutate(mod.id);
  };

  const handleQuizSubmit = () => {
    if (!selectedModule) return;
    let correct = 0;
    for (const q of quizQuestions) {
      const opts = q.options as { text: string; is_correct: boolean }[];
      if (quizAnswers[q.id] !== undefined && opts[quizAnswers[q.id]]?.is_correct) correct++;
    }
    const score = quizQuestions.length > 0 ? Math.round((correct / quizQuestions.length) * 100) : 100;
    submitQuiz.mutate({ moduleId: selectedModule.id, score });
  };

  if (viewMode === "content" && selectedModule) {
    const prog = getProgress(selectedModule.id);
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-purple-600 text-white p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setViewMode("list")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">{selectedModule.title}</h1>
            <p className="text-xs opacity-80">{CATEGORY_LABELS[selectedModule.category]}</p>
          </div>
          {prog?.status === "completed" && <Badge className="bg-white/20 text-white">Selesai</Badge>}
        </div>
        <div className="p-4 pb-24 space-y-4">
          {selectedModule.content_url && (selectedModule.content_type === "video") && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                className="w-full h-full"
                src={selectedModule.content_url.replace("watch?v=", "embed/")}
                allowFullScreen
              />
            </div>
          )}
          {selectedModule.content_url && (selectedModule.content_type === "pdf") && (
            <Button variant="outline" className="w-full" onClick={() => window.open(selectedModule.content_url, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-2" /> Buka PDF Materi
            </Button>
          )}
          {selectedModule.content_text && (
            <Card>
              <CardContent className="pt-4 prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm font-sans">{selectedModule.content_text}</pre>
              </CardContent>
            </Card>
          )}

          {quizQuestions.length > 0 && (
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => setViewMode("quiz")}>
              <Target className="h-4 w-4 mr-2" /> Mulai Quiz ({quizQuestions.length} soal)
            </Button>
          )}
          {quizQuestions.length === 0 && prog?.status !== "completed" && (
            <Button className="w-full" onClick={() => submitQuiz.mutate({ moduleId: selectedModule.id, score: 100 })}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Tandai Selesai
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === "quiz" && selectedModule) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-purple-600 text-white p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setViewMode("content")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">Quiz: {selectedModule.title}</h1>
            <p className="text-xs opacity-80">{quizQuestions.length} soal · Minimum 70% untuk lulus</p>
          </div>
        </div>
        <div className="p-4 pb-24 space-y-4">
          {quizSubmitted ? (
            <Card className={`border-2 ${quizScore >= 70 ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50"}`}>
              <CardContent className="pt-6 text-center">
                {quizScore >= 70 ? (
                  <><Award className="h-12 w-12 text-yellow-500 mx-auto mb-3" /><p className="text-xl font-bold text-green-700">Selamat! Anda Lulus!</p></>
                ) : (
                  <><Target className="h-12 w-12 text-red-400 mx-auto mb-3" /><p className="text-xl font-bold text-red-700">Belum Lulus</p></>
                )}
                <p className="text-3xl font-black mt-2">{quizScore}%</p>
                <p className="text-sm text-muted-foreground mt-1">Nilai Anda</p>
                <div className="flex gap-2 mt-4">
                  {quizScore < 70 && (
                    <Button variant="outline" className="flex-1" onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}>
                      <RefreshCcw className="h-4 w-4 mr-1" /> Coba Lagi
                    </Button>
                  )}
                  <Button className="flex-1" onClick={() => setViewMode("list")}><ArrowLeft className="h-4 w-4 mr-1" /> Kembali</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {quizQuestions.map((q: any, qi: number) => {
                const opts = q.options as { text: string; is_correct: boolean }[];
                return (
                  <Card key={q.id}>
                    <CardContent className="pt-4">
                      <p className="font-medium text-sm mb-3">{qi + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {opts.map((opt, oi) => (
                          <button key={oi} className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${quizAnswers[q.id] === oi ? "bg-purple-100 border-purple-400" : "hover:bg-muted"}`}
                            onClick={() => setQuizAnswers(a => ({ ...a, [q.id]: oi }))}>
                            <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>{opt.text}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <Button className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={Object.keys(quizAnswers).length < quizQuestions.length || submitQuiz.isPending}
                onClick={handleQuizSubmit}>
                {submitQuiz.isPending ? "Menilai..." : "Submit Quiz"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">{Object.keys(quizAnswers).length}/{quizQuestions.length} soal dijawab</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-500/10 rounded-xl">
          <GraduationCap className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pelatihan Produk</h1>
          <p className="text-muted-foreground text-sm">Pelajari materi, selesaikan quiz, dan dapatkan sertifikat</p>
        </div>
      </div>

      {totalModules > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Progress Keseluruhan</p>
              <p className="text-sm text-muted-foreground">{completedCount}/{totalModules} modul</p>
            </div>
            <Progress value={totalModules > 0 ? (completedCount / totalModules) * 100 : 0} className="h-2" />
            {mandatoryCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Modul wajib: {mandatoryDone}/{mandatoryCount} selesai
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Memuat modul...</CardContent></Card>
      ) : !modules.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
          Belum ada modul pelatihan. Hubungi admin untuk informasi.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {modules.map((mod: any) => {
            const prog    = getProgress(mod.id);
            const isDone  = prog?.status === "completed";
            const isInProg = prog?.status === "in_progress";
            return (
              <Card key={mod.id} className={`cursor-pointer hover:border-purple-300 transition-colors ${isDone ? "bg-green-50/30" : ""}`}
                onClick={() => openModule(mod)}>
                <CardContent className="py-4 px-4 flex items-center gap-4">
                  <div className={`p-3 rounded-full flex-shrink-0 ${isDone ? "bg-green-100" : isInProg ? "bg-purple-100" : "bg-muted"}`}>
                    {isDone ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : isInProg ? <Play className="h-5 w-5 text-purple-600" /> : <BookOpen className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{mod.title}</p>
                      {mod.is_mandatory && <Badge variant="destructive" className="text-[9px]">Wajib</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[mod.category]}{mod.duration_minutes ? ` · ${mod.duration_minutes} menit` : ""}</p>
                    {prog?.quiz_score != null && (
                      <p className="text-xs mt-0.5 text-muted-foreground">Quiz: {prog.quiz_score}%</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
