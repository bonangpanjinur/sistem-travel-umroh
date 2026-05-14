/**
 * Web Vitals reporting (LCP, CLS, INP, FCP, TTFB).
 * Mengirim metric ke tabel `web_vitals_metrics` via Supabase anon client,
 * dan log ke console agar bisa dipantau real-time di DevTools.
 * Skip di iframe / Lovable preview untuk menghindari noise.
 */
import type { Metric } from "web-vitals";
import { supabase } from "@/integrations/supabase/client";

let sent = false;

function detectDevice(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getBranchId(): string | null {
  try {
    return (
      localStorage.getItem("active_branch_id") ||
      localStorage.getItem("branch_id") ||
      null
    );
  } catch {
    return null;
  }
}

const RELEASE_VERSION =
  (import.meta as any).env?.VITE_RELEASE_VERSION ||
  (import.meta as any).env?.VITE_GIT_SHA ||
  "dev";

function buildPayload(metric: Metric) {
  return {
    metric_name: metric.name,
    metric_value: Math.round(metric.value * 1000) / 1000,
    rating: metric.rating,
    metric_id: metric.id,
    navigation_type: (metric as any).navigationType ?? null,
    route: location.pathname,
    device_type: detectDevice(),
    user_agent: navigator.userAgent.slice(0, 500),
    branch_id: getBranchId(),
    release_version: RELEASE_VERSION,
  };
}

async function send(metric: Metric) {
  const payload = buildPayload(metric);
  // eslint-disable-next-line no-console
  console.info(`[web-vitals] ${metric.name}`, payload);

  try {
    await (supabase as any).from("web_vitals_metrics").insert(payload);
  } catch {
    /* fail silently — telemetri bukan blocking */
  }
}

export async function initWebVitals() {
  if (sent) return;
  sent = true;

  // Skip iframe / Lovable preview / localhost untuk menghindari pencemaran data
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }
  const host = location.hostname;
  if (
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return;
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