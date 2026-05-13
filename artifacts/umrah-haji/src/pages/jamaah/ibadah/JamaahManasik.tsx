import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, Calendar, MapPin, Clock, CheckCircle2, Users,
  PlayCircle, FileText, ChevronRight, Star, Loader2, Brain
} from "lucide-react";
import { format, parseISO, isPast, isFuture } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { JamaahAppShell } from "@/components/jamaah/shell/JamaahAppShell";
import { JamaahPageHeader } from "@/components/jamaah/shell/JamaahPageHeader";
import JamaahManasikKuis from "@/components/jamaah/JamaahManasikKuis";

export default function JamaahManasik() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);

  const { data: customer } = useQuery({
    queryKey: ["customer-profile-manasik", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, full_name, branch_id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["manasik-schedules", customer?.branch_id],
    enabled: !!customer?.branch_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("manasik_schedules")
        .select("*, branch:branches(name)")
        .eq("branch_id", customer!.branch_id)
        .order("scheduled_date", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["manasik-attendance", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("manasik_attendance")
        .select("schedule_id, confirmed_at")
        .eq("customer_id", customer!.id);
      if (error) return [];
      return data || [];
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await (supabase as any).from("manasik_attendance").upsert({
        schedule_id: scheduleId,
        customer_id: customer!.id,
        confirmed_at: new Date().toISOString(),
      }, { onConflict: "schedule_id,customer_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manasik-attendance"] });
      toast.success("Kehadiran dikonfirmasi! ✅");
      setSelectedSchedule(null);
    },
    onError: (err: any) => toast.error("Gagal: " + err.message),
  });

  const confirmedIds = new Set(attendances.map((a: any) => a.schedule_id));
  const upcoming = schedules.filter((s: any) => isFuture(parseISO(s.scheduled_date)));
  const past = schedules.filter((s: any) => isPast(parseISO(s.scheduled_date)));

  const TYPE_LABEL: Record<string, string> = {
    fiqih: "Fiqih Ibadah",
    doa: "Doa & Dzikir",
    persiapan: "Persiapan Perjalanan",
    praktik: "Praktik Manasik",
    kesehatan: "Kesehatan Jamaah",
    umum: "Umum",
  };

  const ScheduleCard = ({ s }: { s: any }) => {
    const confirmed = confirmedIds.has(s.id);
    const isPastSchedule = isPast(parseISO(s.scheduled_date));
    return (
      <Card className={cn(
        "cursor-pointer hover:shadow-md transition-shadow",
        confirmed && "border-green-300 bg-green-50/30",
        !confirmed && !isPastSchedule && "border-primary/30"
      )} onClick={() => setSelectedSchedule(s)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  {TYPE_LABEL[s.type] || s.type || "Umum"}
                </Badge>
                {confirmed && <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" /> Konfirmasi</Badge>}
              </div>
              <p className="font-semibold text-sm leading-tight">{s.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(s.scheduled_date), "EEEE, d MMMM yyyy", { locale: localeId })}
                </span>
                {s.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.time}</span>}
                {s.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location}</span>}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </div>
          {s.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.description}</p>}
          {(s.video_url || s.material_url) && (
            <div className="flex gap-2 mt-2">
              {s.video_url && (
                <a href={s.video_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                  <PlayCircle className="h-3 w-3" /> Video
                </a>
              )}
              {s.material_url && (
                <a href={s.material_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] text-purple-600 hover:underline">
                  <FileText className="h-3 w-3" /> Materi PDF
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <JamaahAppShell>
      <JamaahPageHeader
        title="Manasik Digital"
        arabic="ٱلْمَنَاسِك"
        subtitle="Jadwal bimbingan & kuis pemahaman ibadah"
      />
      <div className="px-4 -mt-3 mb-2 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border p-2 text-center shadow-sm">
          <p className="font-bold text-base">{schedules.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Sesi</p>
        </div>
        <div className="rounded-xl bg-card border p-2 text-center shadow-sm">
          <p className="font-bold text-base">{attendances.length}</p>
          <p className="text-[10px] text-muted-foreground">Konfirmasi</p>
        </div>
        <div className="rounded-xl bg-card border p-2 text-center shadow-sm">
          <p className="font-bold text-base">{upcoming.length}</p>
          <p className="text-[10px] text-muted-foreground">Mendatang</p>
        </div>
      </div>

      <Tabs defaultValue="jadwal" className="w-full">
        <TabsList className="w-full rounded-none border-b h-11 bg-background sticky top-0 z-10">
          <TabsTrigger value="jadwal" className="flex-1 gap-1.5 text-sm">
            <Calendar className="h-4 w-4" /> Jadwal
          </TabsTrigger>
          <TabsTrigger value="kuis" className="flex-1 gap-1.5 text-sm">
            <Brain className="h-4 w-4" /> Kuis Mandiri
          </TabsTrigger>
        </TabsList>

        {/* ── TAB JADWAL ── */}
        <TabsContent value="jadwal" className="mt-0">
          <div className="p-4 space-y-5">
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="font-medium">Belum ada jadwal manasik</p>
                <p className="text-sm text-muted-foreground mt-1">Jadwal akan ditampilkan setelah dibuat oleh admin cabang</p>
                <div className="mt-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 text-left text-sm">
                  <p className="font-semibold text-primary mb-2">💡 Sementara itu, coba Kuis Mandiri!</p>
                  <p className="text-muted-foreground text-xs">
                    Uji pemahaman manasik Anda dengan 27 soal pilihan ganda yang mencakup Ihram, Tawaf, Sa'i, Wukuf Arafah, Lempar Jumrah, dan Tahallul.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-2">📅 Sesi Mendatang ({upcoming.length})</p>
                    <div className="space-y-2">{upcoming.map((s: any) => <ScheduleCard key={s.id} s={s} />)}</div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-2 text-muted-foreground">Sesi Sebelumnya ({past.length})</p>
                    <div className="space-y-2 opacity-70">{past.map((s: any) => <ScheduleCard key={s.id} s={s} />)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* ── TAB KUIS ── */}
        <TabsContent value="kuis" className="mt-0">
          <JamaahManasikKuis />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      {selectedSchedule && (
        <Dialog open={!!selectedSchedule} onOpenChange={o => !o && setSelectedSchedule(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">{selectedSchedule.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(parseISO(selectedSchedule.scheduled_date), "d MMMM yyyy", { locale: localeId })}</span>
                </div>
                {selectedSchedule.time && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{selectedSchedule.time}</span>
                  </div>
                )}
                {selectedSchedule.location && (
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedSchedule.location}</span>
                  </div>
                )}
              </div>
              {selectedSchedule.description && (
                <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">{selectedSchedule.description}</p>
              )}
              {(selectedSchedule.video_url || selectedSchedule.material_url) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">📚 Materi Digital</p>
                  {selectedSchedule.video_url && (
                    <a href={selectedSchedule.video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                      <PlayCircle className="h-5 w-5 shrink-0" />
                      <span>Tonton Video Materi</span>
                    </a>
                  )}
                  {selectedSchedule.material_url && (
                    <a href={selectedSchedule.material_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-700 hover:bg-purple-100 transition-colors">
                      <FileText className="h-5 w-5 shrink-0" />
                      <span>Download Materi PDF</span>
                    </a>
                  )}
                </div>
              )}
              {confirmedIds.has(selectedSchedule.id) ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Kehadiran sudah dikonfirmasi</span>
                </div>
              ) : isFuture(parseISO(selectedSchedule.scheduled_date)) ? (
                <Button className="w-full" onClick={() => confirmMutation.mutate(selectedSchedule.id)} disabled={confirmMutation.isPending}>
                  {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Konfirmasi Kehadiran
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground text-center">Sesi telah berlalu</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </JamaahAppShell>
  );
}
