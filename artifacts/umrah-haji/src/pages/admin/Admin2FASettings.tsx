import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Shield, Smartphone, Mail, Key, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function Admin2FASettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [setupStep, setSetupStep] = useState<'choose' | 'verify'>('choose');

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

  // Enable 2FA mutation
  const enableMutation = useMutation({
    mutationFn: async ({ method, phone }: { method: string; phone?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_2fa_settings')
        .upsert({
          user_id: user.id,
          is_enabled: true,
          method,
          phone_number: phone || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_activity', {
        _action: '2FA_ENABLED',
        _status: 'success'
      });
    },
    onSuccess: () => {
      toast.success('Two-Factor Authentication berhasil diaktifkan');
      queryClient.invalidateQueries({ queryKey: ['2fa-settings'] });
      setShowSetupDialog(false);
      setSetupStep('choose');
    },
    onError: (error) => {
      toast.error('Gagal mengaktifkan 2FA: ' + error.message);
    }
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

  const handleSetup = () => {
    if (method === 'sms' && !phoneNumber) {
      toast.error('Masukkan nomor telepon untuk metode SMS');
      return;
    }
    
    // For now, we'll skip verification step and enable directly
    // In production, you'd send OTP and verify first
    enableMutation.mutate({ method, phone: phoneNumber });
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
                      {settings.method === 'email' ? 'Email' : 'SMS'}
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
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Pilih metode verifikasi yang Anda inginkan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as 'email' | 'sms')}>
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
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="flex items-center gap-3 cursor-pointer flex-1">
                  <Smartphone className="h-5 w-5" />
                  <div>
                    <p className="font-medium">SMS</p>
                    <p className="text-sm text-muted-foreground">
                      Kode verifikasi dikirim via SMS
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {method === 'sms' && (
              <div className="space-y-2">
                <Label>Nomor Telepon</Label>
                <Input 
                  placeholder="+62812345678" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSetup}
              disabled={enableMutation.isPending}
            >
              {enableMutation.isPending ? 'Mengaktifkan...' : 'Aktifkan 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
