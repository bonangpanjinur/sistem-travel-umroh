import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ESSLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notEmployee = params.get("error") === "not_employee";

  useEffect(() => {
    (supabase as any).auth.getSession().then(({ data }: any) => {
      if (!data.session) return;
      checkEmployee(data.session.user.id);
    });
  }, []);

  const checkEmployee = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.id) navigate("/ess/dashboard", { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: authErr } = await (supabase as any).auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      const userId = data.user?.id;
      if (!userId) throw new Error("Login gagal");
      const { data: emp } = await (supabase as any)
        .from("employees")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!emp?.id) {
        await (supabase as any).auth.signOut();
        setError("Akun Anda tidak terdaftar sebagai karyawan. Hubungi HR.");
        setLoading(false);
        return;
      }
      toast.success("Selamat datang di Portal Karyawan!");
      navigate("/ess/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Login gagal. Periksa email & password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Portal Karyawan</h1>
          <p className="text-slate-500 text-sm">Vinstour Travel — Employee Self-Service</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Masuk ke Akun Anda</CardTitle>
            <CardDescription>Gunakan email & password yang diberikan oleh HR</CardDescription>
          </CardHeader>
          <CardContent>
            {(error || notEmployee) && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{notEmployee && !error ? "Akun Anda tidak terdaftar sebagai karyawan." : error}</span>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" type="email" placeholder="nama@vinstour.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password" type={showPw ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} required
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? "Memverifikasi..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Lupa password?{" "}
          <Link to="/auth/forgot-password" className="text-emerald-600 hover:underline">
            Reset di sini
          </Link>
          {" "}atau hubungi admin HR.
        </p>
      </div>
    </div>
  );
}
