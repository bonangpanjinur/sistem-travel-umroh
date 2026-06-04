import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle, CheckCircle2, Clock, FileCheck, Upload } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Milestone {
  label: string;
  date: string | null;
  type: "document" | "payment" | "visa";
}

interface DocumentStats {
  total_jamaah: number;
  uploaded: number;
  verified: number;
}

interface MilestoneTrackerCardProps {
  milestones: Milestone[];
  className?: string;
  departureId?: string;
}

function getDeadlineStatus(deadline: string | null) {
  if (!deadline) {
    return {
      label: "Belum diatur",
      color: "text-muted-foreground",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      icon: Clock,
    };
  }

  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diffDays = Math.ceil(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      label: "Terlewati",
      color: "text-destructive",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      icon: AlertCircle,
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Mendekati (${diffDays}h)`,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      icon: AlertCircle,
    };
  }

  return {
    label: "Aman",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle2,
  };
}

function useDocumentStats(departureId?: string): DocumentStats | null {
  const { data } = useQuery({
    queryKey: ["milestone-doc-stats", departureId],
    enabled: !!departureId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: passengers, error: pErr } = await supabase
        .from("booking_passengers")
        .select("customer_id, booking:bookings!inner(departure_id)")
        .eq("booking.departure_id", departureId as string);

      if (pErr) throw pErr;

      const customerIds = [...new Set((passengers || []).map((p: any) => p.customer_id).filter(Boolean))];
      if (customerIds.length === 0) return { total_jamaah: 0, uploaded: 0, verified: 0 };

      const { data: docs, error: dErr } = await supabase
        .from("customer_documents")
        .select("customer_id, status, file_url")
        .in("customer_id", customerIds);

      if (dErr) throw dErr;

      const docMap = new Map<string, { uploaded: boolean; verified: boolean }>();
      for (const doc of docs || []) {
        const prev = docMap.get(doc.customer_id) || { uploaded: false, verified: false };
        if (doc.file_url) prev.uploaded = true;
        if (doc.status === "verified") prev.verified = true;
        docMap.set(doc.customer_id, prev);
      }

      let uploaded = 0;
      let verified = 0;
      for (const cid of customerIds) {
        const entry = docMap.get(cid);
        if (entry?.uploaded) uploaded++;
        if (entry?.verified) verified++;
      }

      return {
        total_jamaah: customerIds.length,
        uploaded,
        verified,
      };
    },
  });

  return data ?? null;
}

export function MilestoneTrackerCard({
  milestones,
  className,
  departureId,
}: MilestoneTrackerCardProps) {
  const docStats = useDocumentStats(departureId);

  return (
    <Card className={cn("bg-blue-50/30 border-blue-100", className)}>
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-xs font-semibold flex items-center gap-2 text-blue-700">
          <Calendar className="h-3.5 w-3.5" /> Milestone & Deadline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {milestones.map((milestone, idx) => {
          const status = getDeadlineStatus(milestone.date);
          const Icon = status.icon;

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg border text-[10px]",
                status.bgColor,
                status.borderColor
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">{milestone.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">
                  {milestone.date ? formatDate(milestone.date) : "-"}
                </span>
                <Icon className={cn("h-3 w-3", status.color)} />
              </div>
            </div>
          );
        })}

        {departureId && docStats !== null && (
          <div className="pt-1 border-t border-blue-100 mt-1 space-y-1">
            <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-wide">
              Dokumen Jamaah (Real-time)
            </p>

            <div className="flex items-center justify-between p-2 rounded-lg border bg-amber-50 border-amber-200 text-[10px]">
              <div className="flex items-center gap-1.5">
                <Upload className="h-3 w-3 text-amber-600" />
                <span className="text-muted-foreground font-medium">Sudah Upload</span>
              </div>
              <span className={cn(
                "font-bold",
                docStats.uploaded === docStats.total_jamaah && docStats.total_jamaah > 0
                  ? "text-green-600"
                  : "text-amber-600"
              )}>
                {docStats.uploaded}/{docStats.total_jamaah}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border bg-green-50 border-green-200 text-[10px]">
              <div className="flex items-center gap-1.5">
                <FileCheck className="h-3 w-3 text-green-600" />
                <span className="text-muted-foreground font-medium">Terverifikasi</span>
              </div>
              <span className={cn(
                "font-bold",
                docStats.verified === docStats.total_jamaah && docStats.total_jamaah > 0
                  ? "text-green-600"
                  : "text-orange-600"
              )}>
                {docStats.verified}/{docStats.total_jamaah}
              </span>
            </div>

            {docStats.total_jamaah > 0 && (
              <div className="text-[9px] text-muted-foreground text-right">
                {Math.round((docStats.verified / docStats.total_jamaah) * 100)}% dokumen lengkap
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
