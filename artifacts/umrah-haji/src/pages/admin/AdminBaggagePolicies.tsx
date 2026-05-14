import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Luggage, Plus, Pencil, Trash2, Plane, Info } from "lucide-react";
import { toast } from "sonner";

interface Policy {
  id: string;
  airline_id: string | null;
  cabin_kg: number;
  checked_kg: number;
  max_pieces: number | null;
  notes: string | null;
  airlines?: { name: string; code?: string };
}

const EMPTY_FORM = {
  airline_id: "",
  cabin_kg: 7,
  checked_kg: 23,
  max_pieces: 1,
  notes: "",
};

/** KEP-FIX6 — Manajemen Kebijakan Bagasi per Maskapai */
export default function AdminBaggagePolicies() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: airlines = [] } = useQuery({
    queryKey: ["airlines-list"],
    queryFn: async () => (await supabase.from("airlines").select("id,name,code").order("name")).data || [],
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["baggage-policies"],
    queryFn: async () =>
      (await supabase.from("baggage_policies").select("*, airlines(name,code)").order("created_at", { ascending: false })).data || [],
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (p: Policy) => {
    setEditingId(p.id);
    setForm({
      airline_id: p.airline_id || "",
      cabin_kg: p.cabin_kg,
      checked_kg: p.checked_kg,
      max_pieces: p.max_pieces ?? 1,
      notes: p.notes || "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        airline_id: form.airline_id || null,
        cabin_kg: form.cabin_kg,
        checked_kg: form.checked_kg,
        max_pieces: form.max_pieces || null,
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from("baggage_policies").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("baggage_policies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["baggage-policies"] });
      toast.success(editingId ? "Kebijakan diperbarui" : "Kebijakan ditambahkan");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("baggage_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["baggage-policies"] });
      toast.success("Kebijakan dihapus");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const airlineMap = Object.fromEntries(airlines.map((a: any) => [a.id, a]));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Luggage className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kebijakan Bagasi</h1>
            <p className="text-sm text-muted-foreground">Kelola kuota bagasi per maskapai untuk informasi jamaah</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Kebijakan
        </Button>
      </div>

      {/* Info card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-4 flex gap-3 text-sm text-blue-800 dark:text-blue-200">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Kebijakan bagasi yang didaftarkan akan tampil di portal jamaah saat melihat informasi keberangkatan.
            Buat satu entri per maskapai. Gunakan <strong>Default</strong> (tanpa maskapai) sebagai fallback global.
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Kebijakan ({policies.length})</CardTitle>
          <CardDescription>Klik ikon pensil untuk mengedit, ikon tempat sampah untuk menghapus</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Memuat...</div>
          ) : policies.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Luggage className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">Belum ada kebijakan bagasi.</p>
              <Button variant="outline" onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />Tambah Pertama</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Maskapai</TableHead>
                  <TableHead className="text-center">Kabin (kg)</TableHead>
                  <TableHead className="text-center">Checked (kg)</TableHead>
                  <TableHead className="text-center">Maks. Koper</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(policies as Policy[]).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{p.airlines?.name || "Default (Global)"}</p>
                          {p.airlines?.code && (
                            <Badge variant="outline" className="text-[10px] h-4 mt-0.5">{p.airlines.code}</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{p.cabin_kg} kg</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{p.checked_kg} kg</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {p.max_pieces ? (
                        <Badge variant="outline">{p.max_pieces} koper</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-muted-foreground truncate">{p.notes || "—"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus kebijakan ini?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Kebijakan bagasi {p.airlines?.name || "Default"} akan dihapus permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => deleteMutation.mutate(p.id)}
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Luggage className="h-5 w-5" />
              {editingId ? "Edit Kebijakan Bagasi" : "Tambah Kebijakan Bagasi"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Airline */}
            <div className="space-y-1.5">
              <Label>Maskapai</Label>
              <Select
                value={form.airline_id || "default"}
                onValueChange={(v) => setForm({ ...form, airline_id: v === "default" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih maskapai..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (berlaku untuk semua)</SelectItem>
                  {airlines.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}{a.code ? ` (${a.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pilih "Default" jika berlaku untuk semua maskapai</p>
            </div>

            <Separator />

            {/* Weights */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Kabin (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={form.cabin_kg}
                  onChange={(e) => setForm({ ...form, cabin_kg: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Checked (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={form.checked_kg}
                  onChange={(e) => setForm({ ...form, checked_kg: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Maks. Koper</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  placeholder="1"
                  value={form.max_pieces ?? ""}
                  onChange={(e) => setForm({ ...form, max_pieces: e.target.value ? Number(e.target.value) : 1 })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Catatan Tambahan</Label>
              <Textarea
                placeholder="Contoh: Air zam-zam maks 5 liter, oleh-oleh terpisah dari kuota bagasi"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">Kabin: {form.cabin_kg} kg</Badge>
                <Badge variant="secondary">Checked: {form.checked_kg} kg</Badge>
                {form.max_pieces && <Badge variant="outline">Maks. {form.max_pieces} koper</Badge>}
              </div>
              {form.notes && <p className="text-muted-foreground text-xs mt-1">{form.notes}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
