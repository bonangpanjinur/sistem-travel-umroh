import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export const FOLLOWUP_STORAGE_KEY = "vinstour-chatbot-followup";
const FOLLOWUP_NOTIF_ID = "chatbot-followup-24h";
const DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface FollowupData {
  fireAt: string;
  actionItems: ActionItem[];
  topics: string[];
  fired: boolean;
  scheduledAt: string;
}

export interface ActionItem {
  label: string;
  url: string;
}

// Action items matched by keyword in conversation
const ACTION_MAP: { keywords: string[]; label: string; url: string }[] = [
  {
    keywords: ["dokumen", "paspor", "kk", "kartu keluarga", "akta", "buku nikah", "pas foto"],
    label: "Upload dokumen persyaratan Umroh",
    url: "/jamaah/dokumen",
  },
  {
    keywords: ["visa"],
    label: "Pantau proses visa Anda",
    url: "/jamaah/visa",
  },
  {
    keywords: ["bayar", "cicil", "transfer", "pembayaran", "virtual account"],
    label: "Lanjutkan pembayaran",
    url: "/jamaah/pembayaran",
  },
  {
    keywords: ["hotel", "itinerary", "jadwal", "program"],
    label: "Cek itinerary perjalanan",
    url: "/jamaah/itinerary",
  },
  {
    keywords: ["bagasi"],
    label: "Periksa status bagasi",
    url: "/jamaah/bagasi",
  },
  {
    keywords: ["ibadah", "thawaf", "tawaf", "sa'i", "sai", "manasik", "ihram", "wukuf"],
    label: "Pelajari panduan manasik interaktif",
    url: "/jamaah/manasik-interaktif",
  },
  {
    keywords: ["zakat", "fidyah"],
    label: "Hitung zakat dengan kalkulator islami",
    url: "/kalkulator-islami",
  },
  {
    keywords: ["kesehatan", "vaksin", "meningitis", "obat"],
    label: "Cek panduan kesehatan perjalanan",
    url: "/jamaah/panduan-ibadah",
  },
  {
    keywords: ["sertifikat"],
    label: "Lihat sertifikat umroh Anda",
    url: "/jamaah/sertifikat",
  },
  {
    keywords: ["refund", "batal", "pembatalan"],
    label: "Hubungi tim untuk info pembatalan",
    url: "/customer/support",
  },
];

export function extractActionItems(
  messages: { role: string; content: string }[]
): ActionItem[] {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ");

  const found: ActionItem[] = [];
  const seen = new Set<string>();

  for (const entry of ACTION_MAP) {
    if (entry.keywords.some((kw) => userText.includes(kw))) {
      if (!seen.has(entry.url)) {
        seen.add(entry.url);
        found.push({ label: entry.label, url: entry.url });
      }
    }
  }

  return found.slice(0, 4);
}

function buildNotifBody(actionItems: ActionItem[]): string {
  if (actionItems.length === 0) {
    return "Ada yang perlu ditindaklanjuti dari konsultasi kemarin? Buka portal jamaah sekarang. 🤲";
  }
  if (actionItems.length === 1) {
    return `Jangan lupa: ${actionItems[0].label}. Buka portal jamaah untuk melanjutkan. 🤲`;
  }
  const labels = actionItems.slice(0, 2).map((a) => a.label).join(" dan ");
  return `Jangan lupa: ${labels}. Selesaikan sekarang untuk memperlancar perjalanan Anda. 🤲`;
}

// Schedule the follow-up notification via the service worker
async function scheduleViaServiceWorker(data: FollowupData): Promise<boolean> {
  if (!("serviceWorker" in navigator) || Notification.permission !== "granted") {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const notifBody = buildNotifBody(data.actionItems);
    const destinationUrl =
      data.actionItems.length > 0 ? data.actionItems[0].url : "/jamaah/chatbot";

    reg.active?.postMessage({
      type: "SCHEDULE_NOTIF",
      id: FOLLOWUP_NOTIF_ID,
      title: "🔔 Tindak Lanjut Konsultasi Umroh",
      body: notifBody,
      fireAt: data.fireAt,
      icon: "/images/icon-192.png",
      tag: FOLLOWUP_NOTIF_ID,
      url: destinationUrl,
    });
    return true;
  } catch {
    return false;
  }
}

export function loadFollowupData(): FollowupData | null {
  try {
    const raw = localStorage.getItem(FOLLOWUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FollowupData;
  } catch {
    return null;
  }
}

function saveFollowupData(data: FollowupData) {
  try {
    localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function clearFollowupData() {
  try {
    localStorage.removeItem(FOLLOWUP_STORAGE_KEY);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.active?.postMessage({ type: "CANCEL_NOTIF", id: FOLLOWUP_NOTIF_ID }))
        .catch(() => {});
    }
  } catch {}
}

// Check and re-schedule a pending (unfired) followup — called on app load / portal mount
export async function restorePendingFollowup(): Promise<boolean> {
  const data = loadFollowupData();
  if (!data || data.fired) return false;

  const fireAt = new Date(data.fireAt);
  const now = new Date();
  const msLeft = fireAt.getTime() - now.getTime();

  // Already past fire time — mark as fired and show in-app notification
  if (msLeft <= 0) {
    saveFollowupData({ ...data, fired: true });
    const notifBody = buildNotifBody(data.actionItems);
    toast.info(`🔔 Pengingat: ${notifBody}`, {
      duration: 8000,
      action: {
        label: "Buka Portal",
        onClick: () => { window.location.href = data.actionItems[0]?.url ?? "/jamaah"; },
      },
    });
    return false;
  }

  // Still pending and within 24h — re-schedule via SW
  if (msLeft <= DELAY_MS) {
    await scheduleViaServiceWorker(data);
    return true;
  }

  return false;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseChatbotFollowupOptions {
  messages: { role: string; content: string }[];
  enabled?: boolean;
}

export function useChatbotFollowup({ messages, enabled = true }: UseChatbotFollowupOptions) {
  const scheduledRef = useRef(false);

  // On mount: restore any pending followup (re-schedules SW timer if still valid)
  useEffect(() => {
    if (!enabled) return;
    restorePendingFollowup().catch(() => {});
  }, [enabled]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  // Schedule the 24h follow-up
  const scheduleFollowup = useCallback(
    async (msgs: { role: string; content: string }[]): Promise<boolean> => {
      if (scheduledRef.current) return true;

      const granted = await requestPermission();
      if (!granted) {
        toast.error(
          "Aktifkan izin notifikasi di pengaturan browser untuk menerima pengingat.",
          { duration: 5000 }
        );
        return false;
      }

      const actionItems = extractActionItems(msgs);
      const topics = actionItems.map((a) => a.label);
      const fireAt = new Date(Date.now() + DELAY_MS).toISOString();

      const data: FollowupData = {
        fireAt,
        actionItems,
        topics,
        fired: false,
        scheduledAt: new Date().toISOString(),
      };

      saveFollowupData(data);
      const ok = await scheduleViaServiceWorker(data);
      scheduledRef.current = true;

      if (ok) {
        toast.success("Pengingat tindak lanjut dijadwalkan 24 jam ke depan!", {
          description: actionItems.length > 0
            ? `Topik: ${actionItems.slice(0, 2).map((a) => a.label).join(", ")}`
            : "Kami akan mengingatkan Anda besok.",
          duration: 5000,
        });
      } else {
        // SW not available — save to localStorage, will show as in-app toast on next visit
        toast.success("Pengingat disimpan dan akan muncul saat Anda membuka portal besok.", {
          duration: 5000,
        });
      }

      return true;
    },
    [requestPermission]
  );

  // On unmount: auto-schedule if there are enough messages and not already scheduled
  useEffect(() => {
    return () => {
      const userMsgCount = messages.filter((m) => m.role === "user").length;
      if (!enabled || userMsgCount < 2 || scheduledRef.current) return;

      const existing = loadFollowupData();
      if (existing && !existing.fired) return; // already scheduled

      // Fire-and-forget on unmount
      const actionItems = extractActionItems(messages);
      if (actionItems.length === 0) return;

      const fireAt = new Date(Date.now() + DELAY_MS).toISOString();
      const data: FollowupData = {
        fireAt,
        actionItems,
        topics: actionItems.map((a) => a.label),
        fired: false,
        scheduledAt: new Date().toISOString(),
      };
      saveFollowupData(data);
      scheduleViaServiceWorker(data).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, enabled]);

  const cancelFollowup = useCallback(() => {
    clearFollowupData();
    scheduledRef.current = false;
    toast.success("Pengingat tindak lanjut dibatalkan.");
  }, []);

  const isScheduled = !!loadFollowupData() && !loadFollowupData()?.fired;

  return { scheduleFollowup, cancelFollowup, requestPermission, isScheduled };
}
