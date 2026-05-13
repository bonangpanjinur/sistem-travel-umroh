import { Link } from "react-router-dom";
import { useOpnameSessions } from "@/hooks/useProcurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-gray-100 text-gray-700" },
  submitted: { label: "Menunggu",  cls: "bg-amber-100 text-amber-800" },
  approved:  { label: "Disetujui", cls: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Ditolak",   cls: "bg-red-100 text-red-700" },
};

export default function AdminStoreOpnameSessions() {
  const { data = [], isLoading } = useOpnameSessions("all");
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin/store"><ArrowLeft className="h-4 w-4 mr-1" />Kembali</Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />Sesi Stock Opname
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Daftar sesi opname & alur persetujuan</p>
        </div>
        <Button asChild><Link to="/admin/store/stock-opname"><Plus className="h-4 w-4 mr-1" />Sesi Baru</Link></Button>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Riwayat</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Memuat...</div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Belum ada sesi opname</div>
          ) : (
            <div className="divide-y">
              {data.map((s) => {
                const st = STATUS[s.status] ?? STATUS.draft;
                return (
                  <Link key={s.id} to={`/admin/store/opname/${s.id}`}>
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{s.code}</p>
                        <p className="text-xs text-muted-foreground">
                          Dibuat {format(new Date(s.created_at), "d MMM yyyy HH:mm")}
                          {s.applied_movement_count > 0 && ` · ${s.applied_movement_count} penyesuaian diterapkan`}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}