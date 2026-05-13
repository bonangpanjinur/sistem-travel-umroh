import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX } from "lucide-react";

/** GAP-RBAC-08 — Simulasi Akses User */
export default function AdminAccessSimulator() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ["users-simulator", search],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").ilike("full_name", `%${search}%`).limit(20);
      return data || [];
    },
  });

  const { data: perms } = useQuery({
    queryKey: ["sim-perms", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_effective_permissions", { _user_id: selectedId });
      return (data || []).map((r: any) => r.permission_key);
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["sim-roles", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", selectedId);
      return (data || []).map((r: any) => r.role);
    },
  });

  const { data: menus } = useQuery({
    queryKey: ["sim-menus"],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("key,label,required_permission").eq("is_visible", true).order("sort_order");
      return data || [];
    },
  });

  const allowed = new Set(perms || []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" />Simulasi Akses User</h1>
      <Card>
        <CardHeader><CardTitle>Pilih User</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Cari nama user..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {users?.map((u: any) => (
              <button key={u.user_id} onClick={() => setSelectedId(u.user_id)} className={`p-2 border rounded text-left text-sm ${selectedId === u.user_id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                {u.full_name || u.user_id.slice(0, 8)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      {selectedId && (
        <>
          <Card>
            <CardHeader><CardTitle>Roles Aktif</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {roles?.map((r: string) => <Badge key={r}>{r}</Badge>)}
              {(!roles || roles.length === 0) && <span className="text-muted-foreground text-sm">Tidak ada role.</span>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Akses Menu</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {menus?.map((m: any) => {
                  const ok = !m.required_permission || allowed.has(m.required_permission);
                  return (
                    <div key={m.key} className={`flex items-center justify-between p-2 rounded border ${ok ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                      <span>{m.label}</span>
                      {ok ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldX className="h-4 w-4 text-red-600" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}