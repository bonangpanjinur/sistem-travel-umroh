import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgentByUserId } from "@/hooks/useAgents";
import { useMembershipPlans, useAgentMembership, useSubmitAgentMembership } from "@/hooks/useMemberships";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Clock, XCircle, Crown, Star, Zap, AlertCircle, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const PLAN_ICONS: Record<string, any> = { Silver: Star, Gold: Crown, Platinum: Zap };
const PLAN_COLORS: Record<string, string> = {
  Silver: "border-slate-300 bg-slate-50 dark:bg-slate-900/20",
  Gold: "border-amber-300 bg-amber-50 dark:bg-amber-900/20",
  Platinum: "border-purple-300 bg-purple-50 dark:bg-purple-900/20",
};
const PLAN_BADGE_COLORS: Record<string, string> = {
  Silver: "bg-slate-100 text-slate-700",
  Gold: "bg-amber-100 text-amber-700",
  Platinum: "bg-purple-100 text-purple-700",
};

function StatusCard({ membership }: { membership: any }) {
  const status = membership?.status;
  const plan = membership?.membership_plans;

  if (!membership) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-800 dark:text-orange-200">Belum Berlangganan</p>
              <p className="text-sm text-orange-600">Pilih paket keanggotaan untuk mengaktifkan semua fitur</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    pending:  { label: "Menunggu Verifikasi",  icon: Clock, color: "text-amber-700", bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/20" },
    active:   { label: "Keanggotaan Aktif",    icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20" },
    expired:  { label: "Keanggotaan Expired",  icon: XCircle, color: "text-muted-foreground", bg: "bg-muted border-muted" },
    rejected: { label: "Pendaftaran Ditolak",  icon: XCircle, color: "text-destructive", bg: "bg-destructive/5 border-destructive/20" },
  };
  const sc = statusConfig[status] || statusConfig.pending;
  const Icon = sc.icon;

  return (
    <Card className={`border ${sc.bg}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-6 w-6 ${sc.color}`} />
          <div className="flex-1">
            <p className={`font-semibold ${sc.color}`}>{sc.label}</p>
            {plan && <p className="text-sm text-muted-foreground">Paket <strong>{plan.name}</strong> · {formatCurrency(Number(plan.price_yearly))}/tahun</p>}
            {membership.start_date && status === 'active' && (
              <p className="text-xs text-muted-foreground">Berlaku hingga: {formatDate(membership.end_date)}</p>
            )}
            {status === 'rejected' && membership.rejection_reason && (
              <p className="text-xs text-destructive mt-1">Alasan: {membership.rejection_reason}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RegisterDialog({
  open, onClose, plan, agentId
}: { open: boolean; onClose: () => void; plan: any; agentId: string }) {
  const [proofUrl, setProofUrl] = useState("");
  const submit = useSubmitAgentMembership();

  const handleSubmit = () => {
    submit.mutate({ agentId, planId: plan.id, paymentProofUrl: proofUrl || undefined }, {
      onSuccess: () => { onClose(); setProofUrl(""); }
    });
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Daftar Paket {plan.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Biaya keanggotaan</span>
              <span className="font-bold">{formatCurrency(Number(plan.price_yearly))}/tahun</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Komisi</span>
              <span className="font-semibold">{plan.commission_rate}%</span>
            </div>
            {plan.max_sub_agents && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Maks Sub Agen</span>
                <span className="font-semibold">{plan.max_sub_agents}</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Cara pembayaran:</p>
            <p className="text-sm text-muted-foreground">Transfer ke rekening yang tertera di bawah ini, lalu upload bukti pembayaran.</p>
            <div className="rounded border p-3 bg-muted/20 text-sm font-mono">
              BCA: 1234567890 a/n Vinstour Travel
            </div>
          </div>
          <div className="space-y-2">
            <Label>Link Bukti Pembayaran (opsional)</Label>
            <Input
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="https://drive.google.com/... atau link foto"
            />
            <p className="text-xs text-muted-foreground">Upload bukti ke Google Drive, lalu paste link-nya di sini</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Mengirim..." : "Kirim Pendaftaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentMembership() {
  const { user } = useAuth();
  const { data: agentData } = useAgentByUserId(user?.id) as { data: any };
  const { data: plans = [] } = useMembershipPlans('agent');
  const { data: membership } = useAgentMembership(agentData?.id);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const canRegister = !membership || membership.status === 'rejected' || membership.status === 'expired';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6" />
          Keanggotaan Agen
        </h1>
        <p className="text-muted-foreground">Pilih paket yang sesuai untuk mengaktifkan fitur dan komisi Anda</p>
      </div>

      <StatusCard membership={membership} />

      {membership?.status === 'pending' && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4 text-sm text-blue-700 dark:text-blue-300">
            Pendaftaran Anda sedang diverifikasi. Admin akan menyetujui dalam 1x24 jam kerja.
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Paket Keanggotaan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan: any) => {
            const Icon = PLAN_ICONS[plan.name] || Star;
            const isCurrentPlan = membership?.plan_id === plan.id && membership?.status === 'active';
            const features: string[] = Array.isArray(plan.features) ? plan.features : (typeof plan.features === 'string' ? JSON.parse(plan.features) : []);

            return (
              <Card key={plan.id} className={`border-2 transition-all ${isCurrentPlan ? 'border-primary shadow-md' : PLAN_COLORS[plan.name] || ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${PLAN_BADGE_COLORS[plan.name] || 'bg-muted'}`}>
                      {plan.name}
                    </span>
                    {isCurrentPlan && <Badge>Aktif</Badge>}
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold">{formatCurrency(Number(plan.price_yearly))}</p>
                    <p className="text-xs text-muted-foreground">per tahun</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="font-medium">Komisi {plan.commission_rate}%</span>
                    <span className="text-muted-foreground">{plan.max_sub_agents ? `Maks ${plan.max_sub_agents} Sub Agen` : 'Sub Agen Tak Terbatas'}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2">
                    {features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {canRegister && (
                    <Button
                      className="w-full mt-2"
                      variant={plan.name === 'Gold' ? 'default' : 'outline'}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      Pilih Paket {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {plans.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Paket keanggotaan belum tersedia. Hubungi admin untuk informasi lebih lanjut.
            </CardContent>
          </Card>
        )}
      </div>

      {agentData && (
        <RegisterDialog
          open={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          plan={selectedPlan}
          agentId={agentData.id}
        />
      )}
    </div>
  );
}
