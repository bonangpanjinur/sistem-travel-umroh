import { useState, useMemo } from "react";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { FollowUpReminderPanel } from "@/components/admin/FollowUpReminderPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, BellRing, CalendarClock, Clock,
  Search, CheckCircle2, TrendingUp, Users, RefreshCw,
  ArrowLeft, Calendar, Filter
} from "lucide-react";
import { isPast, isToday, isTomorrow, differenceInDays, parseISO, format, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function AdminFollowUpReminder() {
  const { data: leads, isLoading, refetch } = useLeads();
  const [search, setSearch] = useState("");

  const allReminders = useMemo(() => {
    if (!leads) return [];
    return leads
      .map(lead => {
        const fd = lead.follow_up_date;
        const status = lead.status;
        let urgency: "overdue" | "today" | "tomorrow" | "upcoming" | null = null;
        if (fd && status !== "won" && status !== "lost") {
          const date = parseISO(fd);
          if (isPast(date) && !isToday(date)) urgency = "overdue";
          else if (isToday(date)) urgency = "today";
          else if (isTomorrow(date)) urgency = "tomorrow";
          else if (differenceInDays(date, new Date()) <= 3) urgency = "upcoming";
        }
        return { lead, urgency };
      })
      .filter(r => r.urgency !== null)
      .sort((a, b) => {
        const order = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3 };
        return order[a.urgency!] - order[b.urgency!];
      });
  }, [leads]);

  const counts = useMemo(() => ({
    total: allReminders.length,
    overdue: allReminders.filter(r => r.urgency === "overdue").length,
    today: allReminders.filter(r => r.urgency === "today").length,
    tomorrow: allReminders.filter(r => r.urgency === "tomorrow").length,
    upcoming: allReminders.filter(r => r.urgency === "upcoming").length,
  }), [allReminders]);

  const conversionRate = useMemo(() => {
    if (!leads || leads.length === 0) return 0;
    return ((leads.filter(l => l.status === "won").length / leads.length) * 100).toFixed(1);
  }, [leads]);

  const avgDaysOverdue = useMemo(() => {
    const overdue = allReminders.filter(r => r.urgency === "overdue");
    if (overdue.length === 0) return 0;
    const total = overdue.reduce((sum, r) => {
      return sum + differenceInDays(new Date(), parseISO(r.lead.follow_up_date!));
    }, 0);
    return Math.round(total / overdue.length);
  }, [allReminders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/admin/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BellRing className="h-6 w-6 text-orange-500" />
              Follow-up Reminder
            </h1>
            <p className="text-sm text-muted-foreground">
              Lead yang perlu ditindaklanjuti hari ini & segera
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 self-start">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Overdue */}
          <Card className={cn(
            "border-2 transition-all",
            counts.overdue > 0 ? "border-red-300 dark:border-red-800 shadow-red-100 dark:shadow-none shadow-md" : "border-transparent"
          )}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Terlambat</span>
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <p className={cn("text-4xl font-extrabold", counts.overdue > 0 ? "text-red-600" : "text-foreground")}>
                {counts.overdue}
              </p>
              <p className="text-xs text-muted-foreground">
                {counts.overdue > 0 ? `Rata-rata ${avgDaysOverdue} hari` : "Tidak ada"}
              </p>
            </CardContent>
          </Card>

          {/* Today */}
          <Card className={cn(
            "border-2 transition-all",
            counts.today > 0 ? "border-orange-300 dark:border-orange-800 shadow-orange-100 dark:shadow-none shadow-md" : "border-transparent"
          )}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hari Ini</span>
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <BellRing className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              <p className={cn("text-4xl font-extrabold", counts.today > 0 ? "text-orange-600" : "text-foreground")}>
                {counts.today}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, d MMM", { locale: idLocale })}
              </p>
            </CardContent>
          </Card>

          {/* Tomorrow */}
          <Card className="border-2 border-transparent">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Besok</span>
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <p className="text-4xl font-extrabold">{counts.tomorrow}</p>
              <p className="text-xs text-muted-foreground">
                {format(addDays(new Date(), 1), "EEEE, d MMM", { locale: idLocale })}
              </p>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card className="border-2 border-transparent">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2-3 Hari</span>
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <CalendarClock className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <p className="text-4xl font-extrabold">{counts.upcoming}</p>
              <p className="text-xs text-muted-foreground">Segera ditangani</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Urgency Alert */}
      {counts.overdue > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300 text-sm">
              {counts.overdue} lead melewati jadwal follow-up!
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
              Lead yang terlalu lama tidak ditindaklanjuti berisiko kehilangan minat. Segera hubungi mereka via WhatsApp atau telepon.
            </p>
          </div>
        </div>
      )}

      {counts.today > 0 && counts.overdue === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <BellRing className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
              {counts.today} lead dijadwalkan follow-up hari ini
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
              Hubungi mereka sebelum akhir hari untuk menjaga momentum.
            </p>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Daftar Follow-up</CardTitle>
              <CardDescription>
                Total {counts.total} lead membutuhkan tindak lanjut
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {counts.total} lead
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <FollowUpReminderPanel maxItems={50} compact />
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-teal-600/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tips Follow-up Efektif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            {[
              { tip: "Hubungi lead maksimal 24 jam setelah jadwal follow-up — semakin cepat semakin baik." },
              { tip: "Gunakan WhatsApp untuk first contact, lanjutkan dengan telepon jika tidak dibalas dalam 2 jam." },
              { tip: "Sebutkan nama lead dan paket yang diminati dalam pesan untuk kesan personal." },
              { tip: "Jika tidak berhasil dihubungi, coba 3 kali di waktu berbeda sebelum memindahkan ke 'Lost'." },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p>{item.tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
