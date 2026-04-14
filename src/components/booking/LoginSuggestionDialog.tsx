import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Zap, Lock, FileText } from "lucide-react";

interface LoginSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStep: string;
}

export function LoginSuggestionDialog({
  open,
  onOpenChange,
  currentStep,
}: LoginSuggestionDialogProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const handleLogin = () => {
    navigate(
      `/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
    );
  };

  const handleDismiss = () => {
    setDismissed(true);
    onOpenChange(false);
  };

  if (dismissed) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Hemat Waktu dengan Login
          </DialogTitle>
          <DialogDescription>
            Dapatkan keuntungan eksklusif dengan login sekarang
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Poin Loyalitas</p>
              <p className="text-xs text-muted-foreground">
                Kumpulkan poin dari setiap pemesanan
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Pelacakan Dokumen</p>
              <p className="text-xs text-muted-foreground">
                Pantau status visa dan dokumen perjalanan Anda
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Data Tersimpan</p>
              <p className="text-xs text-muted-foreground">
                Isi data lebih cepat untuk pemesanan berikutnya
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Lanjutkan Tanpa Login
          </Button>
          <Button onClick={handleLogin} className="flex-1">
            Login Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
