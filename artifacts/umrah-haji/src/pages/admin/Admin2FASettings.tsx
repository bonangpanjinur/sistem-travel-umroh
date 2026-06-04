import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Shield, Smartphone, Mail, Key, CheckCircle, AlertCircle,
  Loader2, QrCode, Copy, RefreshCcw, Lock
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const API_BASE = "/api";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request gagal");
  return json;
}

// ─── TOTP Section ─────────────────────────────────────────────────────────────

function TOTPSection({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [enrollStep, setEnrollStep] = useState<"idle" | "scan" | "verify" | "done">("idle");
  const [qrData, setQrData] = useState<{ qrCodeDataUrl: string; manualKey: string } | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [disableOtp, setDisableOtp] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["totp-status", userId],
    queryFn: () => apiFetch(`/totp/status?userId=${userId}`),
    enabled: !!userId,
    retry: false,
  });

  const enrollMutation = useMutation({
    mutationFn: () => apiFetch("/totp/enroll", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
    onSuccess: (data) => {
      setQrData({ qrCodeDataUrl: data.qrCodeDataUrl, manualKey: data.manualKey });
      setEnrollStep("scan");
      setOtpInput("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyEnrollMutation = useMutation({
    mutationFn: () => apiFetch("/totp/verify-enroll", {
      method: "POST",
      body: JSON.stringify({ userId, token: otpInput }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["totp-status", userId] });
      setEnrollStep("done");
      toast.success("TOTP Authenticator berhasil diaktifkan!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disableMutation = useMutation({
    mutationFn: () => apiFetch("/totp/disable", {
      method: "POST",
      body: JSON.stringify({ userId, token: disableOtp }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["totp-status", userId] });
      setShowDisableDialog(false);
      setDisableOtp("");
      setEnrollStep("idle");
      setQrData(null);
      toast.success("TOTP dinonaktifkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copyKey() {
    if (qrData?.manualKey) {
      navigator.clipboard.writeText(qrData.manualKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Memuat status TOTP...</p>;
  }

  const isEnabled = status?.enabled === true;

  if (isEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <QrCode className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="font-medium text-green-800">Authenticator App Aktif</p>
              <p className="text-xs text-green-600">
                Diaktifkan: {status?.verified_at
                  ? new Date(status.verified_at).toLocaleString("id-ID")
                  : "—"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowDisableDialog(true)}>
            Nonaktifkan
          </Button>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Akun Anda terlindungi dengan TOTP. Setiap login memerlukan kode 6 digit dari aplikasi Authenticator.
          </AlertDescription>
        </Alert>

        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nonaktifkan TOTP Authenticator</DialogTitle>
              <DialogDescription>
                Masukkan kode 6 digit dari aplikasi Authenticator Anda untuk mengkonfirmasi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Kode OTP saat ini</Label>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={disableOtp}
                onChange={e => setDisableOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDisableDialog(false); setDisableOtp(""); }}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => disableMutation.mutate()}
                disabled={disableOtp.length !== 6 || disableMutation.isPending}
              >
                {disableMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Nonaktifkan TOTP
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (enrollStep === "idle" || enrollStep === "done") {
    return (
      <div className="space-y-4">
        {enrollStep === "done" && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              TOTP berhasil diaktifkan. Mulai sekarang login Anda memerlukan kode dari aplikasi Authenticator.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center py-6 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <QrCode className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">Authenticator App (TOTP)</p>
            <p className="text-sm text-muted-foreground mt-1">
              Gunakan Google Authenticator, Authy, atau aplikasi TOTP lainnya. Kode diperbarui setiap 30 detik.
            </p>
          </div>
          <Button
            onClick={() => enrollMutation.mutate()}
            disabled={enrollMutation.isPending}
          >
            {enrollMutation.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Membuat kode QR...</>
              : <><QrCode className="h-4 w-4 mr-2" />Mulai Pendaftaran TOTP</>
            }
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1 border rounded-lg p-3 bg-muted/50">
          <p className="font-medium text-foreground">Cara kerja TOTP:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Klik tombol di atas → scan kode QR dengan aplikasi Authenticator</li>
            <li>Aplikasi menghasilkan kode 6 digit yang berganti setiap 30 detik</li>
            <li>Masukkan kode tersebut untuk mengkonfirmasi pendaftaran</li>
            <li>Mulai sekarang, setiap login akan meminta kode tersebut</li>
          </ol>
        </div>
      </div>
    );
  }

  if (enrollStep === "scan" && qrData) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <p className="font-medium mb-1">Langkah 1 — Scan Kode QR</p>
          <p className="text-sm text-muted-foreground mb-4">
            Buka aplikasi Authenticator (Google Authenticator / Authy) → tap tanda <strong>+</strong> → pilih <strong>Scan QR code</strong>
          </p>
          <div className="inline-block p-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <img
              src={qrData.qrCodeDataUrl}
              alt="TOTP QR Code"
              className="w-48 h-48 block mx-auto"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-center text-muted-foreground">
            Tidak bisa scan? Masukkan kunci manual ini ke aplikasi Authenticator:
          </p>
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <code className="flex-1 text-xs font-mono break-all select-all text-center tracking-widest">
              {qrData.manualKey}
            </code>
            <Button size="sm" variant="ghost" onClick={copyKey} className="shrink-0">
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <p className="font-medium mb-1">Langkah 2 — Masukkan Kode dari Aplikasi</p>
            <p className="text-sm text-muted-foreground">
              Setelah scan, masukkan kode 6 digit yang ditampilkan aplikasi untuk mengkonfirmasi.
            </p>
          </div>
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otpInput}
            onChange={e => setOtpInput(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-[0.5em] font-mono"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => { setEnrollStep("idle"); setQrData(null); setOtpInput(""); }}
          >
            Batal
          </Button>
          <Button
            className="flex-1"
            onClick={() => verifyEnrollMutation.mutate()}
            disabled={otpInput.length !== 6 || verifyEnrollMutation.isPending}
          >
            {verifyEnrollMutation.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Memverifikasi...</>
              : <><CheckCircle className="h-4 w-4 mr-2" />Aktifkan TOTP</>
            }
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Kode berlaku 30 detik. Jika kode salah, tunggu kode baru muncul di aplikasi.
        </p>
      </div>
    );
  }

  return null;
}

// ─── OTP Email / WhatsApp Section ─────────────────────────────────────────────

function OTPSection({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [method, setMethod] = useState<"email" | "whatsapp">("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [setupStep, setSetupStep] = useState<"choose" | "verify">("choose");
  const [destinationHint, setDestinationHint] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["2fa-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("user_2fa_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      if (method === "whatsapp" && !phoneNumber.trim()) throw new Error("Masukkan nomor WhatsApp aktif.");
      const { data, error } = await (supabase as any).functions.invoke("request-2fa-otp", {
        body: { purpose: "setup", method, phone: phoneNumber.trim() || undefined },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return { destination: data?.destination ?? "" };
    },
    onSuccess: (data) => { setDestinationHint(data.destination); setSetupStep("verify"); toast.success("Kode OTP dikirim"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!/^\d{6}$/.test(verificationCode)) throw new Error("Kode harus 6 digit angka.");
      const { data, error } = await (supabase as any).functions.invoke("verify-2fa-otp", {
        body: { purpose: "setup", method, phone: phoneNumber.trim() || undefined, code: verificationCode },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("2FA berhasil diaktifkan");
      queryClient.invalidateQueries({ queryKey: ["2fa-settings"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User tidak terautentikasi");
      const { error } = await (supabase as any)
        .from("user_2fa_settings")
        .update({ is_enabled: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("2FA dinonaktifkan");
      queryClient.invalidateQueries({ queryKey: ["2fa-settings"] });
    },
    onError: (e: Error) => toast.error("Gagal menonaktifkan 2FA: " + e.message),
  });

  function closeDialog() {
    setShowSetupDialog(false);
    setSetupStep("choose");
    setVerificationCode("");
    setDestinationHint("");
  }

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Memuat...</p>;

  return (
    <div className="space-y-4">
      {settings?.is_enabled ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                {settings.method === "email"
                  ? <Mail className="h-5 w-5 text-green-700" />
                  : <Smartphone className="h-5 w-5 text-green-700" />}
              </div>
              <div>
                <p className="font-medium text-green-800">
                  {settings.method === "email" ? "Email OTP Aktif" : "WhatsApp OTP Aktif"}
                </p>
                <p className="text-xs text-green-600">
                  {settings.method === "email" ? user?.email : settings.phone_number}
                </p>
              </div>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
            >
              {disableMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nonaktifkan"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Terakhir diverifikasi: {settings.last_verified_at
              ? new Date(settings.last_verified_at).toLocaleString("id-ID")
              : "Belum pernah"}
          </p>
        </div>
      ) : (
        <div className="text-center py-6 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Key className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">OTP via Email / WhatsApp Belum Aktif</p>
            <p className="text-sm text-muted-foreground">Aktifkan untuk menerima kode OTP saat login</p>
          </div>
          <Button onClick={() => setShowSetupDialog(true)}>
            <Shield className="h-4 w-4 mr-2" />Aktifkan OTP
          </Button>
        </div>
      )}

      <Dialog open={showSetupDialog} onOpenChange={o => (o ? setShowSetupDialog(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{setupStep === "choose" ? "Setup OTP Email / WhatsApp" : "Masukkan Kode Verifikasi"}</DialogTitle>
            <DialogDescription>
              {setupStep === "choose" ? "Pilih metode pengiriman kode OTP" : `Kode 6 digit dikirim ke ${destinationHint}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {setupStep === "choose" && (
              <>
                <RadioGroup value={method} onValueChange={v => setMethod(v as "email" | "whatsapp")}>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="email" id="otp-email" />
                    <Label htmlFor="otp-email" className="flex items-center gap-3 cursor-pointer flex-1">
                      <Mail className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <RadioGroupItem value="whatsapp" id="otp-wa" />
                    <Label htmlFor="otp-wa" className="flex items-center gap-3 cursor-pointer flex-1">
                      <Smartphone className="h-5 w-5" />
                      <div>
                        <p className="font-medium">WhatsApp</p>
                        <p className="text-xs text-muted-foreground">Kode dikirim via WA</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
                {method === "whatsapp" && (
                  <div className="space-y-1">
                    <Label>Nomor WhatsApp</Label>
                    <Input placeholder="+62812345678" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                  </div>
                )}
              </>
            )}
            {setupStep === "verify" && (
              <div className="space-y-2">
                <Label>Kode OTP (6 digit)</Label>
                <Input
                  inputMode="numeric" maxLength={6} placeholder="123456"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
                <Button type="button" variant="link" className="px-0 h-auto"
                  onClick={() => requestOtpMutation.mutate()} disabled={requestOtpMutation.isPending}>
                  Kirim ulang kode
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            {setupStep === "choose" ? (
              <Button onClick={() => requestOtpMutation.mutate()} disabled={requestOtpMutation.isPending}>
                {requestOtpMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Kirim Kode OTP
              </Button>
            ) : (
              <Button onClick={() => verifyOtpMutation.mutate()} disabled={verifyOtpMutation.isPending || verificationCode.length !== 6}>
                {verifyOtpMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verifikasi & Aktifkan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Admin2FASettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Two-Factor Authentication (2FA)
        </h1>
        <p className="text-muted-foreground">
          Tingkatkan keamanan akun Anda dengan verifikasi dua langkah
        </p>
      </div>

      <Tabs defaultValue="totp">
        <TabsList className="w-full">
          <TabsTrigger value="totp" className="flex-1">
            <QrCode className="h-4 w-4 mr-2" />
            Authenticator App (TOTP)
          </TabsTrigger>
          <TabsTrigger value="otp" className="flex-1">
            <Mail className="h-4 w-4 mr-2" />
            Email / WhatsApp OTP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="totp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-600" />
                Authenticator App
              </CardTitle>
              <CardDescription>
                Google Authenticator, Authy, Microsoft Authenticator — kode berubah setiap 30 detik dan bekerja tanpa internet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.id ? (
                <TOTPSection userId={user.id} />
              ) : (
                <p className="text-muted-foreground text-sm">Login terlebih dahulu</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="otp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-600" />
                OTP via Email / WhatsApp
              </CardTitle>
              <CardDescription>
                Kode satu kali dikirim ke email atau WhatsApp Anda saat login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OTPSection user={user} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Perbandingan Metode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium flex items-center gap-1.5"><QrCode className="h-4 w-4 text-blue-600" />TOTP (Authenticator App)</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />Bekerja tanpa internet</li>
                <li className="flex gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />Paling aman — tidak bergantung SMS/email</li>
                <li className="flex gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />Tidak bisa dicegat (no phishing)</li>
                <li className="flex gap-2"><AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />Butuh aplikasi di HP</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium flex items-center gap-1.5"><Mail className="h-4 w-4 text-amber-600" />OTP Email / WhatsApp</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />Mudah — tidak perlu app tambahan</li>
                <li className="flex gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />Kode dikirim saat dibutuhkan</li>
                <li className="flex gap-2"><AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />Perlu koneksi internet</li>
                <li className="flex gap-2"><AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />Bergantung pada email/WA server</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
