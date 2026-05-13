import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Luggage, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

/** KEP-FIX6 — Manajemen Bagasi per Maskapai */
export default function AdminBaggagePolicies() {
  const qc = useQueryClient();
  const [airlineId, setAirlineId] = useState("");
  const [cabinKg, setCabinKg] = useState(7);
  const [checkedKg, setCheckedKg] = useState(23);
  const [notes, setNotes] = useState("");

  const { data: airlines } = useQuery({
    queryKey: ["airlines-list"],
    queryFn: async () => (await supabase.from("airlines").select("id,name").order("name")).data || [],
  });
  const { data: policies } = useQuery({
    queryKey: ["baggage-policies"],
    queryFn: async () => (await supabase.from("baggage_policies").select("*, airlines(name)").order("created_at", { ascending: false })).data || [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("baggage_policies").insert({
        airline_id: airlineId || null, cabin_kg: cabinKg, checked_kg: checkedKg, notes,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["baggage-policies"] }); toast.success("Tersimpan"); setNotes(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("baggage_policies").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["baggage-policies"] }),
  });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Luggage className="h-7 w-7 text-primary" />Kebijakan Bagasi</h1>
      <Card>
        <CardHeader><CardTitle>Tambah Kebijakan</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="border rounded px-3 py-2" value={airlineId} onChange={(e) => setAirlineId(e.target.value)}>
            <option value="">— Maskapai —</option>
            {airlines?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Input type="number" placeholder="Cabin (kg)" value={cabinKg} onChange={(e) => setCabinKg(Number(e.target.value))} />
          <Input type="number" placeholder="Checked (kg)" value={checkedKg} onChange={(e) => setCheckedKg(Number(e.target.value))} />
          <Button onClick={() => create.mutate()} disabled={create.isPending}><Save className="h-4 w-4 mr-1" />Simpan</Button>
          <Textarea className="md:col-span-4" placeholder="Catatan kebijakan (oleh-oleh, zam-zam, dsb)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Daftar Kebijakan</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {policies?.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-semibold">{p.airlines?.name || "Default"}</div>
                <div className="text-sm text-muted-foreground">Cabin {p.cabin_kg} kg • Checked {p.checked_kg} kg</div>
                {p.notes && <div className="text-xs mt-1">{p.notes}</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}