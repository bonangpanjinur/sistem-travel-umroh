import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Send, Trash2 } from "lucide-react";

type OutboxRow = {
  id: string;
  user_ids: string[] | null;
  customer_ids: string[] | null;
  title: string;
  body: string;
  type: string;
  url: string | null;
  status: "pending" | "processing" | "sent" | "failed" | string;
  attempts: number;
  last_error: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "outline",
  sent: "default",
  failed: "destructive",
};

export default function AdminPushOutbox() {
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [draining, setDraining] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("push_outbox" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data || []) as unknown as OutboxRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  // realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("push_outbox_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "push_outbox" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(s) ||
        r.body.toLowerCase().includes(s) ||
        (r.last_error || "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const out = { pending: 0, processing: 0, sent: 0, failed: 0 } as Record<string, number>;
    rows.forEach((r) => { out[r.status] = (out[r.status] || 0) + 1; });
    return out;
  }, [rows]);

  const requeue = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase
      .from("push_outbox" as any)
      .update({
        status: "pending",
        last_error: null,
        scheduled_at: new Date().toISOString(),
      })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} notifikasi dijadwalkan ulang`);
    load();
  };

  const drainNow = async () => {
    setDraining(true);
    const { data, error } = await supabase.functions.invoke("process-push-queue", { body: {} });
    setDraining(false);
    if (error) return toast.error(error.message || "Gagal memproses antrian");
    toast.success(
      `Diproses: ${(data as any)?.processed ?? 0} • Terkirim: ${(data as any)?.sent ?? 0} • Gagal: ${(data as any)?.failed ?? 0}`
    );
    load();
  };

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("push_outbox" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
    load();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Push Outbox</h1>
          <p className="text-sm text-muted-foreground">
            Antrian push notifikasi otomatis (booking, pembayaran, pesanan, H-1).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={drainNow} disabled={draining}>
            <Send className={`w-4 h-4 mr-2 ${draining ? "animate-pulse" : ""}`} />
            Proses Antrian Sekarang
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["pending", "processing", "sent", "failed"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">{s}</p>
              <p className="text-2xl font-bold">{stats[s] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row gap-2 items-center justify-between flex-wrap">
          <CardTitle className="text-base">Daftar Antrian</CardTitle>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Cari title/body/error..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() =>
                requeue(filtered.filter((r) => r.status === "failed").map((r) => r.id))
              }
              disabled={!filtered.some((r) => r.status === "failed")}
            >
              Resend Semua Gagal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Title / Body</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const targets =
                  (r.user_ids?.length || 0) + (r.customer_ids?.length || 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status] || "outline"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.body}</p>
                      {r.url && (
                        <p className="text-xs text-muted-foreground truncate">→ {r.url}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{targets} user</TableCell>
                    <TableCell className="text-sm">{r.attempts}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="text-xs text-destructive truncate" title={r.last_error || ""}>
                        {r.last_error || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {(r.status === "failed" || r.status === "sent") && (
                        <Button size="sm" variant="outline" onClick={() => requeue([r.id])}>
                          Resend
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteOne(r.id)}
                        aria-label="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}