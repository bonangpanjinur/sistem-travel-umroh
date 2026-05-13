import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Shield, Smartphone, Mail, Key, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function Admin2FASettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [method, setMethod] = useState<'email' | 'whatsapp'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [setupStep, setSetupStep] = useState<'choose' | 'verify'>('choose');
  const [destinationHint, setDestinationHint] = useState('');

  // Fetch 2FA settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['2fa-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Step 1: request OTP via edge function (no DB write yet)
  const requestOtpMutation = useMutation({
    mutationFn: async () => {
      if (method === 'whatsapp' && !phoneNumber.trim()) {
        throw new Error('Masukkan nomor WhatsApp aktif.');
      }
      const { data, error } = await supabase.functions.invoke('request-2fa-otp', {
        body: { purpose: 'setup', method, phone: phoneNumber.trim() || undefined },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { destination: string };
    },
    onSuccess: (data) => {
      setDestinationHint(data.destination);
      setSetupStep('verify');
      toast.success('Kode OTP dikirim');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Step 2: verify OTP — server enables 2FA on success
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!/^\d{6}$/.test(verificationCode)) {
        throw new Error('Kode harus 6 digit angka.');
      }
      const { data, error } = await supabase.functions.invoke('verify-2fa-otp', {
        body: {
          purpose: 'setup',
          method,
          phone: phoneNumber.trim() || undefined,
          code: verificationCode,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      await supabase.rpc('log_activity', { _action: '2FA_ENABLED', _status: 'success' });
    },
    onSuccess: () => {
      toast.success('2FA berhasil diaktifkan');
      queryClient.invalidateQueries({ queryKey: ['2fa-settings'] });
      setShowSetupDialog(false);
      setSetupStep('choose');
      setVerificationCode('');
      setDestinationHint('');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_2fa_settings')
        .update({ 
          is_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_activity', {
        _action: '2FA_DISABLED',
        _status: 'success'
      });
    },
    onSuccess: () => {
      toast.success('Two-Factor Authentication dinonaktifkan');
      queryClient.invalidateQueries({ queryKey: ['2fa-settings'] });
    },
    onError: (error) => {
      toast.error('Gagal menonaktifkan 2FA: ' + error.message);
    }
  });

  const closeDialog = () => {
    setShowSetupDialog(false);
    setSetupStep('choose');
    setVerificationCode('');
    setDestinationHint('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Two-Factor Authentication
        </h1>
        <p className="text-muted-foreground">
          Tingkatkan keamanan akun Anda dengan verifikasi 2 langkah
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status 2FA</CardTitle>
              <CardDescription>
                Kelola pengaturan two-factor authentication Anda
              </CardDescription>
            </div>
            {settings?.is_enabled ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                <AlertCircle className="h-3 w-3 mr-1" />
                Tidak Aktif
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : settings?.is_enabled ? (
            <>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {settings.method === 'email' ? (
                    <Mail className="h-5 w-5 text-primary" />
                  ) : (
                    <Smartphone className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium">
                      {settings.method === 'email' ? 'Email' : 'WhatsApp'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {settings.method === 'email' 
                        ? user?.email 
                        : settings.phone_number
                      }
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => disableMutation.mutate()}
                  disabled={disableMutation.isPending}
                >
                  Nonaktifkan
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Terakhir diverifikasi: {settings.last_verified_at 
                  ? new Date(settings.last_verified_at).toLocaleString('id-ID')
                  : 'Belum pernah'
                }</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">2FA Belum Diaktifkan</p>
                <p className="text-sm text-muted-foreground">
                  Aktifkan two-factor authentication untuk keamanan ekstra
                </p>
              </div>
              <Button onClick={() => setShowSetupDialog(true)}>
                <Shield className="h-4 w-4 mr-2" />
                Aktifkan 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mengapa 2FA Penting?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Perlindungan dari Akses Tidak Sah</p>
                <p className="text-sm text-muted-foreground">
                  Mencegah login meskipun password bocor
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Notifikasi Login Real-time</p>
                <p className="text-sm text-muted-foreground">
                  Anda akan tahu jika ada yang mencoba login
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Standar Keamanan Enterprise</p>
                <p className="text-sm text-muted-foreground">
                  Direkomendasikan untuk semua akun admin & finance
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={(o) => (o ? setShowSetupDialog(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {setupStep === 'choose' ? 'Setup Two-Factor Authentication' : 'Masukkan Kode Verifikasi'}
            </DialogTitle>
            <DialogDescription>
              {setupStep === 'choose'
                ? 'Pilih metode verifikasi yang Anda inginkan'
                : `Kode 6 digit dikirim ke ${destinationHint}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {setupStep === 'choose' && (
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as 'email' | 'whatsapp')}>
              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Mail className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      Kode verifikasi dikirim ke {user?.email}
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <RadioGroupItem value="whatsapp" id="whatsapp" />
                <Label htmlFor="whatsapp" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Smartphone className="h-5 w-5" />
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">
                      Kode verifikasi dikirim via WhatsApp
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            )}

            {setupStep === 'choose' && method === 'whatsapp' && (
              <div className="space-y-2">
                <Label>Nomor Telepon</Label>
                <Input 
                  placeholder="+62812345678" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}

            {setupStep === 'verify' && (
              <div className="space-y-2">
                <Label>Kode OTP (6 digit)</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
                <Button
                  type="button"
                  variant="link"
                  className="px-0 h-auto"
                  onClick={() => requestOtpMutation.mutate()}
                  disabled={requestOtpMutation.isPending}
                >
                  Kirim ulang kode
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Batal
            </Button>
            {setupStep === 'choose' ? (
              <Button
                onClick={() => requestOtpMutation.mutate()}
                disabled={requestOtpMutation.isPending}
              >
                {requestOtpMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Kirim Kode OTP
              </Button>
            ) : (
              <Button
                onClick={() => verifyOtpMutation.mutate()}
                disabled={verifyOtpMutation.isPending || verificationCode.length !== 6}
              >
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
