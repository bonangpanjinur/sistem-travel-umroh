import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  usePackageLabels,
  useUpsertPackageLabel,
  useDeletePackageLabel,
  getLabelColorClasses,
  type PackageLabel,
} from "@/hooks/usePackageLabels";
import { cn } from "@/lib/utils";

const COLORS = ["amber", "emerald", "red", "rose", "blue", "purple", "primary", "slate"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId?: string | null;
}

export function PackageLabelManagerDialog({ open, onOpenChange, branchId = null }: Props) {
  const { data: labels = [] } = usePackageLabels({ branchId, activeOnly: false });
  const upsert = useUpsertPackageLabel();
  const del = useDeletePackageLabel();

  const [editing, setEditing] = useState<Partial<PackageLabel> | null>(null);

  const startNew = () =>
    setEditing({
      name: "",
      slug: "",
      color: "primary",
      sort_order: labels.length,
      is_active: true,
      branch_id: branchId,
    });

  const save = async () => {
    if (!editing?.name || !editing?.slug || !editing?.color) return;
    await upsert.mutateAsync({
      ...editing,
      slug: editing.slug.trim().toLowerCase().replace(/\s+/g, "_"),
      branch_id: branchId,
    } as any);
    setEditing(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kelola Label Paket</DialogTitle>
          <DialogDescription>
            Buat label kustom (Best Seller, Early Bird, Flash Sale, dll) yang dapat ditempelkan ke paket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {labels.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Badge className={cn("border", getLabelColorClasses(l.color))}>{l.name}</Badge>
                <span className="text-xs text-muted-foreground truncate">
                  slug: {l.slug} · order: {l.sort_order} · {l.is_active ? "aktif" : "nonaktif"}
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditing(l)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => del.mutate(l.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {labels.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              Belum ada label. Tambahkan label baru di bawah.
            </p>
          )}
        </div>

        {editing && (
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <h4 className="text-sm font-semibold">{editing.id ? "Edit Label" : "Label Baru"}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nama</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Best Seller"
                />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="best_seller"
                />
              </div>
              <div>
                <Label className="text-xs">Warna</Label>
                <Select
                  value={editing.color ?? "primary"}
                  onValueChange={(v) => setEditing({ ...editing, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-block h-3 w-3 rounded", getLabelColorClasses(c))} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Urutan</Label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, sort_order: parseInt(e.target.value || "0", 10) })
                  }
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label className="text-xs">Aktif</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button size="sm" onClick={save} disabled={upsert.isPending}>
                Simpan
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {!editing && (
            <Button variant="outline" onClick={startNew}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Label
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}