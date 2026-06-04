import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getRoleHomeRoute } from '@/hooks/useRoleHomeRoute';

const loginSchema = z.object({
  email: z.string().trim().email('Email tidak valid').max(255),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, roles, isLoading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<'idle' | 'pending'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpDestination, setOtpDestination] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const redirectTo = searchParams.get('redirect');

  const sessionVerifiedKey = (uid: string) => `2fa_verified_${uid}`;
  const sessionVersionKey = (uid: string) => `session_version_${uid}`;

  // Redirect jika sudah login — tapi tunggu verifikasi 2FA bila wajib
  useEffect(() => {
    if (!user || authLoading) return;
    // Jika sedang menunggu OTP, jangan redirect
    if (twoFAStep === 'pending') return;

    const verified = sessionStorage.getItem(sessionVerifiedKey(user.id)) === '1';
    
    // Cek apakah user perlu 2FA dan verifikasi session version
    (async () => {
      // Fetch profile untuk cek session_version
      const { data: profileData } = await supabase
        .from('profiles')
        .select('session_version')
        .eq('id', user.id)
        .maybeSingle();

      const currentVersion = profileData?.session_version || 1;
      const storedVersion = parseInt(localStorage.getItem(sessionVersionKey(user.id)) || '0');

      // Jika session_version di server lebih besar dari yang di local, force logout
      if (storedVersion !== 0 && currentVersion > storedVersion) {
        console.warn('[Auth] Session revoked - version mismatch');
        toast({
          title: 'Sesi Berakhir',
          description: 'Sesi Anda telah dihentikan oleh sistem atau dari perangkat lain.',
          variant: 'destructive',
        });
        localStorage.removeItem(sessionVersionKey(user.id));
        await supabase.auth.signOut();
        navigate('/auth/login');
        return;
      }

      // Simpan version saat ini jika belum ada
      if (storedVersion === 0) {
        localStorage.setItem(sessionVersionKey(user.id), currentVersion.toString());
      }

      if (verified) {
        if (redirectTo) {
          navigate(redirectTo);
        } else {
          navigate(getRoleHomeRoute(roles));
        }
        return;
      }

      const { data } = await supabase
        .from('user_2fa_settings')
        .select('is_enabled, method, phone_number')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data?.is_enabled) {
        sessionStorage.setItem(sessionVerifiedKey(user.id), '1');
        if (redirectTo) navigate(redirectTo);
        else navigate(getRoleHomeRoute(roles));
        return;
      }

      // Wajib 2FA — kirim OTP
      setTwoFAStep('pending');
      const { data: otpData, error: otpErr } = await supabase.functions.invoke<
        { ok?: boolean; destination?: string; error?: string }
      >('request-2fa-otp', {
        body: { purpose: 'login', method: data.method, phone: data.phone_number ?? undefined },
      });
      if (otpErr || otpData?.error) {
        toast({
          title: 'Gagal kirim OTP',
          description: (otpErr?.message ?? otpData?.error) || 'Coba lagi',
          variant: 'destructive',
        });
      } else {
        setOtpDestination(otpData?.destination ?? '');
      }
    })();
  }, [user, authLoading, roles, navigate, redirectTo, twoFAStep, toast]);

  const handleVerifyOtp = async () => {
    if (!user) return;
    if (!/^\d{6}$/.test(otpCode)) {
      toast({ title: 'Kode tidak valid', description: 'Masukkan 6 digit angka', variant: 'destructive' });
      return;
    }
    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<
        { ok?: boolean; error?: string }
      >('verify-2fa-otp', {
        body: { purpose: 'login', code: otpCode },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      sessionStorage.setItem(sessionVerifiedKey(user.id), '1');
      setTwoFAStep('idle');
      toast({ title: 'Verifikasi sukses', description: 'Selamat datang!' });
      if (redirectTo) navigate(redirectTo);
      else navigate(getRoleHomeRoute(roles));
    } catch (err: any) {
      toast({ title: 'Verifikasi gagal', description: err.message, variant: 'destructive' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCancelOtp = async () => {
    setTwoFAStep('idle');
    setOtpCode('');
    await supabase.auth.signOut();
  };

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (error) throw error;

      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang kembali!',
      });

      // Redirect terjadi via useEffect setelah roles dimuat
    } catch (error: any) {
      toast({
        title: 'Login Gagal',
        description: error.message || 'Terjadi kesalahan saat login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // OTP gate UI
  if (twoFAStep === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Verifikasi 2 Langkah</CardTitle>
            <CardDescription>
              Masukkan kode 6 digit yang dikirim ke {otpDestination || 'perangkat Anda'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
            <Button className="w-full" onClick={handleVerifyOtp} disabled={otpLoading || otpCode.length !== 6}>
              {otpLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Verifikasi
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleCancelOtp}>
              Batal & Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-2xl">🕋</span>
            </div>
            <span className="text-2xl font-bold text-primary">UmrohHaji</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Masuk ke Akun</CardTitle>
            <CardDescription>
              Masukkan email dan password Anda untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    className="pl-10"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                    Lupa password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground">
              Belum punya akun?{' '}
              <Link to="/auth/register" className="text-primary font-medium hover:underline">
                Daftar sekarang
              </Link>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          <Link to="/" className="hover:text-primary">
            ← Kembali ke Beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
