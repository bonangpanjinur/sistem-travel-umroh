import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Phone, Mail, Calendar, Package, User,
  Clock, MessageSquare, CheckCircle, XCircle, Edit, Trash2,
  ArrowRight, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
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

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'follow_up', 'negotiation', 'closing', 'won'];

export default function AdminLeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ['admin-lead', id],
    queryFn: async (): Promise<Lead> => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          package:packages(id, name, code, price_quad),
          branch:branches(name),
          converted_booking:bookings(id, booking_code)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as unknown as Lead;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['packages-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, code, price_quad')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: departures } = useQuery({
    queryKey: ['departures-for-conversion', lead?.package_interest],
    enabled: !!lead?.package_interest,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departures')
        .select('id, departure_date, quota, booked_count')
        .eq('package_id', lead!.package_interest!)
        .eq('status', 'open')
        .gte('departure_date', new Date().toISOString().split('T')[0])
        .order('departure_date');
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Database["public"]["Tables"]["leads"]["Update"]>) => {
      const { error } = await supabase
        .from('leads')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lead', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      toast({ title: "Lead berhasil diperbarui" });
    },
    onError: (error: any) => {
      toast({ title: "Gagal memperbarui lead", description: error.message, variant: "destructive" });
    },
  });

  const addFollowUpMutation = useMutation({
    mutationFn: async () => {
      const currentNotes = lead?.notes || '';
      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      const newNote = `[${timestamp}] ${followUpNote}`;
      const updatedNotes = currentNotes ? `${newNote}\n\n${currentNotes}` : newNote;
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          notes: updatedNotes,
          follow_up_date: followUpDate || null,
          status: lead?.status === 'new' ? 'contacted' : lead?.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lead', id] });
      setFollowUpNote("");
      setFollowUpDate("");
      toast({ title: "Follow up berhasil ditambahkan" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (departureId: string) => {
      // Create customer first
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          full_name: lead!.full_name,
          phone: lead!.phone,
          email: lead!.email,
        })
        .select()
        .single();
      
      if (customerError) throw customerError;

      // Get package price
      const selectedPackage = packages?.find(p => p.id === lead!.package_interest);
      const basePrice = selectedPackage?.price_quad || 0;

      // Generate booking code
      const { data: bookingCode, error: bookingCodeError } = await supabase.rpc('generate_booking_code', { _package_code: selectedPackage?.code || '', _departure_date: new Date().toISOString().split('T')[0] });
      if (bookingCodeError) throw bookingCodeError;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          booking_code: bookingCode,
          customer_id: customer.id,
          departure_id: departureId,
          base_price: basePrice,
          total_price: basePrice,
          room_type: 'quad',
          total_pax: 1,
          adult_count: 1,
        })
        .select()
        .single();
      
      if (bookingError) throw bookingError;

      // Update lead as converted
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: 'won',
          converted_at: new Date().toISOString(),
          converted_booking_id: booking.id,
        })
        .eq('id', id);
      
      if (leadError) throw leadError;

      return booking;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['admin-lead', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      setIsConvertOpen(false);
      toast({ title: "Lead berhasil dikonversi menjadi booking!" });
      navigate(`/admin/bookings/${booking.id}`);
    },
    onError: (error: any) => {
      toast({ title: "Gagal mengkonversi lead", description: error.message, variant: "destructive" });
    },
  });

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      source: formData.get('source') as string || null,
      package_interest: formData.get('package_interest') as string || null,
    });
    setIsEditOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[400px] lg:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead tidak ditemukan</p>
        <Button asChild className="mt-4">
          <Link to="/admin/leads">Kembali ke Leads</Link>
        </Button>
      </div>
    );
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(lead.status as LeadStatus);
  const isConverted = lead.status === 'won' && lead.converted_booking_id;
  const isLost = lead.status === 'lost';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/leads">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lead.full_name}</h1>
          <p className="text-muted-foreground">Lead dari {lead.source || 'Unknown'}</p>
        </div>
        <Badge className={cn("text-sm", STATUS_CONFIG[lead.status as LeadStatus]?.bgColor, STATUS_CONFIG[lead.status as LeadStatus]?.color)}>
          {STATUS_CONFIG[lead.status as LeadStatus]?.label}
        </Badge>
      </div>

      {/* Status Pipeline */}
      {!isConverted && !isLost && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {STATUS_ORDER.slice(0, -1).map((status, index) => {
                const config = STATUS_CONFIG[status];
                const isActive = lead.status === status;
                const isPast = currentStatusIndex > index;
                
                return (
                  <div key={status} className="flex items-center gap-2 flex-1">
                    <button
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors text-center",
                        isActive && cn(config.bgColor, config.color),
                        isPast && "bg-muted text-muted-foreground",
                        !isActive && !isPast && "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                      onClick={() => updateMutation.mutate({ status })}
                    >
                      {config.label}
                    </button>
                    {index < STATUS_ORDER.length - 2 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Informasi Kontak</CardTitle>
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Lead</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nama Lengkap</Label>
                      <Input id="full_name" name="full_name" defaultValue={lead.full_name} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telepon</Label>
                        <Input id="phone" name="phone" defaultValue={lead.phone || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" defaultValue={lead.email || ''} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="source">Sumber</Label>
                        <Select name="source" defaultValue={lead.source || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih sumber" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="walk-in">Walk-in</SelectItem>
                            <SelectItem value="phone">Telepon</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="package_interest">Paket</Label>
                        <Select name="package_interest" defaultValue={lead.package_interest || ''}>
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
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        Simpan
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nama</p>
                    <p className="font-medium">{lead.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telepon</p>
                    <p className="font-medium">{lead.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paket Diminati</p>
                    <p className="font-medium">{lead.package?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sales/PIC</p>
                    <p className="font-medium">{lead.assigned_profile?.full_name || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Sumber</p>
                  <p className="font-medium capitalize">{lead.source || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal Dibuat</p>
                  <p className="font-medium">
                    {format(new Date(lead.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Terakhir Update</p>
                  <p className="font-medium">
                    {format(new Date(lead.updated_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes / Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Catatan & Aktivitas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add follow up */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <Textarea
                  placeholder="Tambah catatan follow up..."
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="follow_up_date" className="text-sm whitespace-nowrap">Jadwal follow up:</Label>
                    <Input
                      id="follow_up_date"
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-auto"
                    />
                  </div>
                  <Button 
                    onClick={() => addFollowUpMutation.mutate()}
                    disabled={!followUpNote.trim() || addFollowUpMutation.isPending}
                    size="sm"
                  >
                    {addFollowUpMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Tambah Catatan'
                    )}
                  </Button>
                </div>
              </div>

              {/* Notes history */}
              {lead.notes ? (
                <div className="space-y-3">
                  {lead.notes.split('\n\n').map((note, i) => (
                    <div key={i} className="p-3 bg-background border rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Belum ada catatan</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aksi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isConverted && !isLost && (
                <>
                  <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" disabled={!lead.package_interest}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Konversi ke Booking
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Konversi Lead ke Booking</DialogTitle>
                        <DialogDescription>
                          Pilih keberangkatan untuk membuat booking baru
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Paket</p>
                          <p className="font-medium">{lead.package?.name}</p>
                        </div>
                        
                        {departures && departures.length > 0 ? (
                          <div className="space-y-2">
                            <Label>Pilih Keberangkatan</Label>
                            {departures.map(dep => (
                              <Button
                                key={dep.id}
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => convertMutation.mutate(dep.id)}
                                disabled={convertMutation.isPending}
                              >
                                <span>
                                  {format(new Date(dep.departure_date), 'dd MMM yyyy', { locale: idLocale })}
                                </span>
                                <span className="text-muted-foreground">
                                  {dep.booked_count}/{dep.quota} pax
                                </span>
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            Tidak ada keberangkatan tersedia untuk paket ini
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => updateMutation.mutate({ status: 'lost' })}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Tandai Lost
                  </Button>
                </>
              )}

              {isConverted && (
                <Button asChild className="w-full" variant="outline">
                  <Link to={`/admin/bookings/${lead.converted_booking_id}`}>
                    Lihat Booking
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}

              {isLost && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => updateMutation.mutate({ status: 'new' })}
                >
                  Reaktivasi Lead
                </Button>
              )}

              {lead.phone && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-4 w-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Follow Up Schedule */}
          {lead.follow_up_date && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jadwal Follow Up</p>
                    <p className="font-medium">
                      {format(new Date(lead.follow_up_date), 'EEEE, dd MMM yyyy', { locale: idLocale })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isConverted && (
                  <TimelineItem
                    icon={CheckCircle}
                    title="Dikonversi ke Booking"
                    date={lead.converted_at}
                    color="green"
                  />
                )}
                {isLost && (
                  <TimelineItem
                    icon={XCircle}
                    title="Ditandai Lost"
                    date={lead.updated_at}
                    color="red"
                  />
                )}
                <TimelineItem
                  icon={Clock}
                  title="Terakhir diupdate"
                  date={lead.updated_at}
                />
                <TimelineItem
                  icon={User}
                  title="Lead dibuat"
                  date={lead.created_at}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface TimelineItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  date: string | null;
  color?: 'green' | 'red';
}

function TimelineItem({ icon: Icon, title, date, color }: TimelineItemProps) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={cn("p-1.5 rounded-full", color ? colorClasses[color] : "bg-muted")}>
        <Icon className="h-3 w-3" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        {date && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(date), 'dd MMM yyyy HH:mm', { locale: idLocale })}
          </p>
        )}
      </div>
    </div>
  );
}
