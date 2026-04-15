import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Check for chunk load errors or MIME type errors
    const isChunkError = 
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Expected a JavaScript-or-Wasm module script');

    if (isChunkError) {
      // Check if we've already reloaded recently to prevent infinite loops
      const lastReload = sessionStorage.getItem('last-chunk-reload');
      const now = Date.now();
      
      // If we reloaded less than 30 seconds ago, don't reload again automatically
      if (lastReload && (now - parseInt(lastReload)) < 30000) {
        console.error('Persistent chunk loading error detected in ErrorBoundary. Stopping auto-reload.');
        return;
      }

      sessionStorage.setItem('last-chunk-reload', now.toString());
      console.warn('Chunk load error detected in ErrorBoundary, reloading page to fetch latest version...');
      
      // Clear service worker cache if possible
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  handleReset = () => {
    sessionStorage.removeItem('last-chunk-reload');
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Update Terdeteksi</h2>
              <p className="text-sm text-muted-foreground">
                Kami sedang memperbarui aplikasi. Jika halaman tidak memuat otomatis, silakan tekan tombol di bawah.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} variant="default" className="bg-primary hover:bg-primary/90">
                <RefreshCw className="h-4 w-4 mr-2" />
                Muat Ulang Sekarang
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="outline">
                Ke Beranda
              </Button>
            </div>
            {this.state.error && (
              <details className="text-left text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <summary className="cursor-pointer font-medium">Detail Teknis</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
