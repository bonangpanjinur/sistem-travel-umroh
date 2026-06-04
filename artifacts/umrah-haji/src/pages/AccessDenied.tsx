import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getRoleHomeRoute } from "@/hooks/useRoleHomeRoute";
import { ROLE_LABELS } from "@/lib/constants";

export default function AccessDenied() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();

  const homeRoute = getRoleHomeRoute(roles);
  const primaryRole = roles[0];
  const roleLabel = primaryRole ? (ROLE_LABELS[primaryRole] ?? primaryRole) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Akses Ditolak</h1>
          <p className="text-muted-foreground text-lg">
            Maaf, Anda tidak memiliki izin untuk mengakses halaman ini.
            Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
          </p>
          {user && roleLabel && (
            <p className="text-sm text-muted-foreground">
              Anda masuk sebagai <span className="font-medium text-foreground">{roleLabel}</span>.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          {user ? (
            <Button
              onClick={() => navigate(homeRoute)}
              className="w-full sm:w-auto gap-2"
            >
              <Home className="h-4 w-4" />
              Ke Portal Saya
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/")}
              className="w-full sm:w-auto gap-2"
            >
              <Home className="h-4 w-4" />
              Ke Beranda
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
