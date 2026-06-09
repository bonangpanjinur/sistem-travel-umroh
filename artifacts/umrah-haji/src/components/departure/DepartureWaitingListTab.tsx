import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Users, Plus, MoreHorizontal, Bell, CheckCircle2, XCircle, Clock, PhoneCall } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  departureId: string;
  departureName?: string;
}

const ROOM_TYPES = { quad: "Quad (4 org)", triple: "Triple (3 org)", double: "Double (2 org)", single: "Single (1 org)" };

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  waiting:   { label: "Menunggu",     cls: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
  notified:  { label: "Sudah Notif",  cls: "bg-blue-100 text-blue-800",    icon: <Bell className="w-3 h-3" /> },
  converted: { label: "Jadi Booking", cls: "bg-green-100 text-green-800",  icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled: { label: "Dibatalkan",   cls: "bg-gray-100 text-gray-700",    icon: <XCircle className="w-3 h-3" /> },
};

function initForm() {
  return { customer_name: "", customer_phone: "", customer_email: "", room_type: "quad", num_seats: "1", notes: "" };
}

export function DepartureWaitingListTab({ departureId, departureName }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initForm());

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["waiting-list", departureId],
    enabled: !!departureId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("departure_waiting_list")
        .select("*")
        .eq("departure_id", departureId)
        .order("created_at", { ascending: true });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return (data as any[]) || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.customer_name || !form.customer_phone) throw new Error("Nama dan telepon wajib diisi");
      const { error } = await (supabase as any).from("departure_waiting_list").insert({
        departure_id: departureId,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email || null,
        room_type: form.room_type,
        num_seats: parseInt(form.num_seats) || 1,
        notes: form.notes || null,
        status: "waiting",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list", departureId] });
      setDialogOpen(false);
      setForm(initForm());
      toast.success("Calon jamaah berhasil ditambahkan ke daftar tunggu");
    },
    onError: (e: any) => toast.error(e.message || "Gagal menambahkan"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (status === "notified") patch.notified_at = new Date().toISOString();
      if (status === "converted") patch.converted_at = new Date().toISOString();
      const { error } = await (supabase as any).from("departure_waiting_list").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list", departureId] });
      toast.success("Status diperbarui");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("departure_waiting_list").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list", departureId] });
      toast.success("Dihapus dari daftar tunggu");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const waitingCount = list.filter((l: any) => l.status === "waiting").length;
  const notifiedCount = list.filter((l: any) => l.status === "notified").length;
  const convertedCount = list.filter((l: any) => l.status === "converted").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", val: list.length, cls: "text-slate-700" },
          { label: "Menunggu", val: waitingCount, cls: "text-amber-600" },
          { label: "Ternotif", val: notifiedCount, cls: "text-blue-600" },
          { label: "Konversi", val: convertedCount, cls: "text-green-600" },
        ].map(({ label, val, cls }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${cls}`}>{val}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Daftar Tunggu
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Daftar Tunggu
          </CardTitle>
          <CardDescription>
            {list.length === 0 ? "Belum ada calon jamaah dalam daftar tunggu" : `${list.length} calon jamaah — notifikasi saat ada slot terbuka`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Memuat daftar...</div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">Daftar tunggu kosong</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Tambah calon jamaah yang ingin bergabung saat ada slot terbuka</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((item: any, idx: number) => {
                const cfg = STATUS_CFG[item.status] || STATUS_CFG.waiting;
                return (
                  <div key={item.id} className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{item.customer_name}</p>
                          <Badge className={`text-[10px] flex items-center gap-1 py-0 ${cfg.cls}`}>
                            {cfg.icon} {cfg.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                          <p className="flex items-center gap-1">
                            <PhoneCall className="w-3 h-3" /> {item.customer_phone}
                            {item.customer_email && ` · ${item.customer_email}`}
                          </p>
                          <p>
                            {ROOM_TYPES[item.room_type as keyof typeof ROOM_TYPES] || item.room_type} · {item.num_seats} kursi
                          </p>
                          {item.notes && <p className="italic">"{item.notes}"</p>}
                          <p className="text-muted-foreground/60">
                            Daftar: {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                            {item.notified_at && ` · Notif: ${format(new Date(item.notified_at), "dd MMM HH:mm", { locale: idLocale })}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.status === "waiting" && (
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, status: "notified" })}>
                            <Bell className="w-4 h-4 mr-2 text-blue-500" /> Tandai Sudah Dinotif
                          </DropdownMenuItem>
                        )}
                        {(item.status === "waiting" || item.status === "notified") && (
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, status: "converted" })}>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Tandai Konversi (Jadi Booking)
                          </DropdownMenuItem>
                        )}
                        {item.status !== "cancelled" && (
                          <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, status: "cancelled" })}>
                            <XCircle className="w-4 h-4 mr-2 text-red-500" /> Batalkan
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => { if (confirm("Hapus dari daftar tunggu?")) deleteMutation.mutate(item.id); }}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Hapus Permanen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog tambah */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Tambah ke Daftar Tunggu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nama Calon Jamaah *</Label>
                <Input placeholder="Nama lengkap" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>No. Telepon / WA *</Label>
                <Input placeholder="08xxxxxxxxxx" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="email@..." value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe Kamar</Label>
                <Select value={form.room_type} onValueChange={v => setForm(f => ({ ...f, room_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROOM_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jumlah Kursi</Label>
                <Input type="number" min={1} max={10} value={form.num_seats} onChange={e => setForm(f => ({ ...f, num_seats: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Catatan</Label>
                <Textarea rows={2} placeholder="Preferensi khusus, catatan, dll..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!form.customer_name || !form.customer_phone || addMutation.isPending}
            >
              {addMutation.isPending ? "Menyimpan..." : "Tambah ke Daftar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
