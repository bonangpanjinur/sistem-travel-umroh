import React, { useState } from 'react';
import { useLandingPages, useDeleteLandingPage, useCreateLandingPage } from "@/hooks/useLandingPages";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ExternalLink, Globe, Lock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { LoadingState } from "@/components/shared/LoadingState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLandingPages() {
  const { data: landingPages, isLoading } = useLandingPages();
  const deleteMutation = useDeleteLandingPage();
  const createMutation = useCreateLandingPage();
  const navigate = useNavigate();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLP, setNewLP] = useState({ title: '', slug: '' });

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus landing page ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    createMutation.mutate({
      ...newLP,
      sections: [],
      whatsapp_source_type: 'global',
      is_published: false
    }, {
      onSuccess: (data) => {
        setIsCreateOpen(false);
        navigate(`/admin/landing-pages/${data.id}`);
      }
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Landing Page Builder</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Kelola halaman penawaran khusus Anda di sini.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-success hover:bg-success/90 text-success-foreground flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              Buat Landing Page Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Landing Page Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul Halaman</Label>
                <Input 
                  id="title" 
                  placeholder="Contoh: Promo Umrah Ramadhan 2024" 
                  value={newLP.title}
                  onChange={(e) => setNewLP({...newLP, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug URL (tanpa spasi)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/lp/</span>
                  <Input 
                    id="slug" 
                    placeholder="promo-umrah-ramadhan" 
                    value={newLP.slug}
                    onChange={(e) => setNewLP({...newLP, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
              <Button className="bg-success hover:bg-success/90 text-success-foreground" onClick={handleCreate} disabled={!newLP.title || !newLP.slug}>
                Lanjutkan ke Editor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul & URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>WhatsApp Source</TableHead>
              <TableHead>Dibuat Pada</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {landingPages?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Belum ada landing page. Klik tombol di atas untuk membuat yang pertama.
                </TableCell>
              </TableRow>
            ) : (
              landingPages?.map((lp) => (
                <TableRow key={lp.id}>
                  <TableCell>
                    <div className="font-bold text-foreground">{lp.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      /lp/{lp.slug}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lp.is_published ? (
                      <Badge className="bg-success/20 text-success border-success/30">Published</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{lp.whatsapp_source_type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {lp.created_at ? new Date(lp.created_at).toLocaleDateString('id-ID') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/lp/${lp.slug}`} target="_blank">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/landing-pages/${lp.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(lp.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
