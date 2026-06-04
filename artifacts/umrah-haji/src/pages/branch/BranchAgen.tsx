import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { Users, Search, TrendingUp, Package, DollarSign, Star, Award } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default function BranchAgen() {
  const { user, branchId } = useAuth();
  const [search, setSearch] = useState("");

  const { data: branchData } = useQuery({
    queryKey: ["branch-data-agen", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("branches").select("id, name").eq("manager_user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const bId = branchData?.id || branchId;

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["branch-agents", bId],
    enabled: !!bId,
    queryFn: async () => {
      const now = new Date();
      const startMonth = startOfMonth(now).toISOString();
      const endMonth = endOfMonth(now).toISOString();

      const { data: agentsData, error } = await supabase
        .from("agents")
        .select("id, company_name, agent_code, status, commission_rate, created_at, profile:users(email)")
        .eq("branch_id", bId)
        .order("company_name");
      if (error) throw error;

      const enriched = await Promise.all((agentsData || []).map(async (a: any) => {
        const [bookingsRes, commRes] = await Promise.all([
          supabase.from("bookings").select("id, total_price, status", { count: "exact" })
            .eq("agent_id", a.id).gte("created_at", startMonth).lte("created_at", endMonth),
          supabase.from("agent_commissions").select("commission_amount, status")
            .eq("agent_id", a.id).gte("created_at", startMonth).lte("created_at", endMonth),
        ]);
        const totalBookings = bookingsRes.count || 0;
        const confirmedBookings = (bookingsRes.data || []).filter((b: any) => ["confirmed","processing","completed"].includes(b.status)).length;
        const commTotal = (commRes.data || []).reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0);
        const revenue = (bookingsRes.data || []).filter((b: any) => ["confirmed","processing","completed"].includes(b.status))
          .reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
        return { ...a, totalBookings, confirmedBookings, commTotal, revenue };
      }));

      return enriched.sort((a: any, b: any) => b.revenue - a.revenue);
    },
  });

  const filtered = agents.filter((a: any) =>
    a.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.agent_code?.toLowerCase().includes(search.toLowerCase())
  );

  const maxRevenue = Math.max(...filtered.map((a: any) => a.revenue || 0), 1);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Performa Agen</h1>
        <p className="text-sm text-muted-foreground">Monitor kinerja agen di cabang ini — bulan berjalan</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Agen", value: agents.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Agen Aktif", value: agents.filter((a: any) => a.status === "active").length, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Booking", value: agents.reduce((s: number, a: any) => s + a.totalBookings, 0), icon: Package, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(k => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-3 text-center">
                <Icon className={cn("h-5 w-5 mx-auto mb-1", k.color)} />
                <p className="font-bold text-xl">{k.value}</p>
                <p className="text-[10px] text-muted-foreground">{k.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama agen atau kode..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Agen List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Belum ada agen di cabang ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any, idx: number) => (
            <Card key={a.id} className={cn(idx === 0 && "border-amber-300 bg-amber-50/30")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                      idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-gray-200 text-gray-700" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"
                    )}>
                      {idx < 3 ? <Award className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{a.company_name}</p>
                      <p className="text-xs text-muted-foreground">{a.agent_code}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", a.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                    {a.status === "active" ? "Aktif" : "Tidak Aktif"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div>
                    <p className="font-bold text-sm">{a.totalBookings}</p>
                    <p className="text-[10px] text-muted-foreground">Booking</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{a.confirmedBookings}</p>
                    <p className="text-[10px] text-muted-foreground">Confirmed</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-green-600">{formatCurrency(a.commTotal)}</p>
                    <p className="text-[10px] text-muted-foreground">Komisi</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-semibold">{formatCurrency(a.revenue)}</span>
                  </div>
                  <Progress value={(a.revenue / maxRevenue) * 100} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
