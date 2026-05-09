import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { Package, Search, FileSpreadsheet, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function BranchBookings() {
  const { user, branchId } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const { data: branchData } = useQuery({
    queryKey: ["branch-data-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("branches").select("id, name").eq("manager_user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const bId = branchData?.id || branchId;

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["branch-bookings-all", bId],
    enabled: !!bId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`id, booking_code, status, total_price, created_at,
          customer:customers(full_name, phone),
          agent:agents(company_name),
          departure:departures(departure_date, package:packages(name))`)
        .eq("branch_id", bId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => bookings.filter((b: any) => {
    const matchSearch = !search ||
      b.booking_code?.includes(search) ||
      b.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.phone?.includes(search);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  }), [bookings, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const totalRevenue = filtered.filter((b: any) => ["confirmed","processing","completed"].includes(b.status))
    .reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);

  const exportExcel = () => {
    const rows = filtered.map((b: any) => ({
      "Kode Booking": b.booking_code,
      "Jamaah": b.customer?.full_name || "-",
      "HP": b.customer?.phone || "-",
      "Agen": b.agent?.company_name || "Langsung",
      "Paket": b.departure?.package?.name || "-",
      "Keberangkatan": b.departure?.departure_date ? format(parseISO(b.departure.departure_date), "d MMM yyyy", { locale: localeId }) : "-",
      "Status": b.status,
      "Total": Number(b.total_price || 0),
      "Tgl Booking": b.created_at ? format(parseISO(b.created_at), "d MMM yyyy", { locale: localeId }) : "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Booking Cabang");
    XLSX.writeFile(wb, `Booking_Cabang_${branchData?.name || "cabang"}.xlsx`);
    toast.success("Excel diunduh!");
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Rekap Booking Cabang</h1>
          <p className="text-sm text-muted-foreground">Semua booking yang masuk via cabang ini</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtered.length === 0}>
          <FileSpreadsheet className="h-4 w-4 mr-1 text-green-600" /> Export
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: filtered.length, color: "text-gray-700" },
          { label: "Confirmed", value: filtered.filter((b: any) => ["confirmed","processing","completed"].includes(b.status)).length, color: "text-green-700" },
          { label: "Revenue", value: formatCurrency(totalRevenue), color: "text-primary" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-3 text-center">
              <p className={cn("font-bold text-base", k.color)}>{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari kode, nama, HP..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Tidak ada booking</p>
          <p className="text-sm text-muted-foreground">{search || statusFilter !== "all" ? "Coba ubah filter pencarian" : "Belum ada booking di cabang ini"}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((b: any) => (
              <Card key={b.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{b.customer?.full_name || "-"}</p>
                        <Badge className={cn("text-[10px]", STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600")}>
                          {b.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{b.booking_code}</p>
                      <p className="text-xs text-muted-foreground">{b.departure?.package?.name || "-"} · {b.agent?.company_name || "Langsung"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm">{formatCurrency(Number(b.total_price || 0))}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.created_at ? format(parseISO(b.created_at), "d MMM yy", { locale: localeId }) : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
