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
import { toast } from "sonner";

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAgentId?: string | null;
}

export default function AddAgentDialog({ open, onOpenChange, parentAgentId = null }: AddAgentDialogProps) {
  const queryClient = useQueryClient();
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
    parentAgentId: parentAgentId || "",
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, code').eq('is_active', true);
      return data || [];
    },
  });

  // Fetch agents for parent selection
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

  const generateAgentCode = () => {
    const prefix = parentAgentId || form.parentAgentId ? 'SUB' : 'AGT';
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const now = new Date();
    return `${prefix}${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}-${rand}`;
  };

  const createAgentMutation = useMutation({
    mutationFn: async () => {
      if (!form.fullName || !form.email) {
        throw new Error("Nama dan email wajib diisi");
      }

      // 1. Create auth user via admin-like approach: sign up with random password
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: tempPassword,
        options: {
          data: { full_name: form.fullName },
        },
      });

      if (authError) throw new Error("Gagal membuat akun: " + authError.message);
      if (!authData.user) throw new Error("User tidak terbuat");

      const userId = authData.user.id;

      // 2. Add agent role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'agent' as any });

      if (roleError) throw new Error("Gagal set role agent: " + roleError.message);

      // 3. Create agent record
      const agentCode = generateAgentCode();
      const { error: agentError } = await supabase
        .from('agents')
        .insert({
          user_id: userId,
          agent_code: agentCode,
          company_name: form.companyName || null,
          commission_rate: parseFloat(form.commissionRate) || 5,
          bank_name: form.bankName || null,
          bank_account_number: form.bankAccountNumber || null,
          bank_account_name: form.bankAccountName || null,
          npwp: form.npwp || null,
          branch_id: form.branchId || null,
          parent_agent_id: parentAgentId || form.parentAgentId || null,
          is_active: true,
        });

      if (agentError) throw new Error("Gagal membuat agent: " + agentError.message);

      return { agentCode, email: form.email };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast.success(`Agent ${data.agentCode} berhasil dibuat. Email verifikasi dikirim ke ${data.email}`);
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setForm({
      fullName: "", email: "", phone: "", companyName: "",
      commissionRate: "5", bankName: "", bankAccountNumber: "",
      bankAccountName: "", npwp: "", branchId: "", parentAgentId: parentAgentId || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentAgentId ? "Tambah Sub-Agent" : "Tambah Agent Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
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
              <Label>Telepon</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xx" />
            </div>
          </div>

          {/* Company */}
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

          {/* Branch & Parent */}
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
                  <SelectTrigger><SelectValue placeholder="Tidak ada (agent utama)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tidak ada</SelectItem>
                    {parentAgents?.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.agent_code} - {a.company_name || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Bank Info */}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => createAgentMutation.mutate()} disabled={createAgentMutation.isPending}>
            {createAgentMutation.isPending ? "Memproses..." : "Tambah Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
