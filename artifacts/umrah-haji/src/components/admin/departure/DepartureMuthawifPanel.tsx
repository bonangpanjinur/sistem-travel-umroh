import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Plus, Trash2, Star, AlertTriangle, Calendar, Crown, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface DepartureMuthawifPanelProps {
  departureId: string;
  departureDate?: string | null;
  returnDate?: string | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  lead:      { label: "Lead Muthawif",     color: "bg-amber-100 text-amber-800",   icon: Crown },
  muthawif:  { label: "Muthawif",          color: "bg-blue-100 text-blue-800",     icon: User },
  assistant: { label: "Asisten Muthawif",  color: "bg-slate-100 text-slate-700",   icon: User },
};

export function DepartureMuthawifPanel({ departureId, departureDate, returnDate }: DepartureMuthawifPanelProps) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMuthawifId, setSelectedMuthawifId] = useState("");
  const [selectedRole, setSelectedRole] = useState("muthawif");
  const [notes, setNotes] = useState("");

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["departure-muthawifs", departureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departure_muthawifs")
        .select("*, muthawif:muthawifs(id, name, phone, experience_years, rating, languages, is_active)")
        .eq("departure_id", departureId)
        .order("role");
      if (error && error.code === "42P01") return [];
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allMuthawifs = [] } = useQuery({
    queryKey: ["muthawifs-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("muthawifs")
        .select("id, name, phone, experience_years, rating, languages, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: conflictData } = useQuery({
    queryKey: ["muthawif-conflict-check", selectedMuthawifId, departureDate, returnDate],
    enabled: !!selectedMuthawifId && !!departureDate,
    queryFn: async () => {
      if (!selectedMuthawifId || !departureDate) return [];
      const dEnd = returnDate || departureDate;
      const { data, error } = await supabase
        .from("departure_muthawifs")
        .select(`
          departure_id,
          role,
          departure:departures(departure_date, return_date, status, package:packages(name))
        `)
        .eq("muthawif_id", selectedMuthawifId)
        .neq("departure_id", departureId);
      if (error) return [];
      return (data || []).filter((row: any) => {
        const d = row.departure;
        if (!d || ["cancelled","completed"].includes(d.status)) return false;
        const dStart = d.departure_date;
        const dEndExisting = d.return_date || dStart;
        return dStart <= dEnd && dEndExisting >= departureDate;
      });
    },
  });

  const hasConflict = (conflictData?.length ?? 0) > 0;

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("departure_muthawifs")
        .insert({ departure_id: departureId, muthawif_id: selectedMuthawifId, role: selectedRole, notes: notes || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Muthawif berhasil ditambahkan ke keberangkatan");
      queryClient.invalidateQueries({ queryKey: ["departure-muthawifs", departureId] });
      setIsAddOpen(false);
      setSelectedMuthawifId("");
      setSelectedRole("muthawif");
      setNotes("");
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("departure_muthawifs").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Muthawif dilepas dari keberangkatan");
      queryClient.invalidateQueries({ queryKey: ["departure-muthawifs", departureId] });
    },
    onError: (e: any) => toast.error("Gagal: " + e.message),
  });

  const assignedIds = new Set(assignments.map((a: any) => a.muthawif_id));
  const availableMuthawifs = allMuthawifs.filter((m: any) => !assignedIds.has(m.id));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tim Muthawif
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} disabled={availableMuthawifs.length === 0}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Memuat...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Belum ada muthawif ditugaskan
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a: any) => {
                const roleInfo = ROLE_LABELS[a.role] || ROLE_LABELS.muthawif;
                const RoleIcon = roleInfo.icon;
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {a.muthawif?.name?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{a.muthawif?.name}</span>
                        <Badge className={`text-xs ${roleInfo.color}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />{roleInfo.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                        {a.muthawif?.experience_years && (
                          <span>{a.muthawif.experience_years}th pengalaman</span>
                        )}
                        {a.muthawif?.rating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {Number(a.muthawif.rating).toFixed(1)}
                          </span>
                        )}
                        {a.muthawif?.phone && <span>{a.muthawif.phone}</span>}
                      </div>
                      {a.notes && <p className="text-xs text-muted-foreground mt-1 italic">{a.notes}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => removeMutation.mutate(a.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tambah Muthawif ke Keberangkatan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Pilih Muthawif</Label>
              <Select value={selectedMuthawifId} onValueChange={setSelectedMuthawifId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih muthawif..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMuthawifs.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.experience_years ? ` (${m.experience_years}th)` : ""}
                      {m.rating ? ` ★${Number(m.rating).toFixed(1)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasConflict && selectedMuthawifId && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Perhatian — Konflik Jadwal:</strong> Muthawif ini sudah ditugaskan di keberangkatan lain pada periode yang tumpang-tindih:
                  {conflictData?.map((c: any) => (
                    <div key={c.departure_id} className="mt-1 flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {c.departure?.package?.name || "Paket lain"} —{" "}
                        {c.departure?.departure_date
                          ? format(parseISO(c.departure.departure_date), "dd MMM yyyy", { locale: localeId })
                          : "?"}
                      </span>
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label>Peran</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead Muthawif</SelectItem>
                  <SelectItem value="muthawif">Muthawif</SelectItem>
                  <SelectItem value="assistant">Asisten Muthawif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea
                placeholder="Instruksi khusus, area tanggung jawab, dll..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!selectedMuthawifId || addMutation.isPending}
            >
              {addMutation.isPending ? "Menambahkan..." : "Tambah ke Tim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
