import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency } from '@/lib/format';
import { Users, TrendingUp, Link2, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useQuery as useAgentQuery } from '@tanstack/react-query';

export default function AgentMyReferrals() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Ambil data agen berdasarkan user
  const { data: agent } = useQuery({
    queryKey: ['agent_profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, company_name, agent_code, slug')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Ambil booking yang direferral oleh agen ini
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['agent_referral_bookings', agent?.id],
    enabled: !!agent?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_code, booking_status, payment_status,
          total_price, total_pax, created_at,
          customers(id, full_name, email, phone),
          departures(
            departure_date,
            packages(id, name, package_type)
          )
        `)
        .eq('agent_id', agent!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const agentSlug = agent?.slug || agent?.agent_code?.toLowerCase();
  const agentWebsiteUrl = agentSlug
    ? `${window.location.origin}/a/${agentSlug}`
    : null;

  const copyLink = () => {
    if (!agentWebsiteUrl) return;
    navigator.clipboard.writeText(agentWebsiteUrl).then(() => {
      setCopied(true);
      toast({ title: 'Link disalin!', description: agentWebsiteUrl });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalBookings = bookings?.length || 0;
  const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
  const confirmedBookings = bookings?.filter(b => b.booking_status === 'confirmed' || b.booking_status === 'completed').length || 0;

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-800' },
    processing: { label: 'Diproses', color: 'bg-purple-100 text-purple-800' },
    completed: { label: 'Selesai', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral & Booking Saya</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Semua booking yang masuk melalui website agen Anda akan otomatis tercatat di sini.
        </p>
      </div>

      {/* Link website agen */}
      {agentWebsiteUrl && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Link Website Agen Anda
            </CardTitle>
            <CardDescription>
              Bagikan link ini ke calon jamaah. Booking yang masuk via link ini otomatis tercatat atas nama Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background border rounded px-3 py-2 text-sm font-mono truncate">
                {agentWebsiteUrl}
              </code>
              <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Disalin' : 'Salin'}
              </Button>
              <Button size="sm" asChild>
                <a href={agentWebsiteUrl} target="_blank" rel="noopener noreferrer">
                  Lihat Website
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Booking</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booking Konfirmasi</p>
                <p className="text-2xl font-bold">{confirmedBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Nilai</p>
                <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daftar booking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Booking via Website Anda</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !bookings?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada booking via website Anda</p>
              <p className="text-sm mt-1">Bagikan link website Anda ke calon jamaah untuk mulai mendapatkan booking.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(booking => {
                const statusCfg = STATUS_CONFIG[booking.booking_status ?? ''] || { label: booking.booking_status ?? '-', color: 'bg-gray-100 text-gray-800' };
                const customer = booking.customers as any;
                const dep = booking.departures as any;
                const pkg = dep?.packages;
                return (
                  <div key={booking.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{(customer?.full_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{customer?.full_name || 'Jamaah'}</p>
                      <p className="text-xs text-muted-foreground truncate">{pkg?.name || '-'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{formatCurrency(booking.total_price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {booking.created_at ? format(new Date(booking.created_at), 'dd MMM yy', { locale: idLocale }) : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
