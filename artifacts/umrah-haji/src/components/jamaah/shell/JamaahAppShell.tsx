import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";

interface JamaahAppShellProps {
  children: ReactNode;
  /** Tampilkan bottom nav (default: true) */
  showBottomNav?: boolean;
  /** Background variant */
  variant?: "sand" | "white";
  className?: string;
}

/**
 * Wrapper standar seluruh halaman portal jamaah.
 * Menambahkan data-portal="jamaah" supaya token CSS Islami aktif,
 * mengatur safe-area iOS, dan memuat bottom navigation.
 */
export function JamaahAppShell({
  children,
  showBottomNav = true,
  variant = "sand",
  className,
}: JamaahAppShellProps) {
  // Atur theme-color status bar saat komponen aktif
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content");
    meta?.setAttribute("content", "#0F2E1F");
    return () => {
      if (meta && previous) meta.setAttribute("content", previous);
    };
  }, []);

  return (
    <div
      data-portal="jamaah"
      className={cn(
        "min-h-screen w-full",
        variant === "sand" ? "bg-background" : "bg-card",
        className
      )}
    >
      <div className={cn("mx-auto w-full max-w-md", showBottomNav && "pb-24")}>
        <div className="safe-top" />
        {children}
      </div>
      {showBottomNav && <JamaahBottomNav />}
    </div>
  );
}