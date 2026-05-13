import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOpnameSession, useSubmitOpname, useApproveOpname, useRejectOpname } from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/format";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-gray-100 text-gray-700" },
  submitted: { label: "Menunggu Persetujuan", cls: "bg-amber-100 text-amber-800" },
  approved:  { label: "Disetujui", cls: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Ditolak",   cls: "bg-red-100 text-red-700" },
};

export default function AdminStoreOpnameSessionDetail() {
  const { id = "" } = useParams();
  const { data: s, isLoading } = useOpnameSession(id);
  const submit = useSubmitOpname();
  const approve = useApproveOpname();
  const reject = useRejectOpname();
  const [reviewerNotes, setReviewerNotes] = useState("");

  if (isLoading || !s) {
    return <div className="p-10 text-center text-muted-foreground">Memuat...</div>;
  }
  const st = STATUS[s.status];
  const lines = s.lines ?? [];
  const totalDiff = lines.reduce((sum, l) => sum + (l.physical_qty - l.system_qty), 0);
  const totalValue = lines.reduce((sum, l) => sum + (l.physical_qty - l.system_qty) * (l.unit_cost || 0), 0);
  const busy = submit.isPending || approve.isPending || reject.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin/store/opname"><ArrowLeft className="h-4 w-4 mr-1" />Daftar Sesi</Link>
          </Button>
          <h1 className="text-3xl font-bold">{s.code}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.cls}`}>{st.label}</span>
            <span className="text-xs text-muted-foreground">
              Dibuat {format(new Date(s.created_at), "d MMM yyyy HH:mm")}
            </span>
          </div>
          {s.notes && <p className="text-sm text-muted-foreground mt-2">{s.notes}</p>}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {s.status === "draft" && (
            <Button disabled={busy || lines.length === 0} onClick={() => submit.mutate(s.id)}>
              {submit.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Ajukan Persetujuan
            </Button>
          )}
          {s.status === "submitted" && (
            <>
              <Button className="bg-emerald-600 hover:bg-emerald-700"
                disabled={busy} onClick={() => approve.mutate({ id: s.id, notes: reviewerNotes || undefined })}>
                {approve.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Setujui & Terapkan
              </Button>
              <Button variant="destructive"
                disabled={busy || !reviewerNotes.trim()}
                onClick={() => reject.mutate({ id: s.id, notes: reviewerNotes })}>
                <X className="h-4 w-4 mr-2" />Tolak
              </Button>
            </>
          )}
        </div>
      </div>

      {s.status === "submitted" && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Catatan Reviewer</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={2} value={reviewerNotes} onChange={(e) => setReviewerNotes(e.target.value)}
              placeholder="Catatan persetujuan / alasan penolakan (wajib untuk tolak)" />
          </CardContent>
        </Card>
      )}

      {(s.status === "approved" || s.status === "rejected") && s.reviewer_notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Catatan Reviewer</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p>{s.reviewer_notes}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {s.reviewed_at && format(new Date(s.reviewed_at), "d MMM yyyy HH:mm")}
              {s.applied_movement_count > 0 && ` · ${s.applied_movement_count} penyesuaian diterapkan`}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Item ({lines.length})</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total selisih: <span className="font-semibold">{totalDiff > 0 ? "+" : ""}{totalDiff}</span>
            {" · "}Nilai: <span className={totalValue >= 0 ? "text-emerald-600" : "text-red-600"}>{formatCurrency(totalValue)}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-2">Produk</th>
                  <th className="text-right px-4 py-2">Sistem</th>
                  <th className="text-right px-4 py-2">Fisik</th>
                  <th className="text-right px-4 py-2">Selisih</th>
                  <th className="text-right px-4 py-2">Nilai</th>
                  <th className="text-left px-4 py-2">Catatan</th>
                  <th className="text-center px-4 py-2">Diterapkan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((l) => {
                  const diff = l.physical_qty - l.system_qty;
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-2">
                        <div className="font-medium">{l.product?.name ?? "—"}</div>
                        {l.product?.sku && <div className="text-xs text-muted-foreground">{l.product.sku}</div>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{l.system_qty}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{l.physical_qty}</td>
                      <td className="px-4 py-2 text-right">
                        {diff === 0 ? <Badge variant="secondary">Cocok</Badge>
                          : diff > 0 ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">+{diff}</Badge>
                          : <Badge variant="destructive">{diff}</Badge>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(diff * (l.unit_cost || 0))}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{l.line_notes ?? "—"}</td>
                      <td className="px-4 py-2 text-center">{l.applied ? "✅" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}