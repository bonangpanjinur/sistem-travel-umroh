import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, QrCode, Check } from "lucide-react";

interface BookingBarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
  customerName?: string;
  packageName?: string;
  departureDate?: string;
  companyName?: string;
}

type LabelSize = "sticker" | "card" | "a4";

const SIZE_CONFIG: Record<LabelSize, { label: string; desc: string; px: number }> = {
  sticker: { label: "Stiker Kecil", desc: "6×6 cm, cocok untuk amplop / dokumen", px: 200 },
  card:    { label: "Kartu ID",    desc: "8.5×5.5 cm, ukuran kartu nama",        px: 280 },
  a4:      { label: "Halaman A4",  desc: "Satu halaman penuh, bisa digunting",   px: 360 },
};

export function BookingBarcodeModal({
  open,
  onOpenChange,
  bookingId,
  bookingCode,
  customerName,
  packageName,
  departureDate,
  companyName,
}: BookingBarcodeModalProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [size, setSize] = useState<LabelSize>("card");
  const printRef = useRef<HTMLDivElement>(null);

  const verifyUrl = `${window.location.origin}/transaksi/${bookingId}`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(verifyUrl, {
      width: 512,
      margin: 1,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    }).then(setQrUrl);
  }, [open, verifyUrl]);

  function handlePrint() {
    const printWin = window.open("", "_blank", "width=800,height=600");
    if (!printWin || !printRef.current) return;

    const isA4 = size === "a4";
    const stickerW = size === "sticker" ? "6cm" : "8.5cm";
    const stickerH = size === "sticker" ? "6cm" : "5.5cm";
    const qrSize   = size === "sticker" ? "80px" : "110px";
    const fontSize  = size === "sticker" ? "6pt" : "7pt";
    const codeSize  = size === "sticker" ? "9pt" : "11pt";

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Barcode ${bookingCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: white;
      ${isA4 ? "display:flex;align-items:center;justify-content:center;min-height:100vh;" : ""}
    }
    @page {
      size: ${isA4 ? "A4" : `${stickerW} ${stickerH}`};
      margin: 0;
    }
    .label {
      width: ${isA4 ? "10cm" : stickerW};
      height: ${isA4 ? "auto" : stickerH};
      padding: ${size === "sticker" ? "4mm" : "5mm"};
      border: ${isA4 ? "2px" : "1.5px"} solid #1a1a2e;
      border-radius: 4mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3mm;
    }
    .header {
      width: 100%;
      background: #1a1a2e;
      color: white;
      text-align: center;
      border-radius: 2mm;
      padding: 2mm 3mm;
      font-size: ${fontSize};
      font-weight: 700;
      letter-spacing: 0.5pt;
      text-transform: uppercase;
    }
    .qr-wrap {
      border: 1.5px solid #e0e0e0;
      border-radius: 2mm;
      padding: 2mm;
      background: white;
    }
    .qr-wrap img {
      width: ${qrSize};
      height: ${qrSize};
      display: block;
    }
    .code {
      font-family: 'Courier New', monospace;
      font-size: ${codeSize};
      font-weight: 700;
      letter-spacing: 1pt;
      color: #1a1a2e;
      text-align: center;
    }
    .info {
      width: 100%;
      text-align: center;
      font-size: ${fontSize};
      color: #444;
      line-height: 1.5;
    }
    .info .name { font-weight: 700; color: #1a1a2e; }
    .footer {
      font-size: ${size === "sticker" ? "4.5pt" : "5.5pt"};
      color: #888;
      text-align: center;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">${companyName || "Verifikasi Booking"}</div>
    <div class="qr-wrap">
      <img src="${qrUrl}" alt="QR Code" />
    </div>
    <div class="code">${bookingCode}</div>
    ${customerName ? `<div class="info"><span class="name">${customerName}</span></div>` : ""}
    ${packageName || departureDate ? `<div class="info">${[packageName, departureDate].filter(Boolean).join(" • ")}</div>` : ""}
    <div class="footer">Scan untuk verifikasi · ${verifyUrl}</div>
  </div>
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };<\/script>
</body>
</html>`);
    printWin.document.close();
  }

  const qrPx = SIZE_CONFIG[size].px;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Cetak Ulang Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(Object.entries(SIZE_CONFIG) as [LabelSize, typeof SIZE_CONFIG[LabelSize]][]).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSize(key)}
                className={`flex-1 rounded-lg border p-2 text-left transition-all ${size === key ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  {size === key && <Check className="h-3 w-3 text-primary" />}
                  <p className="text-xs font-semibold">{cfg.label}</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{cfg.desc}</p>
              </button>
            ))}
          </div>

          <div ref={printRef} className="flex justify-center">
            <div
              className="border-2 border-foreground rounded-xl flex flex-col items-center gap-3 bg-white text-foreground"
              style={{ width: qrPx, padding: 16 }}
            >
              <div
                className="w-full rounded-lg text-center text-white text-[10px] font-bold uppercase tracking-wider py-1.5"
                style={{ background: "#1a1a2e" }}
              >
                {companyName || "Verifikasi Booking"}
              </div>

              {qrUrl ? (
                <div className="border rounded-lg p-2 bg-white">
                  <img
                    src={qrUrl}
                    alt="QR"
                    style={{ width: qrPx - 80, height: qrPx - 80 }}
                  />
                </div>
              ) : (
                <div
                  className="border rounded-lg p-2 bg-muted animate-pulse"
                  style={{ width: qrPx - 80, height: qrPx - 80 }}
                />
              )}

              <p className="font-mono font-bold tracking-widest text-center" style={{ fontSize: size === "sticker" ? 11 : 14 }}>
                {bookingCode}
              </p>

              {customerName && (
                <p className="text-center font-semibold text-[11px]">{customerName}</p>
              )}

              {(packageName || departureDate) && (
                <p className="text-center text-[10px] text-muted-foreground">
                  {[packageName, departureDate].filter(Boolean).join(" • ")}
                </p>
              )}

              <p className="text-center text-[8px] text-muted-foreground break-all px-1">
                Scan untuk verifikasi
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={!qrUrl}>
              <Printer className="h-4 w-4 mr-2" />
              Cetak
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
