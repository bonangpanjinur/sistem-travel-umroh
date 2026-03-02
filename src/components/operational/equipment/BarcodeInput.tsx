import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Barcode, X } from "lucide-react";
import { toast } from "sonner";

interface BarcodeInputProps {
  onBarcodeScanned: (customerId: string) => void;
  isActive?: boolean;
}

export function BarcodeInput({ onBarcodeScanned, isActive = true }: BarcodeInputProps) {
  const [scannedCode, setScannedCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;

    // Barcode scanners typically end with Enter key
    if (e.key === "Enter" && input.value.trim()) {
      const code = input.value.trim();
      setScannedCode(code);
      setIsScanning(true);

      // Simulate barcode processing (in real app, this would call an API)
      setTimeout(() => {
        onBarcodeScanned(code);
        setScannedCode("");
        input.value = "";
        setIsScanning(false);
        toast.success(`Barcode ${code} berhasil di-scan`);
        input.focus();
      }, 500);
    }
  };

  const handleClear = () => {
    setScannedCode("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Barcode className="h-4 w-4" />
          Barcode/QR Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Arahkan scanner ke barcode atau QR code untuk otomatis memilih jamaah dan mendistribusikan perlengkapan standar.
        </p>

        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Scan barcode di sini..."
            onKeyDown={handleBarcodeInput}
            disabled={!isActive}
            className="font-mono text-sm"
            autoComplete="off"
          />
          {scannedCode && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Badge variant="outline" className="bg-green-50">
                {isScanning ? "Memproses..." : "Terscan"}
              </Badge>
            </div>
          )}
        </div>

        {scannedCode && (
          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-sm font-mono text-green-700">{scannedCode}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>Tips:</strong> Gunakan barcode scanner untuk mempercepat proses distribusi. Sistem akan otomatis menandai semua perlengkapan standar untuk jamaah tersebut.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
