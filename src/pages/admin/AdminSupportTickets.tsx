import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  Search, MessageSquare, Clock, CheckCircle2, 
  AlertCircle, User, Send, Filter
} from "lucide-react";

const CATEGORIES = [
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'TRANSPORT', label: 'Transportasi' },
  { value: 'FOOD', label: 'Makanan' },
  { value: 'APP', label: 'Aplikasi' },
  { value: 'OTHER', label: 'Lainnya' },
];

const PRIORITIES = [
  { value: 'low', label: 'Rendah', color: 'bg-gray-500' },
  { value: 'medium', label: 'Sedang', color: 'bg-yellow-500' },
  { value: 'high', label: 'Tinggi', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

const STATUSES = [
  { value: 'open', label: 'Open', variant: 'default' as const },
  { value: 'in_progress', label: 'In Progress', variant: 'secondary' as const },
  { value: 'resolved', label: 'Resolved', variant: 'outline' as const },
  { value: 'closed', label: 'Closed', variant: 'outline' as const },
];

interface SupportTicket {
  id: string;
  ticket_code: string;
  user_id: string;
  category: string | null;
  priority: string;
  subject: string;
  description: string;
  status: string;
  assigned_to: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: { full_name: string | null };
  assigned_profile?: { full_name: string | null };
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
  user_profile?: { full_name: string | null };
}

export default function AdminSupportTickets() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as SupportTicket[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const { data: responses } = useQuery({
    queryKey: ['ticket-responses', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TicketResponse[];
    },
    enabled: !!selectedTicket,
    staleTime: 1000 * 60 * 2,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      toast.success('Status tiket diperbarui');
    },
  });

  const sendResponseMutation = useMutation({
    mutationFn: async ({ ticketId, message, isInternal }: { ticketId: string; message: string; isInternal: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message,
          is_internal_note: isInternal,
        });
      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (selectedTicket?.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', ticketId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-responses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      setResponseText("");
      toast.success('Balasan terkirim');
    },
    onError: (error: any) => {
      toast.error('Gagal mengirim balasan: ' + error.message);
    },
  });

  const filteredTickets = tickets?.filter(t => {
    const matchSearch = t.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const ticketsByStatus = {
    open: tickets?.filter(t => t.status === 'open').length || 0,
    in_progress: tickets?.filter(t => t.status === 'in_progress').length || 0,
    resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
  };

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs text-white ${p?.color || 'bg-gray-500'}`}>
        {p?.label || priority}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Helpdesk</h1>
        <p className="text-muted-foreground">Kelola tiket support dan komplain jamaah</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tickets?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Tiket</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ticketsByStatus.open}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ticketsByStatus.in_progress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ticketsByStatus.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket List */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari tiket..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {isLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : filteredTickets?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada tiket
                    </div>
                  ) : (
                    filteredTickets?.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_code}</span>
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant={STATUSES.find(s => s.value === ticket.status)?.variant || 'default'}>
                            {STATUSES.find(s => s.value === ticket.status)?.label || ticket.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: localeId })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground mb-1">{selectedTicket.ticket_code}</p>
                    <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === selectedTicket.category)?.label || selectedTicket.category}
                      </Badge>
                      {getPriorityBadge(selectedTicket.priority)}
                    </div>
                  </div>
                  <Select 
                    value={selectedTicket.status} 
                    onValueChange={(v) => updateStatusMutation.mutate({ ticketId: selectedTicket.id, status: v })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  {/* Original Message */}
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {(selectedTicket.user_profile as any)?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {(selectedTicket.user_profile as any)?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedTicket.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  {/* Responses */}
                  <div className="space-y-3">
                    {responses?.map((resp) => (
                      <div 
                        key={resp.id} 
                        className={`p-3 rounded-lg ${
                          resp.is_internal_note 
                            ? 'bg-yellow-50 border border-yellow-200' 
                            : 'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        {resp.is_internal_note && (
                          <Badge variant="outline" className="mb-2 text-xs">Internal Note</Badge>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {(resp.user_profile as any)?.full_name?.charAt(0) || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-xs">
                              {(resp.user_profile as any)?.full_name || 'Staff'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(resp.created_at), "dd MMM HH:mm")}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm">{resp.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Reply Box */}
                <div className="p-4 border-t bg-muted/30">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Tulis balasan..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm"
                        disabled={!responseText.trim() || sendResponseMutation.isPending}
                        onClick={() => sendResponseMutation.mutate({
                          ticketId: selectedTicket.id,
                          message: responseText,
                          isInternal: isInternalNote,
                        })}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={isInternalNote ? "secondary" : "outline"}
                        onClick={() => setIsInternalNote(!isInternalNote)}
                        title="Toggle Internal Note"
                      >
                        🔒
                      </Button>
                    </div>
                  </div>
                  {isInternalNote && (
                    <p className="text-xs text-yellow-600 mt-1">Internal note - tidak terlihat oleh user</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Pilih tiket untuk melihat detail</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
