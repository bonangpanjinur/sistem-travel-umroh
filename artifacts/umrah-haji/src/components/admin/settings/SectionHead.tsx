import type { ElementType } from "react";

export function SectionHead({ icon: Icon, title, desc }: { icon: ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}