import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AccessDenied() {
  const navigate = useNavigate();

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
            Maaf, Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini. 
            Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            Kembali
          </Button>
          <Button 
            onClick={() => navigate("/")}
            className="w-full sm:w-auto"
          >
            Ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
