import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BranchForm } from "@/components/admin/forms/BranchForm";
import { Search, Plus, Edit, Trash2, Building2, MapPin, Phone, Mail, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminBranches() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [websiteBranch, setWebsiteBranch] = useState<any>(null);
  const [deletingBranch, setDeletingBranch] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branches").delete().eq("id", id);
      if (error) {
        if (error.message?.includes('violates foreign key constraint') || error.code === '23503') {
          throw new Error('Cabang tidak bisa dihapus karena masih memiliki data terkait.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cabang berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-branches"] });
      setDeletingBranch(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus cabang");
    },
  });

  const filtered = branches?.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari cabang..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => { setEditingBranch(null); setIsFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Tambah Cabang
        </Button>
      </div>

      {!filtered?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{searchTerm ? "Tidak ada hasil" : "Belum ada cabang"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(branch => (
            <Card key={branch.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{branch.code}</p>
                    <h3 className="font-semibold">{branch.name}</h3>
                  </div>
                  <Badge variant={branch.is_active ? "default" : "secondary"}>
                    {branch.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  {branch.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{branch.city}{branch.province ? `, ${branch.province}` : ""}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{branch.email}</span>
                    </div>
                  )}
                  {branch.slug && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      <span className="font-mono text-xs text-primary">/b/{branch.slug}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingBranch(branch); setIsFormOpen(true); }}>
                    <Edit className="h-4 w-4 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setWebsiteBranch(branch)} disabled={!branch.slug}>
                    <Globe className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeletingBranch(branch)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit" : "Tambah"} Cabang</DialogTitle>
          </DialogHeader>
          <BranchForm branchData={editingBranch} onSuccess={() => setIsFormOpen(false)} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {websiteBranch && (
        <BranchWebsiteDialog
          branch={websiteBranch}
          open={!!websiteBranch}
          onOpenChange={(open) => !open && setWebsiteBranch(null)}
        />
      )}

      <AlertDialog open={!!deletingBranch} onOpenChange={(open) => !open && setDeletingBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Cabang?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menghapus cabang "{deletingBranch?.name}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingBranch && deleteMutation.mutate(deletingBranch.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// === Branch Website Settings Dialog ===
function BranchWebsiteDialog({ branch, open, onOpenChange }: { branch: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ["branch-website-settings", branch.id],
    enabled: open,
    queryFn: async () => {
      // Try to find existing settings
      const { data, error } = await supabase
        .from("website_settings")
        .select("*")
        .eq("branch_id", branch.id)
        .maybeSingle();
      if (error) throw error;
      
      if (data) return data;

      // Auto-create if not exists
      const { data: newData, error: insertError } = await supabase
        .from("website_settings")
        .insert({
          branch_id: branch.id,
          company_name: branch.name,
          tagline: `Website Cabang ${branch.name}`,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      return newData;
    },
  });

  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Sync form when settings load
  const currentSettings = {
    company_name: formValues.company_name ?? settings?.company_name ?? "",
    tagline: formValues.tagline ?? settings?.tagline ?? "",
    logo_url: formValues.logo_url ?? settings?.logo_url ?? "",
    hero_title: formValues.hero_title ?? settings?.hero_title ?? "",
    hero_subtitle: formValues.hero_subtitle ?? settings?.hero_subtitle ?? "",
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.id) return;
      const { error } = await supabase
        .from("website_settings")
        .update({
          company_name: currentSettings.company_name,
          tagline: currentSettings.tagline,
          logo_url: currentSettings.logo_url || null,
          hero_title: currentSettings.hero_title || null,
          hero_subtitle: currentSettings.hero_subtitle || null,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-website-settings", branch.id] });
      toast.success("Pengaturan website cabang disimpan");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateField = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website Cabang: {branch.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              URL: <span className="font-mono text-primary">{window.location.origin}/b/{branch.slug}</span>
            </p>

            <div className="space-y-2">
              <Label>Nama Perusahaan / Cabang</Label>
              <Input
                value={currentSettings.company_name}
                onChange={e => updateField("company_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={currentSettings.tagline}
                onChange={e => updateField("tagline", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL Logo</Label>
              <Input
                value={currentSettings.logo_url}
                onChange={e => updateField("logo_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Judul Hero</Label>
              <Input
                value={currentSettings.hero_title}
                onChange={e => updateField("hero_title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle Hero</Label>
              <Input
                value={currentSettings.hero_subtitle}
                onChange={e => updateField("hero_subtitle", e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
