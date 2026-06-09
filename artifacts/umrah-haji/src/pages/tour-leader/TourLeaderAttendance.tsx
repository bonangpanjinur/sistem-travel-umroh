import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, Plus, QrCode, CheckCircle2, XCircle, Clock, RefreshCcw, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import QRCode from "qrcode";

const supabase: any = supabaseRaw;

const SESSION_TYPES = [
  { value: "bus_boarding", label: "🚌 Naik Bus" },
  { value: "sholat", label: "🕌 Sholat Berjamaah" },
  { value: "ziarah", label: "🕋 Ziarah" },
  { value: "makan", label: "🍽️ Makan Bersama" },
  { value: "hotel_checkin", label: "🏨 Check-in Hotel" },
  { value: "airport", label: "✈️ Bandara" },
  { value: "briefing", label: "📋 Briefing" },
  { value: "custom", label: "📌 Lainnya" },
];

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}

async function generateQR(token: string, sessionId: string): Promise<string> {
  const url = `${window.location.origin}/jamaah/absensi?session=${sessionId}&token=${token}`;
  return QRCode.toDataURL(url, { width: 300, margin: 2 });
}

export default function TourLeaderAttendance() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", session_type: "custom", location: "", scheduled_at: "" });
  const [creating, setCreating] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [showAttendance, setShowAttendance] = useState<string | null>(null);

  const { data: departure } = useQuery({
    queryKey: ["tl-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name)")
        .eq("tour_leader_user_id", user!.id)
        .in("status", ["active", "departed", "open"])
        .order("departure_date", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const depId = departure?.id;

  const { data: sessionsData, isLoading, refetch } = useQuery({
    queryKey: ["tl-sessions", depId],
    enabled: !!depId,
    refetchInterval: 10000,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/sessions/${depId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const { data: attendanceData } = useQuery({
    queryKey: ["tl-attendance", showAttendance],
    enabled: !!showAttendance,
    refetchInterval: 5000,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/sessions/${showAttendance}/attendance`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const sessions = sessionsData?.sessions || [];
  const attendance = attendanceData?.attendance || [];

  const createSession = async () => {
    if (!form.title.trim() || !depId) return;
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/v1/guide/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ departure_id: depId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Sesi absensi dibuat!");
      setForm({ title: "", session_type: "custom", location: "", scheduled_at: "" });
      setShowForm(false);
      const session = data.session;
      setActiveSession(session);
      const qr = await generateQR(session.qr_token, session.id);
      setQrDataUrl(qr);
      qc.invalidateQueries({ queryKey: ["tl-sessions", depId] });
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat sesi");
    } finally {
      setCreating(false);
    }
  };

  const refreshQR = async (sessionId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/sessions/${sessionId}/refresh-qr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const qr = await generateQR(data.session.qr_token, sessionId);
      setQrDataUrl(qr);
      if (activeSession?.id === sessionId) setActiveSession(data.session);
      toast.success("QR diperbarui");
      qc.invalidateQueries({ queryKey: ["tl-sessions", depId] });
    } catch {
      toast.error("Gagal refresh QR");
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      const token = await getToken();
      await fetch(`/api/v1/guide/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Sesi berakhir");
      if (activeSession?.id === sessionId) { setActiveSession(null); setQrDataUrl(""); }
      qc.invalidateQueries({ queryKey: ["tl-sessions", depId] });
    } catch {
      toast.error("Gagal mengakhiri sesi");
    }
  };

  const markAttendance = async (sessionId: string, customerId: string, status: string) => {
    try {
      const token = await getToken();
      await fetch(`/api/v1/guide/sessions/${sessionId}/attendance/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      qc.invalidateQueries({ queryKey: ["tl-attendance", sessionId] });
    } catch {
      toast.error("Gagal update kehadiran");
    }
  };

  const todaySessions = sessions.filter((s: any) => {
    const created = new Date(s.created_at);
    return created.toDateString() === new Date().toDateString();
  });

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/tour-leader">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-purple-600" />
            Absensi Sesi
          </h1>
          <p className="text-xs text-slate-400">{(departure?.package as any)?.name || "Rombongan"}</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Buat Sesi
        </Button>
      </div>

      {/* Form Buat Sesi */}
      {showForm && (
        <Card className="border shadow-sm border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Buat Sesi Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Jenis Sesi</Label>
              <Select value={form.session_type} onValueChange={v => setForm(f => ({ ...f, session_type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Nama Sesi *</Label>
              <Input placeholder="mis. Sholat Subuh Berjemaah, Ziarah Jabal Nur..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-9" />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Lokasi (opsional)</Label>
              <Input placeholder="mis. Masjidil Haram, Bus 1" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="h-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={createSession} disabled={creating || !form.title.trim()}>
                {creating ? "Membuat..." : "Buat & Tampilkan QR"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Display untuk sesi aktif */}
      {activeSession && qrDataUrl && (
        <Card className="border-2 border-purple-300 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              {activeSession.title}
              {activeSession.location && <span className="text-xs font-normal text-slate-400">• {activeSession.location}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <img src={qrDataUrl} alt="QR Absensi" className="w-64 h-64 rounded-xl border" />
            <p className="text-xs text-slate-500 text-center">
              Tampilkan QR ini ke jamaah untuk scan absensi.<br />
              QR berlaku {activeSession.qr_expires_at ? format(parseISO(activeSession.qr_expires_at), "HH:mm") : "30 menit"}.
            </p>
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => refreshQR(activeSession.id)}>
                <RefreshCcw className="h-3.5 w-3.5 mr-1" />Refresh QR
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-slate-500" onClick={() => endSession(activeSession.id)}>
                Akhiri Sesi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daftar Sesi Hari Ini */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Sesi Hari Ini ({todaySessions.length})</h2>
        {isLoading && <Skeleton className="h-20 w-full rounded-xl" />}
        {!isLoading && todaySessions.length === 0 && (
          <div className="text-center text-slate-400 py-8 text-sm">Belum ada sesi hari ini.</div>
        )}
        <div className="space-y-3">
          {todaySessions.map((s: any) => (
            <Card key={s.id} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{s.title}</p>
                    {s.location && <p className="text-xs text-slate-400 mt-0.5">{s.location}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs ${s.ended_at ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}`}>
                      {s.ended_at ? "Selesai" : "Aktif"}
                    </Badge>
                    <span className="text-xs text-slate-500 font-semibold">{s.present_count}/{s.total_count || "?"}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {!s.ended_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={async () => {
                        setActiveSession(s);
                        const qr = await generateQR(s.qr_token, s.id);
                        setQrDataUrl(qr);
                      }}
                    >
                      <QrCode className="h-3 w-3 mr-1" />Tampilkan QR
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-purple-600"
                    onClick={() => setShowAttendance(showAttendance === s.id ? null : s.id)}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Daftar Hadir
                    {showAttendance === s.id ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                  </Button>
                  {!s.ended_at && (
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-slate-400" onClick={() => endSession(s.id)}>
                      Akhiri
                    </Button>
                  )}
                </div>

                {/* Daftar kehadiran */}
                {showAttendance === s.id && attendance.length > 0 && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    {attendance.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-700">{a.customer_name}</p>
                          <p className="text-[10px] text-slate-400">{a.customer_phone}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => markAttendance(s.id, a.customer_id, "present")}
                            className={`p-1 rounded-full transition-colors ${a.status === "present" ? "text-green-600 bg-green-100" : "text-slate-300 hover:text-green-400"}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => markAttendance(s.id, a.customer_id, "late")}
                            className={`p-1 rounded-full transition-colors ${a.status === "late" ? "text-amber-600 bg-amber-100" : "text-slate-300 hover:text-amber-400"}`}
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => markAttendance(s.id, a.customer_id, "absent")}
                            className={`p-1 rounded-full transition-colors ${a.status === "absent" ? "text-red-500 bg-red-100" : "text-slate-300 hover:text-red-400"}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
