import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ESSProtectedRouteProps {
  children: React.ReactNode;
}

export function ESSProtectedRoute({ children }: ESSProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null | undefined>(undefined);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    (supabase as any)
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setEmployeeId(data?.id ?? null);
        setChecking(false);
      });
  }, [user]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Memuat portal karyawan...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/ess/login" replace />;
  if (employeeId === null) return <Navigate to="/ess/login?error=not_employee" replace />;

  return <>{children}</>;
}
