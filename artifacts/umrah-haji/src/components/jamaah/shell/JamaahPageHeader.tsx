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
        "relative px-5 pt-4 pb-6 rounded-b-3xl",
        isMihrab ? "islamic-surface-mihrab text-primary-foreground" : "bg-card text-foreground border-b",
        className
      )}
    >
      {isMihrab && <GeometricPattern className="opacity-30" opacity={0.18} />}
      <div className="relative flex items-center gap-3">
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Kembali"
            className={cn(
              "h-9 w-9 inline-flex items-center justify-center rounded-full",
              isMihrab ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/70"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {arabic && (
            <p className="font-arabic text-sm/relaxed opacity-80 truncate" dir="rtl">{arabic}</p>
          )}
          <h1 className="font-display text-xl font-semibold truncate">{title}</h1>
          {subtitle && <p className="text-xs opacity-80 truncate">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}