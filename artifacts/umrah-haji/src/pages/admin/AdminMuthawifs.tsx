import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MuthawifForm } from "@/components/admin/forms/MuthawifForm";
import { MuthawifConflictCalendar } from "@/components/admin/muthawif/MuthawifConflictCalendar";
import { Search, Plus, Edit, Trash2, User, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function AdminMuthawifs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMuthawif, setEditingMuthawif] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: muthawifs, isLoading } = useQuery({
    queryKey: ["admin-muthawifs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("muthawifs").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("muthawifs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Muthawif berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-muthawifs"] });
    },
  });

  const filtered = muthawifs?.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <Tabs defaultValue="daftar">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="daftar" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Daftar Muthawif
            </TabsTrigger>
            <TabsTrigger value="kalender" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Kalender Konflik
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => { setEditingMuthawif(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Tambah Muthawif
          </Button>
        </div>

        {/* Tab: Daftar */}
        <TabsContent value="daftar" className="mt-0">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari muthawif..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>

          {!filtered?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{searchTerm ? "Tidak ada hasil" : "Belum ada muthawif"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(muthawif => (
                <Card key={muthawif.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-lg">{muthawif.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{muthawif.name}</h3>
                          <Badge variant={muthawif.is_active ? "default" : "secondary"} className="shrink-0">
                            {muthawif.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{muthawif.experience_years || 0} tahun pengalaman</p>
                        {(muthawif.languages?.length ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Bahasa: {muthawif.languages!.join(", ")}</p>
                        )}
                        {muthawif.phone && <p className="text-xs text-muted-foreground">{muthawif.phone}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditingMuthawif(muthawif); setIsFormOpen(true); }}>
                        <Edit className="h-4 w-4 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(muthawif.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Kalender Konflik — C6 */}
        <TabsContent value="kalender" className="mt-0">
          <MuthawifConflictCalendar />
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMuthawif ? "Edit" : "Tambah"} Muthawif</DialogTitle>
          </DialogHeader>
          <MuthawifForm muthawifData={editingMuthawif} onSuccess={() => setIsFormOpen(false)} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
