/**
 * PackageCancellationPolicyCard.tsx
 * Card yang tampil di halaman detail paket (AdminPackageDetail).
 * Mengelola aturan pembatalan yang terkait dengan satu paket:
 *   - Tampilkan aturan aktif (khusus paket atau global/fallback)
 *   - Pilih aturan yang sudah ada dari daftar
 *   - Buat aturan baru khusus paket ini
 *   - Edit aturan yang sudah ada (jika spesifik paket ini)
 *   - Lepas keterkaitan aturan
 *   - Pratinjau PDF
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Pencil, Unlink, Globe, FileText, Loader2,
  CheckCircle2, ChevronDown, ChevronUp, X, GripVertical, Info,
} from "lucide-react";
import {
  generateTransactionForm,
  DEFAULT_TEMPLATE,
} from "@/lib/transaction-form-generator";

interface PolicySection { title: string; items: string[] }
interface Policy {
  id: string;
  name: string;
  is_global: boolean;
  package_id: string | null;
  sections: PolicySection[];
  package?: { name: string } | null;
}

interface PackageCancellationPolicyCardProps {
  packageId: string;
  packageName?: string;
}

const EMPTY_SECTIONS: PolicySection[] = [
  { title: "PEMBAYARAN", items: [""] },
  { title: "PEMBATALAN", items: [""] },
  { title: "PINDAH PAKET, PINDAH TANGGAL, GANTI NAMA", items: [""] },
];

// ─── Inline Section Builder ────────────────────────────────────────────────────

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
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" type="button" onClick={() => moveSection(si, -1)} disabled={si === 0}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" type="button" onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {sections.length > 1 && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" type="button" onClick={() => removeSection(si)}>
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
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(si); } }}
                />
                {section.items.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" type="button" onClick={() => removeItem(si, ii)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground pl-4" type="button" onClick={() => addItem(si)}>
              <Plus className="h-3 w-3 mr-1" /> Tambah poin
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PackageCancellationPolicyCard({ packageId, packageName }: PackageCancellationPolicyCardProps) {
  const queryClient = useQueryClient();

  // Dialog modes: null | "pick" | "create" | "edit"
  const [mode, setMode] = useState<null | "pick" | "create" | "edit">(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form state for create/edit
  const [formName, setFormName] = useState("");
  const [formSections, setFormSections] = useState<PolicySection[]>(EMPTY_SECTIONS);

  // Pick state
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");

  // ── Queries ─────────────────────────────────────────────────────────────────

  /** Policy directly linked to this package */
  const { data: ownPolicy, isLoading: ownLoading } = useQuery<Policy | null>({
    queryKey: ["cancellation-policy-own", packageId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cancellation_policies")
        .select("*")
        .eq("package_id", packageId)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!packageId,
  });

  /** Global fallback policy */
  const { data: globalPolicy } = useQuery<Policy | null>({
    queryKey: ["cancellation-policy-global"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cancellation_policies")
        .select("*")
        .eq("is_global", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  /** All policies for the pick list */
  const { data: allPolicies = [] } = useQuery<Policy[]>({
    queryKey: ["cancellation-policies"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cancellation_policies")
        .select("*, package:packages(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const activePolicy = ownPolicy ?? null;
  const fallbackPolicy = !ownPolicy ? globalPolicy : null;

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName.trim(),
        is_global: false,
        package_id: packageId,
        sections: formSections.map(s => ({
          title: s.title.trim(),
          items: s.items.filter(i => i.trim() !== ""),
        })).filter(s => s.title),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("cancellation_policies")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aturan pembatalan berhasil dibuat dan dikaitkan ke paket ini");
      invalidate();
      setMode(null);
    },
    onError: (e: any) => toast.error(e.message || "Gagal membuat aturan"),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!ownPolicy) return;
      const payload = {
        name: formName.trim(),
        sections: formSections.map(s => ({
          title: s.title.trim(),
          items: s.items.filter(i => i.trim() !== ""),
        })).filter(s => s.title),
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("cancellation_policies")
        .update(payload)
        .eq("id", ownPolicy.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aturan pembatalan diperbarui");
      invalidate();
      setMode(null);
    },
    onError: (e: any) => toast.error(e.message || "Gagal memperbarui aturan"),
  });

  /** Assign an existing policy to this package */
  const assignMutation = useMutation({
    mutationFn: async (policyId: string) => {
      // First unlink any existing package-specific policy for this package
      if (ownPolicy) {
        await (supabase as any)
          .from("cancellation_policies")
          .update({ package_id: null, updated_at: new Date().toISOString() })
          .eq("id", ownPolicy.id);
      }
      // Link the selected policy to this package
      const { error } = await (supabase as any)
        .from("cancellation_policies")
        .update({ package_id: packageId, is_global: false, updated_at: new Date().toISOString() })
        .eq("id", policyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aturan pembatalan berhasil dikaitkan ke paket ini");
      invalidate();
      setMode(null);
      setSelectedPolicyId("");
    },
    onError: (e: any) => toast.error(e.message || "Gagal mengaitkan aturan"),
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!ownPolicy) return;
      const { error } = await (supabase as any)
        .from("cancellation_policies")
        .update({ package_id: null, updated_at: new Date().toISOString() })
        .eq("id", ownPolicy.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Keterkaitan aturan dilepas. Paket ini akan menggunakan aturan global.");
      invalidate();
      setConfirmUnlink(false);
    },
    onError: (e: any) => toast.error(e.message || "Gagal melepas keterkaitan"),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["cancellation-policy-own", packageId] });
    queryClient.invalidateQueries({ queryKey: ["cancellation-policy-global"] });
    queryClient.invalidateQueries({ queryKey: ["cancellation-policies"] });
    queryClient.invalidateQueries({ queryKey: ["cancellation-policy-for-booking"] });
  }

  function openCreate() {
    setFormName("");
    setFormSections(EMPTY_SECTIONS.map(s => ({ ...s, items: [...s.items] })));
    setMode("create");
  }

  function openEdit() {
    if (!ownPolicy) return;
    setFormName(ownPolicy.name);
    setFormSections(
      ownPolicy.sections.length > 0
        ? ownPolicy.sections.map(s => ({ title: s.title, items: [...s.items, ""] }))
        : [{ title: "", items: [""] }]
    );
    setMode("edit");
  }

  function openPick() {
    setSelectedPolicyId("");
    setMode("pick");
  }

  async function handlePreview(policy: Policy) {
    setPreviewLoading(true);
    try {
      const now = new Date();
      const dep = new Date(now); dep.setMonth(dep.getMonth() + 3);
      const ret = new Date(dep); ret.setDate(ret.getDate() + 9);

      const doc = await generateTransactionForm(
        {
          transactionCode: "TRA-PREVIEW",
          customerCode: "JMH-PREVIEW",
          transactionDate: now,
          customerName: "CONTOH JAMAAH",
          customerAddress: "Jl. Contoh No. 1, Jakarta",
          customerPhone: "08123456789",
          packageName: packageName ?? "NAMA PAKET",
          packageType: "UMRAH 9 HARI",
          umrahSeason: "1448 H",
          programDays: "9 HARI",
          departureDate: dep,
          returnDate: ret,
          hotelMakkah: "Hotel Contoh Makkah ★★★★",
          hotelMadinah: "Hotel Contoh Madinah ★★★★",
          airline: "Maskapai Contoh",
          airport: "Soekarno-Hatta (CGK)",
          roomCombinations: [{ roomType: "Triple", pricePerPax: 29500000, paxCount: 1, roomCount: 1 }],
          totalPrice: 29500000,
          passengers: [{
            name: "CONTOH JAMAAH", roomType: "Triple",
            basePrice: 29500000, discount: 0, totalBill: 29500000,
          }],
        },
        { name: "VINSTOUR TRAVEL", address: "Jl. Travel Islami No. 99, Jakarta", phone: "(021) 99999999", email: "info@vinstour.id" },
        { ...DEFAULT_TEMPLATE, cancellationPolicy: { id: policy.id, name: policy.name, sections: policy.sections } }
      );
      doc.output("dataurlnewwindow");
    } catch (e: any) {
      toast.error("Gagal membuat pratinjau: " + (e?.message ?? "error"));
    } finally {
      setPreviewLoading(false);
    }
  }

  const formValid = formName.trim().length > 0 && formSections.some(s => s.title.trim());

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Aturan Pembatalan
            </CardTitle>
            <div className="flex gap-2">
              {activePolicy && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handlePreview(activePolicy)} disabled={previewLoading}>
                    {previewLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1.5" />}
                    Pratinjau
                  </Button>
                  <Button variant="outline" size="sm" onClick={openEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={openPick}>
                    Ganti
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmUnlink(true)}>
                    <Unlink className="h-3.5 w-3.5 mr-1.5" />
                    Lepas
                  </Button>
                </>
              )}
              {!activePolicy && (
                <>
                  <Button variant="outline" size="sm" onClick={openPick}>
                    Pilih Aturan
                  </Button>
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Buat Aturan Baru
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {ownLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : activePolicy ? (
            /* ── Own policy linked ──────────────────────────────── */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{activePolicy.name}</p>
                  <p className="text-xs text-muted-foreground">{activePolicy.sections.length} seksi • Aturan khusus paket ini</p>
                </div>
                <Badge className="ml-auto bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Aktif</Badge>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {activePolicy.sections.map((s, si) => (
                  <div key={si}>
                    <p className="text-xs font-semibold">{s.title.toUpperCase()}:</p>
                    {s.items.map((item, ii) => (
                      <p key={ii} className="text-xs text-muted-foreground pl-3">• {item}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : fallbackPolicy ? (
            /* ── Global fallback ────────────────────────────────── */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{fallbackPolicy.name}</p>
                  <p className="text-xs text-muted-foreground">Aturan global (fallback) — belum ada aturan khusus untuk paket ini</p>
                </div>
                <Badge className="ml-auto bg-blue-100 text-blue-800 border-blue-200 text-xs">Global</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handlePreview(fallbackPolicy)} disabled={previewLoading}>
                  {previewLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
                  Pratinjau aturan global
                </Button>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 flex gap-2 items-start">
                <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Paket ini belum memiliki aturan khusus. Klik <strong>Buat Aturan Baru</strong> untuk membuat aturan spesifik, atau <strong>Pilih Aturan</strong> untuk mengaitkan aturan yang sudah ada.
                </p>
              </div>
            </div>
          ) : (
            /* ── No policy at all ───────────────────────────────── */
            <div className="rounded-lg border-2 border-dashed p-6 text-center space-y-3">
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Belum ada aturan pembatalan untuk paket ini</p>
              <p className="text-xs text-muted-foreground">Aturan akan otomatis muncul di Form Transaksi PDF saat booking dicetak</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={openPick}>Pilih dari Daftar</Button>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Buat Aturan Baru
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pick Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={mode === "pick"} onOpenChange={open => { if (!open) setMode(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pilih Aturan Pembatalan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Pilih aturan yang akan dikaitkan khusus ke paket ini.</p>
            {allPolicies.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Belum ada aturan tersedia. Buat aturan baru terlebih dahulu.
              </div>
            ) : (
              <div className="space-y-2">
                {allPolicies.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPolicyId(p.id)}
                    className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 ${selectedPolicyId === p.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className={`mt-1 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selectedPolicyId === p.id ? "border-primary" : "border-muted-foreground/40"}`}>
                      {selectedPolicyId === p.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        {p.is_global && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Globe className="h-2.5 w-2.5 mr-1" />Global
                          </Badge>
                        )}
                        {p.package_id === packageId && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs shrink-0">Saat ini</Badge>
                        )}
                        {p.package_id && p.package_id !== packageId && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {p.package?.name ?? "Paket lain"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.sections.length} seksi</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Batal</Button>
            <Button
              disabled={!selectedPolicyId || assignMutation.isPending}
              onClick={() => assignMutation.mutate(selectedPolicyId)}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaitkan ke Paket Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={mode === "create" || mode === "edit"} onOpenChange={open => { if (!open) setMode(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Edit Aturan Pembatalan" : "Buat Aturan Pembatalan Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {mode === "create" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 flex gap-2 items-start">
                <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Aturan ini akan otomatis dikaitkan khusus ke paket <strong>{packageName}</strong>. Aturan ini akan diprioritaskan di atas aturan global.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nama Aturan *</Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Syarat & Ketentuan 1448 H"
              />
            </div>
            <Separator />
            <SectionBuilder sections={formSections} onChange={setFormSections} />
            {formName && formSections.some(s => s.title) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm">Pratinjau</Label>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 font-mono text-xs space-y-2 max-h-44 overflow-y-auto border">
                    <p className="font-bold">{formName.toUpperCase()}</p>
                    {formSections.filter(s => s.title).map((s, si) => (
                      <div key={si}>
                        <p className="font-bold text-primary">{s.title.toUpperCase()}:</p>
                        {s.items.filter(i => i.trim()).map((item, ii) => (
                          <p key={ii} className="pl-4 text-muted-foreground">• {item}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Batal</Button>
            <Button
              disabled={!formValid || createMutation.isPending || editMutation.isPending}
              onClick={() => mode === "edit" ? editMutation.mutate() : createMutation.mutate()}
            >
              {(createMutation.isPending || editMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "edit" ? "Simpan Perubahan" : "Buat & Kaitkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Unlink Confirmation ───────────────────────────────────────────────── */}
      <AlertDialog open={confirmUnlink} onOpenChange={setConfirmUnlink}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lepas Aturan Pembatalan?</AlertDialogTitle>
            <AlertDialogDescription>
              Aturan <strong>{ownPolicy?.name}</strong> akan dilepas dari paket ini. Paket akan menggunakan aturan global (jika tersedia). Aturan itu sendiri tidak akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => unlinkMutation.mutate()} className="bg-destructive text-destructive-foreground">
              Lepas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
