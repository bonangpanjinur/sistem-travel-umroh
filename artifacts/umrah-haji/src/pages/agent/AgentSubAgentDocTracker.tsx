import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Network, Search, ChevronDown, ChevronRight, CheckCircle2,
  Clock, XCircle, FileX, Users, FileCheck, AlertTriangle
} from "lucide-react";

const supabase: any = supabaseRaw;

const STATUS_CONFIG = {
  verified:  { label: "Terverifikasi", icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",  badge: "bg-green-100 text-green-700" },
  pending:   { label: "Menunggu",      icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50",  badge: "bg-amber-100 text-amber-700" },
  rejected:  { label: "Ditolak",       icon: XCircle,      color: "text-red-600",    bg: "bg-red-50",    badge: "bg-red-100 text-red-700" },
  missing:   { label: "Belum Upload",  icon: FileX,        color: "text-slate-400",  bg: "bg-slate-50",  badge: "bg-slate-100 text-slate-600" },
};

type DocStatusKey = keyof typeof STATUS_CONFIG;

interface CustomerDocSummary {
  customerId: string;
  customerName: string;
  phone: string;
  bookingCode: string;
  departureName: string;
  departureDate: string;
  subAgentCode: string;
  subAgentName: string;
  docTypes: Array<{ id: string; name: string; code: string; required: boolean; status: DocStatusKey }>;
  verifiedCount: number;
  totalRequired: number;
  completionPct: number;
}

export default function AgentSubAgentDocTracker() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterSubAgent, setFilterSubAgent] = useState("all");
  const [filterDeparture, setFilterDeparture] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "complete" | "incomplete" | "missing">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Get main agent
  const { data: agentData } = useQuery({
    queryKey: ["agent-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("id, agent_code, company_name").eq("user_id", user!.id).single();
      return data;
    },
  });

  // Get sub-agents
  const { data: subAgents = [] } = useQuery({
    queryKey: ["sub-agents-of", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, agent_code, company_name")
        .eq("parent_agent_id", agentData!.id);
      return data || [];
    },
  });

  const subAgentIds = subAgents.map((a: any) => a.id);

  // Get bookings by sub-agents
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["sub-agent-doc-bookings", subAgentIds.join(",")],
    enabled: subAgentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, agent_id,
          customer:customers(id, full_name, phone),
          departure:departures(id, departure_date, package:packages(name))
        `)
        .in("agent_id", subAgentIds)
        .not("booking_status", "eq", "cancelled");
      return data || [];
    },
  });

  const customerIds = useMemo(() => [...new Set(bookings.map((b: any) => b.customer?.id).filter(Boolean))], [bookings]);

  // Get document types
  const { data: docTypes = [] } = useQuery({
    queryKey: ["document-types-required"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_types")
        .select("id, name, code, is_required")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  // Get customer_documents for all customers
  const { data: customerDocs = [], isLoading: docsLoading } = useQuery({
    queryKey: ["customer-docs-for-tracker", customerIds.join(",")],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_documents")
        .select("id, customer_id, document_type_id, status")
        .in("customer_id", customerIds);
      return data || [];
    },
  });

  const isLoading = bookingsLoading || docsLoading;

  // Build summary per customer
  const summaries = useMemo<CustomerDocSummary[]>(() => {
    return bookings.map((booking: any) => {
      const customer = booking.customer;
      if (!customer) return null;
      const subAgent = subAgents.find((sa: any) => sa.id === booking.agent_id);
      const dep = booking.departure;

      const requiredDocTypes = docTypes.filter((dt: any) => dt.is_required);
      const custDocs = customerDocs.filter((d: any) => d.customer_id === customer.id);

      const docRows = requiredDocTypes.map((dt: any) => {
        const doc = custDocs.find((d: any) => d.document_type_id === dt.id);
        const status: DocStatusKey = doc
          ? (doc.status === "verified" ? "verified" : doc.status === "rejected" ? "rejected" : "pending")
          : "missing";
        return { id: dt.id, name: dt.name, code: dt.code, required: dt.is_required, status };
      });

      const verified = docRows.filter(d => d.status === "verified").length;
      const total = requiredDocTypes.length;

      return {
        customerId: customer.id,
        customerName: customer.full_name || "-",
        phone: customer.phone || "-",
        bookingCode: booking.booking_code,
        departureName: (dep?.package as any)?.name || "-",
        departureDate: dep?.departure_date || "",
        departureId: dep?.id || "",
        subAgentCode: subAgent?.agent_code || "-",
        subAgentName: subAgent?.company_name || "-",
        docTypes: docRows,
        verifiedCount: verified,
        totalRequired: total,
        completionPct: total > 0 ? Math.round((verified / total) * 100) : 0,
      };
    }).filter(Boolean) as CustomerDocSummary[];
  }, [bookings, subAgents, docTypes, customerDocs]);

  // Unique departures for filter
  const departureOptions = useMemo(() => {
    const seen = new Map<string, any>();
    bookings.forEach((b: any) => {
      const dep = b.departure;
      if (dep && !seen.has(dep.id)) seen.set(dep.id, dep);
    });
    return Array.from(seen.values());
  }, [bookings]);

  // Filter
  const filtered = useMemo(() => {
    let list = summaries;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        r.customerName.toLowerCase().includes(s) ||
        r.bookingCode.toLowerCase().includes(s) ||
        r.phone.includes(s)
      );
    }
    if (filterSubAgent !== "all") list = list.filter(r => r.subAgentCode === filterSubAgent);
    if (filterDeparture !== "all") list = list.filter(r => (r as any).departureId === filterDeparture);
    if (filterStatus === "complete") list = list.filter(r => r.completionPct === 100);
    if (filterStatus === "incomplete") list = list.filter(r => r.completionPct > 0 && r.completionPct < 100);
    if (filterStatus === "missing") list = list.filter(r => r.completionPct === 0);
    return list;
  }, [summaries, search, filterSubAgent, filterDeparture, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: summaries.length,
    complete: summaries.filter(r => r.completionPct === 100).length,
    incomplete: summaries.filter(r => r.completionPct > 0 && r.completionPct < 100).length,
    missing: summaries.filter(r => r.completionPct === 0).length,
  }), [summaries]);

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" />
          Tracking Dokumen Sub-Agen
        </h1>
        <p className="text-muted-foreground mt-1">
          Pantau kelengkapan dokumen jamaah dari seluruh sub-agen di bawah Anda
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Jamaah",   value: stats.total,      icon: Users,       color: "text-primary",  bg: "bg-primary/10" },
          { label: "Dokumen Lengkap",value: stats.complete,   icon: FileCheck,   color: "text-green-600",bg: "bg-green-50" },
          { label: "Tidak Lengkap",  value: stats.incomplete, icon: AlertTriangle,color: "text-amber-600",bg: "bg-amber-50" },
          { label: "Belum Upload",   value: stats.missing,    icon: FileX,       color: "text-slate-500", bg: "bg-slate-50" },
        ].map(s => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", s.bg)}>
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Cari nama jamaah, kode booking, HP..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterSubAgent} onValueChange={setFilterSubAgent}>
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="Semua Sub-Agen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Sub-Agen</SelectItem>
            {subAgents.map((sa: any) => (
              <SelectItem key={sa.id} value={sa.agent_code}>{sa.company_name} ({sa.agent_code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDeparture} onValueChange={setFilterDeparture}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Semua Keberangkatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Keberangkatan</SelectItem>
            {departureOptions.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {new Date(d.departure_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} — {(d.package as any)?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="complete">Lengkap</SelectItem>
            <SelectItem value="incomplete">Tidak Lengkap</SelectItem>
            <SelectItem value="missing">Belum Upload</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : subAgents.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada sub-agen</p>
          <p className="text-sm mt-1">Sub-agen akan muncul di sini setelah bergabung ke jaringan Anda</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Tidak ada jamaah yang sesuai filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => {
            const isExp = expanded.has(row.customerId);
            const statusConfig = row.completionPct === 100
              ? STATUS_CONFIG.verified
              : row.completionPct > 0
                ? STATUS_CONFIG.pending
                : STATUS_CONFIG.missing;

            return (
              <Collapsible key={row.customerId} open={isExp} onOpenChange={() => toggleExpand(row.customerId)}>
                <Card className="border-none shadow-sm overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="shrink-0">
                        {isExp ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{row.customerName}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">{row.subAgentCode}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.bookingCode} · {row.departureName}
                          {row.departureDate ? ` · ${new Date(row.departureDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-4 shrink-0">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{row.verifiedCount}/{row.totalRequired} dokumen</span>
                            <span className="font-medium">{row.completionPct}%</span>
                          </div>
                          <Progress value={row.completionPct} className={cn("h-1.5",
                            row.completionPct === 100 ? "[&>div]:bg-green-500" :
                            row.completionPct > 50 ? "[&>div]:bg-amber-500" :
                            "[&>div]:bg-red-400"
                          )} />
                        </div>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusConfig.badge)}>
                          {row.completionPct === 100 ? "Lengkap" : row.completionPct > 0 ? "Tidak Lengkap" : "Belum Upload"}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t bg-muted/10 px-4 py-3">
                      <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
                        <span>📱 {row.phone}</span>
                        <span>🏢 {row.subAgentName}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {row.docTypes.map(doc => {
                          const cfg = STATUS_CONFIG[doc.status];
                          return (
                            <div key={doc.id} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs border", cfg.bg)}>
                              <cfg.icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
                              <div>
                                <p className="font-medium leading-tight">{doc.name}</p>
                                <p className={cn("text-[10px]", cfg.color)}>{cfg.label}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
