import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Pencil, Trash2, Star, StarOff, Loader2,
  ChevronDown, ChevronUp, X, GripVertical, Package, Eye, EyeOff,
  Search, CheckSquare, Square, Filter,
} from "lucide-react";
import { formatDate } from "@/lib/format";

const API_BASE = "/api";

interface PolicySection { title: string; items: string[] }
interface CancellationRule {
  id: string;
  name: string;
  is_default: boolean;
  sections: PolicySection[];
  package_count: number;
  created_at: string;
  updated_at: string;
}
interface PackageRow {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  cancellation_rule_id: string | null;
}

const EMPTY_SECTIONS: PolicySection[] = [
  { title: "PEMBAYARAN", items: [""] },
  { title: "PEMBATALAN", items: [""] },
  { title: "PINDAH PAKET / PINDAH TANGGAL / GANTI NAMA", items: [""] },
];

// ─── Section Builder ──────────────────────────────────────────────────────────

function SectionBuilder({
  sections,
  onChange,
}: {
  sections: PolicySection[];
  onChange: (s: PolicySection[]) => void;
}) {
  function addSection() {
    onChange([...sections, { title: "", items: [""] }]);
  }
  function removeSection(si: number) {
    onChange(sections.filter((_, i) => i !== si));
  }
  function updateTitle(si: number, val: string) {
    const next = [...sections];
    next[si] = { ...next[si], title: val };
    onChange(next);
  }
  function moveSection(si: number, dir: -1 | 1) {
    const next = [...sections];
    const tgt = si + dir;
    if (tgt < 0 || tgt >= next.length) return;
    [next[si], next[tgt]] = [next[tgt], next[si]];
    onChange(next);
  }
  function addItem(si: number) {
    const next = [...sections];
    next[si] = { ...next[si], items: [...next[si].items, ""] };
    onChange(next);
  }
  function updateItem(si: number, ii: number, val: string) {
    const next = [...sections];
    const items = [...next[si].items];
    items[ii] = val;
    next[si] = { ...next[si], items };
    onChange(next);
  }
  function removeItem(si: number, ii: number) {
    const next = [...sections];
    const items = next[si].items.filter((_, i) => i !== ii);
    next[si] = { ...next[si], items: items.length > 0 ? items : [""] };
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Seksi / Bagian</Label>
        <Button variant="outline" size="sm" type="button" onClick={addSection}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Seksi
        </Button>
      </div>
      {sections.map((section, si) => (
        <div key={si} className="border rounded-lg p-3 space-y-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              className="font-semibold text-sm h-8"
              value={section.title}
              onChange={e => updateTitle(si, e.target.value)}
              placeholder="Judul seksi, mis: PEMBAYARAN"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" type="button"
              onClick={() => moveSection(si, -1)} disabled={si === 0}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" type="button"
              onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {sections.length > 1 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive"
                type="button" onClick={() => removeSection(si)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="pl-6 space-y-1.5">
            {section.items.map((item, ii) => (
              <div key={ii} className="flex gap-1.5">
                <span className="text-muted-foreground text-xs mt-2">•</span>
                <Input
                  className="h-7 text-xs"
                  value={item}
                  onChange={e => updateItem(si, ii, e.target.value)}
                  placeholder={`Poin ${ii + 1}...`}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(si); } }}
                />
                {section.items.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground"
                    type="button" onClick={() => removeItem(si, ii)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground pl-4"
              type="button" onClick={() => addItem(si)}>
              <Plus className="h-3 w-3 mr-1" /> Tambah poin
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onSetDefault,
  onViewPackages,
  onBulkAssign,
}: {
  rule: CancellationRule;
  onEdit: (r: CancellationRule) => void;
  onDelete: (r: CancellationRule) => void;
  onSetDefault: (r: CancellationRule) => void;
  onViewPackages: (r: CancellationRule) => void;
  onBulkAssign: (ruleId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={rule.is_default ? "border-amber-300 dark:border-amber-700" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{rule.name}</h3>
              {rule.is_default && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs shrink-0">
                  <Star className="h-3 w-3 mr-1" /> Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rule.sections.length} seksi •{" "}
              <button
                type="button"
                className="underline hover:no-underline"
                onClick={() => onViewPackages(rule)}
              >
                {rule.package_count} paket
              </button>{" "}
              • Diperbarui {formatDate(rule.updated_at)}
            </p>
          </div>
          <div className="flex gap-1 shrink-0 flex-wrap justify-end">
            <Button
              variant="outline" size="sm"
              className="h-7 text-xs px-2 text-primary border-primary/30 hover:bg-primary/5"
              title="Assign ke Banyak Paket"
              onClick={() => onBulkAssign(rule.id)}
            >
              <Package className="h-3 w-3 mr-1" /> Bulk Assign
            </Button>
            {!rule.is_default && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500"
                title="Jadikan Default" onClick={() => onSetDefault(rule)}>
                <StarOff className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7"
              title="Edit" onClick={() => onEdit(rule)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
              title="Hapus" onClick={() => onDelete(rule)}
              disabled={rule.package_count > 0}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {rule.sections.length > 0 && (
        <CardContent className="pt-0">
          <Button
            variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground -ml-1 mb-2"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded
              ? <><EyeOff className="h-3 w-3 mr-1" /> Sembunyikan isi</>
              : <><Eye className="h-3 w-3 mr-1" /> Lihat {rule.sections.length} seksi</>
            }
          </Button>
          {expanded && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto">
              {rule.sections.map((s, si) => (
                <div key={si}>
                  <p className="text-xs font-semibold">{s.title.toUpperCase()}:</p>
                  {s.items.map((item, ii) => (
                    <p key={ii} className="text-xs text-muted-foreground pl-3">• {item}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAturanPembatalan() {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<null | "create" | "edit">(null);
  const [editTarget, setEditTarget] = useState<CancellationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CancellationRule | null>(null);
  const [defaultTarget, setDefaultTarget] = useState<CancellationRule | null>(null);
  const [packagesTarget, setPackagesTarget] = useState<CancellationRule | null>(null);

  const [formName, setFormName] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formSections, setFormSections] = useState<PolicySection[]>(EMPTY_SECTIONS);

  // ── Bulk Assign state ─────────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRuleId, setBulkRuleId] = useState<string>("");
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkFilterUnassigned, setBulkFilterUnassigned] = useState(false);
  const [selectedPkgIds, setSelectedPkgIds] = useState<Set<string>>(new Set());

  const { data: rules = [], isLoading } = useQuery<CancellationRule[]>({
    queryKey: ["cancellation-rules"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/cancellation-rules`);
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: linkedPackages = [], isLoading: loadingPackages } = useQuery<any[]>({
    queryKey: ["cancellation-rule-packages", packagesTarget?.id],
    queryFn: async () => {
      if (!packagesTarget) return [];
      const res = await fetch(`${API_BASE}/cancellation-rules/${packagesTarget.id}/packages`);
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!packagesTarget,
  });

  const { data: allPackages = [], isLoading: loadingAllPkgs } = useQuery<PackageRow[]>({
    queryKey: ["all-packages-for-bulk-assign"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/cancellation-rules/all-packages`);
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: bulkOpen,
  });

  const filteredPackages = useMemo(() => {
    let list = allPackages;
    if (bulkFilterUnassigned) {
      list = list.filter(p => !p.cancellation_rule_id);
    }
    if (bulkSearch.trim()) {
      const q = bulkSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allPackages, bulkSearch, bulkFilterUnassigned]);

  const allFilteredSelected = filteredPackages.length > 0 &&
    filteredPackages.every(p => selectedPkgIds.has(p.id));

  function togglePkg(id: string) {
    setSelectedPkgIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedPkgIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredPackages.forEach(p => next.delete(p.id));
      } else {
        filteredPackages.forEach(p => next.add(p.id));
      }
      return next;
    });
  }

  function openBulkAssign(ruleId: string) {
    setBulkRuleId(ruleId);
    setBulkSearch("");
    setBulkFilterUnassigned(false);
    setSelectedPkgIds(new Set());
    setBulkOpen(true);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["cancellation-rules"] });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName.trim(),
        is_default: formIsDefault,
        sections: formSections
          .map(s => ({ title: s.title.trim(), items: s.items.filter(i => i.trim()) }))
          .filter(s => s.title),
      };
      const res = await fetch(`${API_BASE}/cancellation-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal membuat aturan");
      }
    },
    onSuccess: () => {
      toast.success("Aturan pembatalan berhasil dibuat");
      invalidate();
      setMode(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal membuat aturan"),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const payload = {
        name: formName.trim(),
        is_default: formIsDefault,
        sections: formSections
          .map(s => ({ title: s.title.trim(), items: s.items.filter(i => i.trim()) }))
          .filter(s => s.title),
      };
      const res = await fetch(`${API_BASE}/cancellation-rules/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal memperbarui aturan");
      }
    },
    onSuccess: () => {
      toast.success("Aturan pembatalan diperbarui");
      invalidate();
      setMode(null);
      setEditTarget(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal memperbarui"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/cancellation-rules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menghapus aturan");
      }
    },
    onSuccess: () => {
      toast.success("Aturan pembatalan dihapus");
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menghapus"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/cancellation-rules/${id}/set-default`, {
        method: "PUT",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menjadikan default");
      }
    },
    onSuccess: () => {
      toast.success("Aturan berhasil dijadikan default");
      invalidate();
      setDefaultTarget(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menjadikan default"),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      const packageIds = Array.from(selectedPkgIds);
      const res = await fetch(`${API_BASE}/cancellation-rules/${bulkRuleId}/bulk-assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_ids: packageIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal bulk assign");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(`${data.updated ?? selectedPkgIds.size} paket berhasil dikaitkan`);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["all-packages-for-bulk-assign"] });
      setBulkOpen(false);
      setSelectedPkgIds(new Set());
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal bulk assign"),
  });

  function openCreate() {
    setFormName("");
    setFormIsDefault(rules.length === 0);
    setFormSections(EMPTY_SECTIONS.map(s => ({ ...s, items: [...s.items] })));
    setEditTarget(null);
    setMode("create");
  }

  function openEdit(rule: CancellationRule) {
    setFormName(rule.name);
    setFormIsDefault(rule.is_default);
    setFormSections(
      rule.sections.length > 0
        ? rule.sections.map(s => ({ title: s.title, items: [...s.items, ""] }))
        : [{ title: "", items: [""] }]
    );
    setEditTarget(rule);
    setMode("edit");
  }

  const selectedRuleName = rules.find(r => r.id === bulkRuleId)?.name ?? "";
  const formValid = formName.trim().length > 0 && formSections.some(s => s.title.trim());
  const isSaving = createMutation.isPending || editMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Aturan Pembatalan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola aturan pembatalan yang bisa dikaitkan ke setiap paket.
            Aturan <strong>default</strong> otomatis berlaku untuk paket yang belum punya aturan khusus.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {rules.length > 0 && (
            <Button variant="outline" onClick={() => openBulkAssign(rules[0].id)}>
              <Package className="h-4 w-4 mr-2" />
              Bulk Assign Paket
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Buat Aturan Baru
          </Button>
        </div>
      </div>

      {/* Rule List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat...
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center space-y-4">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="font-medium">Belum ada aturan pembatalan</p>
            <p className="text-sm text-muted-foreground mt-1">
              Buat aturan pertama Anda untuk mulai mengaitkannya ke paket
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Buat Aturan Pertama
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={openEdit}
              onDelete={r => setDeleteTarget(r)}
              onSetDefault={r => setDefaultTarget(r)}
              onViewPackages={r => setPackagesTarget(r)}
              onBulkAssign={openBulkAssign}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={mode === "create" || mode === "edit"}
        onOpenChange={open => { if (!open) { setMode(null); setEditTarget(null); } }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Buat Aturan Pembatalan Baru" : "Edit Aturan Pembatalan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Nama Aturan <span className="text-destructive">*</span></Label>
              <Input
                id="rule-name"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="mis: Aturan Pembatalan Umroh Reguler 2025"
              />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20">
              <input
                id="is-default"
                type="checkbox"
                checked={formIsDefault}
                onChange={e => setFormIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-amber-400 accent-amber-500"
              />
              <div>
                <Label htmlFor="is-default" className="text-sm font-medium cursor-pointer">
                  Jadikan Aturan Default
                </Label>
                <p className="text-xs text-muted-foreground">
                  Paket yang belum punya aturan khusus akan otomatis menggunakan aturan ini
                </p>
              </div>
            </div>

            <SectionBuilder sections={formSections} onChange={setFormSections} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setMode(null); setEditTarget(null); }}>
              Batal
            </Button>
            <Button
              disabled={!formValid || isSaving}
              onClick={() => mode === "create" ? createMutation.mutate() : editMutation.mutate()}
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {mode === "create" ? "Buat Aturan" : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Assign Dialog ───────────────────────────────────────────────── */}
      <Dialog open={bulkOpen} onOpenChange={open => {
        if (!open) { setBulkOpen(false); setSelectedPkgIds(new Set()); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Bulk Assign Paket ke Aturan Pembatalan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Rule selector */}
            <div className="space-y-1.5">
              <Label>Aturan yang akan Diterapkan</Label>
              <Select value={bulkRuleId} onValueChange={setBulkRuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih aturan pembatalan..." />
                </SelectTrigger>
                <SelectContent>
                  {rules.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="flex items-center gap-2">
                        {r.is_default && <Star className="h-3 w-3 text-amber-500" />}
                        {r.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Cari nama paket..."
                  value={bulkSearch}
                  onChange={e => setBulkSearch(e.target.value)}
                />
              </div>
              <Button
                variant={bulkFilterUnassigned ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs shrink-0"
                onClick={() => setBulkFilterUnassigned(v => !v)}
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Belum ada aturan
              </Button>
            </div>

            {/* Package list */}
            <div className="flex-1 overflow-hidden border rounded-lg flex flex-col">
              {/* Select all row */}
              <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/30">
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={toggleAllFiltered}
                  disabled={filteredPackages.length === 0}
                >
                  {allFilteredSelected
                    ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    : <Square className="h-3.5 w-3.5" />}
                  Pilih semua yang tampil
                </button>
                {selectedPkgIds.size > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selectedPkgIds.size} dipilih
                  </Badge>
                )}
                {filteredPackages.length === 0 && allPackages.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">Tidak ada hasil</span>
                )}
              </div>

              <div className="overflow-y-auto flex-1 max-h-72">
                {loadingAllPkgs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPackages.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    {allPackages.length === 0 ? "Belum ada paket" : "Tidak ada paket yang sesuai filter"}
                  </p>
                ) : (
                  filteredPackages.map(pkg => {
                    const checked = selectedPkgIds.has(pkg.id);
                    const currentRule = pkg.cancellation_rule_id
                      ? rules.find(r => r.id === pkg.cancellation_rule_id)
                      : null;
                    return (
                      <label
                        key={pkg.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 border-b last:border-0"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePkg(pkg.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{pkg.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pkg.type || "—"}
                            {currentRule && (
                              <> · <span className="text-amber-600">Saat ini: {currentRule.name}</span></>
                            )}
                            {!currentRule && !pkg.cancellation_rule_id && (
                              <> · <span className="text-muted-foreground/70">Belum ada aturan</span></>
                            )}
                          </p>
                        </div>
                        <Badge
                          variant={pkg.is_active ? "default" : "secondary"}
                          className="text-xs shrink-0"
                        >
                          {pkg.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Summary */}
            {selectedPkgIds.size > 0 && bulkRuleId && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                <strong>{selectedPkgIds.size} paket</strong> akan dikaitkan ke aturan{" "}
                <strong>"{selectedRuleName}"</strong>.
                Paket yang sudah punya aturan lain akan diganti.
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setBulkOpen(false); setSelectedPkgIds(new Set()); }}>
              Batal
            </Button>
            <Button
              disabled={selectedPkgIds.size === 0 || !bulkRuleId || bulkAssignMutation.isPending}
              onClick={() => bulkAssignMutation.mutate()}
            >
              {bulkAssignMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Terapkan ke {selectedPkgIds.size > 0 ? `${selectedPkgIds.size} ` : ""}Paket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete ───────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Aturan Pembatalan?</AlertDialogTitle>
            <AlertDialogDescription>
              Aturan <strong>{deleteTarget?.name}</strong> akan dihapus secara permanen.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Set Default ──────────────────────────────────────────────── */}
      <AlertDialog open={!!defaultTarget} onOpenChange={open => { if (!open) setDefaultTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jadikan Aturan Default?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{defaultTarget?.name}</strong> akan menjadi aturan default.
              Aturan default sebelumnya (jika ada) akan dilepas dari status default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => defaultTarget && setDefaultMutation.mutate(defaultTarget.id)}
              disabled={setDefaultMutation.isPending}
            >
              {setDefaultMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Ya, Jadikan Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Packages Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!packagesTarget} onOpenChange={open => { if (!open) setPackagesTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Paket yang Memakai Aturan Ini
            </DialogTitle>
          </DialogHeader>
          {loadingPackages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : linkedPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Belum ada paket yang memakai aturan ini.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {linkedPackages.map((pkg: any) => (
                <div key={pkg.id}
                  className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm font-medium">{pkg.name}</span>
                  <Badge variant={pkg.is_active ? "default" : "secondary"} className="text-xs">
                    {pkg.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackagesTarget(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
