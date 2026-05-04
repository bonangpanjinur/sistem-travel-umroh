import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ScanLine, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Passenger {
  id: string;
  customer?: {
    id: string;
    full_name: string;
    phone?: string | null;
    passport_number?: string | null;
  } | null;
  booking?: {
    booking_code?: string | null;
  } | null;
}

interface CheckinQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departureId: string;
  checkpoint?: string;
  passengers: Passenger[];
}

const SCANNER_ELEMENT_ID = "qr-scanner-region";

export function CheckinQRDialog({
  open,
  onOpenChange,
  departureId,
  checkpoint = "airport_departure",
  passengers,
}: CheckinQRDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [lastResult, setLastResult] = useState<{
    type: "success" | "error" | "duplicate";
    name: string;
    message: string;
  } | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const queryClient = useQueryClient();

  const checkinMutation = useMutation({
    mutationFn: async (rawValue: string) => {
      const value = rawValue.trim();
      if (!value) throw new Error("Kode kosong");

      // Resolve customer id - support QR payload formats:
      // 1) plain customer UUID
      // 2) JSON {customer_id, ...}
      // 3) "CUST:<uuid>"
      // 4) passenger row id (from booking_passengers) - fallback lookup
      let customerId: string | null = null;

      try {
        if (value.startsWith("{")) {
          const parsed = JSON.parse(value);
          customerId = parsed.customer_id || parsed.id || null;
        } else if (value.startsWith("CUST:")) {
          customerId = value.replace("CUST:", "").trim();
        } else if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value
          )
        ) {
          customerId = value;
        }
      } catch {
        // ignore JSON parse error
      }

      // Fallback: try as passenger.id from current list, or by passport number
      if (!customerId) {
        const matchByPassenger = passengers.find((p) => p.id === value);
        if (matchByPassenger?.customer?.id) {
          customerId = matchByPassenger.customer.id;
        }
      }
      if (!customerId) {
        const matchByPassport = passengers.find(
          (p) => p.customer?.passport_number === value
        );
        if (matchByPassport?.customer?.id) {
          customerId = matchByPassport.customer.id;
        }
      }

      if (!customerId) {
        throw new Error("Kode QR tidak dikenali / jamaah tidak ditemukan");
      }

      // Verify the customer is actually in this departure passenger list
      const passenger = passengers.find((p) => p.customer?.id === customerId);
      if (!passenger) {
        throw new Error("Jamaah tidak terdaftar pada keberangkatan ini");
      }

      // Check if already checked in
      const { data: existing } = await supabase
        .from("attendance")
        .select("id, checked_in_at")
        .eq("departure_id", departureId)
        .eq("customer_id", customerId)
        .eq("checkpoint", checkpoint)
        .maybeSingle();

      if (existing) {
        return {
          duplicate: true as const,
          name: passenger.customer?.full_name || "Jamaah",
          checkedInAt: existing.checked_in_at,
        };
      }

      const { data: userResp } = await supabase.auth.getUser();

      const { error } = await supabase.from("attendance").insert({
        departure_id: departureId,
        customer_id: customerId,
        checkpoint,
        checked_in_by: userResp.user?.id ?? null,
      });
      if (error) throw error;

      return {
        duplicate: false as const,
        name: passenger.customer?.full_name || "Jamaah",
      };
    },
    onSuccess: (res) => {
      if (res.duplicate) {
        setLastResult({
          type: "duplicate",
          name: res.name,
          message: "Sudah check-in sebelumnya",
        });
        toast.info(`${res.name} sudah check-in`);
      } else {
        setLastResult({
          type: "success",
          name: res.name,
          message: "Check-in berhasil",
        });
        toast.success(`${res.name} check-in ✓`);
      }
      queryClient.invalidateQueries({
        queryKey: ["departure-attendance", departureId],
      });
    },
    onError: (err: any) => {
      setLastResult({
        type: "error",
        name: "-",
        message: err.message || "Gagal check-in",
      });
      toast.error(err.message || "Gagal check-in");
    },
  });

  const handleScanResult = (decodedText: string) => {
    const now = Date.now();
    if (
      lastScanRef.current &&
      lastScanRef.current.value === decodedText &&
      now - lastScanRef.current.at < 2500
    ) {
      return; // debounce same code
    }
    lastScanRef.current = { value: decodedText, at: now };
    checkinMutation.mutate(decodedText);
  };

  const startScanner = async () => {
    try {
      const html5 = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleScanResult(decoded),
        () => {}
      );
      setScanning(true);
    } catch (e: any) {
      toast.error(
        "Tidak bisa mengakses kamera: " + (e?.message || "permission denied")
      );
      setManualMode(true);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (open && !manualMode) {
      // small delay to ensure DOM mounted
      const t = setTimeout(() => startScanner(), 200);
      return () => {
        clearTimeout(t);
        stopScanner();
      };
    }
    if (!open) {
      stopScanner();
      setLastResult(null);
      setManualInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, manualMode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    checkinMutation.mutate(manualInput);
    setManualInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Check-in via QR
          </DialogTitle>
          <DialogDescription>
            Pindai QR jamaah atau masukkan kode manual. Hasil tercatat real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={!manualMode ? "default" : "outline"}
              onClick={() => setManualMode(false)}
              className="flex-1"
            >
              <ScanLine className="h-4 w-4 mr-1" />
              Kamera
            </Button>
            <Button
              size="sm"
              variant={manualMode ? "default" : "outline"}
              onClick={() => setManualMode(true)}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-1" />
              Manual
            </Button>
          </div>

          {!manualMode && (
            <div
              id={SCANNER_ELEMENT_ID}
              className="w-full aspect-square bg-muted rounded-md overflow-hidden"
            />
          )}

          {manualMode && (
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Customer ID, passport, atau payload QR"
                autoFocus
              />
              <Button
                type="submit"
                className="w-full"
                disabled={checkinMutation.isPending}
              >
                {checkinMutation.isPending ? "Memproses..." : "Check-in"}
              </Button>
            </form>
          )}

          {lastResult && (
            <div
              className={`flex items-start gap-3 p-3 rounded-md border ${
                lastResult.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : lastResult.type === "duplicate"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}
            >
              {lastResult.type === "error" ? (
                <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{lastResult.name}</p>
                <p className="text-xs">{lastResult.message}</p>
              </div>
              <Badge variant="outline" className="capitalize text-[10px]">
                {lastResult.type}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Checkpoint: <span className="font-mono">{checkpoint}</span>
            </span>
            <span>{scanning ? "Kamera aktif" : "Idle"}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
