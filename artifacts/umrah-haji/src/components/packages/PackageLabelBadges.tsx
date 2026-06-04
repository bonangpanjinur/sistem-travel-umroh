import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type PackageLabel,
  getLabelColorClasses,
  usePackageLabelsForPackage,
} from "@/hooks/usePackageLabels";

interface Props {
  packageId?: string;
  labels?: PackageLabel[];
  className?: string;
  size?: "sm" | "md";
}

/**
 * Renders custom package label badges. Pass either `labels` directly
 * (preferred for batch listings) or `packageId` to fetch.
 */
export function PackageLabelBadges({ packageId, labels, className, size = "sm" }: Props) {
  const { data: fetched } = usePackageLabelsForPackage(labels ? undefined : packageId);
  const list = labels ?? fetched ?? [];
  if (list.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {list.map((l) => (
        <Badge
          key={l.id}
          className={cn(
            "border shadow-sm font-bold uppercase tracking-wider",
            size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
            getLabelColorClasses(l.color)
          )}
        >
          {l.name}
        </Badge>
      ))}
    </div>
  );
}