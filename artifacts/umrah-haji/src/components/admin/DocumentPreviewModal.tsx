import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, X } from "lucide-react";

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  documentName: string;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  documentUrl,
  documentName,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | "unknown">("unknown");

  useEffect(() => {
    if (open && documentUrl) {
      setLoading(true);
      setError(null);

      // Determine file type from URL
      const urlLower = documentUrl.toLowerCase();
      if (urlLower.includes(".pdf")) {
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

      // Simulate loading
      const timer = setTimeout(() => {
        setLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, documentUrl]);

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
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback to opening in new tab if blob download fails
      window.open(documentUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <DialogDescription className="flex items-center justify-between pt-2">
            <span>{documentName}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogDescription>
        </DialogHeader>

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
                src={`${documentUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
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
