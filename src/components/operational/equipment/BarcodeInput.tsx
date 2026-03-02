import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Barcode, X, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BarcodeInputProps {
  onBarcodeScanned: (customerId: string) => void;
  isActive?: boolean;
  onClear?: () => void;
}

export function BarcodeInput({ onBarcodeScanned, isActive = true, onClear }: BarcodeInputProps) {
  const [scannedCode, setScannedCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;

    // Barcode scanners typically end with Enter key
    if (e.key === "Enter" && input.value.trim()) {
      e.preventDefault();
      
      const code = input.value.trim();
      setScannedCode(code);
      setIsScanning(true);

      // Add to history
      setScanHistory(prev => [code, ...prev.slice(0, 4)]);

      // Process barcode with hardware scanner compatibility
      // Most barcode scanners send data followed by Enter key
      // This timeout simulates processing time
      scanTimeoutRef.current = setTimeout(() => {
        onBarcodeScanned(code);
        setScannedCode("");
        input.value = "";
        setIsScanning(false);
        toast.success(`✅ Barcode ${code} berhasil di-scan`);
        
        // Keep focus on input for continuous scanning
        input.focus();
      }, 300);
    }
  };

  const handleClear = () => {
    setScannedCode("");
    setScanHistory([]);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
    onClear?.();
  };

  const handleManualEntry = (code: string) => {
    if (inputRef.current) {
      inputRef.current.value = code;
      inputRef.current.focus();
      // Simulate Enter key press
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      inputRef.current.dispatchEvent(event);
    }
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3 bg-blue-50 border-b">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Barcode className="h-5 w-5 text-blue-600" />
          Barcode/QR Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* Instructions */}
        <Alert className="bg-blue-50 border-blue-200">
          <Barcode className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            <strong>Cara Penggunaan:</strong> Arahkan hardware scanner ke barcode/QR code. Sistem akan otomatis memproses dan memilih jamaah. Pastikan input field selalu fokus.
          </AlertDescription>
        </Alert>

        {/* Main Barcode Input - Large for Touch Devices */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Scan Area (Touch-Friendly)</label>
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Scan barcode di sini atau ketik manual..."
              onKeyDown={handleBarcodeInput}
              disabled={!isActive}
              className={`font-mono text-base p-4 h-14 border-2 transition-all ${
                scannedCode 
                  ? "border-green-400 bg-green-50" 
                  : "border-blue-300 focus:border-blue-600"
              }`}
              autoComplete="off"
              spellCheck="false"
            />
            {scannedCode && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isScanning ? (
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scanned Code Display */}
        {scannedCode && (
          <div className="flex items-center justify-between p-3 bg-green-100 border-2 border-green-400 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase">Barcode Terscan</p>
              <p className="text-lg font-mono font-bold text-green-900 mt-1">{scannedCode}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-8 w-8 p-0 hover:bg-green-200"
            >
              <X className="h-4 w-4 text-green-700" />
            </Button>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase">Riwayat Scan Terakhir</label>
            <div className="flex flex-wrap gap-2">
              {scanHistory.map((code, idx) => (
                <button
                  key={idx}
                  onClick={() => handleManualEntry(code)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-mono text-gray-700 transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600">Status</p>
            <Badge variant={isActive ? "default" : "secondary"} className="mt-1">
              {isActive ? "🟢 Aktif" : "🔴 Tidak Aktif"}
            </Badge>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600">Mode</p>
            <Badge variant="outline" className="mt-1">
              {isScanning ? "⏳ Memproses" : "✓ Siap"}
            </Badge>
          </div>
        </div>

        {/* Tips */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>💡 Tips Optimal:</strong>
            <ul className="mt-1 space-y-0.5 ml-4 list-disc">
              <li>Gunakan barcode scanner dengan koneksi USB atau Bluetooth</li>
              <li>Pastikan input field selalu fokus (kursor aktif)</li>
              <li>Scan akan diproses otomatis saat scanner mengirim Enter</li>
              <li>Untuk tablet, gunakan external barcode scanner untuk akurasi lebih baik</li>
            </ul>
          </p>
        </div>

        {/* Clear Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleClear}
        >
          <X className="h-4 w-4 mr-2" />
          Bersihkan
        </Button>
      </CardContent>
    </Card>
  );
}
