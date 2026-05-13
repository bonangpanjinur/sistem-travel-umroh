import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Check, X } from "lucide-react";
import { toast } from "sonner";

/** CAB-ADD8 — Transfer Booking antar Cabang */
export default function AdminBookingTransfers() {
  const qc = useQueryClient();
  const [bookingCode, setBookingCode] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [reason, setReason] = useState("");

  const { data: branches } = useQuery({
    queryKey: ["branches-list"],
    queryFn: async () => (await supabase.from("branches").select("id,name").order("name")).data || [],
  });
  const { data: transfers } = useQuery({
    queryKey: ["booking-transfers"],
    queryFn: async () => (await supabase.from("booking_transfers").select("*, bookings(booking_code)").order("created_at", { ascending: false })).data || [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: bk } = await supabase.from("bookings").select("id, branch_id").eq("booking_code", bookingCode).maybeSingle();
      if (!bk) throw new Error("Booking tidak ditemukan");
      const { error } = await supabase.from("booking_transfers").insert({
        booking_id: bk.id, from_branch_id: bk.branch_id, to_branch_id: toBranch, reason, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Permohonan transfer dibuat"); qc.invalidateQueries({ queryKey: ["booking-transfers"] }); setBookingCode(""); setReason(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, booking_id, to }: any) => {
      await supabase.from("booking_transfers").update({ status, approved_by: (await supabase.auth.getUser()).data.user?.id }).eq("id", id);
      if (status === "approved") {
        await supabase.from("bookings").update({ branch_id: to }).eq("id", booking_id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking-transfers"] }),
  });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowRightLeft className="h-7 w-7 text-primary" />Transfer Booking Antar Cabang</h1>
      <Card>
        <CardHeader><CardTitle>Permohonan Baru</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Kode Booking" value={bookingCode} onChange={(e) => setBookingCode(e.target.value)} />
          <select className="border rounded px-3 py-2" value={toBranch} onChange={(e) => setToBranch(e.target.value)}>
            <option value="">— Cabang Tujuan —</option>
            {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !bookingCode || !toBranch}>Ajukan</Button>
          <Textarea className="md:col-span-3" placeholder="Alasan transfer" value={reason} onChange={(e) => setReason(e.target.value)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Daftar Permohonan</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {transfers?.map((t: any) => (
            <div key={t.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{t.bookings?.booking_code}</div>
                <div className="text-xs text-muted-foreground">{t.reason}</div>
                <Badge variant="outline" className="mt-1">{t.status}</Badge>
              </div>
              {t.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: t.id, status: "approved", booking_id: t.booking_id, to: t.to_branch_id })}><Check className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => decide.mutate({ id: t.id, status: "rejected" })}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}