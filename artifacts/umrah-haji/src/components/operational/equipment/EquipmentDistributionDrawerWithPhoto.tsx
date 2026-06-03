import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, CheckCircle2, Loader2, User, RotateCcw, AlertCircle, Ruler, Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface EquipmentItem {
  id: string;
  name: string;
  description?: string;
  stock_quantity?: number;
  category?: string;
  low_stock_threshold?: number;
  has_sizes?: boolean;
  available_sizes?: string[];
}

interface ChecklistItem {
  equipmentId: string;
  quantity: number;
  size?: string;
  photoUrl?: string;
  photoFile?: File;
}

interface EquipmentDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jamaahId: string;
  jamaahName: string;
  jamaahGender?: string;
  jamaahType?: string;
  departureId: string;
}

export function EquipmentDistributionDialogWithPhoto({
  open, onOpenChange, jamaahId, jamaahName, jamaahGender, jamaahType, departureId,
}: EquipmentDistributionDialogProps) {
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Map<string, ChecklistItem>>(new Map());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showUnsavedReturnsDialog, setShowUnsavedReturnsDialog] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);

  const { data: allEquipmentItems, isLoading: loadingItems } = useQuery({
    queryKey: ["equipment-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_items").select("*").order("name");
      if (error) throw error;
      return data as EquipmentItem[];
    },
  });

  const equipmentItems = useMemo(() => {
    if (!allEquipmentItems) return [];
    return allEquipmentItems.filter(item => {
      const cat = item.category || 'general';
      if (cat === 'general') return true;
      if (cat === 'male_only' && (jamaahGender === 'male' || jamaahGender === 'Laki-laki')) return true;
      if (cat === 'female_only' && (jamaahGender === 'female' || jamaahGender === 'Perempuan')) return true;
      if (cat === 'child_only' && jamaahType === 'child') return true;
      return false;
    });
  }, [allEquipmentItems, jamaahGender, jamaahType]);

  const { data: existingDistributions } = useQuery({
    queryKey: ["customer-distributions", jamaahId, departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_distributions")
        .select("equipment_id, quantity, status, size, distribution_photo_url")
        .eq("customer_id", jamaahId)
        .eq("departure_id", departureId)
        .eq("status", "distributed");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (existingDistributions && existingDistributions.length > 0) {
      const newChecked = new Map<string, ChecklistItem>();
      existingDistributions.forEach((d: any) => {
        newChecked.set(d.equipment_id, { 
          equipmentId: d.equipment_id, 
          quantity: d.quantity || 1, 
          size: d.size ?? undefined,
          photoUrl: d.distribution_photo_url ?? undefined
        });
      });
      setCheckedItems(newChecked);
    } else if (existingDistributions) {
      setCheckedItems(new Map());
    }
  }, [existingDistributions]);

  useEffect(() => {
    if (!open) {
      setShowConfirmDialog(false);
      setShowUnsavedReturnsDialog(false);
      setUploadingPhotoId(null);
      setPreviewPhotoId(null);
    }
  }, [open]);

  const hasUnsavedReturns = useMemo(() => {
    const existingIds = new Set(existingDistributions?.map((d: any) => d.equipment_id) || []);
    return Array.from(existingIds).some(id => !checkedItems.has(id));
  }, [existingDistributions, checkedItems]);

  const handleClose = () => {
    if (hasUnsavedReturns) {
      setShowUnsavedReturnsDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  // Handle photo upload to Supabase Storage
  const handlePhotoUpload = async (equipmentId: string, file: File) => {
    try {
      setUploadingPhotoId(equipmentId);
      
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `distribution-${departureId}-${jamaahId}-${equipmentId}-${timestamp}.jpg`;
      const filepath = `equipment-distributions/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("equipment-photos")
        .upload(filepath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from("equipment-photos")
        .getPublicUrl(filepath);

      const photoUrl = publicData.publicUrl;

      // Update local state
      const newChecked = new Map(checkedItems);
      const existing = newChecked.get(equipmentId);
      if (existing) {
        newChecked.set(equipmentId, { ...existing, photoUrl, photoFile: file });
      }
      setCheckedItems(newChecked);

      toast.success("Foto berhasil diunggah");
    } catch (error: any) {
      toast.error(`Gagal upload foto: ${error.message}`);
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const handlePhotoRemove = (equipmentId: string) => {
    const newChecked = new Map(checkedItems);
    const existing = newChecked.get(equipmentId);
    if (existing) {
      newChecked.set(equipmentId, { ...existing, photoUrl: undefined, photoFile: undefined });
    }
    setCheckedItems(newChecked);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate size requirements before saving
      for (const [id, item] of checkedItems.entries()) {
        const eq = allEquipmentItems?.find(e => e.id === id);
        if (eq?.has_sizes && (eq.available_sizes?.length ?? 0) > 0 && !item.size) {
          throw new Error(`Pilih ukuran untuk: ${eq.name}`);
        }
      }

      const existingIds = new Set(existingDistributions?.map((d: any) => d.equipment_id) || []);
      const newCheckedIds = new Set(checkedItems.keys());
      
      const itemsToAdd = Array.from(newCheckedIds).filter((id) => !existingIds.has(id));
      const itemsToRemove = Array.from(existingIds).filter((id) => !newCheckedIds.has(id));

      // 1. Handle Additions (Atomic)
      if (itemsToAdd.length > 0) {
        const distributions = itemsToAdd.map(id => {
          const item = checkedItems.get(id);
          return {
            equipment_id: id,
            customer_id: jamaahId,
            quantity: item?.quantity || 1,
            ...(item?.size ? { size: item.size } : {}),
            ...(item?.photoUrl ? { distribution_photo_url: item.photoUrl } : {}),
          };
        });

        const { error } = await supabase.rpc('bulk_distribute_equipment', {
          p_departure_id: departureId,
          p_distributions: distributions
        });
        if (error) throw error;
      }

      // 2. Handle Photo Updates for existing distributions
      for (const [id, item] of checkedItems.entries()) {
        if (item.photoUrl && existingIds.has(id)) {
          // Find the distribution record and update photo
          const { data: dist, error: fetchError } = await supabase
            .from("equipment_distributions")
            .select("id")
            .eq("customer_id", jamaahId)
            .eq("departure_id", departureId)
            .eq("equipment_id", id)
            .eq("status", "distributed")
            .single();
          
          if (!fetchError && dist) {
            await supabase
              .from("equipment_distributions")
              .update({ distribution_photo_url: item.photoUrl })
              .eq("id", dist.id);
          }
        }
      }

      // 3. Handle Removals (Atomic Return)
      if (itemsToRemove.length > 0) {
        for (const equipmentId of itemsToRemove) {
          const { data: dist, error: fetchError } = await supabase
            .from("equipment_distributions")
            .select("id, quantity")
            .eq("customer_id", jamaahId)
            .eq("departure_id", departureId)
            .eq("equipment_id", equipmentId)
            .eq("status", "distributed")
            .single();
          
          if (fetchError) throw fetchError;

          const { error: updateError } = await supabase
            .from("equipment_distributions")
            .update({ 
              status: 'returned', 
              returned_at: new Date().toISOString() 
            })
            .eq("id", dist.id);
          
          if (updateError) throw updateError;

          const { error: rpcError } = await supabase.rpc('increment_equipment_stock', {
            item_id: equipmentId,
            amount: dist.quantity || 1
          });
          if (rpcError) throw rpcError;
        }
      }
    },
    onSuccess: () => {
      toast.success(`Perlengkapan ${jamaahName} berhasil diperbarui`);
      queryClient.invalidateQueries({ queryKey: ["equipment-distributions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-items"] });
      queryClient.invalidateQueries({ queryKey: ["customer-distributions", jamaahId, departureId] });
      
      setShowConfirmDialog(false);
      setCheckedItems(new Map());
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
      setShowConfirmDialog(false);
    },
  });

  const handleCheckItem = (id: string) => {
    const item = allEquipmentItems?.find(i => i.id === id);
    const isChecked = checkedItems.has(id);
    
    if (!isChecked && (item?.stock_quantity || 0) <= 0) {
      toast.error(`Stok ${item?.name} habis!`);
      return;
    }

    const newChecked = new Map(checkedItems);
    if (isChecked) {
      newChecked.delete(id);
    } else {
      const defaultSize = item?.has_sizes && item.available_sizes?.length === 1
        ? item.available_sizes[0]
        : undefined;
      newChecked.set(id, { equipmentId: id, quantity: 1, size: defaultSize });
    }
    setCheckedItems(newChecked);
  };

  const handleSizeChange = (id: string, size: string) => {
    const newChecked = new Map(checkedItems);
    const existing = newChecked.get(id);
    if (existing) newChecked.set(id, { ...existing, size });
    setCheckedItems(newChecked);
  };

  const handleSelectAll = () => {
    const newChecked = new Map(checkedItems);
    let skipped = 0;
    
    equipmentItems?.forEach((item) => {
      if (!newChecked.has(item.id)) {
        if ((item.stock_quantity || 0) > 0) {
          newChecked.set(item.id, { equipmentId: item.id, quantity: 1 });
        } else {
          skipped++;
        }
      }
    });
    
    if (skipped > 0) {
      toast.warning(`${skipped} item dilewati karena stok habis`);
    }
    setCheckedItems(newChecked);
  };

  const handleDeselectAll = () => setCheckedItems(new Map());

  const distributedCount = checkedItems.size;
  const totalCount = equipmentItems?.length || 0;
  const progressPercentage = totalCount > 0 ? (distributedCount / totalCount) * 100 : 0;

  const isMale = jamaahGender === 'male' || jamaahGender === 'Laki-laki';
  const isFemale = jamaahGender === 'female' || jamaahGender === 'Perempuan';
  const genderLabel = isMale ? 'Laki-laki' : isFemale ? 'Perempuan' : jamaahType === 'child' ? 'Anak' : '-';
  const genderColor = isMale ? 'text-blue-600 bg-blue-50 border-blue-200' : isFemale ? 'text-pink-600 bg-pink-50 border-pink-200' : 'text-muted-foreground bg-muted';

  if (showConfirmDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Konfirmasi Penyimpanan
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Simpan distribusi <strong>{distributedCount}</strong> item untuk <strong>{jamaahName}</strong>?
            </p>
            
            <div className="p-3 bg-muted rounded-md text-sm space-y-1 max-h-[300px] overflow-y-auto">
              {Array.from(checkedItems.entries()).map(([eqId, ci]) => {
                const eq = allEquipmentItems?.find(e => e.id === eqId);
                const isNew = !existingDistributions?.some(d => d.equipment_id === eqId);
                return (
                  <p key={eqId} className="flex items-center justify-between gap-2">
                    <span>
                      • {eq?.name}{ci.size ? <span className="text-muted-foreground ml-1">({ci.size})</span> : null}
                      {ci.photoUrl && <Camera className="h-3 w-3 ml-1 text-blue-600 inline" />}
                    </span>
                    {isNew && <Badge className="text-[10px] h-4 bg-green-100 text-green-700 border-green-200">Baru</Badge>}
                  </p>
                );
              })}
              {existingDistributions?.filter(d => !checkedItems.has(d.equipment_id)).map(d => {
                const eq = allEquipmentItems?.find(e => e.id === d.equipment_id);
                return (
                  <p key={d.equipment_id} className="flex items-center justify-between text-destructive">
                    <span>• {eq?.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 text-destructive border-destructive/30 flex gap-1">
                      <RotateCcw className="h-2 w-2" /> Retur
                    </Badge>
                  </p>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...</>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        {/* Unsaved Returns Confirmation Modal */}
        <Dialog open={showUnsavedReturnsDialog} onOpenChange={setShowUnsavedReturnsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-destructive" />
                Konfirmasi Pengembalian
              </DialogTitle>
              <DialogDescription>
                Anda telah menghapus centang pada beberapa item. Apakah Anda ingin menyimpan perubahan ini sebagai pengembalian (retur)?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm space-y-1 max-h-[200px] overflow-y-auto">
                <p className="font-semibold text-destructive mb-2">Item yang akan dikembalikan:</p>
                {existingDistributions?.filter(d => !checkedItems.has(d.equipment_id)).map(d => {
                  const eq = allEquipmentItems?.find(e => e.id === d.equipment_id);
                  return (
                    <p key={d.equipment_id} className="flex items-center justify-between text-destructive">
                      <span>• {eq?.name}</span>
                    </p>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Tutup Tanpa Simpan
              </Button>
              <Button 
                variant="destructive"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...</>
                ) : (
                  'Ya, Simpan Retur'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Photo Preview Modal */}
        {previewPhotoId && (
          <Dialog open={!!previewPhotoId} onOpenChange={() => setPreviewPhotoId(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Preview Foto Bukti</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center">
                {checkedItems.get(previewPhotoId)?.photoUrl && (
                  <img 
                    src={checkedItems.get(previewPhotoId)?.photoUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-[500px] rounded-lg"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="p-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-lg">Detail Perlengkapan Jamaah + Foto Bukti</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${genderColor}`}>
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">{jamaahName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${genderColor}`}>{genderLabel}</Badge>
                {jamaahType === 'child' && <Badge variant="outline" className="text-xs">Anak</Badge>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{distributedCount}/{totalCount}</p>
              <p className="text-xs text-muted-foreground">{Math.round(progressPercentage)}% selesai</p>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2 mt-3" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {loadingItems ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : equipmentItems && equipmentItems.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Checklist Perlengkapan + Foto Bukti</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={distributedCount === totalCount}>
                    Pilih Semua
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={distributedCount === 0}>
                    Hapus Semua
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {equipmentItems.map((item) => {
                  const isChecked = checkedItems.has(item.id);
                  const checkedItem = checkedItems.get(item.id);
                  const stock = item.stock_quantity || 0;
                  const threshold = item.low_stock_threshold || 5;
                  const needsSize = item.has_sizes && (item.available_sizes?.length ?? 0) > 0;
                  const missingSize = isChecked && needsSize && !checkedItem?.size;
                  const hasPhoto = isChecked && checkedItem?.photoUrl;
                  const isUploading = uploadingPhotoId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border transition-all ${
                        isChecked
                          ? missingSize
                            ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/20'
                            : 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700'
                          : stock === 0
                            ? 'bg-muted/50 opacity-70'
                            : 'hover:border-primary/50'
                      }`}
                    >
                      <div
                        onClick={() => handleCheckItem(item.id)}
                        className={`flex items-center gap-3 p-3 ${stock === 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <Checkbox checked={isChecked} className="h-5 w-5 pointer-events-none" />
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {needsSize && (
                            <Badge variant="outline" className="text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50">
                              <Ruler className="h-2.5 w-2.5" /> Ukuran
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              stock === 0 ? 'bg-red-50 text-red-700 border-red-200' :
                              stock <= threshold ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-green-50 text-green-700 border-green-200'
                            }`}
                          >
                            Stok: {stock}
                          </Badge>
                          {isChecked && !missingSize && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                        </div>
                      </div>

                      {isChecked && (
                        <div className="px-3 pb-3 space-y-2 border-t pt-2">
                          {needsSize && (
                            <div className="flex items-center gap-2">
                              <Ruler className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground">Pilih ukuran:</span>
                              <Select
                                value={checkedItem?.size ?? ""}
                                onValueChange={(v) => handleSizeChange(item.id, v)}
                              >
                                <SelectTrigger
                                  className={`h-7 text-xs flex-1 max-w-[160px] ${missingSize ? 'border-amber-400' : ''}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SelectValue placeholder={missingSize ? "⚠ Pilih ukuran..." : "Pilih..."} />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.available_sizes?.map((s) => (
                                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {checkedItem?.size && (
                                <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                  {checkedItem.size}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Photo Upload Section */}
                          <div className="flex items-center gap-2">
                            <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">Foto bukti serah terima:</span>
                            <div className="flex gap-1 flex-1">
                              {hasPhoto ? (
                                <>
                                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200 gap-1 cursor-pointer hover:bg-green-200" onClick={() => setPreviewPhotoId(item.id)}>
                                    <Camera className="h-2.5 w-2.5" /> Foto Ada
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handlePhotoRemove(item.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <label className="flex items-center gap-1 px-2 py-1 rounded border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer text-xs text-blue-700 transition-colors">
                                  <Upload className="h-3 w-3" />
                                  {isUploading ? "Uploading..." : "Upload Foto"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handlePhotoUpload(item.id, file);
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Tidak ada perlengkapan yang sesuai</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>Tutup</Button>
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...</>
            ) : (
              'Simpan Distribusi'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
