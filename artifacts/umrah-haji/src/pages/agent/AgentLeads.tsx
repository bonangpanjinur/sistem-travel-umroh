import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Plus, Phone, MessageSquare, MoreVertical, User2,
  ArrowRight, Loader2, Search, Trash2, Edit, Users,
  TrendingUp, Clock, CheckCircle2, X
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "baru", label: "Prospek Baru", color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" },
  { id: "dihubungi", label: "Dihubungi", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  { id: "tertarik", label: "Tertarik", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { id: "negosiasi", label: "Negosiasi", color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  { id: "booking", label: "Booking 🎉", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
];

const STAGE_ORDER = ["baru", "dihubungi", "tertarik", "negosiasi", "booking"];

type Lead = {
  id: string;
  name: string;
  phone: string;
  stage: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  agent_id: string;
};

const emptyForm = { name: "", phone: "", stage: "baru", notes: "" };

export default function AgentLeads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const { data: agentData } = useQuery({
    queryKey: ["agent-profile-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["agent-leads", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agent_leads")
        .select("*")
        .eq("agent_id", agentData!.id)
        .order("updated_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editLead) {
        const { error } = await (supabase as any)
          .from("agent_leads")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editLead.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("agent_leads")
          .insert({ ...payload, agent_id: agentData!.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-leads"] });
      setAddOpen(false);
      setEditLead(null);
      setForm(emptyForm);
      toast.success(editLead ? "Lead diperbarui" : "Lead baru ditambahkan");
    },
    onError: (err: any) => toast.error("Gagal menyimpan: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("agent_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-leads"] });
      toast.success("Lead dihapus");
    },
  });

  const moveStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await (supabase as any)
        .from("agent_leads")
        .update({ stage, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agent-leads"] }),
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!form.phone.trim()) { toast.error("Nomor HP wajib diisi"); return; }
    saveMutation.mutate(form);
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setForm({ name: lead.name, phone: lead.phone, stage: lead.stage, notes: lead.notes || "" });
    setAddOpen(true);
  };

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.phone.includes(search)
  );

  const byStage = (stage: string) => filtered.filter(l => l.stage === stage);

  const stats = {
    total: leads.length,
    baru: leads.filter(l => l.stage === "baru").length,
    aktif: leads.filter(l => ["dihubungi", "tertarik", "negosiasi"].includes(l.stage)).length,
    booking: leads.filter(l => l.stage === "booking").length,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">CRM Pipeline Lead</h1>
          <p className="text-sm text-muted-foreground">Kelola prospek calon jamaah Anda</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setEditLead(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editLead ? "Edit Lead" : "Tambah Prospek Baru"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nama Lengkap *</Label>
                <Input placeholder="cth. Budi Santoso" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Nomor HP / WhatsApp *</Label>
                <Input placeholder="cth. 08123456789" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} inputMode="tel" />
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea
                  placeholder="Minat paket apa, kendala, dll..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAddOpen(false); setEditLead(null); setForm(emptyForm); }}>Batal</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editLead ? "Simpan Perubahan" : "Tambah Lead"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "text-gray-600" },
          { label: "Baru", value: stats.baru, icon: Clock, color: "text-gray-500" },
          { label: "Aktif", value: stats.aktif, icon: TrendingUp, color: "text-amber-600" },
          { label: "Booking", value: stats.booking, icon: CheckCircle2, color: "text-green-600" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <Icon className={cn("h-4 w-4 mx-auto mb-1", s.color)} />
                <div className="font-bold text-lg">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search & View Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama atau HP..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setView("kanban")}
            className={cn("px-3 py-2 text-xs font-medium transition-colors", view === "kanban" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-gray-50")}
          >
            Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("px-3 py-2 text-xs font-medium transition-colors", view === "list" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-gray-50")}
          >
            List
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Belum ada lead</p>
          <p className="text-sm text-muted-foreground mb-4">Tambahkan prospek calon jamaah pertama Anda</p>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Tambah Lead</Button>
        </div>
      ) : view === "list" ? (
        /* List View */
        <div className="space-y-2">
          {filtered.map(lead => {
            const stage = STAGES.find(s => s.id === lead.stage);
            const stageIdx = STAGE_ORDER.indexOf(lead.stage);
            return (
              <Card key={lead.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{lead.name}</p>
                        <Badge className={cn("text-xs border", stage?.color)}>{stage?.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>
                      {lead.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <a href={`https://wa.me/62${lead.phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(lead)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(lead.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Move stage buttons */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {stageIdx > 0 && (
                      <button
                        onClick={() => moveStageMutation.mutate({ id: lead.id, stage: STAGE_ORDER[stageIdx - 1] })}
                        className="text-[10px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        ← {STAGES[stageIdx - 1]?.label}
                      </button>
                    )}
                    {stageIdx < STAGE_ORDER.length - 1 && (
                      <button
                        onClick={() => moveStageMutation.mutate({ id: lead.id, stage: STAGE_ORDER[stageIdx + 1] })}
                        className="text-[10px] px-2 py-0.5 rounded border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                      >
                        {STAGES[stageIdx + 1]?.label} →
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Kanban View */
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => {
              const stageLeads = byStage(stage.id);
              return (
                <div key={stage.id} className="w-60 shrink-0">
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-xl border", stage.color)}>
                    <div className={cn("w-2 h-2 rounded-full", stage.dot)} />
                    <span className="text-xs font-semibold">{stage.label}</span>
                    <Badge className="ml-auto text-[10px] bg-white/50 border-0">{stageLeads.length}</Badge>
                  </div>
                  <div className={cn("min-h-32 rounded-b-xl border border-t-0 p-2 space-y-2", stage.color.includes("gray") ? "bg-gray-50/50" : "bg-white")}>
                    {stageLeads.map(lead => {
                      const stageIdx = STAGE_ORDER.indexOf(lead.stage);
                      return (
                        <div key={lead.id} className="bg-white border rounded-lg p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm leading-tight">{lead.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>
                            </div>
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(lead)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(lead.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {lead.notes && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{lead.notes}</p>
                          )}
                          <div className="flex gap-1 mt-2">
                            <a href={`https://wa.me/62${lead.phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button size="sm" variant="outline" className="w-full h-6 text-[10px] text-green-600 border-green-200 hover:bg-green-50">
                                <MessageSquare className="h-3 w-3 mr-0.5" /> WA
                              </Button>
                            </a>
                            {stageIdx < STAGE_ORDER.length - 1 && (
                              <Button
                                size="sm"
                                className="flex-1 h-6 text-[10px]"
                                onClick={() => moveStageMutation.mutate({ id: lead.id, stage: STAGE_ORDER[stageIdx + 1] })}
                              >
                                Maju <ArrowRight className="h-3 w-3 ml-0.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {stageLeads.length === 0 && (
                      <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                        Tidak ada lead
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
