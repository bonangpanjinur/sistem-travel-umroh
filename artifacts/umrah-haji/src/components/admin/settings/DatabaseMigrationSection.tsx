import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SectionHead } from "./SectionHead";
import { Database, Play, RefreshCw, CheckCircle2, Clock, AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Migration {
  filename: string;
  name: string;
  applied: boolean;
  appliedAt: string | null;
}

interface RunResult {
  ok: number;
  errors: number;
  messages: string[];
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const stored = localStorage.getItem("vinstour_access_token");
  if (stored) return { Authorization: `Bearer ${stored}` };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

export function DatabaseMigrationSection() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function fetchMigrations() {
    setLoading(true);
    setLoadError(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/admin/migrations", { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMigrations(data.migrations ?? []);
    } catch (err: any) {
      setLoadError(err?.message ?? "Gagal memuat daftar migrasi");
    } finally {
      setLoading(false);
    }
  }

  async function runMigration(name: string) {
    setRunning(name);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/migrations/${encodeURIComponent(name)}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setResults(prev => ({ ...prev, [name]: body }));
      setExpanded(prev => ({ ...prev, [name]: true }));
      await fetchMigrations();
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [name]: { ok: 0, errors: 1, messages: [err?.message ?? "Error tidak diketahui"] },
      }));
      setExpanded(prev => ({ ...prev, [name]: true }));
    } finally {
      setRunning(null);
    }
  }

  useEffect(() => { fetchMigrations(); }, []);

  const pending = migrations.filter(m => !m.applied);
  const applied = migrations.filter(m => m.applied);

  return (
    <div className="space-y-6">
      <SectionHead
        icon={Database}
        title="Migrasi Database"
        desc="Jalankan file SQL migrasi langsung dari browser tanpa perlu membuka Supabase"
      />

      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span><strong className="text-foreground">{applied.length}</strong> diterapkan</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4 text-amber-500" />
            <span><strong className="text-foreground">{pending.length}</strong> tertunda</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchMigrations}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {loading && !loadError && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat daftar migrasi…
        </div>
      )}

      {!loading && migrations.length === 0 && !loadError && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Tidak ada file migrasi ditemukan.
        </p>
      )}

      {!loading && migrations.length > 0 && (
        <div className="space-y-2">
          {migrations.map(m => {
            const result = results[m.name];
            const isExpanded = expanded[m.name];
            const isRunning = running === m.name;

            return (
              <div
                key={m.name}
                className={`rounded-lg border bg-card transition-colors ${
                  m.applied ? "border-green-200 dark:border-green-900/40" : "border-amber-200 dark:border-amber-900/40"
                }`}
              >
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {m.applied ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-amber-500" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium truncate">{m.filename}</p>
                    {m.appliedAt && (
                      <p className="text-xs text-muted-foreground">
                        Diterapkan {new Date(m.appliedAt).toLocaleString("id-ID")}
                      </p>
                    )}
                  </div>

                  <Badge
                    variant={m.applied ? "secondary" : "outline"}
                    className={
                      m.applied
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent"
                        : "border-amber-400 text-amber-700 dark:text-amber-400"
                    }
                  >
                    {m.applied ? "Diterapkan" : "Tertunda"}
                  </Badge>

                  {!m.applied && (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 shrink-0"
                      onClick={() => runMigration(m.name)}
                      disabled={isRunning || running !== null}
                    >
                      {isRunning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      {isRunning ? "Menjalankan…" : "Jalankan"}
                    </Button>
                  )}

                  {result && (
                    <button
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      onClick={() => setExpanded(prev => ({ ...prev, [m.name]: !prev[m.name] }))}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {/* Result panel */}
                {result && isExpanded && (
                  <div className="border-t px-4 py-3 bg-muted/30 rounded-b-lg space-y-2">
                    <div className="flex gap-4 text-xs">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        ✓ {result.ok} statement berhasil
                      </span>
                      {result.errors > 0 && (
                        <span className="text-destructive font-medium">
                          ✗ {result.errors} error
                        </span>
                      )}
                    </div>
                    {result.messages.length > 0 && (
                      <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-h-40 text-muted-foreground border">
                        {result.messages.join("\n")}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t pt-4">
        Setiap migrasi hanya dapat dijalankan sekali. Setelah berhasil, statusnya berubah menjadi "Diterapkan" dan tombol
        Jalankan tidak akan muncul lagi. Semua migrasi bersifat idempotent — aman dijalankan ulang.
      </p>
    </div>
  );
}
