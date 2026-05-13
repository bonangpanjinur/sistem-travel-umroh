import { ElementType, ReactNode, createElement } from "react";
import { cn } from "@/lib/utils";

/** Kartu standar bergaya Islami: rounded-3xl, border emas tipis, shadow lembut. */
export function IslamicCard({
  children,
  className,
  pattern = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  pattern?: boolean;
  as?: ElementType;
}) {
  return createElement(
    Tag,
    { className: cn("islamic-card relative overflow-hidden p-4", pattern && "pattern-geometric", className) },
    children
  );
}

export function IslamicSectionTitle({
  title,
  arabic,
  action,
  className,
}: {
  title: string;
  arabic?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between px-1 mb-3", className)}>
      <div>
        {arabic && (
          <p className="font-arabic text-xs text-gold-deep" dir="rtl">{arabic}</p>
        )}
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}