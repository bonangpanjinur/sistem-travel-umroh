import { useState, useEffect } from "react";

export function usePWAMode() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // GAP-PWA-09: deteksi semua display mode standalone-equivalent
    const mq = window.matchMedia(
      "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)"
    );
    const isPreview = new URLSearchParams(window.location.search).get("preview") === "standalone";
    setIsStandalone(mq.matches || (window.navigator as { standalone?: boolean }).standalone === true || isPreview);
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches || isPreview);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return { isStandalone };
}
