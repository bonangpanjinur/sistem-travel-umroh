import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppPageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  right?: ReactNode;
  className?: string;
  dark?: boolean;
  style?: React.CSSProperties;
}

export function AppPageHeader({
  title,
  subtitle,
  backTo,
  right,
  className,
  dark = false,
  style,
}: AppPageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-40 flex items-center gap-3 px-3 py-3 safe-area-top",
        dark
          ? "bg-slate-900/95 border-b border-white/10 backdrop-blur-md"
          : "bg-background/95 border-b border-border backdrop-blur-md shadow-sm",
        className,
      )}
      style={style}
    >
      <button
        onClick={handleBack}
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-colors",
          dark
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-foreground/70 hover:text-foreground hover:bg-muted",
        )}
        aria-label="Kembali"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1
          className={cn(
            "text-base font-bold leading-tight truncate",
            dark ? "text-white" : "text-foreground",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "text-xs leading-tight truncate",
              dark ? "text-white/50" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>

      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
