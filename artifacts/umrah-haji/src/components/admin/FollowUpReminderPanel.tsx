import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, Clock, CalendarClock, Phone, MessageCircle,
  CheckCircle2, RefreshCw, ChevronRight, BellRing, ExternalLink,
  User, Package, X, Filter, ArrowRight, Calendar
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays, addDays, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

type LeadUrgency = "overdue" | "today" | "tomorrow" | "upcoming";

function getUrgency(followUpDate: string | null, status: string | null): LeadUrgency | null {
  if (!followUpDate || status === "won" || status === "lost") return null;
  const date = parseISO(followUpDate);
  if (isPast(date) && !isToday(date)) return "overdue";
  if (isToday(date)) return "today";
  if (isTomorrow(date)) return "tomorrow";
  const daysAway = differenceInDays(date, new Date());
  if (daysAway <= 3) return "upcoming";
  return null;
}

const URGENCY_CONFIG: Record<LeadUrgency, {
  label: string; badgeClass: string; rowClass: string; icon: React.ElementType; iconClass: string;
}> = {
  overdue: {
    label: "Terlambat",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200",
    rowClass: "border-l-red-500 bg-red-50/30 dark:bg-red-950/10",
    icon: AlertTriangle,
    iconClass: "text-red-500",
  },
  today: {
    label: "Hari Ini",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200",
    rowClass: "border-l-orange-400 bg-orange-50/30 dark:bg-orange-950/10",
    icon: BellRing,
    iconClass: "text-orange-500",
  },
  tomorrow: {
    label: "Besok",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
    rowClass: "border-l-amber-400",
    icon: Clock,
    iconClass: "text-amber-500",
  },
  upcoming: {
    label: "Segera",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
    rowClass: "border-l-blue-400",
    icon: CalendarClock,
    iconClass: "text-blue-500",
  },
};

function buildWhatsAppLink(phone: string | null | undefined, name: string) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "").replace(/^0/, "62");
  const msg = encodeURIComponent(
    `Assalamu'alaikum ${name}, kami dari tim Vinstour Travel ingin menindaklanjuti minat perjalanan ibadah Anda. Apakah ada yang bisa kami bantu? 🕌`
  );
  return `https://wa.me/${clean}?text=${msg}`;
}

interface FollowUpReminderPanelProps {
  compact?: boolean;
  maxItems?: number;
  filterUrgency?: LeadUrgency[];
  onClose?: () => void;
}

export function FollowUpReminderPanel({
  compact = false,
  maxItems = 20,
  filterUrgency,
  onClose,
}: FollowUpReminderPanelProps) {
  const { data: leads, isLoading, refetch } = useLeads();
  const updateLead = useUpdateLead();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<LeadUrgency | "all">("all");
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());

  const reminders = useMemo(() => {
    if (!leads) return [];
    return leads
      .map(lead => ({ lead, urgency: getUrgency(lead.follow_up_date, lead.status) }))
      .filter(({ urgency, lead }) => {
        if (!urgency) return false;
        if (snoozedIds.has(lead.id)) return false;
        if (filterUrgency && !filterUrgency.includes(urgency)) return false;
        return true;
      })
      .sort((a, b) => {
        const order: Record<LeadUrgency, number> = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3 };
        return order[a.urgency!] - order[b.urgency!];
      });
  }, [leads, snoozedIds, filterUrgency]);

  const counts = useMemo(() => ({
    overdue: reminders.filter(r => r.urgency === "overdue").length,
    today: reminders.filter(r => r.urgency === "today").length,
    tomorrow: reminders.filter(r => r.urgency === "tomorrow").length,
    upcoming: reminders.filter(r => r.urgency === "upcoming").length,
    total: reminders.length,
  }), [reminders]);

  const displayed = useMemo(() => {
    const filtered = activeFilter === "all" ? reminders : reminders.filter(r => r.urgency === activeFilter);
    return filtered.slice(0, maxItems);
  }, [reminders, activeFilter, maxItems]);

  const handleMarkContacted = (id: string, name: string) => {
    updateLead.mutate(
      { id, status: "contacted" as LeadStatus, updated_at: new Date().toISOString() },
      {
        onSuccess: () => toast({ title: `${name} ditandai Dihubungi` }),
        onError: () => toast({ title: "Gagal memperbarui", variant: "destructive" }),
      }
    );
  };

  const handleSnooze = (id: string, name: string, days: number) => {
    const newDate = addDays(new Date(), days);
    updateLead.mutate(
      {
        id,
        follow_up_date: format(newDate, "yyyy-MM-dd"),
        updated_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setSnoozedIds(prev => new Set([...prev, id]));
          toast({ title: `Follow-up ${name} diundur ${days} hari` });
        },
        onError: () => toast({ title: "Gagal mengundur", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (counts.total === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-60" />
        <p className="font-semibold">Semua follow-up sudah tertangani!</p>
        <p className="text-sm mt-1">Tidak ada lead yang perlu tindak lanjut saat ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter pills */}
        {(["all", "overdue", "today", "tomorrow", "upcoming"] as const).map(key => {
          const count = key === "all" ? counts.total : counts[key];
          if (key !== "all" && count === 0) return null;
          const cfg = key === "all" ? null : URGENCY_CONFIG[key];
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                activeFilter === key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30"
              )}
            >
              {cfg && <cfg.icon className={cn("h-3 w-3", activeFilter === key ? "text-primary-foreground" : cfg.iconClass)} />}
              {key === "all" ? "Semua" : cfg?.label}
              <span className={cn(
                "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeFilter === key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {!compact && (
            <Button variant="outline" size="sm" asChild className="h-7 text-xs">
              <Link to="/admin/follow-up">
                Lihat Semua
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Lead rows */}
      <div className="space-y-2">
        {displayed.map(({ lead, urgency }) => {
          const cfg = URGENCY_CONFIG[urgency!];
          const UrgencyIcon = cfg.icon;
          const waLink = buildWhatsAppLink(lead.phone, lead.full_name);
          const daysOverdue = lead.follow_up_date && urgency === "overdue"
            ? differenceInDays(new Date(), parseISO(lead.follow_up_date))
            : null;

          return (
            <div
              key={lead.id}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-l-4 transition-all hover:shadow-sm bg-background",
                cfg.rowClass
              )}
            >
              {/* Urgency icon */}
              <div className={cn("flex-shrink-0 hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-muted/60")}>
                <UrgencyIcon className={cn("h-4 w-4", cfg.iconClass)} />
              </div>

              {/* Lead info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/admin/leads/${lead.id}`}
                    className="font-semibold text-sm hover:text-primary transition-colors truncate"
                  >
                    {lead.full_name}
                  </Link>
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-4 border font-semibold", cfg.badgeClass)}>
                    {urgency === "overdue" && daysOverdue ? `Terlambat ${daysOverdue}h` : cfg.label}
                  </Badge>
                  {lead.source && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4 capitalize">
                      {lead.source}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {lead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </span>
                  )}
                  {(lead.package as any)?.name && (
                    <span className="flex items-center gap-1 truncate">
                      <Package className="h-3 w-3 flex-shrink-0" />
                      {(lead.package as any).name}
                    </span>
                  )}
                  {(lead.assigned_profile as any)?.full_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {(lead.assigned_profile as any).full_name}
                    </span>
                  )}
                  {lead.follow_up_date && (
                    <span className={cn(
                      "flex items-center gap-1 font-medium",
                      urgency === "overdue" ? "text-red-600 dark:text-red-400" : urgency === "today" ? "text-orange-600 dark:text-orange-400" : ""
                    )}>
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(lead.follow_up_date), "EEE, d MMM yyyy", { locale: idLocale })}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                {waLink && (
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                    asChild
                  >
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WA
                    </a>
                  </Button>
                )}
                {lead.phone && !waLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs gap-1"
                    asChild
                  >
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-3.5 w-3.5" />
                      Telepon
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                  onClick={() => handleMarkContacted(lead.id, lead.full_name)}
                  disabled={updateLead.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Dihubungi
                </Button>

                {/* Snooze dropdown inline */}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Tunda 1 hari"
                    onClick={() => handleSnooze(lead.id, lead.full_name, 1)}
                    disabled={updateLead.isPending}
                  >
                    +1h
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Tunda 3 hari"
                    onClick={() => handleSnooze(lead.id, lead.full_name, 3)}
                    disabled={updateLead.isPending}
                  >
                    +3h
                  </Button>
                </div>

                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                  <Link to={`/admin/leads/${lead.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {displayed.length < reminders.length && (
        <p className="text-center text-xs text-muted-foreground">
          Menampilkan {displayed.length} dari {reminders.length} follow-up
          {" "}·{" "}
          <Link to="/admin/follow-up" className="text-primary hover:underline font-medium">
            Lihat semua
          </Link>
        </p>
      )}
    </div>
  );
}
