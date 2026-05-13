import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  usePackageLabels,
  usePackageLabelsForPackage,
  useAssignPackageLabels,
  getLabelColorClasses,
} from "@/hooks/usePackageLabels";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packageId: string | null;
  packageName?: string;
  branchId?: string | null;
}

export function PackageLabelAssignDialog({
  open,
  onOpenChange,
  packageId,
  packageName,
  branchId = null,
}: Props) {
  const { data: labels = [] } = usePackageLabels({ branchId, activeOnly: true });
  const { data: current = [] } = usePackageLabelsForPackage(packageId ?? undefined);
  const assign = useAssignPackageLabels();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(current.map((l) => l.id)));
  }, [current, packageId, open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const save = async () => {
    if (!packageId) return;
    await assign.mutateAsync({ packageId, labelIds: Array.from(selected) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur Label Paket</DialogTitle>
          <DialogDescription>
            Pilih label yang ingin ditampilkan pada {packageName ?? "paket ini"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {labels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Belum ada label tersedia. Buat di "Kelola Label" dulu.
            </p>
          )}
          {labels.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50"
            >
              <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
              <Badge className={cn("border", getLabelColorClasses(l.color))}>{l.name}</Badge>
              {l.description && (
                <span className="text-xs text-muted-foreground">{l.description}</span>
              )}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={save} disabled={assign.isPending || !packageId}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}