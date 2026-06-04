import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, MapPin, Clock, Calendar, CheckCircle2, Share2, Bus, Users, Navigation } from "lucide-react";
import { Link } from "react-router-dom";
import { JamaahBottomNav } from "@/components/jamaah/JamaahBottomNav";
import { format, addDays, isToday, isBefore } from "date-fns";
import { id } from "date-fns/locale";

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  activities: {
    time: string;
    activity: string;
    location?: string;
  }[];
}

export default function JamaahItinerary() {
  const { user } = useAuth();

  // Fetch customer data
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

  // Fetch booking with departure and package
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

  const departure = booking?.departure;
  const packageData = departure?.package;

  // Generate itinerary from package data or use default
  const generateItinerary = (): ItineraryDay[] => {
    if (!departure) return [];

    const startDate = new Date(departure.departure_date);
    const durationDays = packageData?.duration_days || 9;

    // Check if package has itinerary JSON
    if (packageData?.itinerary && Array.isArray(packageData.itinerary)) {
      return (packageData.itinerary as any[]).map((day: any, index: number) => ({
        day: index + 1,
        date: format(addDays(startDate, index), "yyyy-MM-dd"),
        title: day.title || `Hari ${index + 1}`,
        activities: day.activities || [],
      }));
    }

    // Default itinerary template
    const defaultItinerary: ItineraryDay[] = [
      {
        day: 1,
        date: format(startDate, "yyyy-MM-dd"),
        title: "Keberangkatan dari Indonesia",
        activities: [
          { time: "06:00", activity: "Berkumpul di Bandara", location: "Terminal Internasional" },
          { time: "09:00", activity: "Check-in dan boarding", location: "Bandara" },
          { time: "12:00", activity: "Penerbangan ke Jeddah", location: "Pesawat" },
          { time: "18:00", activity: "Tiba di Jeddah, transfer ke Madinah", location: "Jeddah" },
        ],
      },
      {
        day: 2,
        date: format(addDays(startDate, 1), "yyyy-MM-dd"),
        title: "Madinah - Ziarah Masjid Nabawi",
        activities: [
          { time: "05:00", activity: "Sholat Subuh berjamaah", location: "Masjid Nabawi" },
          { time: "07:00", activity: "Sarapan di hotel", location: "Hotel" },
          { time: "09:00", activity: "Ziarah Raudhah", location: "Masjid Nabawi" },
          { time: "12:00", activity: "Sholat Dzuhur", location: "Masjid Nabawi" },
          { time: "16:00", activity: "City Tour Madinah", location: "Madinah" },
        ],
      },
      {
        day: 3,
        date: format(addDays(startDate, 2), "yyyy-MM-dd"),
        title: "Madinah - Ziarah Sejarah",
        activities: [
          { time: "05:00", activity: "Sholat Subuh berjamaah", location: "Masjid Nabawi" },
          { time: "08:00", activity: "Ziarah Uhud & Khandaq", location: "Madinah" },
          { time: "12:00", activity: "Sholat Dzuhur", location: "Masjid Nabawi" },
          { time: "14:00", activity: "Ziarah Masjid Quba", location: "Madinah" },
          { time: "16:00", activity: "Ziarah Qiblatain", location: "Madinah" },
        ],
      },
    ];

    // Add remaining days
    for (let i = 3; i < durationDays - 1; i++) {
      defaultItinerary.push({
        day: i + 1,
        date: format(addDays(startDate, i), "yyyy-MM-dd"),
        title: i < 5 ? "Makkah - Ibadah di Masjidil Haram" : "Makkah - Umrah & Ibadah",
        activities: [
          { time: "05:00", activity: "Sholat Subuh berjamaah", location: "Masjidil Haram" },
          { time: "07:00", activity: "Sarapan di hotel", location: "Hotel" },
          { time: "09:00", activity: "Thawaf & Sa'i (jika umrah)", location: "Masjidil Haram" },
          { time: "12:00", activity: "Sholat Dzuhur", location: "Masjidil Haram" },
          { time: "20:00", activity: "Sholat Isya & Tahajud", location: "Masjidil Haram" },
        ],
      });
    }

    // Last day - return
    defaultItinerary.push({
      day: durationDays,
      date: format(addDays(startDate, durationDays - 1), "yyyy-MM-dd"),
      title: "Kepulangan ke Indonesia",
      activities: [
        { time: "05:00", activity: "Sholat Subuh", location: "Hotel" },
        { time: "08:00", activity: "Check-out hotel", location: "Hotel" },
        { time: "10:00", activity: "Transfer ke Bandara Jeddah", location: "Jeddah" },
        { time: "14:00", activity: "Penerbangan kembali ke Indonesia", location: "Pesawat" },
        { time: "23:00", activity: "Tiba di Indonesia", location: "Bandara" },
      ],
    });

    return defaultItinerary;
  };

  const itinerary = generateItinerary();

  const getDayStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    if (isToday(date)) return "today";
    if (isBefore(date, today)) return "past";
    return "future";
  };

  const [showTransport, setShowTransport] = useState(true);

  // Derive transport info from booking/departure
  const transportSchedule = booking ? [
    {
      label: "Penjemputan ke Bandara",
      time: departure?.departure_date
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
      notes: "Perkiraan 5-6 jam perjalanan darat",
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
      time: departure?.return_date
        ? format(new Date(new Date(departure.return_date).getTime() - 4 * 60 * 60 * 1000), "HH:mm")
        : "08:00",
      location: "Hotel Makkah",
      bus: "Bus Charter",
      notes: "Perkiraan 1-2 jam perjalanan",
    },
  ] : [];

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
          {/* Q3: Tombol Share untuk Itinerary */}
          {itinerary.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground"
              onClick={async () => {
                const text = itinerary.map(day =>
                  `Hari ${day.day} - ${day.title}\n` +
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
              }}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">

        {/* O2: Info Transportasi / Bus */}
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
                  className={`overflow-hidden ${
                    status === "today" ? "ring-2 ring-primary" : ""
                  } ${status === "past" ? "opacity-60" : ""}`}
                >
                  <CardHeader className={`py-3 ${
                    status === "today" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === "past" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
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
                      {day.activities.map((activity, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            {idx < day.activities.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-3">
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                            <p className="font-medium text-sm">{activity.activity}</p>
                            {activity.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" />
                                {activity.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
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