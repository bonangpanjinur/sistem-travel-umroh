import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileStack, Plus, Pencil, Trash2, CheckCircle2, Loader2, Star, Building2, Globe,
  Receipt, Ticket, Award, Users, Plane, FileText, Briefcase,
} from "lucide-react";

const supabase: any = supabaseRaw;

const DOC_TYPES = [
  { value: "invoice",         label: "Invoice Pembayaran", icon: Receipt },
  { value: "eticket",         label: "E-Ticket",           icon: Ticket },
  { value: "certificate",     label: "Sertifikat Umrah",   icon: Award },
  { value: "jamaah_leave",    label: "Surat Izin Jamaah",  icon: Users },
  { value: "passport_letter", label: "Surat Paspor",       icon: Plane },
  { value: "employee_leave",  label: "Surat Izin Karyawan",icon: Briefcase },
  { value: "general_letter",  label: "Surat Umum",         icon: FileText },
];

const ACCENT_COLORS = [
  { value: "#16a34a", label: "Hijau" },
  { value: "#0284c7", label: "Biru" },
  { value: "#7c3aed", label: "Ungu" },
  { value: "#d97706", label: "Emas" },
  { value: "#0f172a", label: "Hitam" },
  { value: "#dc2626", label: "Merah" },
  { value: "#0891b2", label: "Cyan" },
];

const emptyForm = {
  doc_type: "invoice",
  branch_id: "" as string,
  name: "",
  is_default: false,
  accent_color: "#16a34a",
  font: "helvetica" as string,
  orientation: "portrait" as string,
  show_agent: true,
  show_stamp: true,
  show_signature: true,
};

export default function AdminDocumentTemplates() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterType, setFilterType] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: branches } = useQuery({
    queryKey: ["branches-for-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*, branch:branches(id, name)")
        .order("doc_type")
        .order("branch_id", { nullsFirst: true })
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        doc_type: form.doc_type,
        branch_id: form.branch_id || null,
        name: form.name,
        is_default: form.is_default,
        settings_json: {
          accent_color: form.accent_color,
          font: form.font,
          orientation: form.orientation,
          show_agent: form.show_agent,
          show_stamp: form.show_stamp,
          show_signature: form.show_signature,
        },
      };
      if (editingId) {
        const { error } = await supabase.from("document_templates").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("document_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success(editingId ? "Template diperbarui" : "Template dibuat");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan template"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("document_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template dihapus");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message || "Gagal menghapus"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (tpl: any) => {
    setEditingId(tpl.id);
    const s = tpl.settings_json || {};
    setForm({
      doc_type: tpl.doc_type,
      branch_id: tpl.branch_id || "",
      name: tpl.name,
      is_default: tpl.is_default,
      accent_color: s.accent_color || "#16a34a",
      font: s.font || "helvetica",
      orientation: s.orientation || "portrait",
      show_agent: s.show_agent !== false,
      show_stamp: s.show_stamp !== false,
      show_signature: s.show_signature !== false,
    });
    setDialogOpen(true);
  };

  const filtered = filterType === "all"
    ? (templates || [])
    : (templates || []).filter((t: any) => t.doc_type === filterType);

  const grouped = DOC_TYPES.map((dt) => ({
    ...dt,
    templates: (templates || []).filter((t: any) => t.doc_type === dt.value),
  }));

  const docTypeInfo = (type: string) => DOC_TYPES.find((d) => d.value === type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileStack className="h-6 w-6" />Template Dokumen
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola template desain per jenis dokumen dan per cabang. Template default digunakan saat tidak ada template cabang.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 self-start">
          <Plus className="h-4 w-4" />Buat Template
        </Button>
      </div>

      {/* ── Filter ── */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm" variant={filterType === "all" ? "default" : "outline"}
          onClick={() => setFilterType("all")}
        >
          Semua ({templates?.length ?? 0})
        </Button>
        {DOC_TYPES.map((dt) => {
          const Icon = dt.icon;
          const count = (templates || []).filter((t: any) => t.doc_type === dt.value).length;
          return (
            <Button
              key={dt.value} size="sm"
              variant={filterType === dt.value ? "default" : "outline"}
              onClick={() => setFilterType(dt.value)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />{dt.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* ── Template Cards ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filterType === "all" ? (
        <div className="space-y-6">
          {grouped.map(({ value, label, icon: Icon, templates: tpls }) =>
            tpls.length === 0 ? null : (
              <div key={value}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{label}</h3>
                  <span className="text-xs text-muted-foreground">({tpls.length} template)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tpls.map((tpl: any) => (
                    <TemplateCard
                      key={tpl.id} tpl={tpl}
                      onEdit={() => openEdit(tpl)}
                      onDelete={() => setDeleteId(tpl.id)}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tpl: any) => (
            <TemplateCard
              key={tpl.id} tpl={tpl}
              onEdit={() => openEdit(tpl)}
              onDelete={() => setDeleteId(tpl.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground py-12">
              Belum ada template untuk jenis dokumen ini.
              <br />
              <Button variant="link" onClick={openCreate}>Buat template baru</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "Buat Template Dokumen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Jenis Dokumen</Label>
              <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Template</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Invoice Cabang Surabaya"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cabang (kosongkan untuk template global)</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua cabang (global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua cabang (global)</SelectItem>
                  {(branches || []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Warna Aksen</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.accent_color === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setForm({ ...form, accent_color: c.value })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Font PDF</Label>
                <Select value={form.font} onValueChange={(v) => setForm({ ...form, font: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="helvetica">Helvetica (default)</SelectItem>
                    <SelectItem value="times">Times New Roman</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Orientasi Kertas</Label>
              <div className="flex gap-2">
                {["portrait", "landscape"].map((o) => (
                  <Button
                    key={o} size="sm" type="button"
                    variant={form.orientation === o ? "default" : "outline"}
                    onClick={() => setForm({ ...form, orientation: o })}
                  >
                    {o === "portrait" ? "Portrait (tegak)" : "Landscape (mendatar)"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tampilkan elemen</Label>
              {[
                { key: "show_agent", label: "Info agen (jika ada)" },
                { key: "show_stamp", label: "Stempel cabang" },
                { key: "show_signature", label: "Tanda tangan" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={(form as any)[key]}
                    onCheckedChange={(v) => setForm({ ...form, [key]: v })}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label>Jadikan default</Label>
                <p className="text-xs text-muted-foreground">Template ini dipakai otomatis jika tidak dipilih manual</p>
              </div>
              <Switch
                checked={form.is_default}
                onCheckedChange={(v) => setForm({ ...form, is_default: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.name || !form.doc_type}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {editingId ? "Simpan Perubahan" : "Buat Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tindakan ini tidak bisa dibatalkan. Template akan dihapus permanen.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({ tpl, onEdit, onDelete }: { tpl: any; onEdit: () => void; onDelete: () => void }) {
  const dt = DOC_TYPES.find((d) => d.value === tpl.doc_type);
  const Icon = dt?.icon ?? FileStack;
  const s = tpl.settings_json || {};

  return (
    <Card className="relative hover:shadow-md transition-shadow">
      {tpl.is_default && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />Default
          </Badge>
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${s.accent_color}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: s.accent_color || "#16a34a" }} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{tpl.name}</p>
            <p className="text-xs text-muted-foreground">{dt?.label ?? tpl.doc_type}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tpl.branch ? (
            <Badge variant="outline" className="text-xs gap-1">
              <Building2 className="h-3 w-3" />{tpl.branch.name}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1">
              <Globe className="h-3 w-3" />Global
            </Badge>
          )}
          {s.accent_color && (
            <div
              className="w-4 h-4 rounded-full border border-border"
              title={`Warna: ${s.accent_color}`}
              style={{ backgroundColor: s.accent_color }}
            />
          )}
          {s.font && <span className="text-xs text-muted-foreground">{s.font}</span>}
          {s.orientation && <span className="text-xs text-muted-foreground">{s.orientation}</span>}
        </div>

        <div className="flex gap-2 pt-1 border-t">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={onEdit}>
            <Pencil className="h-3 w-3" />Edit
          </Button>
          <Button
            size="sm" variant="outline"
            className="flex-1 h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />Hapus
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
