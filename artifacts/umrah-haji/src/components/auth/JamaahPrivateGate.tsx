import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Soft auth gate for /jamaah/* private features.
 *
 * - If the auth state is loading → spinner.
 * - If the user IS signed in → render children.
 * - If guest → show a friendly inline "login to continue" panel
 *   (NO redirect to /auth/login, NO "Access Denied" page).
 *
 * This keeps the PWA feeling open: install → use freely → only soft
 * prompt when entering a feature that needs identity (documents,
 * payment history, etc.).
 */
export default function JamaahPrivateGate({
  children,
  title = "Masuk untuk melanjutkan",
  description = "Fitur ini menampilkan data pribadi Anda. Silakan masuk dengan akun jamaah Anda untuk melanjutkan.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  const redirect = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="min-h-[70vh] px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-base font-bold mb-1.5">{title}</h2>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{description}</p>
        <div className="space-y-2">
          <Button asChild className="w-full" size="lg">
            <Link to={`/auth/login?redirect=${redirect}`}>
              <LogIn className="h-4 w-4 mr-2" />
              Masuk Akun
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link to="/jamaah">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Beranda
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground pt-2">
            Belum punya akun?{" "}
            <Link to="/auth/register" className="text-primary font-semibold hover:underline">
              Daftar gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}