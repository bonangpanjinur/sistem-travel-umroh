import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  ClipboardList, Plus, QrCode, Users, CheckCircle,
  XCircle, ChevronLeft, Clock, ChevronRight, Loader2, StopCircle
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase: any = supabaseRaw;

interface Session {
  id: string;
  title: string;
  session_type: string;
  location?: string;
  started_at: string;
  ended_at?: string;
  present_count: number;
  total_count: number;
}

interface AttendanceRow {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  check_in_at?: string;
}

export default function MuthawifAbsensiSesi() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: muthawifData } = useQuery({
    queryKey: ["muthawif-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name), booked_count")
        .eq("muthawif_user_id", user!.id)
        .in("status", ["active", "departed", "open"])
        .order("departure_date", { ascending: false })
        .limit(1).single();
      return data;
    },
  });

  const depId = muthawifData?.id;

  const { data: sessionData, isLoading: sessLoading } = useQuery({
    queryKey: ["muthawif-sessions", depId],
    enabled: !!depId,
    refetchInterval: 15000,
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`/api/v1/guide/sessions/${depId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      return res.json();
    },
  });

  const { data: attendanceData } = useQuery({
    queryKey: ["muthawif-attendance", selectedSession?.id],
    enabled: !!selectedSession?.id,
    refetchInterval: 10000,
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`/api/v1/guide/sessions/${selectedSession!.id}/attendance`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) throw new Error("Judul sesi wajib diisi");
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch("/api/v1/guide/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          departure_id: depId,
          session_type: "ibadah",
          title: newTitle.trim(),
          location: newLocation.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal buat sesi");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["muthawif-sessions", depId] });
      setNewTitle(""); setNewLocation(""); setShowCreate(false);
      toast.success("Sesi absensi dibuat");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      const session = (await supabase.auth.getSession()).data.session;
      await fetch(`/api/v1/guide/sessions/${id}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["muthawif-sessions", depId] });
      if (selectedSession) setSelectedSession(null);
      toast.success("Sesi diakhiri");
    },
  });

  const manualMutation = useMutation({
    mutationFn: async ({ customerId, status }: { customerId: string; status: string }) => {
      const session = (await supabase.auth.getSession()).data.session;
      await fetch(`/api/v1/guide/sessions/${selectedSession!.id}/attendance/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["muthawif-attendance", selectedSession?.id] }),
  });

  const sessions: Session[] = sessionData?.sessions || [];
  const attendance: AttendanceRow[] = attendanceData?.attendance || [];
  const openSessions = sessions.filter(s => !s.ended_at);
  const closedSessions = sessions.filter(s => s.ended_at);

  if (selectedSession) {
    const present = attendance.filter(a => a.status === "present").length;
    const absent = attendance.filter(a => a.status === "absent").length;
    const total = attendance.length || muthawifData?.booked_count || 0;

    return (
      <div className="min-h-screen bg-slate-50 pb-8">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedSession(null)} className="text-slate-500 hover:text-slate-700">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{selectedSession.title}</p>
                <p className="text-xs text-slate-500">{selectedSession.location}</p>
              </div>
            </div>
            {!selectedSession.ended_at && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-red-600 border-red-200 text-xs"
                onClick={() => endSessionMutation.mutate(selectedSession.id)}
                disabled={endSessionMutation.isPending}
              >
                <StopCircle className="w-3.5 h-3.5 mr-1" />Akhiri
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center p-3">
              <p className="text-2xl font-bold text-slate-700">{total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </Card>
            <Card className="text-center p-3 bg-emerald-50 border-emerald-200">
              <p className="text-2xl font-bold text-emerald-700">{present}</p>
              <p className="text-xs text-emerald-600">Hadir</p>
            </Card>
            <Card className="text-center p-3 bg-red-50 border-red-200">
              <p className="text-2xl font-bold text-red-700">{absent}</p>
              <p className="text-xs text-red-600">Tidak Hadir</p>
            </Card>
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Kehadiran</span>
              <span>{total > 0 ? Math.round((present / total) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full">
              <div
                className="h-2 bg-emerald-500 rounded-full transition-all"
                style={{ width: total > 0 ? `${(present / total) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* Attendance list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Daftar Jamaah</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {attendance.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Belum ada data absensi</p>
              ) : (
                <div className="divide-y">
                  {attendance.map(a => (
                    <div key={a.customer_id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{a.customer_name}</p>
                        <p className="text-xs text-slate-500">{a.customer_phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.status === "present" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">✅ Hadir</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">❌ Absen</Badge>
                        )}
                        <button
                          onClick={() => manualMutation.mutate({
                            customerId: a.customer_id,
                            status: a.status === "present" ? "absent" : "present",
                          })}
                          className="text-xs text-slate-400 hover:text-slate-600 underline"
                        >
                          Ubah
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/muthawif/dashboard" className="text-slate-500 hover:text-slate-700">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-slate-800">Absensi Sesi</h1>
              <p className="text-xs text-slate-500">{muthawifData?.package?.name}</p>
            </div>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-1" />Buat Sesi
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {showCreate && (
          <Card className="border-emerald-200">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">Buat Sesi Baru</h3>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nama Sesi *</label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Misal: Shalat Subuh, Ziarah Jabal Nur..."
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Lokasi</label>
                <Input
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="Masjidil Haram, Masjid Nabawi..."
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newTitle.trim()}
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Buat Sesi
                </Button>
                <Button variant="outline" className="h-9" onClick={() => setShowCreate(false)}>Batal</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {openSessions.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sesi Aktif</h2>
            <div className="space-y-2">
              {openSessions.map(s => (
                <button key={s.id} onClick={() => setSelectedSession(s)} className="w-full text-left">
                  <Card className="border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                        </div>
                        {s.location && <p className="text-xs text-slate-500">{s.location}</p>}
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {s.present_count} hadir
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        )}

        {closedSessions.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sesi Selesai</h2>
            <div className="space-y-2">
              {closedSessions.map(s => (
                <button key={s.id} onClick={() => setSelectedSession(s)} className="w-full text-left">
                  <Card className="hover:bg-slate-50 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-700 text-sm">{s.title}</p>
                        {s.location && <p className="text-xs text-slate-500">{s.location}</p>}
                        <p className="text-xs text-slate-400 mt-1">
                          {s.present_count} hadir · selesai {s.ended_at ? format(new Date(s.ended_at), "HH:mm", { locale: idLocale }) : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        )}

        {!sessLoading && sessions.length === 0 && (
          <Card className="text-center p-8">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada sesi absensi.</p>
            <p className="text-slate-400 text-xs mt-1">Buat sesi baru untuk mulai mencatat kehadiran.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
