import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Search, Phone, Mail, Calendar, User, 
  ArrowRight, Filter, Users, TrendingUp, Target, XCircle,
  MessageCircle, AlertTriangle, DollarSign, X, BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, isPast, isToday } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";
import { useLeads, useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { Lead } from "@/types/database";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'Baru', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  contacted: { label: 'Dihubungi', color: 'text-purple-700', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  follow_up: { label: 'Follow Up', color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  negotiation: { label: 'Negosiasi', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  closing: { label: 'Closing', color: 'text-emerald-700', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  won: { label: 'Won', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  lost: { label: 'Lost', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

const KANBAN_COLUMNS: LeadStatus[] = ['new', 'contacted', 'follow_up', 'negotiation', 'closing'];

const SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'referral', label: 'Referral' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'phone', label: 'Telepon' },
];

export default function AdminLeads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: leads, isLoading, isError, refetch } = useLeads();

  const { data: packages } = useQuery({
    queryKey: ['packages-for-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, code, price_quad')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useCreateLead();
  const updateStatusMutation = useUpdateLead();

  const handleStatusChange = (id: string, status: LeadStatus) => {
    updateStatusMutation.mutate({ id, status, updated_at: new Date().toISOString() }, {
      onSuccess: () => toast({ title: "Status lead diperbarui" }),
    });
  };

  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = !search || 
      lead.full_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Stats
  const stats = {
    total: leads?.length || 0,
    new: leads?.filter(l => l.status === 'new').length || 0,
    inProgress: leads?.filter(l => ['contacted', 'follow_up', 'negotiation', 'closing'].includes(l.status || '')).length || 0,
    won: leads?.filter(l => l.status === 'won').length || 0,
    lost: leads?.filter(l => l.status === 'lost').length || 0,
    conversionRate: leads?.length ? ((leads.filter(l => l.status === 'won').length / leads.length) * 100).toFixed(1) : '0',
    overdueFollowUps: leads?.filter(l => {
      if (!l.follow_up_date || l.status === 'won' || l.status === 'lost') return false;
      return isPast(new Date(l.follow_up_date)) && !isToday(new Date(l.follow_up_date));
    }).length || 0,
  };

  // Pipeline value per column
  const getPipelineValue = (statusLeads: Lead[]) => {
    return statusLeads.reduce((sum, lead) => {
      const price = lead.package?.price_quad || 0;
      return sum + price;
    }, 0);
  };

  const totalPipelineValue = leads?.filter(l => !['won', 'lost'].includes(l.status || '')).reduce((sum, lead) => {
    return sum + (lead.package?.price_quad || 0);
  }, 0) || 0;

  const hasActiveFilters = sourceFilter !== 'all' || statusFilter !== 'all' || search;
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string || undefined,
      email: formData.get('email') as string || undefined,
      source: formData.get('source') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      package_interest: formData.get('package_interest') as string || undefined,
    }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        toast({ title: "Lead berhasil ditambahkan" });
      },
      onError: (error: any) => {
        toast({ title: "Gagal menambahkan lead", description: error.message, variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM - Leads</h1>
          <p className="text-muted-foreground mt-1">Kelola prospek dan konversi ke booking</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link to="/admin/leads/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Lead Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nama Lengkap *</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telepon</Label>
                    <Input id="phone" name="phone" type="tel" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Sumber</Label>
                    <Select name="source">
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih sumber" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package_interest">Paket Diminati</Label>
                    <Select name="package_interest">
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih paket" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages?.map(pkg => (
                          <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid - Enhanced */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard 
          title="Total Leads" 
          value={stats.total} 
          icon={Users}
          highlight={true}
        />
        <StatCard 
          title="Leads Baru" 
          value={stats.new} 
          icon={Plus} 
          color="blue" 
        />
        <StatCard 
          title="Dalam Proses" 
          value={stats.inProgress} 
          icon={ArrowRight} 
          color="purple" 
        />
        <StatCard 
          title="Won" 
          value={stats.won} 
          icon={TrendingUp} 
          color="green" 
        />
        <StatCard 
          title="Lost" 
          value={stats.lost} 
          icon={XCircle} 
          color="red" 
        />
        <StatCard 
          title="Konversi" 
          value={`${stats.conversionRate}%`} 
          icon={Target} 
          color="amber" 
        />
      </div>

      {/* Pipeline Value - Enhanced */}
      {totalPipelineValue > 0 && (
        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Nilai Pipeline (Aktif)</span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400 block">{formatCurrency(totalPipelineValue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters - Enhanced */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nama, telepon, atau email..." 
                className="pl-10 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-10">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-10">
                  <SelectValue placeholder="Filter Sumber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Sumber</SelectItem>
                  {SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  onClick={clearFilters} 
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset Filter
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Alert */}
      {stats.overdueFollowUps > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-100">
              {stats.overdueFollowUps} Follow-up Terlambat
            </p>
            <p className="text-sm text-red-700 dark:text-red-200">
              Ada lead yang memerlukan follow-up segera
            </p>
          </div>
        </div>
      )}

      {/* Tabs Section */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-0">
          {isLoading ? (
            <LoadingState message="Memuat leads..." />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4">
              {KANBAN_COLUMNS.map(status => {
                const statusLeads = filteredLeads?.filter(l => l.status === status) || [];
                const config = STATUS_CONFIG[status];
                const pipelineValue = getPipelineValue(statusLeads as any[]);

                return (
                  <div
                    key={status}
                    className="w-[320px] flex-shrink-0 snap-start flex flex-col gap-3 bg-gradient-to-b from-muted/60 to-muted/30 rounded-xl p-4 border border-muted-foreground/10 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between sticky top-0 z-10 bg-gradient-to-b from-muted/60 to-transparent backdrop-blur-sm pb-3 -mx-1 px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("w-3 h-3 rounded-full flex-shrink-0", config.bgColor.split(' ')[0])} />
                        <h3 className="font-bold text-sm uppercase tracking-wider truncate">{config.label}</h3>
                        <Badge 
                          variant="secondary" 
                          className="ml-1 h-6 px-2 text-xs font-semibold"
                        >
                          {statusLeads.length}
                        </Badge>
                      </div>
                      {pipelineValue > 0 && (
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex-shrink-0 ml-2 whitespace-nowrap">
                          {formatCurrency(pipelineValue)}
                        </span>
                      )}
                    </div>

                    {/* Cards Container */}
                    <div className="flex flex-col gap-3 min-h-[200px]">
                      {statusLeads.map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead as any}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                      {statusLeads.length === 0 && (
                        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center text-muted-foreground text-sm flex items-center justify-center min-h-[200px]">
                          <div>
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            Tidak ada lead
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold">Nama</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Sumber</th>
                    <th className="text-left p-4 font-semibold">Paket</th>
                    <th className="text-left p-4 font-semibold">Follow Up</th>
                    <th className="text-right p-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads?.map(lead => (
                    <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold">{lead.full_name}</div>
                        <div className="text-xs text-muted-foreground">{lead.phone}</div>
                      </td>
                      <td className="p-4">
                        <Badge className={cn(STATUS_CONFIG[lead.status as LeadStatus].bgColor, STATUS_CONFIG[lead.status as LeadStatus].color, "border-none font-medium")}>
                          {STATUS_CONFIG[lead.status as LeadStatus].label}
                        </Badge>
                      </td>
                      <td className="p-4 capitalize text-sm">{lead.source}</td>
                      <td className="p-4 text-sm">{lead.package?.name || '-'}</td>
                      <td className="p-4">
                        {lead.follow_up_date ? (
                          <div className={cn(
                            "text-xs font-medium",
                            isPast(new Date(lead.follow_up_date)) && !isToday(new Date(lead.follow_up_date)) && "text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded"
                          )}>
                            {format(new Date(lead.follow_up_date), 'dd MMM yyyy', { locale: idLocale })}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/admin/leads/${lead.id}`}>Detail</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(!filteredLeads || filteredLeads.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Tidak ada data lead yang ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  highlight 
}: { 
  title: string, 
  value: string | number, 
  icon: any, 
  color?: string,
  highlight?: boolean
}) {
  const colorClasses: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/30",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/30",
    green: "text-green-600 bg-green-50 dark:bg-green-900/30",
    red: "text-red-600 bg-red-50 dark:bg-red-900/30",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/30",
  };

  return (
    <Card className={cn(
      "border-0 shadow-sm transition-all hover:shadow-md",
      highlight && "ring-2 ring-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
    )}>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className={cn("p-2 rounded-lg", color ? colorClasses[color] : "bg-primary/10 text-primary")}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function LeadCard({ lead, onStatusChange }: { lead: Lead, onStatusChange: (id: string, status: LeadStatus) => void }) {
  const isOverdue = lead.follow_up_date && isPast(new Date(lead.follow_up_date)) && !isToday(new Date(lead.follow_up_date));

  return (
    <Card className="group hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary/50 bg-white dark:bg-slate-950">
      <CardContent className="p-4 space-y-3">
        {/* Lead Name and Source */}
        <div className="flex justify-between items-start gap-2">
          <Link 
            to={`/admin/leads/${lead.id}`} 
            className="font-bold text-sm hover:text-primary transition-colors line-clamp-1 flex-1"
          >
            {lead.full_name}
          </Link>
          <Badge 
            variant="outline" 
            className="text-[10px] px-2 py-0.5 h-5 capitalize flex-shrink-0 font-medium"
          >
            {lead.source}
          </Badge>
        </div>

        {/* Package Info */}
        {lead.package && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
            <Target className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{lead.package.name}</span>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex flex-col gap-2 pt-1">
          {lead.phone && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{lead.phone}</span>
            </div>
          )}
          {lead.follow_up_date && (
            <div className={cn(
              "flex items-center gap-2 text-[11px] font-medium",
              isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            )}>
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{format(new Date(lead.follow_up_date), 'dd MMM yyyy', { locale: idLocale })}</span>
              {isOverdue && <AlertTriangle className="h-3 w-3" />}
            </div>
          )}
        </div>

        {/* Actions - Visible on Hover */}
        <div className="flex items-center justify-between pt-3 border-t mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/30" 
              asChild
            >
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4 text-blue-600" />
              </a>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-green-100 dark:hover:bg-green-900/30" 
              asChild
            >
              <a 
                href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
              </a>
            </Button>
          </div>
          <Select 
            value={lead.status} 
            onValueChange={(val) => onStatusChange(lead.id, val as LeadStatus)}
          >
            <SelectTrigger className="h-8 text-[10px] w-[110px] bg-muted/50 border-muted-foreground/20 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value} className="text-xs">{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
