import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, XCircle, QrCode, Clock, Search, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const supabase: any = supabaseRaw;

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}

export default function JamaahAbsensi() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [sessionIdInput, setSessionIdInput] = useState("");

  // Auto-checkin from QR scan URL params
  const sessionFromUrl = searchParams.get("session");
  const tokenFromUrl   = searchParams.get("token");

  // Get jamaah customer record
  const { data: customerData } = useQuery({
    queryKey: ["jamaah-customer", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, bookings(id, departure_id, booking_status)")
        .eq("user_id", user!.id)
        .limit(1)
        .single();
      return data;
    },
  });

  const customerId = customerData?.id;

  // Get attendance history for this jamaah
  const { data: historyData, isLoading: histLoading, refetch } = useQuery({
    queryKey: ["jamaah-attendance-history", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const token = await getToken();
      const { data } = await supabase
        .from("guide_session_attendance")
        .select("id, status, check_in_at, check_in_method, session:guide_sessions(id, title, location, session_type, created_at)")
        .eq("customer_id", customerId)
        .order("check_in_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const doCheckin = async (sessionId: string, qrToken?: string) => {
    if (!customerId) {
      toast.error("Data jamaah tidak ditemukan. Pastikan Anda sudah login.");
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/v1/guide/sessions/${sessionId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qr_token: qrToken || undefined, customer_id: customerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Gagal check-in" });
        toast.error(data.error || "Gagal check-in");
      } else {
        setResult({ ok: true, message: `✅ Kehadiran Anda di sesi "${data.session_title}" berhasil dicatat!` });
        toast.success(`Kehadiran dicatat untuk sesi: ${data.session_title}`);
        refetch();
      }
    } catch {
      setResult({ ok: false, message: "Terjadi kesalahan. Coba lagi." });
      toast.error("Gagal terhubung ke server");
    } finally {
      setChecking(false);
    }
  };

  // Auto-process URL QR params
  useEffect(() => {
    if (sessionFromUrl && tokenFromUrl && customerId && !result) {
      doCheckin(sessionFromUrl, tokenFromUrl);
    }
  }, [sessionFromUrl, tokenFromUrl, customerId]);

  const handleManualCheckin = () => {
    const sid = sessionIdInput.trim();
    const tok = manualToken.trim();
    if (!sid) { toast.error("Masukkan ID sesi terlebih dahulu"); return; }
    doCheckin(sid, tok || undefined);
  };

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    present:  { label: "Hadir",     color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
    absent:   { label: "Absen",     color: "bg-red-100 text-red-700",      icon: XCircle },
    late:     { label: "Terlambat", color: "bg-amber-100 text-amber-700",  icon: Clock },
    excused:  { label: "Izin",      color: "bg-blue-100 text-blue-700",    icon: AlertCircle },
  };

  const history = historyData || [];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-lg mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-100 rounded-xl">
          <QrCode className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Absensi Sesi</h1>
          <p className="text-sm text-slate-400">Scan QR dari pemandu untuk mencatat kehadiran</p>
        </div>
      </div>

      {/* Hasil QR scan dari URL */}
      {(sessionFromUrl || result) && (
        <Card className={`border-2 ${result?.ok ? "border-green-300 bg-green-50" : result ? "border-red-300 bg-red-50" : "border-purple-200 bg-purple-50"}`}>
          <CardContent className="p-5 text-center">
            {checking && (
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full border-4 border-purple-300 border-t-purple-600 animate-spin" />
                <p className="text-sm text-purple-700">Memproses kehadiran...</p>
              </div>
            )}
            {!checking && result && (
              <div className="flex flex-col items-center gap-3">
                {result.ok
                  ? <CheckCircle2 className="h-12 w-12 text-green-500" />
                  : <XCircle className="h-12 w-12 text-red-500" />
                }
                <p className={`text-sm font-medium ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.message}</p>
                {!result.ok && (
                  <Button size="sm" variant="outline" onClick={() => setResult(null)}>Coba Lagi Manual</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual input (fallback jika QR tidak bisa scan) */}
      {!sessionFromUrl && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              Input Manual Token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500">
              Jika tidak bisa scan QR, minta pemandu untuk membagikan ID Sesi dan Token secara manual.
            </p>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">ID Sesi</Label>
              <Input
                placeholder="Masukkan ID sesi dari pemandu..."
                value={sessionIdInput}
                onChange={e => setSessionIdInput(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Token QR (opsional)</Label>
              <Input
                placeholder="Token dari pemandu..."
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={handleManualCheckin}
              disabled={checking || !sessionIdInput.trim()}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {checking ? "Memproses..." : "Catat Kehadiran"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Panduan */}
      <Card className="border border-slate-100 bg-slate-50">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-slate-600 mb-2">Cara Absensi:</h3>
          <ol className="text-xs text-slate-500 space-y-1 list-decimal pl-4">
            <li>Pemandu membuka halaman Absensi Sesi di layarnya</li>
            <li>Scan QR yang ditampilkan pemandu menggunakan kamera HP</li>
            <li>Anda akan diarahkan ke halaman ini dan kehadiran otomatis tercatat</li>
            <li>Atau gunakan input manual jika QR tidak bisa dibaca</li>
          </ol>
        </CardContent>
      </Card>

      {/* Riwayat kehadiran */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-400" />
          Riwayat Kehadiran ({history.length})
        </h2>

        {histLoading && <Skeleton className="h-20 w-full rounded-xl" />}
        {!histLoading && history.length === 0 && (
          <div className="text-center text-slate-400 py-8 text-sm">Belum ada riwayat kehadiran sesi.</div>
        )}

        <div className="space-y-2">
          {history.map((a: any) => {
            const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.present;
            const Icon = sc.icon;
            const session = a.session;
            return (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                <div className={`p-1.5 rounded-full ${sc.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{session?.title || "Sesi"}</p>
                  {session?.location && <p className="text-[10px] text-slate-400">{session.location}</p>}
                  {a.check_in_at && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {format(parseISO(a.check_in_at), "d MMM HH:mm", { locale: idLocale })}
                    </p>
                  )}
                </div>
                <Badge className={`text-[10px] border-0 flex-shrink-0 ${sc.color}`}>{sc.label}</Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
