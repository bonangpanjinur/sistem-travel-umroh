import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Loader2,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getAgentRef } from '@/hooks/useAgentRef';

// ─── Zod schema ──────────────────────────────────────────────────────────────

const PHONE_RE = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

const registerSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama terlalu panjang'),
  email: z
    .string()
    .email('Format email tidak valid')
    .max(254, 'Email terlalu panjang'),
  phone: z
    .string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(
      PHONE_RE,
      'Format tidak valid. Gunakan: 08xx, 628xx, atau +628xx',
    ),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Harus mengandung minimal 1 huruf besar')
    .regex(/[0-9]/, 'Harus mengandung minimal 1 angka'),
  confirmPassword: z.string(),
  agreeTerms: z
    .boolean()
    .refine(val => val === true, 'Anda harus menyetujui syarat dan ketentuan'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

// ─── Async-check state type ───────────────────────────────────────────────────

type CheckState = 'idle' | 'checking' | 'ok' | 'duplicate' | 'error';

function FieldStatus({ state, okText }: { state: CheckState; okText: string }) {
  if (state === 'checking')
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Memeriksa…
      </span>
    );
  if (state === 'ok')
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {okText}
      </span>
    );
  if (state === 'duplicate')
    return null; // error shown by react-hook-form below
  return null;
}

// ─── Password strength bar ───────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  const map = [
    { label: '', color: 'bg-gray-200' },
    { label: 'Sangat lemah', color: 'bg-red-500' },
    { label: 'Lemah', color: 'bg-orange-400' },
    { label: 'Cukup', color: 'bg-yellow-400' },
    { label: 'Kuat', color: 'bg-green-500' },
    { label: 'Sangat kuat', color: 'bg-green-600' },
  ];
  return { score, ...map[Math.min(score, 5)] };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Async duplicate-check state
  const [emailCheck, setEmailCheck] = useState<CheckState>('idle');
  const [phoneCheck, setPhoneCheck] = useState<CheckState>('idle');
  const emailDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { agreeTerms: false },
  });

  const agreeTerms = watch('agreeTerms');
  const passwordValue = watch('password') ?? '';
  const strength = passwordStrength(passwordValue);

  // ── Async email check ─────────────────────────────────────────────────────
  const checkEmail = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    if (emailDebounce.current) clearTimeout(emailDebounce.current);
    setEmailCheck('checking');

    emailDebounce.current = setTimeout(async () => {
      try {
        const { data } = await (supabase as any)
          .from('customers')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (data) {
          setEmailCheck('duplicate');
          setError('email', {
            type: 'manual',
            message: 'Email ini sudah terdaftar. Silakan login atau gunakan email lain.',
          });
        } else {
          setEmailCheck('ok');
          clearErrors('email');
        }
      } catch {
        setEmailCheck('idle');
      }
    }, 600);
  };

  // ── Async phone check ─────────────────────────────────────────────────────
  const checkPhone = (raw: string) => {
    const phone = raw.trim();
    if (!phone || !PHONE_RE.test(phone)) return;

    if (phoneDebounce.current) clearTimeout(phoneDebounce.current);
    setPhoneCheck('checking');

    phoneDebounce.current = setTimeout(async () => {
      try {
        // Normalize: strip leading 0 / 62 / +62 → always store as 08xx for comparison
        const normalised = phone.startsWith('+62')
          ? '0' + phone.slice(3)
          : phone.startsWith('62')
          ? '0' + phone.slice(2)
          : phone;

        const { data } = await (supabase as any)
          .from('customers')
          .select('id')
          .or(`phone.eq.${phone},phone.eq.${normalised}`)
          .maybeSingle();

        if (data) {
          setPhoneCheck('duplicate');
          setError('phone', {
            type: 'manual',
            message: 'Nomor telepon ini sudah terdaftar. Apakah Anda sudah punya akun?',
          });
        } else {
          setPhoneCheck('ok');
          clearErrors('phone');
        }
      } catch {
        setPhoneCheck('idle');
      }
    }, 600);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: RegisterForm) => {
    // Block if async checks found duplicates
    if (emailCheck === 'duplicate' || phoneCheck === 'duplicate') {
      toast({
        title: 'Data sudah terdaftar',
        description: 'Periksa kembali email atau nomor telepon Anda.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const agentRef = getAgentRef();

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: data.fullName,
            phone: data.phone,
            referred_agent_id: agentRef.agentId || null,
            referred_branch_id: agentRef.branchId || null,
          },
        },
      });

      if (error) {
        // Intercept Supabase's email-already-registered response
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('user already exists')
        ) {
          setError('email', {
            type: 'manual',
            message: 'Email ini sudah terdaftar. Silakan login.',
          });
          return;
        }
        throw error;
      }

      // Atribusi agen/cabang
      if (authData.user && (agentRef.agentId || agentRef.branchId)) {
        try {
          await supabase.rpc('create_customer_account' as any, {
            p_user_id: authData.user.id,
            p_agent_id: agentRef.agentId || null,
            p_branch_id: agentRef.branchId || null,
            p_agent_slug: agentRef.agentSlug || null,
            p_branch_slug: agentRef.branchSlug || null,
          });
        } catch (_) {
          // Migrasi belum dijalankan — skip
        }
      }

      toast({
        title: 'Pendaftaran Berhasil',
        description: 'Akun Anda telah dibuat. Silakan login untuk melanjutkan.',
      });
      navigate('/auth/login');
    } catch (error: any) {
      toast({
        title: 'Pendaftaran Gagal',
        description: error.message || 'Terjadi kesalahan saat mendaftar',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <CardTitle className="text-2xl">Daftar Akun Baru</CardTitle>
            <CardDescription>
              Buat akun untuk mulai memesan paket umroh atau haji
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    className="pl-10"
                    {...register('fullName')}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    className={`pl-10 pr-9 ${emailCheck === 'ok' ? 'border-green-400 focus-visible:ring-green-300' : emailCheck === 'duplicate' ? 'border-destructive' : ''}`}
                    {...register('email', {
                      onChange: (e) => {
                        setEmailCheck('idle');
                        clearErrors('email');
                        checkEmail(e.target.value);
                      },
                    })}
                  />
                  {emailCheck === 'checking' && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                  {emailCheck === 'ok' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {emailCheck === 'duplicate' && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                  )}
                </div>
                {errors.email ? (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {errors.email.message}
                  </p>
                ) : (
                  <FieldStatus state={emailCheck} okText="Email tersedia" />
                )}
              </div>

              {/* Nomor Telepon */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08123456789"
                    className={`pl-10 pr-9 ${phoneCheck === 'ok' ? 'border-green-400 focus-visible:ring-green-300' : phoneCheck === 'duplicate' ? 'border-destructive' : ''}`}
                    {...register('phone', {
                      onChange: (e) => {
                        setPhoneCheck('idle');
                        clearErrors('phone');
                        // Only allow digits, +, and spaces
                        const cleaned = e.target.value.replace(/[^\d+\s]/g, '');
                        e.target.value = cleaned;
                        checkPhone(cleaned);
                      },
                    })}
                  />
                  {phoneCheck === 'checking' && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                  {phoneCheck === 'ok' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {phoneCheck === 'duplicate' && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                  )}
                </div>
                {errors.phone ? (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {errors.phone.message}
                  </p>
                ) : phoneCheck === 'ok' ? (
                  <FieldStatus state={phoneCheck} okText="Nomor tersedia" />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Format: 08xx, 628xx, atau +628xx (10–15 digit)
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
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

                {/* Strength bar */}
                {passwordValue && (
                  <div className="space-y-1">
                    <div className="flex gap-1 h-1.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all ${
                            i <= strength.score ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <p className="text-xs text-muted-foreground">
                        Kekuatan: <span className="font-medium">{strength.label}</span>
                      </p>
                    )}
                  </div>
                )}

                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {errors.password.message}
                  </p>
                )}
                {!errors.password && !passwordValue && (
                  <p className="text-xs text-muted-foreground">
                    Min 8 karakter, 1 huruf besar, dan 1 angka
                  </p>
                )}
              </div>

              {/* Konfirmasi Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    className="pl-10"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Syarat & Ketentuan */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeTerms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setValue('agreeTerms', checked as boolean)}
                />
                <label
                  htmlFor="agreeTerms"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                  Saya menyetujui{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Syarat dan Ketentuan
                  </Link>{' '}
                  serta{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Kebijakan Privasi
                  </Link>
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.agreeTerms.message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || emailCheck === 'checking' || phoneCheck === 'checking' || emailCheck === 'duplicate' || phoneCheck === 'duplicate'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses…
                  </>
                ) : (
                  'Daftar Sekarang'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link to="/auth/login" className="text-primary font-medium hover:underline">
                Masuk di sini
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
