import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PublicLayout } from "@/components/layout/PublicLayout";
import {
  CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight,
  RefreshCcw, DollarSign, FileText, ChevronDown, ChevronUp,
  MessageSquare
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  pending: {
    label: "Menunggu Persetujuan",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: <Clock className="h-5 w-5 text-amber-500" />,
    desc: "Permintaan Anda sedang menunggu ditinjau oleh tim kami.",
  },
  approved: {
    label: "Disetujui",
    color: "text-green-700 bg-green-50 border-green-200",
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    desc: "Permintaan Anda telah disetujui. Dana akan diproses dalam 3–7 hari kerja.",
  },
  rejected: {
    label: "Ditolak",
    color: "text-red-700 bg-red-50 border-red-200",
    icon: <XCircle className="h-5 w-5 text-red-500" />,
    desc: "Mohon maaf, permintaan Anda tidak dapat disetujui. Silakan hubungi CS kami.",
  },
  escalated: {
    label: "Diteruskan ke Manajemen",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
    desc: "Permintaan Anda sedang ditinjau oleh manajemen untuk keputusan akhir.",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-slate-600 bg-slate-50 border-slate-200",
    icon: <XCircle className="h-5 w-5 text-slate-400" />,
    desc: "Permintaan ini telah dibatalkan.",
  },
};

const TYPE_LABEL: Record<string, string> = {
  refund: "Pengembalian Dana (Refund)",
  discount: "Diskon Booking",
  cancellation: "Pembatalan Booking",
  vendor_invoice: "Invoice Vendor",
};

const STEP_LABELS = ["Diajukan", "Ditinjau", "Keputusan Final"];

function StepTracker({ currentLevel, maxLevel, status }: { currentLevel: number; maxLevel: number; status: string }) {
  const steps = Array.from({ length: maxLevel + 1 }, (_, i) => i);
  return (
    <div className="flex items-center gap-0 w-full my-4">
      {steps.map((step, idx) => {
        const done = status === "approved" || status === "rejected"
          ? true
          : step < currentLevel;
        const active = step === currentLevel - 1;
        const label = idx === 0 ? "Diajukan" : idx === steps.length - 1 ? "Selesai" : `Level ${idx}`;
        return (
          <div key={step} className="flex-1 flex flex-col items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${done || status === "approved"
                ? "bg-green-500 border-green-500 text-white"
                : active
                  ? "bg-amber-400 border-amber-400 text-white animate-pulse"
                  : "bg-white border-slate-300 text-slate-400"}
            `}>
              {done && (status === "approved" || step < currentLevel - 1)
                ? <CheckCircle2 className="h-4 w-4" />
                : step + 1}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 text-center leading-tight">{label}</span>
            {idx < steps.length - 1 && (
              <div className={`absolute h-0.5 w-full top-4 left-1/2
                ${done ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RequestCard({ req }: { req: any }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;

  return (
    <Card className={`border ${cfg.color} mb-4 transition-all`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {cfg.icon}
            <div>
              <p className="font-semibold text-sm">{TYPE_LABEL[req.type] ?? req.type}</p>
              {req.reference_code && (
                <p className="text-xs text-slate-500">Ref: {req.reference_code}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${cfg.color}`}>
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {req.amount && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{formatCurrency(req.amount)}</span>
            {req.percentage && (
              <span className="text-slate-400">({req.percentage}%)</span>
            )}
          </div>
        )}

        <p className="text-xs text-slate-600 bg-white/60 rounded p-2 border border-inherit">
          {cfg.desc}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Diajukan {formatDistanceToNow(parseISO(req.created_at), { addSuffix: true, locale: localeId })}</span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-700"
          >
            Detail {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 pt-1">
            <Separator />
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Alasan Pengajuan</p>
              <p className="text-xs text-slate-700 bg-white/60 rounded p-2 border border-inherit">{req.reason}</p>
            </div>

            {/* Step tracker */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Progress Persetujuan</p>
              <StepTracker currentLevel={req.current_level} maxLevel={req.max_level} status={req.status} />
            </div>

            {/* Action history */}
            {req.actions && req.actions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Riwayat Tindakan</p>
                <div className="space-y-2">
                  {req.actions.map((a: any) => (
                    <div key={a.id} className="flex gap-2 text-xs">
                      <div className="mt-0.5">
                        {a.action === "approved"  && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                        {a.action === "rejected"  && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                        {a.action === "escalated" && <AlertCircle className="h-3.5 w-3.5 text-blue-500" />}
                        {a.action === "noted"     && <MessageSquare className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                      <div>
                        <span className="font-medium capitalize">{a.action}</span>
                        <span className="text-slate-400"> oleh {a.actor_role}</span>
                        {a.notes && <p className="text-slate-500 italic">"{a.notes}"</p>}
                        <p className="text-slate-400">{formatDate(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerRefundStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["customer-approval-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("approval_requests")
        .select("*, actions:approval_actions(*)")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const pending   = requests.filter((r: any) => r.status === "pending"   || r.status === "escalated");
  const resolved  = requests.filter((r: any) => r.status === "approved"  || r.status === "rejected" || r.status === "cancelled");

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700">
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Status Pengajuan Saya</h1>
              <p className="text-xs text-slate-500">Refund, diskon, dan pembatalan yang Anda ajukan</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => refetch()} className="ml-auto">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Belum ada pengajuan</p>
                <p className="text-slate-400 text-sm mt-1">
                  Jika ingin mengajukan refund atau pembatalan, hubungi CS kami.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/customer/support")}
                >
                  Hubungi Support
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {pending.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" /> Sedang Diproses ({pending.length})
                  </h2>
                  {pending.map((req: any) => <RequestCard key={req.id} req={req} />)}
                </div>
              )}

              {resolved.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Sudah Selesai ({resolved.length})
                  </h2>
                  {resolved.map((req: any) => <RequestCard key={req.id} req={req} />)}
                </div>
              )}
            </div>
          )}

          {/* Info box */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-blue-700 font-medium mb-1">Informasi Proses</p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Refund nominal kecil biasanya selesai dalam <strong>1–3 hari kerja</strong></li>
                <li>• Refund nominal besar memerlukan persetujuan manajemen (<strong>3–7 hari kerja</strong>)</li>
                <li>• Anda akan dihubungi via WhatsApp/email saat status berubah</li>
                <li>• Pertanyaan? Hubungi CS kami di halaman Support</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
