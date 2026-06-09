import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit2, Trash2, Users, UserPlus, UserMinus, Bus, Shuffle } from "lucide-react";
import { Link } from "react-router-dom";
import AutoSplitSubgroupDialog from "@/components/departure/AutoSplitSubgroupDialog";

const supabase: any = supabaseRaw;

const GROUP_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

async function getToken() {
  return (await supabaseRaw.auth.getSession()).data.session?.access_token || "";
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) { const e = await res.json(); throw e; }
  return res.json();
}

export default function TourLeaderSubgroups() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: departure } = useQuery({
    queryKey: ["tl-departure", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, package:packages(name), booked_count")
        .eq("tour_leader_user_id", user!.id)
        .in("status", ["active", "departed", "open"])
        .order("departure_date", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  const depId = departure?.id;

  const { data: subgroupsData, isLoading } = useQuery({
    queryKey: ["tl-subgroups", depId],
    enabled: !!depId,
    queryFn: () => apiFetch(`/api/v1/guide/subgroups/${depId}`),
  });

  const subgroups = subgroupsData?.subgroups || [];

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiFetch("/api/v1/guide/subgroups", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tl-subgroups", depId] }); toast.success("Sub-grup dibuat"); setShowCreate(false); setForm({ name: "", color: GROUP_COLORS[0] }); },
    onError: (e: any) => toast.error(e?.error || "Gagal membuat sub-grup"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => apiFetch(`/api/v1/guide/subgroups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tl-subgroups", depId] }); toast.success("Sub-grup diperbarui"); setEditTarget(null); },
    onError: (e: any) => toast.error(e?.error || "Gagal memperbarui"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/guide/subgroups/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tl-subgroups", depId] }); toast.success("Sub-grup dihapus"); },
    onError: (e: any) => toast.error(e?.error || "Gagal menghapus"),
  });

  const { data: jamaahData } = useQuery({
    queryKey: ["tl-jamaah-list", depId],
    enabled: !!depId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("customer_id, customer:customers(id, full_name, phone)")
        .eq("departure_id", depId)
        .not("booking_status", "in", "(cancelled,refunded)");
      return (data || []).map((b: any) => b.customer).filter(Boolean);
    },
  });
  const allJamaah: any[] = jamaahData || [];

  const addMemberMutation = useMutation({
    mutationFn: ({ sgId, customerIds }: { sgId: string; customerIds: string[] }) =>
      apiFetch(`/api/v1/guide/subgroups/${sgId}/members`, { method: "POST", body: JSON.stringify({ customer_ids: customerIds }) }),
    onSuccess: (_, { sgId }) => { qc.invalidateQueries({ queryKey: ["tl-sg-members", sgId] }); qc.invalidateQueries({ queryKey: ["tl-subgroups", depId] }); toast.success("Anggota ditambahkan"); setManageTarget(null); },
    onError: (e: any) => toast.error(e?.error || "Gagal menambahkan anggota"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ sgId, customerId }: { sgId: string; customerId: string }) =>
      apiFetch(`/api/v1/guide/subgroups/${sgId}/members/${customerId}`, { method: "DELETE" }),
    onSuccess: (_, { sgId }) => { qc.invalidateQueries({ queryKey: ["tl-sg-members", sgId] }); qc.invalidateQueries({ queryKey: ["tl-subgroups", depId] }); toast.success("Anggota dikeluarkan"); },
    onError: (e: any) => toast.error(e?.error || "Gagal menghapus anggota"),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showAutoSplit, setShowAutoSplit] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [manageTarget, setManageTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: "", color: GROUP_COLORS[0] });
  const [memberSearch, setMemberSearch] = useState("");

  const { data: membersData } = useQuery({
    queryKey: ["tl-sg-members", manageTarget?.id],
    enabled: !!manageTarget?.id,
    queryFn: () => apiFetch(`/api/v1/guide/subgroups/${manageTarget.id}/members`),
  });
  const currentMembers: any[] = membersData?.members || [];
  const currentMemberIds = new Set(currentMembers.map((m: any) => m.customer_id));
  const filteredJamaah = allJamaah.filter(j => j.full_name?.toLowerCase().includes(memberSearch.toLowerCase()));

  if (!departure && !isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/tour-leader" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold">Sub-Grup Rombongan</h1>
        </div>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Tidak ada keberangkatan aktif yang ditugaskan untuk Anda.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/tour-leader" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Sub-Grup Rombongan</h1>
          <p className="text-sm text-muted-foreground">{(departure?.package as any)?.name} • {departure?.booked_count ?? 0} jamaah</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAutoSplit(true)} className="gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          <Shuffle className="h-4 w-4" />Bagi Otomatis
        </Button>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
          <Plus className="h-4 w-4" />Tambah Grup
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Memuat sub-grup...</div>
      ) : subgroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada sub-grup. Buat grup per bus atau kelompok ibadah.</p>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" className="gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setShowAutoSplit(true)}>
                <Shuffle className="h-4 w-4" />Bagi Otomatis
              </Button>
              <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />Buat Manual</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subgroups.map((sg: any) => (
            <Card key={sg.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: sg.color || "#6b7280" }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{sg.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />{sg.member_count ?? 0} anggota
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => setManageTarget(sg)}>
                      <UserPlus className="h-3 w-3" />Anggota
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { setEditTarget(sg); setForm({ name: sg.name, color: sg.color || GROUP_COLORS[0] }); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => { if (confirm("Hapus sub-grup ini?")) deleteMutation.mutate(sg.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editTarget} onOpenChange={v => { if (!v) { setShowCreate(false); setEditTarget(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Sub-Grup" : "Buat Sub-Grup Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Grup</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="mis. Bus 1, Kelompok Madinah..." />
            </div>
            <div>
              <Label>Warna</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditTarget(null); }}>Batal</Button>
            <Button
              disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                if (editTarget) updateMutation.mutate({ id: editTarget.id, ...form });
                else createMutation.mutate({ departure_id: depId, ...form });
              }}
            >
              {editTarget ? "Simpan Perubahan" : "Buat Grup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={!!manageTarget} onOpenChange={v => !v && setManageTarget(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: manageTarget?.color }} />
              Anggota — {manageTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
            <Input
              placeholder="Cari jamaah..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
            />
            {filteredJamaah.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jamaah ditemukan</p>
            ) : (
              <div className="space-y-1.5">
                {filteredJamaah.map((j: any) => {
                  const isMember = currentMemberIds.has(j.id);
                  return (
                    <div key={j.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${isMember ? "bg-emerald-50 border-emerald-200" : "border-gray-200"}`}>
                      <div>
                        <p className="text-sm font-medium">{j.full_name}</p>
                        {j.phone && <p className="text-xs text-muted-foreground">{j.phone}</p>}
                      </div>
                      {isMember ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 gap-1"
                          onClick={() => removeMemberMutation.mutate({ sgId: manageTarget.id, customerId: j.id })}
                          disabled={removeMemberMutation.isPending}>
                          <UserMinus className="h-3 w-3" />Keluarkan
                        </Button>
                      ) : (
                        <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => addMemberMutation.mutate({ sgId: manageTarget.id, customerIds: [j.id] })}
                          disabled={addMemberMutation.isPending}>
                          <UserPlus className="h-3 w-3" />Tambah
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTarget(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Split Dialog */}
      {depId && (
        <AutoSplitSubgroupDialog
          open={showAutoSplit}
          onOpenChange={setShowAutoSplit}
          departureId={depId}
          totalJamaah={departure?.booked_count ?? 0}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["tl-subgroups", depId] })}
        />
      )}
    </div>
  );
}
