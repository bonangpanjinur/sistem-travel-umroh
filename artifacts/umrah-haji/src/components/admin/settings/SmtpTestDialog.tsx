import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  values: Record<string, string>;
}

export function SmtpTestDialog({ open, onOpenChange, values }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) { setEmail(""); setResult(null); }
  };

  const send = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: values["integration_smtp_host"],
          port: values["integration_smtp_port"],
          user: values["integration_smtp_user"],
          pass: values["integration_smtp_pass"],
          to: email,
        }),
      });
      const data = await res.json();
      setResult({
        ok: data.success,
        message: data.success
          ? `Email test berhasil dikirim ke ${email}! Cek inbox atau folder spam Anda.`
          : (data.error || "Gagal mengirim email."),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      setResult({ ok: false, message: `Tidak dapat terhubung ke server: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />Kirim Email Test
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground/70 mb-1">Konfigurasi yang digunakan:</p>
            <p><strong>Host:</strong> {values["integration_smtp_host"] || "—"}</p>
            <p><strong>Port:</strong> {values["integration_smtp_port"] || "—"}</p>
            <p><strong>Pengirim:</strong> {values["integration_smtp_user"] || "—"}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Kirim ke alamat email:</Label>
            <Input
              type="email"
              placeholder="contoh@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              onKeyDown={e => { if (e.key === "Enter" && email && !loading) send(); }}
            />
          </div>
          {result && (
            <div className={cn(
              "flex items-start gap-2 p-3 rounded-lg border text-sm",
              result.ok
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 text-red-700 dark:text-red-400"
            )}>
              {result.ok
                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{result.message}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Tutup</Button>
          <Button
            onClick={send}
            disabled={loading || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
              : <><Mail className="h-4 w-4 mr-2" />Kirim Test</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}