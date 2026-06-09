import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useJamaahPushSubscription } from "@/hooks/useJamaahPushSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MapPin, Clock, Calendar, CheckCircle2, Share2,
  Bus, Users, Navigation, Plane, Hotel, Star, Circle, Bell, BellOff, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format, addDays, isToday, isBefore } from "date-fns";
import { id } from "date-fns/locale";

interface ItineraryActivity {
  time: string;
  activity: string;
  location?: string;
  type?: string;
  is_completed?: boolean;
}

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  activities: ItineraryActivity[];
  source: "live" | "package" | "default";
}

const ACTIVITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  hotel: Hotel,
  transport: Bus,
  group: Users,
  location: MapPin,
  other: Circle,
};

export default function JamaahItinerary() {
  const { user } = useAuth();

  const { data: customer } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: booking } = useQuery({
    queryKey: ["jamaah-booking-itinerary", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          departure:departures(
            *,
            package:packages(*)
          )
        `)
        .eq("customer_id", customer.id)
        .in("booking_status", ["confirmed", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const queryClient = useQueryClient();
  const departure = (booking?.departure as any) ?? null;
  const packageData = (departure?.package as any) ?? null;
  const departureId: string | null = departure?.id ?? null;

  // ── Push notification subscription ───────────────────────────────────────
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    permission: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = useJamaahPushSubscription({
    customerId: customer?.id,
    userId: user?.id,
    autoSubscribe: true,
  });

  // ── Realtime subscription — auto-refresh itinerary saat guide update ─────
  useEffect(() => {
    if (!departureId) return;

    const channel = (supabase as any)
      .channel(`trip-timeline-${departureId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_timeline",
          filter: `departure_id=eq.${departureId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["trip-timeline-jamaah", departureId] });
        },
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [departureId, queryClient]);

  const { data: timelineEntries } = useQuery({
    queryKey: ["trip-timeline-jamaah", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("trip_timeline")
        .select("id, day_number, activity_type, title, description, location, time_start, is_completed")
        .eq("departure_id", departureId)
        .order("day_number", { ascending: true })
        .order("time_start", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data ?? []) as {
        id: string;
        day_number: number;
        activity_type: string;
        title: string;
        description: string | null;
        location: string | null;
        time_start: string | null;
        is_completed: boolean;
      }[];
    },
  });

  const generateItinerary = (): ItineraryDay[] => {
    if (!departure) return [];

    const startDate = new Date(departure.departure_date);
    const durationDays = packageData?.duration_days || 9;

    // Priority 1: trip_timeline live data
    if (timelineEntries && timelineEntries.length > 0) {
      const grouped = new Map<number, typeof timelineEntries>();
      for (const entry of timelineEntries) {
        const dn = entry.day_number ?? 1;
        if (!grouped.has(dn)) grouped.set(dn, []);
        grouped.get(dn)!.push(entry);
      }

      const days: ItineraryDay[] = [];
      for (const [dayNum, entries] of Array.from(grouped.entries()).sort((a, b) => a[0] - b[0])) {
        days.push({
          day: dayNum,
          date: format(addDays(startDate, dayNum - 1), "yyyy-MM-dd"),
          title: entries[0]?.title ?? `Hari ${dayNum}`,
          source: "live",
          activities: entries.map(e => ({
            time: e.time_start ?? "",
            activity: e.title,
            location: e.location ?? undefined,
            type: e.activity_type,
            is_completed: e.is_completed,
          })),
        });
      }
      return days;
    }

    // Priority 2: packages.itinerary JSON
    if (packageData?.itinerary && Array.isArray(packageData.itinerary)) {
      return (packageData.itinerary as any[]).map((day: any, index: number) => ({
        day: index + 1,
        date: format(addDays(startDate, index), "yyyy-MM-dd"),
        title: day.title || `Hari ${index + 1}`,
        source: "package" as const,
        activities: (day.activities ?? []).map((a: any) => ({
          time: a.time ?? "",
          activity: a.activity ?? a.title ?? "",
          location: a.location,
          type: a.type,
          is_completed: false,
        })),
      }));
    }

    // Priority 3: default template
    const defaultItinerary: ItineraryDay[] = [
      {
        day: 1,
        date: format(startDate, "yyyy-MM-dd"),
        title: "Keberangkatan dari Indonesia",
        source: "default",
        activities: [
          { time: "06:00", activity: "Berkumpul di Bandara", location: "Terminal Internasional", type: "group" },
          { time: "09:00", activity: "Check-in dan boarding", location: "Bandara", type: "flight" },
          { time: "12:00", activity: "Penerbangan ke Jeddah", location: "Pesawat", type: "flight" },
          { time: "18:00", activity: "Tiba di Jeddah, transfer ke Madinah", location: "Jeddah", type: "transport" },
        ],
      },
      {
        day: 2,
        date: format(addDays(startDate, 1), "yyyy-MM-dd"),
        title: "Madinah – Ziarah Masjid Nabawi",
        source: "default",
        activities: [
          { time: "05:00", activity: "Sholat Subuh berjamaah", location: "Masjid Nabawi", type: "group" },
          { time: "07:00", activity: "Sarapan di hotel", location: "Hotel", type: "hotel" },
          { time: "09:00", activity: "Ziarah Raudhah", location: "Masjid Nabawi", type: "location" },
          { time: "12:00", activity: "Sholat Dzuhur", location: "Masjid Nabawi", type: "group" },
          { time: "16:00", activity: "City Tour Madinah", location: "Madinah", type: "location" },
        ],
      },
      {
        day: 3,
        date: format(addDays(startDate, 2), "yyyy-MM-dd"),
        title: "Madinah – Ziarah Sejarah",
        source: "default",
        activities: [
          { time: "05:00", activity: "Sholat Subuh berjamaah", location: "Masjid Nabawi", type: "group" },
          { time: "08:00", activity: "Ziarah Uhud & Khandaq", location: "Madinah", type: "location" },
          { time: "12:00", activity: "Sholat Dzuhur", location: "Masjid Nabawi", type: "group" },
          { time: "14:00", activity: "Ziarah Masjid Quba", location: "Madinah", type: "location" },
          { time: "16:00", activity: "Ziarah Qiblatain", location: "Madinah", type: "location" },
        ],
      },
    ];

    for (let i = 3; i < durationDays - 1; i++) {
      defaultItinerary.push({
        day: i + 1,
        date: format(addDays(startDate, i), "yyyy-MM-dd"),
        title: i < 5 ? "Makkah – Ibadah di Masjidil Haram" : "Makkah – Umrah & Ibadah",
        source: "default",
        activities: [
          { time: "05:00", activity: "Sholat Subuh berjamaah", location: "Masjidil Haram", type: "group" },
          { time: "07:00", activity: "Sarapan di hotel", location: "Hotel", type: "hotel" },
          { time: "09:00", activity: "Thawaf & Sa'i (jika umrah)", location: "Masjidil Haram", type: "location" },
          { time: "12:00", activity: "Sholat Dzuhur", location: "Masjidil Haram", type: "group" },
          { time: "20:00", activity: "Sholat Isya & Tahajud", location: "Masjidil Haram", type: "group" },
        ],
      });
    }

    defaultItinerary.push({
      day: durationDays,
      date: format(addDays(startDate, durationDays - 1), "yyyy-MM-dd"),
      title: "Kepulangan ke Indonesia",
      source: "default",
      activities: [
        { time: "05:00", activity: "Sholat Subuh", location: "Hotel", type: "group" },
        { time: "08:00", activity: "Check-out hotel", location: "Hotel", type: "hotel" },
        { time: "10:00", activity: "Transfer ke Bandara Jeddah", location: "Jeddah", type: "transport" },
        { time: "14:00", activity: "Penerbangan kembali ke Indonesia", location: "Pesawat", type: "flight" },
        { time: "23:00", activity: "Tiba di Indonesia", location: "Bandara", type: "flight" },
      ],
    });

    return defaultItinerary;
  };

  const itinerary = generateItinerary();
  const isLiveData = itinerary.length > 0 && itinerary[0].source === "live";

  const getDayStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "today";
    if (isBefore(date, new Date())) return "past";
    return "future";
  };

  const [showTransport, setShowTransport] = useState(true);

  const transportSchedule = departure ? [
    {
      label: "Penjemputan ke Bandara",
      time: departure.departure_date
        ? format(new Date(new Date(departure.departure_date).getTime() - 3 * 60 * 60 * 1000), "HH:mm")
        : "05:00",
      location: "Titik Kumpul – Kantor Travel",
      bus: "Bus A1",
      notes: "Tiba 30 menit sebelum waktu kumpul",
    },
    {
      label: "Transfer Jeddah → Madinah",
      time: "Setelah tiba di Jeddah",
      location: "Bandara King Abdulaziz, Jeddah",
      bus: "Bus Charter",
      notes: "Perkiraan 5–6 jam perjalanan darat",
    },
    {
      label: "Transfer Madinah → Makkah",
      time: "Hari ke-4 atau ke-5",
      location: "Hotel Madinah",
      bus: "Bus Rombongan",
      notes: "Sesuai instruksi muthawif",
    },
    {
      label: "Transfer Makkah → Jeddah (Pulang)",
      time: departure.return_date
        ? format(new Date(new Date(departure.return_date).getTime() - 4 * 60 * 60 * 1000), "HH:mm")
        : "08:00",
      location: "Hotel Makkah",
      bus: "Bus Charter",
      notes: "Perkiraan 1–2 jam perjalanan",
    },
  ] : [];

  const shareItinerary = async () => {
    const text = itinerary.map(day =>
      `Hari ${day.day} – ${day.title}\n` +
      day.activities.map(a => `  ${a.time} ${a.activity}${a.location ? ` (${a.location})` : ""}`).join("\n")
    ).join("\n\n");
    const shareData = {
      title: `Itinerary ${packageData?.name || "Perjalanan Umroh"}`,
      text: `*Itinerary ${packageData?.name || "Umroh/Haji"}*\n\n${text}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(shareData.text);
      const { toast } = await import("sonner");
      toast.success("Itinerary disalin ke clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/jamaah">
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">Itinerary</h1>
              <p className="text-xs opacity-80">{packageData?.name || "Jadwal Perjalanan"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Tombol notifikasi push */}
            {pushSupported && pushPermission !== "denied" && (
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground"
                onClick={() => pushSubscribed ? unsubscribePush() : subscribePush()}
                disabled={pushLoading}
                title={pushSubscribed ? "Nonaktifkan notifikasi" : "Aktifkan notifikasi itinerary"}
              >
                {pushLoading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : pushSubscribed
                    ? <Bell className="h-5 w-5" />
                    : <BellOff className="h-5 w-5 opacity-60" />
                }
              </Button>
            )}
            {itinerary.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground"
                onClick={shareItinerary}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">

        {/* Live data badge */}
        {isLiveData && (
          <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-700 font-medium">Live Update dari Guide</span>
            <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 ml-auto">
              Real-time
            </Badge>
          </div>
        )}

        {/* Prompt aktifkan notifikasi push jika belum subscribe */}
        {pushSupported && pushPermission === "default" && !pushSubscribed && customer?.id && (
          <div className="mb-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-800 font-medium truncate">
                Aktifkan notifikasi agar tahu saat guide memperbarui program
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-amber-700 border-amber-300 hover:bg-amber-100 text-xs flex-shrink-0 h-7 px-2"
              onClick={() => subscribePush()}
              disabled={pushLoading}
            >
              {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aktifkan"}
            </Button>
          </div>
        )}

        {/* Info Transportasi */}
        {transportSchedule.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowTransport(v => !v)}
              className="w-full flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-2"
            >
              <span className="flex items-center gap-2 text-blue-800 font-semibold text-sm">
                <Bus className="h-4 w-4" /> Info Transportasi & Bus
              </span>
              <span className="text-blue-500 text-xs">{showTransport ? "Sembunyikan ▲" : "Tampilkan ▼"}</span>
            </button>
            {showTransport && (
              <div className="space-y-2">
                {transportSchedule.map((t, idx) => (
                  <div key={idx} className="bg-white border border-blue-100 rounded-xl p-3 flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bus className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">{t.label}</p>
                        <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg flex-shrink-0">{t.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Navigation className="h-3 w-3" />{t.location}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Users className="h-3 w-3" />{t.bus}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{t.notes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {itinerary.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada jadwal perjalanan</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {itinerary.map((day) => {
              const status = getDayStatus(day.date);

              return (
                <Card
                  key={day.day}
                  className={`overflow-hidden ${status === "today" ? "ring-2 ring-primary" : ""} ${status === "past" ? "opacity-70" : ""}`}
                >
                  <CardHeader className={`py-3 ${status === "today" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === "past" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {status === "today" && <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />}
                        <CardTitle className="text-base">Hari {day.day}</CardTitle>
                      </div>
                      <Badge variant={status === "today" ? "secondary" : "outline"}>
                        {format(new Date(day.date), "dd MMM", { locale: id })}
                      </Badge>
                    </div>
                    <CardDescription className={status === "today" ? "text-primary-foreground/80" : ""}>
                      {day.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-3">
                    <div className="space-y-3">
                      {day.activities.map((activity, idx) => {
                        const Icon = ACTIVITY_ICON[activity.type ?? "other"] ?? Circle;
                        return (
                          <div key={idx} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${activity.is_completed ? "bg-green-100" : "bg-primary/10"}`}>
                                {activity.is_completed
                                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  : <Icon className="h-4 w-4 text-primary" />
                                }
                              </div>
                              {idx < day.activities.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border mt-1 min-h-[12px]" />
                              )}
                            </div>
                            <div className={`flex-1 pb-3 ${activity.is_completed ? "opacity-60" : ""}`}>
                              {activity.time && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />{activity.time}
                                </p>
                              )}
                              <p className={`font-medium text-sm ${activity.is_completed ? "line-through" : ""}`}>
                                {activity.activity}
                              </p>
                              {activity.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {activity.location}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <JamaahBottomNav />
    </div>
  );
}
