import { useState, useEffect } from "react";

export function usePWAMode() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // GAP-PWA-09: deteksi semua display mode standalone-equivalent
    const mq = window.matchMedia(
      "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)"
    );
    setIsStandalone(mq.matches || (window.navigator as { standalone?: boolean }).standalone === true);
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return { isStandalone };
}
