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
import AddBranchDialog from "@/components/admin/AddBranchDialog";
import ResetPasswordDialog from "@/components/admin/ResetPasswordDialog";
import { Link } from "react-router-dom";
import { Search, Plus, Edit, Trash2, Building2, MapPin, Phone, Mail, Globe, Loader2, KeyRound, UserCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function AdminBranches() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [websiteBranch, setWebsiteBranch] = useState<any>(null);
  const [deletingBranch, setDeletingBranch] = useState<any>(null);
  const [resetPasswordBranch, setResetPasswordBranch] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*, profiles:manager_user_id(full_name, email, phone, id)")
        .order("name");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari cabang..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
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
          {filtered.map(branch => {
            const manager = (branch as any).profiles;
            return (
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
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span>{branch.city}{branch.province ? `, ${branch.province}` : ""}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                    {branch.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{branch.email}</span>
                      </div>
                    )}
                    {branch.slug && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="font-mono text-xs text-primary">/b/{branch.slug}</span>
                      </div>
                    )}
                  </div>

                  {manager ? (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                      <UserCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <span className="truncate">
                        <span className="text-foreground font-medium">{manager.full_name || "Manager"}</span>
                        {manager.email && <span className="ml-1">· {manager.email}</span>}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t text-xs text-amber-600 flex items-center gap-1">
                      <UserCircle2 className="h-3.5 w-3.5" />
                      Belum ada manager
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="default" className="flex-1" asChild>
                      <Link to={`/admin/branches/${branch.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />Detail
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingBranch(branch); }} title="Edit Cabang">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWebsiteBranch(branch)}
                      disabled={!branch.slug}
                      title="Pengaturan Website"
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                    {manager?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResetPasswordBranch({ ...branch, managerId: manager.id, managerEmail: manager.email })}
                        title="Reset Password Manager"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => setDeletingBranch(branch)} title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Tambah Cabang (dengan buat akun manager) */}
      <AddBranchDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      {/* Dialog Edit Cabang */}
      <Dialog open={!!editingBranch} onOpenChange={open => !open && setEditingBranch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cabang</DialogTitle>
          </DialogHeader>
          <BranchForm
            branchData={editingBranch}
            onSuccess={() => setEditingBranch(null)}
            onCancel={() => setEditingBranch(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Website */}
      {websiteBranch && (
        <BranchWebsiteDialog
          branch={websiteBranch}
          open={!!websiteBranch}
          onOpenChange={open => !open && setWebsiteBranch(null)}
        />
      )}

      {/* Dialog Reset Password Manager */}
      {resetPasswordBranch && (
        <ResetPasswordDialog
          open={!!resetPasswordBranch}
          onOpenChange={open => !open && setResetPasswordBranch(null)}
          userId={resetPasswordBranch.managerId}
          userLabel={`Manager ${resetPasswordBranch.name} (${resetPasswordBranch.managerEmail})`}
        />
      )}

      {/* Konfirmasi Hapus */}
      <AlertDialog open={!!deletingBranch} onOpenChange={open => !open && setDeletingBranch(null)}>
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
      const { data, error } = await supabase
        .from("website_settings")
        .select("*")
        .eq("branch_id", branch.id)
        .maybeSingle();
      if (error) throw error;

      if (data) return data;

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

        <div className="flex flex-col max-h-[85vh]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0 pb-4">
                <p className="text-sm text-muted-foreground">
                  URL: <span className="font-mono text-primary">{window.location.origin}/b/{branch.slug}</span>
                </p>
                <div className="space-y-2">
                  <Label>Nama Perusahaan / Cabang</Label>
                  <Input value={currentSettings.company_name} onChange={e => updateField("company_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input value={currentSettings.tagline} onChange={e => updateField("tagline", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>URL Logo</Label>
                  <Input value={currentSettings.logo_url} onChange={e => updateField("logo_url", e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Judul Hero</Label>
                  <Input value={currentSettings.hero_title} onChange={e => updateField("hero_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle Hero</Label>
                  <Input value={currentSettings.hero_subtitle} onChange={e => updateField("hero_subtitle", e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-4 border-t flex-shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
