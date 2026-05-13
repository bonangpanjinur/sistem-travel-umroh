import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone } from "lucide-react";

/** GAP-PWA-10 — Statistik Install PWA */
export default function AdminPWAInstallStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["pwa-install-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pwa_install_events")
        .select("*")
        .order("installed_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const total = data?.length || 0;
  const byPlatform = (data || []).reduce((acc: Record<string, number>, e: any) => {
    const p = e.platform || "unknown";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Smartphone className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Statistik Install PWA</h1>
      </div>
      {isLoading ? <Skeleton className="h-40" /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader><CardTitle>Total Install</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{total}</CardContent></Card>
            {Object.entries(byPlatform).map(([p, n]) => (
              <Card key={p}><CardHeader><CardTitle className="capitalize">{p}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{n as number}</CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Riwayat Install (500 terbaru)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left border-b"><th className="py-2">Tanggal</th><th>Platform</th><th>User Agent</th></tr></thead>
                  <tbody>
                    {(data || []).map((e: any) => (
                      <tr key={e.id} className="border-b">
                        <td className="py-2">{new Date(e.installed_at).toLocaleString("id-ID")}</td>
                        <td>{e.platform || "-"}</td>
                        <td className="truncate max-w-md">{e.user_agent || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}