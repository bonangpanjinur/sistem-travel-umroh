import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { KeyRound, Copy, CheckCircle2, Loader2, MessageCircle } from "lucide-react";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userLabel: string;
  userPhone?: string;
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userLabel,
  userPhone,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [result, setResult] = useState<{ tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/branches/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword: newPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal reset password");
      return data as { tempPassword: string };
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success("Password berhasil direset");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleClose = () => {
    setResult(null);
    setNewPassword("");
    onOpenChange(false);
  };

  const copyPassword = () => {
    if (!result?.tempPassword) return;
    navigator.clipboard.writeText(result.tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Reset Password
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Password berhasil direset!
              </AlertDescription>
            </Alert>
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm text-muted-foreground">{userLabel}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-sm">{result.tempPassword}</span>
                <Button size="sm" variant="outline" onClick={copyPassword}>
                  {copied ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            {userPhone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Kirim password ini ke HP {userPhone} secara manual atau via fitur WA.
              </p>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Selesai</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset password untuk: <span className="font-medium text-foreground">{userLabel}</span>
            </p>
            <div className="space-y-2">
              <Label>Password Baru (opsional)</Label>
              <Input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Kosongkan untuk generate otomatis"
              />
              <p className="text-xs text-muted-foreground">
                Jika dikosongkan, sistem akan membuat password acak yang aman.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Batal</Button>
              <Button onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
                {resetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
