import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Loader2, Plus, Trash2, Edit2, AlertCircle } from "lucide-react";
import {
  usePackageChangeRules,
  useCreatePackageChangeRule,
  useUpdatePackageChangeRule,
  useDeletePackageChangeRule,
} from "@/hooks/usePackageChangeRules";
import { PackageChangeRule } from "@/types/packageChangeRules";

interface PackageChangeRulesManagerProps {
  packageId: string;
  packageName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PackageChangeRulesManager({
  packageId,
  packageName,
  isOpen,
  onClose,
}: PackageChangeRulesManagerProps) {
  const queryClient = useQueryClient();
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRule, setEditingRule] = useState<PackageChangeRule | null>(null);
  const [formData, setFormData] = useState({
    min_days_before_departure: 60,
    penalty_amount: 0,
    penalty_type: 'fixed' as 'fixed' | 'percentage',
    description: '',
  });

  const { data: rules, isLoading } = usePackageChangeRules(packageId);
  const createMutation = useCreatePackageChangeRule();
  const updateMutation = useUpdatePackageChangeRule();
  const deleteMutation = useDeletePackageChangeRule();

  const handleAddRule = async () => {
    if (formData.min_days_before_departure < 0) {
      toast.error("Hari keberangkatan tidak boleh negatif");
      return;
    }

    if (formData.penalty_amount < 0) {
      toast.error("Denda tidak boleh negatif");
      return;
    }

    try {
      await createMutation.mutateAsync({
        packageId,
        minDaysBeforeDeparture: formData.min_days_before_departure,
        penaltyAmount: formData.penalty_amount,
        penaltyType: formData.penalty_type,
        description: formData.description,
      });
      toast.success("Aturan denda berhasil ditambahkan");
      resetForm();
      setIsAddingRule(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan aturan denda");
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    if (formData.min_days_before_departure < 0) {
      toast.error("Hari keberangkatan tidak boleh negatif");
      return;
    }

    if (formData.penalty_amount < 0) {
      toast.error("Denda tidak boleh negatif");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        ruleId: editingRule.id,
        updates: {
          min_days_before_departure: formData.min_days_before_departure,
          penalty_amount: formData.penalty_amount,
          penalty_type: formData.penalty_type,
          description: formData.description,
        },
      });
      toast.success("Aturan denda berhasil diperbarui");
      resetForm();
      setEditingRule(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal memperbarui aturan denda");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus aturan denda ini?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(ruleId);
      toast.success("Aturan denda berhasil dihapus");
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus aturan denda");
    }
  };

  const handleEditRule = (rule: PackageChangeRule) => {
    setEditingRule(rule);
    setFormData({
      min_days_before_departure: rule.min_days_before_departure,
      penalty_amount: rule.penalty_amount,
      penalty_type: rule.penalty_type,
      description: rule.description || '',
    });
    setIsAddingRule(false);
  };

  const resetForm = () => {
    setFormData({
      min_days_before_departure: 60,
      penalty_amount: 0,
      penalty_type: 'fixed',
      description: '',
    });
    setEditingRule(null);
  };

  const sortedRules = rules
    ? [...rules].sort((a, b) => b.min_days_before_departure - a.min_days_before_departure)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aturan Denda Pindah Paket - {packageName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Box */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Cara Kerja Aturan Denda:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Tentukan jangka waktu H-X (hari sebelum keberangkatan)</li>
                <li>Jika pindah paket kurang dari H-X, akan dikenakan denda sesuai aturan</li>
                <li>Sistem akan memilih aturan dengan H-X tertinggi yang masih berlaku</li>
                <li>Contoh: Jika ada H-60 dan H-30, dan sisa 45 hari, maka H-60 berlaku</li>
              </ul>
            </div>
          </div>

          {/* Rules Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="text-xs font-bold">H-X (Hari)</TableHead>
                  <TableHead className="text-xs font-bold">Denda</TableHead>
                  <TableHead className="text-xs font-bold">Tipe</TableHead>
                  <TableHead className="text-xs font-bold">Keterangan</TableHead>
                  <TableHead className="text-xs font-bold text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : sortedRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Belum ada aturan denda. Tambahkan aturan baru untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-semibold text-sm">
                        H-{rule.min_days_before_departure}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rule.penalty_type === 'fixed'
                          ? formatCurrency(rule.penalty_amount)
                          : `${rule.penalty_amount}%`}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${
                          rule.penalty_type === 'fixed' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}>
                          {rule.penalty_type === 'fixed' ? 'Tetap' : 'Persen'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rule.description || '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRule(rule)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Add/Edit Form */}
          {(isAddingRule || editingRule) && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
              <h3 className="font-semibold text-sm">
                {editingRule ? 'Edit Aturan Denda' : 'Tambah Aturan Denda Baru'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_days" className="text-xs font-bold">
                    H-X (Hari Sebelum Keberangkatan)
                  </Label>
                  <Input
                    id="min_days"
                    type="number"
                    min="0"
                    value={formData.min_days_before_departure}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_days_before_departure: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="60"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Jika pindah paket kurang dari H-X, denda akan berlaku
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penalty_type" className="text-xs font-bold">
                    Tipe Denda
                  </Label>
                  <Select
                    value={formData.penalty_type}
                    onValueChange={(value: 'fixed' | 'percentage') =>
                      setFormData({ ...formData, penalty_type: value })
                    }
                  >
                    <SelectTrigger id="penalty_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Tetap (Rp)</SelectItem>
                      <SelectItem value="percentage">Persen (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="penalty_amount" className="text-xs font-bold">
                  Nominal Denda {formData.penalty_type === 'percentage' ? '(%)' : '(Rp)'}
                </Label>
                <Input
                  id="penalty_amount"
                  type="number"
                  min="0"
                  step={formData.penalty_type === 'percentage' ? '0.1' : '1000'}
                  value={formData.penalty_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      penalty_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder={formData.penalty_type === 'percentage' ? '10' : '500000'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold">
                  Keterangan (Opsional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Contoh: Denda untuk pindah paket kurang dari 60 hari..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsAddingRule(false);
                  }}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={editingRule ? handleUpdateRule : handleAddRule}
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    formData.min_days_before_departure < 0 ||
                    formData.penalty_amount < 0
                  }
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingRule ? 'Perbarui' : 'Tambah'} Aturan
                </Button>
              </div>
            </div>
          )}

          {/* Add Rule Button */}
          {!isAddingRule && !editingRule && (
            <Button
              onClick={() => setIsAddingRule(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Aturan Denda Baru
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
