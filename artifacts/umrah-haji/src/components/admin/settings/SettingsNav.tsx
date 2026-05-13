import { cn } from "@/lib/utils";
import { ChevronRight, Settings } from "lucide-react";
import type { NavItem, SettingsSection } from "./types";

interface Props {
  items: NavItem[];
  activeSection: SettingsSection;
  onChange: (id: SettingsSection) => void;
}

export function SettingsNav({ items, activeSection, onChange }: Props) {
  return (
    <aside className="w-60 shrink-0 border-r bg-muted/20 flex flex-col">
      <div className="px-4 py-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Pengaturan Sistem</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <div className={cn("text-xs font-semibold truncate", active ? "text-primary-foreground" : "")}>{item.label}</div>
                <div className={cn("text-[10px] truncate", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{item.description}</div>
              </div>
              {active && <ChevronRight className="h-3 w-3 shrink-0 text-primary-foreground/60" />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}