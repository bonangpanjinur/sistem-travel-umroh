import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, CreditCard, FileText, Package, ClipboardCheck, AlertTriangle, CheckCircle2
} from "lucide-react";

interface Props {
  departureId: string;
}

function pct(done: number, total: number) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function statusColor(p: number) {
  if (p >= 90) return "text-green-600";
  if (p >= 60) return "text-amber-600";
  return "text-red-600";
}

function ReadinessRow({ label, icon: Icon, badgeColor, done, total }: {
  label: string; icon: React.ElementType; badgeColor: string; done: number; total: number;
}) {
  const p = pct(done, total);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${badgeColor}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-slate-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{done}/{total}</span>
          <span className={`text-sm font-bold ${statusColor(p)}`}>{p}%</span>
        </div>
      </div>
      <Progress value={p} className="h-2" />
    </div>
  );
}

export function DepartureReadinessDashboard({ departureId }: Props) {

  // Total non-cancelled bookings
  const { data: totalBookings = 0 } = useQuery({
    queryKey: ["readiness-total-bookings", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("bookings").select("id", { count: "exact", head: true })
        .eq("departure_id", departureId).neq("booking_status", "cancelled");
      return count ?? 0;
    },
  });

  // Total passengers (non-cancelled bookings → booking_passengers)
  const { data: totalPassengers = 0 } = useQuery({
    queryKey: ["readiness-total-passengers", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { data: bks } = await (supabase as any)
        .from("bookings").select("id")
        .eq("departure_id", departureId).neq("booking_status", "cancelled");
      if (!bks?.length) return 0;
      const { count } = await (supabase as any)
        .from("booking_passengers").select("id", { count: "exact", head: true })
        .in("booking_id", bks.map((b: any) => b.id));
      return count ?? 0;
    },
  });

  // Lunas pembayaran
  const { data: paidCount = 0 } = useQuery({
    queryKey: ["readiness-paid", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("bookings").select("id", { count: "exact", head: true })
        .eq("departure_id", departureId).eq("payment_status", "paid")
        .neq("booking_status", "cancelled");
      return count ?? 0;
    },
  });

  // Paspor uploaded (passport_number not null)
  const { data: pasporCount = 0 } = useQuery({
    queryKey: ["readiness-paspor", departureId],
    enabled: !!departureId && totalPassengers > 0,
    queryFn: async () => {
      const { data: bks } = await (supabase as any)
        .from("bookings").select("id")
        .eq("departure_id", departureId).neq("booking_status", "cancelled");
      if (!bks?.length) return 0;
      const { count } = await (supabase as any)
        .from("booking_passengers").select("id", { count: "exact", head: true })
        .in("booking_id", bks.map((b: any) => b.id))
        .not("passport_number", "is", null);
      return count ?? 0;
    },
  });

  // Visa approved
  const { data: visaCount = 0 } = useQuery({
    queryKey: ["readiness-visa", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("visa_applications").select("id", { count: "exact", head: true })
        .eq("departure_id", departureId).eq("status", "approved");
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Perlengkapan terdistribusi
  const { data: equipCount = 0 } = useQuery({
    queryKey: ["readiness-equip", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("equipment_distributions").select("id", { count: "exact", head: true })
        .eq("departure_id", departureId).not("distributed_at", "is", null);
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Checklist
  const { data: checklistDone = 0 } = useQuery({
    queryKey: ["readiness-checklist-done", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("booking_departure_checklist").select("id", { count: "exact", head: true })
        .eq("departure_id", departureId).eq("is_completed", true);
      if (error) return 0;
      return count ?? 0;
    },
  });

  const { data: checklistTotal = 0 } = useQuery({
    queryKey: ["readiness-checklist-total", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("booking_departure_checklist").select("id", { count: "exact", head: true })
        .eq("departure_id", departureId);
      if (error) return 0;
      return count ?? 0;
    },
  });

  const items = [
    { label: "Lunas Pembayaran",           icon: CreditCard,     badgeColor: "bg-green-100 text-green-700",  done: paidCount,    total: totalBookings },
    { label: "Data Paspor",                icon: FileText,       badgeColor: "bg-blue-100 text-blue-700",    done: pasporCount,  total: totalPassengers },
    { label: "Visa Disetujui",             icon: ShieldCheck,    badgeColor: "bg-violet-100 text-violet-700",done: visaCount,    total: totalPassengers },
    { label: "Perlengkapan Terdistribusi", icon: Package,        badgeColor: "bg-orange-100 text-orange-700",done: equipCount,   total: totalPassengers },
    { label: "Checklist Pre-Departure",    icon: ClipboardCheck, badgeColor: "bg-emerald-100 text-emerald-700", done: checklistDone, total: checklistTotal },
  ];

  const overallReady = Math.round(
    items.reduce((s, i) => s + pct(i.done, i.total), 0) / items.length
  );

  const level =
    overallReady >= 90 ? { label: "Siap Berangkat",  cls: "bg-green-100 text-green-800",  Icon: CheckCircle2 } :
    overallReady >= 60 ? { label: "Hampir Siap",      cls: "bg-amber-100 text-amber-800",  Icon: AlertTriangle } :
    { label: "Perlu Perhatian",  cls: "bg-red-100 text-red-800",    Icon: AlertTriangle };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            Readiness Dashboard
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs flex items-center gap-1 ${level.cls}`}>
              <level.Icon className="w-3 h-3" /> {level.label}
            </Badge>
            <span className={`text-lg font-bold ${statusColor(overallReady)}`}>{overallReady}%</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={overallReady} className="h-3" />
        <div className="space-y-3 pt-1">
          {items.map((item) => <ReadinessRow key={item.label} {...item} />)}
        </div>
        {overallReady < 90 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Pastikan semua kategori ≥90% sebelum tanggal keberangkatan.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
