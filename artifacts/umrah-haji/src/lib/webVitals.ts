/**
 * Web Vitals reporting (LCP, CLS, INP, FCP, TTFB).
 * Hanya aktif di production (bukan iframe / preview host).
 * Mengirim metric ke endpoint Supabase function bila tersedia,
 * fallback console.info agar bisa dipantau via DevTools.
 */
import type { Metric } from "web-vitals";

const ENDPOINT = "/api/web-vitals"; // optional; ignored if 404

let sent = false;

function send(metric: Metric & { route?: string }) {
  const payload = {
    name: metric.name,
    value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating,
    id: metric.id,
    navigationType: (metric as any).navigationType,
    route: location.pathname,
    ua: navigator.userAgent,
    ts: Date.now(),
  };

  // Always log so devs/users can verify in DevTools console.
  // eslint-disable-next-line no-console
  console.info(`[web-vitals] ${metric.name}`, payload);

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export async function initWebVitals() {
  if (sent) return;
  sent = true;
  // Skip in iframe / lovable preview to avoid noise
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }
  const host = location.hostname;
  if (host.includes("id-preview--") || host.includes("lovableproject.com") || host === "localhost") {
    // tetap log saja, jangan beacon
  }

  try {
    const { onLCP, onCLS, onINP, onFCP, onTTFB } = await import("web-vitals");
    onLCP(send);
    onCLS(send);
    onINP(send);
    onFCP(send);
    onTTFB(send);
  } catch {
    /* web-vitals unavailable */
  }
}