import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

interface Mahram {
  id: string;
  mahram_name: string;
  mahram_relation: string;
  mahram_customer_id?: string | null;
  notes?: string | null;
  created_at: string;
}

const MAHRAM_RELATIONS = [
  { value: "suami", label: "Suami" },
  { value: "istri", label: "Istri" },
  { value: "ayah", label: "Ayah" },
  { value: "ibu", label: "Ibu" },
  { value: "anak", label: "Anak" },
  { value: "saudara", label: "Saudara Kandung" },
  { value: "paman", label: "Paman" },
  { value: "kakek", label: "Kakek" },
  { value: "nenek", label: "Nenek" },
  { value: "cucu", label: "Cucu" },
];

const RELATION_ICONS: Record<string, string> = {
  suami: "💍",
  istri: "💍",
  ayah: "👨",
  ibu: "👩",
  anak: "👶",
  saudara: "👥",
  paman: "👨‍🦱",
  kakek: "👴",
  nenek: "👵",
  cucu: "👶",
};

export default function MahramForm() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMahram, setNewMahram] = useState({
    mahram_name: "",
    mahram_relation: "",
    notes: "",
  });

  // Fetch customer data
  const { data: customer } = useQuery({
    queryKey: ["customer-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch mahrams for this customer
  const { data: mahrams, isLoading: mahramsLoading } = useQuery({
    queryKey: ["customer-mahrams", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("customer_mahrams")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Mahram[];
    },
    enabled: !!customer?.id,
  });

  // Add mahram mutation
  const addMahramMutation = useMutation({
    mutationFn: async (mahram: typeof newMahram) => {
      if (!customer?.id) throw new Error("Customer not found");

      const { error } = await supabase
        .from("customer_mahrams")
        .insert({
          customer_id: customer.id,
          mahram_name: mahram.mahram_name,
          mahram_relation: mahram.mahram_relation,
          notes: mahram.notes || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Mahram berhasil ditambahkan",
      });
      queryClient.invalidateQueries({ queryKey: ["customer-mahrams"] });
      setNewMahram({ mahram_name: "", mahram_relation: "", notes: "" });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal menambahkan mahram",
        variant: "destructive",
      });
    },
  });

  // Delete mahram mutation
  const deleteMahramMutation = useMutation({
    mutationFn: async (mahramId: string) => {
      const { error } = await supabase
        .from("customer_mahrams")
        .delete()
        .eq("id", mahramId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Mahram berhasil dihapus",
      });
      queryClient.invalidateQueries({ queryKey: ["customer-mahrams"] });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal menghapus mahram",
        variant: "destructive",
      });
    },
  });

  const handleAddMahram = () => {
    if (!newMahram.mahram_name || !newMahram.mahram_relation) {
      toast({
        title: "Validasi",
        description: "Nama dan hubungan mahram harus diisi",
        variant: "destructive",
      });
      return;
    }
    addMahramMutation.mutate(newMahram);
  };

  const getRelationLabel = (value: string) => {
    return MAHRAM_RELATIONS.find((r) => r.value === value)?.label || value;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Manajemen Mahram
        </CardTitle>
        <CardDescription>
          Kelola daftar mahram Anda. Mahram adalah keluarga yang tidak boleh
          dinikahi menurut syariat Islam.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Information Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Mahram adalah orang yang haram dinikahi karena hubungan keluarga
            (nasab, persusuan, atau pernikahan). Untuk jamaah wanita, mahram
            sangat penting untuk perjalanan umrah.
          </AlertDescription>
        </Alert>

        {/* Mahrams List */}
        {mahramsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : mahrams && mahrams.length > 0 ? (
          <div className="grid gap-3">
            {mahrams.map((mahram) => (
              <div
                key={mahram.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {RELATION_ICONS[mahram.mahram_relation] || "👤"}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">
                        {mahram.mahram_name}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {getRelationLabel(mahram.mahram_relation)}
                      </Badge>
                    </div>
                  </div>
                  {mahram.notes && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {mahram.notes}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMahramMutation.mutate(mahram.id)}
                  disabled={deleteMahramMutation.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deleteMahramMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Heart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Belum ada mahram yang terdaftar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tambahkan mahram untuk melengkapi profil Anda
            </p>
          </div>
        )}

        {/* Add Button */}
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="w-full sm:w-auto"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Mahram
        </Button>

        {/* Add Mahram Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Mahram Baru</DialogTitle>
              <DialogDescription>
                Lengkapi informasi mahram Anda di bawah ini
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mahram_name">Nama Mahram *</Label>
                <Input
                  id="mahram_name"
                  placeholder="Nama lengkap mahram"
                  value={newMahram.mahram_name}
                  onChange={(e) =>
                    setNewMahram((p) => ({
                      ...p,
                      mahram_name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mahram_relation">Hubungan *</Label>
                <Select
                  value={newMahram.mahram_relation}
                  onValueChange={(value) =>
                    setNewMahram((p) => ({
                      ...p,
                      mahram_relation: value,
                    }))
                  }
                >
                  <SelectTrigger id="mahram_relation">
                    <SelectValue placeholder="Pilih hubungan" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAHRAM_RELATIONS.map((relation) => (
                      <SelectItem key={relation.value} value={relation.value}>
                        {relation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Mis: Nomor telepon, alamat, atau keterangan tambahan"
                  rows={3}
                  value={newMahram.notes}
                  onChange={(e) =>
                    setNewMahram((p) => ({
                      ...p,
                      notes: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                onClick={handleAddMahram}
                disabled={
                  addMahramMutation.isPending ||
                  !newMahram.mahram_name ||
                  !newMahram.mahram_relation
                }
              >
                {addMahramMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Tambah Mahram
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
