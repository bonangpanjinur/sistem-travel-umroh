import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { CheckCircle2, Copy, MessageCircle, KeyRound } from "lucide-react";

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAgentId?: string | null;
}

interface CreatedAgent {
  agentCode: string;
  email: string;
  tempPassword?: string;
  waSent?: boolean;
}

export default function AddAgentDialog({ open, onOpenChange, parentAgentId = null }: AddAgentDialogProps) {
  const queryClient = useQueryClient();
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    commissionRate: "5",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    npwp: "",
    branchId: "",
    parentAgentId: parentAgentId || "none",
  });

  const { data: branches } = useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, code').eq('is_active', true);
      return data || [];
    },
  });

  const { data: parentAgents } = useQuery({
    queryKey: ['agents-for-parent'],
    queryFn: async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, agent_code, company_name')
        .eq('is_active', true)
        .is('parent_agent_id', null)
        .order('agent_code');
      return data || [];
    },
    enabled: !parentAgentId,
  });

  const createAgentMutation = useMutation({
    mutationFn: async () => {
      if (!form.fullName || !form.email) throw new Error("Nama dan email wajib diisi");
      const res = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || null,
          companyName: form.companyName || null,
          commissionRate: form.commissionRate,
          bankName: form.bankName || null,
          bankAccountNumber: form.bankAccountNumber || null,
          bankAccountName: form.bankAccountName || null,
          npwp: form.npwp || null,
          branchId: form.branchId || null,
          parentAgentId: parentAgentId || (form.parentAgentId === "none" ? null : form.parentAgentId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal membuat agent");
      return data as { agentCode: string; email: string; tempPassword?: string; waSent?: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      setCreatedAgent(data);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetForm = () => {
    setForm({
      fullName: "", email: "", phone: "", companyName: "",
      commissionRate: "5", bankName: "", bankAccountNumber: "",
      bankAccountName: "", npwp: "", branchId: "", parentAgentId: parentAgentId || "none",
    });
    setCreatedAgent(null);
    setCopied(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const copyCredentials = () => {
    if (!createdAgent?.tempPassword) return;
    navigator.clipboard.writeText(`Email: ${createdAgent.email}\nPassword: ${createdAgent.tempPassword}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentAgentId ? "Tambah Sub-Agent" : "Tambah Agent Baru"}
          </DialogTitle>
        </DialogHeader>

        {createdAgent ? (
          <div className="space-y-4 py-2">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Agent <strong>{createdAgent.agentCode}</strong> berhasil dibuat!
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4" />Kredensial Login
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-mono font-medium">{createdAgent.email}</span>
                </div>
                {createdAgent.tempPassword && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Password Sementara</span>
                    <span className="font-mono font-medium">{createdAgent.tempPassword}</span>
                  </div>
                )}
              </div>
              {createdAgent.tempPassword && (
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={copyCredentials} className="flex-1">
                    {copied ? <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied ? "Tersalin" : "Salin Kredensial"}
                  </Button>
                  {createdAgent.waSent ? (
                    <span className="text-xs flex items-center gap-1 text-green-700">
                      <MessageCircle className="h-3 w-3" />WA terkirim
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />Kirim manual
                    </span>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Selesai</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nama Lengkap *</Label>
                  <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Nama lengkap agent" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div>
                  <Label>Telepon (WA)</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xx" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Perusahaan</Label>
                  <Input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="PT. ..." />
                </div>
                <div>
                  <Label>Rate Komisi (%)</Label>
                  <Input type="number" min="0" max="100" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cabang</Label>
                  <Select value={form.branchId} onValueChange={v => setForm({ ...form, branchId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih cabang" /></SelectTrigger>
                    <SelectContent>
                      {branches?.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!parentAgentId && (
                  <div>
                    <Label>Parent Agent (opsional)</Label>
                    <Select value={form.parentAgentId} onValueChange={v => setForm({ ...form, parentAgentId: v })}>
                      <SelectTrigger><SelectValue placeholder="Agent utama" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tidak ada</SelectItem>
                        {parentAgents?.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.agent_code} — {a.company_name || 'N/A'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Info Rekening</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nama Bank</Label>
                    <Input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="BCA, Mandiri, dll" />
                  </div>
                  <div>
                    <Label>No. Rekening</Label>
                    <Input value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })} />
                  </div>
                  <div>
                    <Label>Nama Pemilik Rekening</Label>
                    <Input value={form.bankAccountName} onChange={e => setForm({ ...form, bankAccountName: e.target.value })} />
                  </div>
                  <div>
                    <Label>NPWP</Label>
                    <Input value={form.npwp} onChange={e => setForm({ ...form, npwp: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Batal</Button>
              <Button onClick={() => createAgentMutation.mutate()} disabled={createAgentMutation.isPending}>
                {createAgentMutation.isPending ? "Memproses..." : "Tambah Agent"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
