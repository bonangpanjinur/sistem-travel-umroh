import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const LANGUAGES: { value: Language; label: string; flag: string; native: string }[] = [
  { value: "id", label: "Indonesia", flag: "🇮🇩", native: "Bahasa Indonesia" },
  { value: "en", label: "English", flag: "🇬🇧", native: "English" },
  { value: "ar", label: "Arabic", flag: "🇸🇦", native: "العربية" },
];

interface LanguageSwitcherProps {
  variant?: "dropdown" | "buttons";
  className?: string;
}

export function LanguageSwitcher({ variant = "dropdown", className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGES.find(l => l.value === language) ?? LANGUAGES[0];

  if (variant === "buttons") {
    return (
      <div className={`flex gap-1 ${className ?? ""}`}>
        {LANGUAGES.map(lang => (
          <Button
            key={lang.value}
            size="sm"
            variant={language === lang.value ? "default" : "outline"}
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setLanguage(lang.value)}
          >
            <span>{lang.flag}</span>
            <span>{lang.value.toUpperCase()}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`gap-1.5 h-8 ${className ?? ""}`}>
          <Globe className="h-3.5 w-3.5" />
          <span className="text-sm">{current.flag}</span>
          <span className="text-xs font-medium">{current.value.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.value}
            onClick={() => setLanguage(lang.value)}
            className={`gap-2 ${language === lang.value ? "font-semibold bg-primary/10" : ""}`}
          >
            <span className="text-base">{lang.flag}</span>
            <div className="flex flex-col">
              <span className="text-sm leading-tight">{lang.native}</span>
              <span className="text-xs text-muted-foreground">{lang.label}</span>
            </div>
            {language === lang.value && <span className="ml-auto text-primary text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
