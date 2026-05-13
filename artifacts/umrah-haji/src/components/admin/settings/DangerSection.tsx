import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert, Database, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SectionHead } from "./SectionHead";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const CONFIRM_TEXT = "RESET DATABASE SEKARANG";

export function DangerSection() {
  const { resetDatabase } = useCompanySettings();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleReset = async () => {
    if (confirm !== CONFIRM_TEXT) return;
    setBusy(true);
    try {
      await resetDatabase(confirm);
      setOpen(false);
      setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mereset database");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionHead icon={ShieldAlert} title="Zona Bahaya" desc="Tindakan yang tidak dapat dibatalkan — gunakan dengan hati-hati" />
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <Database className="h-4 w-4" />Reset Data Transaksi
          </CardTitle>
          <CardDescription>
            Menghapus <strong>semua data transaksi</strong>: booking, pembayaran, leads, dokumen. Data master (paket, hotel, maskapai, karyawan) tetap aman.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" />Bersihkan Semua Data Transaksi
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />Konfirmasi Reset Database
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive font-medium">
              Tindakan ini tidak bisa dibatalkan. Semua data booking dan pembayaran akan hilang selamanya.
            </div>
            <div className="space-y-2">
              <Label>Ketik <code className="bg-muted px-1 rounded text-xs">{CONFIRM_TEXT}</code> untuk konfirmasi:</Label>
              <Input
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={CONFIRM_TEXT}
                className="border-destructive/50 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Batal</Button>
            <Button variant="destructive" onClick={handleReset}
              disabled={confirm !== CONFIRM_TEXT || busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus Semua Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}