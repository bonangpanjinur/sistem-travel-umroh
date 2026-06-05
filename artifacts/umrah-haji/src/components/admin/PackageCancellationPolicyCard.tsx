/**
 * PackageCancellationPolicyCard.tsx
 *
 * Mengelola aturan pembatalan per paket:
 *  - Tampilkan aturan yang dikaitkan (atau aturan default/global sebagai fallback)
 *  - Pilih aturan dari daftar
 *  - Buat aturan baru langsung dari sini
 *  - Edit aturan yang sudah dikaitkan ke paket ini
 *  - Lepas keterkaitan (kembali ke default)
 *
 * Menggunakan REST API (/api/cancellation-rules) — tidak ada panggilan Supabase.
 */

import { useState } from "react";
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
import { toast } from "sonner";
import {
  ClipboardList, Plus, Pencil, Unlink, Globe, Loader2,
  CheckCircle2, ChevronDown, ChevronUp, X, GripVertical, Info, Star,
} from "lucide-react";

const API_BASE = "/api";

interface PolicySection { title: string; items: string[] }
interface CancellationRule {
  id: string;
  name: string;
  is_default: boolean;
  sections: PolicySection[];
  package_count?: number;
}

interface PackageCancellationPolicyCardProps {
  packageId: string;
  packageName?: string;
  /** cancellation_rule_id terpasang saat ini (dari data paket) */
  cancellationRuleId?: string | null;
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function PackageCancellationPolicyCard({
  packageId,
  packageName,
  cancellationRuleId,
}: PackageCancellationPolicyCardProps) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<null | "pick" | "create" | "edit">(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const [formName, setFormName] = useState("");
  const [formSections, setFormSections] = useState<PolicySection[]>(EMPTY_SECTIONS);
  const [selectedRuleId, setSelectedRuleId] = useState("");

  // ── Data queries ─────────────────────────────────────────────────────────────

  const { data: allRules = [], isLoading: loadingAll } = useQuery<CancellationRule[]>({
    queryKey: ["cancellation-rules"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/cancellation-rules`);
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const activeRule = allRules.find(r => r.id === cancellationRuleId) ?? null;
  const defaultRule = !activeRule ? (allRules.find(r => r.is_default) ?? null) : null;

  // ── Assign mutation ───────────────────────────────────────────────────────────

  const assignMutation = useMutation({
    mutationFn: async (ruleId: string | null) => {
      const res = await fetch(`${API_BASE}/cancellation-rules/packages/${packageId}/cancellation-rule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellation_rule_id: ruleId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan"),
  });

  // ── Create mutation ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName.trim(),
        is_default: false,
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
      return res.json();
    },
    onSuccess: async (data) => {
      toast.success("Aturan pembatalan berhasil dibuat");
      await invalidate();
      await assignMutation.mutateAsync(data.data.id);
      toast.success("Aturan dikaitkan ke paket ini");
      setMode(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal membuat aturan"),
  });

  // ── Edit mutation ─────────────────────────────────────────────────────────────

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!activeRule) return;
      const payload = {
        name: formName.trim(),
        sections: formSections
          .map(s => ({ title: s.title.trim(), items: s.items.filter(i => i.trim()) }))
          .filter(s => s.title),
      };
      const res = await fetch(`${API_BASE}/cancellation-rules/${activeRule.id}`, {
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
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal memperbarui"),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["cancellation-rules"] });
    queryClient.invalidateQueries({ queryKey: ["admin-package", packageId] });
    queryClient.invalidateQueries({ queryKey: ["packages"] });
  }

  function openCreate() {
    setFormName("");
    setFormSections(EMPTY_SECTIONS.map(s => ({ ...s, items: [...s.items] })));
    setMode("create");
  }

  function openEdit() {
    if (!activeRule) return;
    setFormName(activeRule.name);
    setFormSections(
      activeRule.sections.length > 0
        ? activeRule.sections.map(s => ({ title: s.title, items: [...s.items, ""] }))
        : [{ title: "", items: [""] }]
    );
    setMode("edit");
  }

  function openPick() {
    setSelectedRuleId("");
    setMode("pick");
  }

  async function handleUnlink() {
    await assignMutation.mutateAsync(null);
    toast.success("Keterkaitan aturan dilepas. Paket ini akan menggunakan aturan default.");
    setConfirmUnlink(false);
  }

  async function handleAssign() {
    if (!selectedRuleId) return;
    await assignMutation.mutateAsync(selectedRuleId);
    toast.success("Aturan pembatalan dikaitkan ke paket ini");
    setMode(null);
    setSelectedRuleId("");
  }

  const formValid = formName.trim().length > 0 && formSections.some(s => s.title.trim());
  const isSaving = createMutation.isPending || editMutation.isPending || assignMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Aturan Pembatalan
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {activeRule ? (
                <>
                  <Button variant="outline" size="sm" onClick={openEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={openPick}>
                    Ganti
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive"
                    onClick={() => setConfirmUnlink(true)}>
                    <Unlink className="h-3.5 w-3.5 mr-1.5" /> Lepas
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={openPick}>
                    Pilih Aturan
                  </Button>
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Buat Aturan Baru
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loadingAll ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : activeRule ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activeRule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeRule.sections.length} seksi • Aturan khusus paket ini
                  </p>
                </div>
                <Badge className="ml-auto bg-emerald-100 text-emerald-800 border-emerald-200 text-xs shrink-0">
                  Aktif
                </Badge>
              </div>
              <PolicyPreview sections={activeRule.sections} />
            </div>
          ) : defaultRule ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{defaultRule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Aturan default — belum ada aturan khusus untuk paket ini
                  </p>
                </div>
                <Badge className="ml-auto bg-blue-100 text-blue-800 border-blue-200 text-xs shrink-0">
                  Default
                </Badge>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 flex gap-2 items-start">
                <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Paket ini menggunakan aturan default. Klik <strong>Pilih Aturan</strong> atau{" "}
                  <strong>Buat Aturan Baru</strong> untuk mengatur aturan khusus paket ini.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed p-6 text-center space-y-3">
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Belum ada aturan pembatalan</p>
              <p className="text-xs text-muted-foreground">
                Buat atau pilih aturan agar muncul di dokumen booking
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={openPick}>Pilih dari Daftar</Button>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Buat Aturan Baru
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pick Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={mode === "pick"} onOpenChange={open => { if (!open) setMode(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pilih Aturan Pembatalan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Pilih aturan yang akan dikaitkan khusus ke paket <strong>{packageName}</strong>.
            </p>
            {allRules.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Belum ada aturan tersedia. Buat aturan baru terlebih dahulu.
              </div>
            ) : (
              <div className="space-y-2">
                {allRules.map(rule => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 ${
                      selectedRuleId === rule.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className={`mt-1 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      selectedRuleId === rule.id ? "border-primary" : "border-muted-foreground/40"
                    }`}>
                      {selectedRuleId === rule.id && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{rule.name}</p>
                        {rule.is_default && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Star className="h-2.5 w-2.5 mr-1" /> Default
                          </Badge>
                        )}
                        {rule.id === cancellationRuleId && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-xs shrink-0">
                            Terpasang
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rule.sections.length} seksi
                        {rule.package_count !== undefined && ` • digunakan ${rule.package_count} paket`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Batal</Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedRuleId || isSaving}
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Kaitkan Aturan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={mode === "create" || mode === "edit"}
        onOpenChange={open => { if (!open) setMode(null); }}
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
            <SectionBuilder sections={formSections} onChange={setFormSections} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Batal</Button>
            <Button
              disabled={!formValid || isSaving}
              onClick={() => mode === "create" ? createMutation.mutate() : editMutation.mutate()}
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {mode === "create" ? "Buat & Kaitkan" : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Unlink ───────────────────────────────────────────────────── */}
      <AlertDialog open={confirmUnlink} onOpenChange={setConfirmUnlink}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lepas Keterkaitan Aturan?</AlertDialogTitle>
            <AlertDialogDescription>
              Paket ini akan kembali menggunakan aturan pembatalan default. Aturan yang dilepas
              tidak akan dihapus dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} disabled={isSaving}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Ya, Lepas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── PolicyPreview (mini viewer) ─────────────────────────────────────────────

function PolicyPreview({ sections }: { sections: PolicySection[] }) {
  if (!sections?.length) return null;
  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
      {sections.map((s, si) => (
        <div key={si}>
          <p className="text-xs font-semibold">{s.title.toUpperCase()}:</p>
          {s.items.map((item, ii) => (
            <p key={ii} className="text-xs text-muted-foreground pl-3">• {item}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
