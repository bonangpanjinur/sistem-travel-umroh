import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Milestone {
  label: string;
  date: string | null;
  type: "document" | "payment" | "visa";
}

interface MilestoneTrackerCardProps {
  milestones: Milestone[];
  className?: string;
}

function getMilestoneStatus(deadline: string | null) {
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

export function MilestoneTrackerCard({
  milestones,
  className,
}: MilestoneTrackerCardProps) {
  return (
    <Card className={cn("bg-blue-50/30 border-blue-100", className)}>
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-xs font-semibold flex items-center gap-2 text-blue-700">
          <Calendar className="h-3.5 w-3.5" /> Milestone & Deadline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {milestones.map((milestone, idx) => {
          const status = getMilestoneStatus(milestone.date);
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
      </CardContent>
    </Card>
  );
}
