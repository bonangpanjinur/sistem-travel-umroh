import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || "Terjadi kesalahan tak terduga.";
      const isChunkError = /chunk|dynamically imported module|Failed to fetch/i.test(msg);

      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h3 className="font-semibold text-destructive">
                Gagal memuat bagian ini
              </h3>
              <p className="text-sm text-muted-foreground">
                {isChunkError
                  ? "Tidak dapat mengunduh modul. Mungkin koneksi terputus atau aplikasi sudah diperbarui."
                  : msg}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
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