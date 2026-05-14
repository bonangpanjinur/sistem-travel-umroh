import { useEffect, useRef, useState, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Tinggi placeholder untuk mencegah CLS sebelum mount. */
  minHeight?: number | string;
  /** Margin viewport untuk pre-load lebih awal. */
  rootMargin?: string;
  /** Mount juga saat browser idle (fallback bila IO tidak tersedia). */
  idleFallback?: boolean;
  className?: string;
}

/**
 * Tunda render children sampai elemen mendekati viewport.
 * Mengurangi waktu first-paint pada portal jamaah di mobile.
 */
export function LazyMount({
  children,
  minHeight = 200,
  rootMargin = "200px",
  idleFallback = true,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
          break;
        }
      }
    }, { rootMargin });
    io.observe(node);

    let idleId: number | undefined;
    if (idleFallback && "requestIdleCallback" in window) {
      // Pastikan tetap mount kalau user tidak scroll (mis. layar pendek)
      idleId = (window as any).requestIdleCallback(() => setVisible(true), { timeout: 2500 });
    }
    return () => {
      io.disconnect();
      if (idleId && "cancelIdleCallback" in window) (window as any).cancelIdleCallback(idleId);
    };
  }, [visible, rootMargin, idleFallback]);

  return (
    <div ref={ref} className={className} style={!visible ? { minHeight } : undefined}>
      {visible ? children : null}
    </div>
  );
}
