import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, WifiOff, Bug, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  children: ReactNode;
  /** Reset boundary when this value changes (e.g. active section id). */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[SectionErrorBoundary]", error, info);
    const msg = error?.message || "Terjadi kesalahan tak terduga.";
    const isChunkError = /chunk|dynamically imported module|Failed to fetch/i.test(msg);
    toast.error(
      isChunkError ? "Gagal memuat modul" : "Gagal memuat bagian",
      {
        description: isChunkError
          ? "Periksa koneksi atau muat ulang halaman."
          : msg,
      }
    );
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || "Terjadi kesalahan tak terduga.";
      const isChunkError = /chunk|dynamically imported module|Failed to fetch|Loading chunk/i.test(msg);
      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

      const Icon = isChunkError ? (isOffline ? WifiOff : RefreshCw) : Bug;
      const title = isChunkError
        ? isOffline
          ? "Tidak ada koneksi internet"
          : "Gagal memuat modul bagian"
        : "Terjadi kesalahan saat menampilkan bagian ini";

      const subtitle = isChunkError
        ? isOffline
          ? "Perangkat sedang offline. Sambungkan kembali ke internet, lalu coba lagi."
          : "Modul tidak dapat diunduh. Biasanya karena koneksi tidak stabil atau aplikasi sudah diperbarui di server."
        : "Komponen mengalami error runtime. Data mungkin tidak valid atau ada bug yang perlu ditinjau.";

      const steps: string[] = isChunkError
        ? isOffline
          ? [
              "Periksa koneksi Wi-Fi atau data seluler Anda.",
              "Setelah online kembali, klik Coba lagi.",
              "Jika masih gagal, klik Muat ulang halaman.",
            ]
          : [
              "Klik Coba lagi untuk mengunduh ulang modul.",
              "Jika gagal, klik Muat ulang halaman (versi terbaru akan diambil).",
              "Bila tetap muncul, bersihkan cache browser lalu buka kembali.",
            ]
        : [
            "Klik Coba lagi untuk merender ulang bagian ini.",
            "Pindah ke menu lain lalu kembali — sebagian state akan tereset.",
            "Jika tetap muncul, salin pesan error di bawah dan laporkan ke tim teknis.",
          ];

      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-destructive/10 p-2 shrink-0">
              <Icon className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {title}
              </h3>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-background/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Langkah perbaikan
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer inline-flex items-center gap-1 select-none hover:text-foreground">
              <ChevronDown className="h-3 w-3" /> Detail teknis
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2 whitespace-pre-wrap break-all">
              {msg}
            </pre>
          </details>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" /> Coba lagi
            </Button>
            {isChunkError && (
              <Button size="sm" onClick={() => window.location.reload()}>
                Muat ulang halaman
              </Button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}