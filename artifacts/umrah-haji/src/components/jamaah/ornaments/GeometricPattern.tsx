import { cn } from "@/lib/utils";

/** SVG repeating geometric pattern (Islamic 8-point star + interlace). */
export function GeometricPattern({ className, opacity = 0.08 }: { className?: string; opacity?: number }) {
  return (
    <svg className={cn("absolute inset-0 w-full h-full pointer-events-none", className)} aria-hidden="true">
      <defs>
        <pattern id="geo-star" width="48" height="48" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1" opacity={opacity}>
            <path d="M24 4 L30 18 L44 18 L33 28 L37 42 L24 34 L11 42 L15 28 L4 18 L18 18 Z" />
            <circle cx="24" cy="24" r="14" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo-star)" />
    </svg>
  );
}

export function CrescentMoon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-6 h-6", className)} fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export function KaabaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-7 h-7", className)} aria-hidden="true">
      <rect x="6" y="10" width="20" height="18" rx="1" fill="currentColor" />
      <rect x="6" y="14" width="20" height="2.5" fill="hsl(var(--gold))" />
      <path d="M4 12 L16 4 L28 12 Z" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

export function MosqueSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 60" preserveAspectRatio="none" className={cn("w-full h-12", className)} aria-hidden="true">
      <path
        d="M0 60 V40 Q0 30 8 30 V20 H12 V30 Q20 30 20 40 V60 Z
           M40 60 V35 Q40 18 60 18 Q80 18 80 35 V60 Z M58 18 V8 H62 V18 Z
           M100 60 V40 H140 V60 Z M120 40 Q120 22 140 22 Q160 22 160 40
           M180 60 V35 Q180 18 200 18 Q220 18 220 35 V60 Z M198 18 V8 H202 V18 Z"
        fill="currentColor"
      />
    </svg>
  );
}