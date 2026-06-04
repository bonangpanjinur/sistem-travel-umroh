import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeometricPattern } from "@/components/jamaah/ornaments/GeometricPattern";

interface JamaahPageHeaderProps {
  title: string;
  subtitle?: string;
  arabic?: string;
  back?: boolean;
  right?: ReactNode;
  variant?: "mihrab" | "plain";
  className?: string;
}

export function JamaahPageHeader({
  title,
  subtitle,
  arabic,
  back = true,
  right,
  variant = "mihrab",
  className,
}: JamaahPageHeaderProps) {
  const navigate = useNavigate();
  const isMihrab = variant === "mihrab";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 px-4 pt-3 pb-4 rounded-b-3xl",
        isMihrab
          ? "islamic-surface-mihrab text-primary-foreground shadow-lg shadow-primary/20"
          : "bg-card/90 backdrop-blur-xl text-foreground border-b border-border/60 shadow-sm",
        className
      )}
    >
      {isMihrab && <GeometricPattern className="opacity-20" opacity={0.15} />}

      <div className="relative flex items-center gap-2 min-w-0">
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Kembali"
            className={cn(
              "shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-2xl transition-colors active:scale-95",
              isMihrab
                ? "bg-white/15 hover:bg-white/25 active:bg-white/30"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          {arabic && (
            <p
              className={cn(
                "font-arabic text-sm leading-relaxed truncate",
                isMihrab ? "opacity-75" : "text-primary/70"
              )}
              dir="rtl"
            >
              {arabic}
            </p>
          )}
          <h1 className="font-display text-[19px] font-bold leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "text-[12px] mt-0.5 truncate leading-snug",
                isMihrab ? "opacity-75" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          )}
        </div>

        {right && <div className="shrink-0 ml-1">{right}</div>}
      </div>
    </header>
  );
}
