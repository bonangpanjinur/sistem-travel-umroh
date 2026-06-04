import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, X, Printer, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertTriangle } from "lucide-react";

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  documentName: string;
  /** Optional total page count. When provided, enables prev/next page nav. */
  pageCount?: number;
  /** Optional layout warnings to surface above the preview. */
  warnings?: string[];
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200];

export function DocumentPreviewModal({
  open,
  onOpenChange,
  documentUrl,
  documentName,
  pageCount,
  warnings,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | "unknown">("unknown");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (open && documentUrl) {
      setLoading(true);
      setError(null);
      setPage(1);
      setZoom(100);

      const urlLower = documentUrl.toLowerCase();
      if (urlLower.includes(".pdf") || documentUrl.startsWith("blob:")) {
        setFileType("pdf");
      } else if (
        urlLower.includes(".jpg") ||
        urlLower.includes(".jpeg") ||
        urlLower.includes(".png") ||
        urlLower.includes(".gif") ||
        urlLower.includes(".webp")
      ) {
        setFileType("image");
      } else {
        setFileType("unknown");
      }

      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, documentUrl]);

  // Build PDF viewer URL with page + zoom fragment (Chrome PDF viewer supports this)
  const pdfSrc = useMemo(() => {
    if (fileType !== "pdf") return documentUrl;
    return `${documentUrl}#toolbar=1&navpanes=0&scrollbar=1&page=${page}&zoom=${zoom}`;
  }, [documentUrl, fileType, page, zoom]);

  const handleDownload = async () => {
    try {
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = documentName || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(documentUrl, "_blank");
    }
  };

  const handlePrint = () => {
    // Try to invoke the iframe's print dialog directly (works for same-origin
    // blob URLs in most browsers). Fallback: open in new window and print.
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    } catch {
      /* fallthrough */
    }
    const w = window.open(documentUrl, "_blank");
    if (w) {
      w.addEventListener("load", () => {
        try { w.focus(); w.print(); } catch { /* ignore */ }
      });
    }
  };

  const canPaginate = fileType === "pdf" && !!pageCount && pageCount > 1;
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(pageCount ?? p, p + 1));
  const zoomIn = () => setZoom((z) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.findIndex((v) => v >= z) + 1)] ?? z);
  const zoomOut = () => setZoom((z) => {
    const idx = ZOOM_LEVELS.findIndex((v) => v >= z);
    return ZOOM_LEVELS[Math.max(0, idx - 1)] ?? z;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Preview Dokumen</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between gap-2 pt-2 flex-wrap">
            <span className="truncate">{documentName}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {fileType === "pdf" && (
                <>
                  {canPaginate && (
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} disabled={page <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs tabular-nums px-1">
                        {page} / {pageCount}
                      </span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} disabled={page >= (pageCount ?? 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut} disabled={zoom <= ZOOM_LEVELS[0]}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs tabular-nums w-10 text-center">{zoom}%</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                    <Printer className="h-4 w-4" />
                    Cetak
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>

        {warnings && warnings.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <div className="flex items-center gap-2 font-semibold text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Peringatan layout ({warnings.length})
            </div>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="relative w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Memuat dokumen...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
              <p className="text-sm text-red-500 font-medium">Gagal memuat dokumen</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(documentUrl, "_blank")}
                className="mt-2"
              >
                Buka di Tab Baru
              </Button>
            </div>
          )}

          {!loading && !error && fileType === "pdf" && (
            <div className="w-full h-full">
              <iframe
                ref={iframeRef}
                src={pdfSrc}
                className="w-full h-full border-0"
                title={documentName}
                onError={() => {
                  setError("Tidak dapat menampilkan PDF. Silakan buka di tab baru.");
                }}
              />
            </div>
          )}

          {!loading && !error && fileType === "image" && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={documentUrl}
                alt={documentName}
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  setError("Tidak dapat memuat gambar.");
                }}
              />
            </div>
          )}

          {!loading && !error && fileType === "unknown" && (
            <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
              <p className="text-sm text-muted-foreground">
                Tipe file tidak didukung untuk preview
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(documentUrl, "_blank")}
                className="mt-2"
              >
                Buka di Tab Baru
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
