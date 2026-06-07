/**
 * CancellationRuleDisplay — Komponen reusable untuk menampilkan aturan pembatalan.
 *
 * Digunakan di:
 *   - StepReviewDynamic (form booking — view compact)
 *   - PackageDetail (halaman publik — view full)
 *   - AdminBookingDetail (tab kebijakan — view full)
 *
 * Menerima sections: { title: string; items: string[] }[]
 */

import { Badge } from "@/components/ui/badge";
import { Globe, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PolicySection {
  title: string;
  items: string[];
}

interface CancellationRuleDisplayProps {
  name: string;
  sections: PolicySection[];
  isDefault?: boolean;
  compact?: boolean;
  className?: string;
}

export function CancellationRuleDisplay({
  name,
  sections,
  isDefault = false,
  compact = false,
  className,
}: CancellationRuleDisplayProps) {
  const validSections = sections.filter(
    (s) => s.title?.trim() && s.items.some((i) => i.trim())
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {isDefault ? (
          <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        )}
        <span className={cn("font-medium", compact ? "text-sm" : "text-base")}>
          {name}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-xs shrink-0",
            isDefault
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          )}
        >
          {isDefault ? "Aturan Umum" : "Aturan Khusus Paket"}
        </Badge>
      </div>

      {validSections.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Belum ada detail aturan yang diisi.
        </p>
      ) : compact ? (
        /* ── Compact: accordion-style sections ── */
        <div className="space-y-2">
          {validSections.map((section, si) => (
            <div key={si} className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-foreground mb-1.5">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items
                  .filter((item) => item.trim())
                  .map((item, ii) => (
                    <li
                      key={ii}
                      className="flex items-start gap-1.5 text-xs text-muted-foreground"
                    >
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        /* ── Full: richer layout for detail pages ── */
        <div className="space-y-5">
          {validSections.map((section, si) => (
            <div key={si}>
              <h4 className="text-sm font-bold uppercase tracking-wide text-foreground mb-2 pb-1 border-b">
                {section.title}
              </h4>
              <ul className="space-y-1.5">
                {section.items
                  .filter((item) => item.trim())
                  .map((item, ii) => (
                    <li
                      key={ii}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted-foreground italic border-t pt-3">
            Dengan melakukan pendaftaran, Anda dianggap telah membaca, memahami,
            dan menyetujui seluruh syarat &amp; ketentuan di atas.
          </p>
        </div>
      )}
    </div>
  );
}
