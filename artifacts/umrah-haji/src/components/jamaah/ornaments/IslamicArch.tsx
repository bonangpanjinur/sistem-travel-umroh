import { cn } from "@/lib/utils";

export function IslamicArch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
      className={cn("w-full h-20", className)}
      aria-hidden="true"
    >
      <path
        d="M0 80 V40 Q0 0 40 0 H80 Q100 0 100 18 Q100 0 120 0 H160 Q200 0 200 40 V80 Z"
        fill="currentColor"
      />
    </svg>
  );
}