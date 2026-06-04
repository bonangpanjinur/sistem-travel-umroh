import { useEffect } from "react";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;

/** GAP-PWA-10 — Track event `appinstalled` ke tabel pwa_install_events */
export function usePWAInstallTracker() {
  useEffect(() => {
    const handler = async () => {
      try {
        const ua = navigator.userAgent;
        const platform = /iPhone|iPad|iPod/i.test(ua) ? "ios"
          : /Android/i.test(ua) ? "android"
          : /Windows/i.test(ua) ? "windows"
          : /Mac/i.test(ua) ? "macos"
          : "other";
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("pwa_install_events").insert({
          user_id: user?.id || null, platform, user_agent: ua,
        });
      } catch (e) {
        console.warn("[PWA install track]", e);
      }
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);
}