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
  MessageCircle, AlertTriangle, DollarSign, X
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">CRM - Leads</h1>
          <p className="text-muted-foreground">Kelola prospek dan konversi ke booking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/leads/analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Link>
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard title="Total Leads" value={stats.total} icon={Users} />
        <StatCard title="Leads Baru" value={stats.new} icon={Plus} color="blue" />
        <StatCard title="Dalam Proses" value={stats.inProgress} icon={TrendingUp} color="amber" />
        <StatCard title="Won" value={stats.won} icon={Target} color="green" />
        <StatCard title="Conversion" value={`${stats.conversionRate}%`} icon={ArrowRight} color="emerald" />
        <StatCard 
          title="Overdue F/U" 
          value={stats.overdueFollowUps} 
          icon={AlertTriangle} 
          color={stats.overdueFollowUps > 0 ? "red" : undefined}
        />
      </div>

      {/* Pipeline Value */}
      {totalPipelineValue > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total Nilai Pipeline (Aktif)</span>
            </div>
            <span className="text-lg font-bold text-primary">{formatCurrency(totalPipelineValue)}</span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="kanban" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari lead..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sumber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sumber</SelectItem>
                {SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="kanban">
          {isLoading ? (
            <LoadingState message="Memuat leads..." />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-5 overflow-x-auto">
              {KANBAN_COLUMNS.map(status => {
                const statusLeads = filteredLeads?.filter(l => l.status === status) || [];
                const config = STATUS_CONFIG[status];
                const pipelineValue = getPipelineValue(statusLeads as any[]);
                
                return (
                  <div key={status} className="min-w-[250px]">
                    <div className={cn("rounded-t-lg px-3 py-2 font-medium", config.bgColor)}>
                      <div className="flex items-center justify-between">
                        <span className={config.color}>{config.label}</span>
                        <Badge variant="secondary" className="text-xs">{statusLeads.length}</Badge>
                      </div>
                      {pipelineValue > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(pipelineValue)}
                        </p>
                      )}
                    </div>
                    <div className="bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[350px]">
                      {statusLeads.map(lead => (
                        <LeadCard 
                          key={lead.id} 
                          lead={lead as any} 
                          onStatusChange={(newStatus) => handleStatusChange(lead.id, newStatus)}
                        />
                      ))}
                      {statusLeads.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-8">
                          Tidak ada lead
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          {isLoading ? (
            <LoadingState message="Memuat leads..." />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Nama</th>
                      <th className="text-left py-3 px-4 font-medium">Kontak</th>
                      <th className="text-left py-3 px-4 font-medium">Paket</th>
                      <th className="text-left py-3 px-4 font-medium">Assigned</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Follow Up</th>
                      <th className="text-left py-3 px-4 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads?.map(lead => {
                      const isOverdue = lead.follow_up_date && 
                        isPast(new Date(lead.follow_up_date)) && 
                        !isToday(new Date(lead.follow_up_date)) &&
                        lead.status !== 'won' && lead.status !== 'lost';

                      return (
                        <tr key={lead.id} className={cn(
                          "border-b last:border-0 hover:bg-muted/30",
                          isOverdue && "bg-red-50 dark:bg-red-950/10"
                        )}>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{lead.full_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{lead.source}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {lead.phone && (
                                <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                  className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600" title="WhatsApp">
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {lead.phone && (
                                <a href={`tel:${lead.phone}`} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600" title="Telepon">
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {lead.email && (
                                <a href={`mailto:${lead.email}`} className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600" title="Email">
                                  <Mail className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {lead.package?.name || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {(lead as any).assigned_profile?.full_name || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={cn("font-normal", STATUS_CONFIG[lead.status as LeadStatus]?.bgColor, STATUS_CONFIG[lead.status as LeadStatus]?.color)}>
                              {STATUS_CONFIG[lead.status as LeadStatus]?.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {lead.follow_up_date ? (
                              <span className={cn(
                                "flex items-center gap-1",
                                isOverdue && "text-red-600 font-medium"
                              )}>
                                {isOverdue && <AlertTriangle className="h-3 w-3" />}
                                {format(new Date(lead.follow_up_date), 'dd MMM yyyy', { locale: idLocale })}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/admin/leads/${lead.id}`}>
                                Detail
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'amber' | 'green' | 'emerald' | 'red';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn("p-2 rounded-full", color ? colorClasses[color] : "bg-primary/10 text-primary")}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => void;
}

function LeadCard({ lead, onStatusChange }: LeadCardProps) {
  const currentIndex = KANBAN_COLUMNS.indexOf(lead.status as LeadStatus);
  const canMoveForward = currentIndex < KANBAN_COLUMNS.length - 1;
  const nextStatus = canMoveForward ? KANBAN_COLUMNS[currentIndex + 1] : null;

  const isOverdue = lead.follow_up_date && 
    isPast(new Date(lead.follow_up_date)) && 
    !isToday(new Date(lead.follow_up_date)) &&
    lead.status !== 'won' && lead.status !== 'lost';

  const assignedName = lead.assigned_profile?.full_name;

  return (
    <Card className={cn(
      "cursor-pointer hover:shadow-md transition-shadow",
      isOverdue && "border-red-400 bg-red-50/50 dark:bg-red-950/20"
    )}>
      <CardContent className="p-3">
        <Link to={`/admin/leads/${lead.id}`} className="block">
          <div className="flex items-start justify-between mb-1">
            <p className="font-medium text-sm leading-tight">{lead.full_name}</p>
          </div>
          
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {lead.source && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{lead.source}</Badge>
            )}
            {assignedName && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <User className="h-2.5 w-2.5 mr-0.5" />
                {assignedName}
              </Badge>
            )}
          </div>

          {lead.package?.name && (
            <p className="text-xs text-muted-foreground mb-1">
              📦 {lead.package.name}
            </p>
          )}

          {(lead.package?.price_quad || 0) > 0 && (
            <p className="text-xs font-medium text-primary mb-2">
              {formatCurrency(lead.package!.price_quad)}
            </p>
          )}
          
          {/* Quick contact actions */}
          <div className="flex items-center gap-1 mb-2">
            {lead.phone && (
              <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600" title="WhatsApp">
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600" title="Telepon">
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600" title="Email">
                <Mail className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          
          {lead.follow_up_date && (
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1",
              isOverdue ? "text-red-600 font-medium" : "text-amber-600"
            )}>
              {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
              {isOverdue ? "Overdue: " : ""}
              {format(new Date(lead.follow_up_date), 'dd MMM', { locale: idLocale })}
            </div>
          )}
        </Link>
        
        {nextStatus && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="w-full mt-2 text-xs h-7"
            onClick={(e) => {
              e.preventDefault();
              onStatusChange(nextStatus);
            }}
          >
            Pindah ke {STATUS_CONFIG[nextStatus].label}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
