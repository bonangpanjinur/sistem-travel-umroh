import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackageTypeForm } from "@/components/admin/forms/PackageTypeForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, Settings2, Info } from "lucide-react";
import { toast } from "sonner";
import { getBookingModeLabel, getBookingModeBadgeColor } from "@/lib/format";

const BOOKING_MODE_HINTS: Record<string, string> = {
  umroh: "Wizard: pilih kamar Quad/Triple/Double/Single",
  haji: "Wizard: harga per orang, tanpa alokasi kamar",
  wisata: "Wizard: Twin/Double + surcharge solo traveler",
};

export default function AdminPackageTypes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: packageTypes, isLoading } = useQuery({
    queryKey: ["admin-package-types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("package_types")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("package_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipe paket berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-package-types"] });
      queryClient.invalidateQueries({ queryKey: ["package-types"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus tipe paket");
    },
  });

  const filtered = (packageTypes || []).filter((t: any) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMode = filterMode === "all" || t.booking_mode === filterMode;
    return matchSearch && matchMode;
  });

  const handleDelete = (type: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus tipe paket "${type.name}"?`)) {
      deleteMutation.mutate(type.id);
    }
  };

  const modeCounts = {
    umroh: (packageTypes || []).filter((t: any) => t.booking_mode === "umroh").length,
    haji: (packageTypes || []).filter((t: any) => t.booking_mode === "haji").length,
    wisata: (packageTypes || []).filter((t: any) => t.booking_mode === "wisata").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tipe Paket</h1>
          <p className="text-muted-foreground">
            Kelola tipe paket — mode booking menentukan alur wizard dan model harga
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari tipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-56"
            />
          </div>
          <Button onClick={() => { setEditingType(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Tipe
          </Button>
        </div>
      </div>

      {/* Mode summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {(["all", "umroh", "haji", "wisata"] as const).filter(m => m !== "all").map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(filterMode === mode ? "all" : mode)}
            className={`rounded-lg border p-3 text-left transition-all ${
              filterMode === mode ? "ring-2 ring-primary" : "hover:bg-muted/50"
            }`}
          >
            <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mb-1 ${getBookingModeBadgeColor(mode)}`}>
              {getBookingModeLabel(mode)}
            </div>
            <div className="text-2xl font-bold">{modeCounts[mode]}</div>
            <div className="text-xs text-muted-foreground">{BOOKING_MODE_HINTS[mode]}</div>
          </button>
        ))}
      </div>

      {filterMode !== "all" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          Filter aktif: mode <strong>{getBookingModeLabel(filterMode)}</strong>
          <button className="underline" onClick={() => setFilterMode("all")}>Hapus filter</button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Daftar Tipe Paket
          </CardTitle>
          <CardDescription>
            Tipe paket yang aktif akan muncul sebagai pilihan saat membuat paket baru.
            Kolom <strong>Mode Booking</strong> menentukan alur wizard dan model harga.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Urutan</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Tipe</TableHead>
                <TableHead>Mode Booking</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Tidak ada data ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((type: any) => (
                  <TableRow key={type.id}>
                    <TableCell className="text-center">{type.display_order}</TableCell>
                    <TableCell className="font-mono text-xs">{type.code}</TableCell>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getBookingModeBadgeColor(type.booking_mode || "umroh")}`}
                      >
                        {getBookingModeLabel(type.booking_mode || "umroh")}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {type.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingType(type); setIsFormOpen(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(type)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit" : "Tambah"} Tipe Paket</DialogTitle>
          </DialogHeader>
          <PackageTypeForm
            packageTypeData={editingType}
            onSuccess={() => setIsFormOpen(false)}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
