import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Users, Search, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";

export default function AgentJamaah() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Get agent data
  const { data: agentData } = useQuery({
    queryKey: ['agent-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Get bookings by this agent with customer data
  const { data: jamaahList, isLoading } = useQuery({
    queryKey: ['agent-jamaah', agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      // First get bookings by this agent
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_code,
          booking_status,
          created_at,
          departure:departures(
            departure_date,
            package:packages(name)
          )
        `)
        .eq('agent_id', agentData!.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Then get passengers for these bookings
      const bookingIds = bookings.map(b => b.id);
      const { data: passengers, error: passengersError } = await supabase
        .from('booking_passengers')
        .select(`
          id,
          booking_id,
          passenger_type,
          is_main_passenger,
          customer:customers(*)
        `)
        .in('booking_id', bookingIds);

      if (passengersError) throw passengersError;

      // Combine data
      const jamaahData = passengers.map(p => {
        const booking = bookings.find(b => b.id === p.booking_id);
        return {
          ...p,
          booking_code: booking?.booking_code,
          booking_status: booking?.booking_status,
          departure_date: (booking?.departure as any)?.departure_date,
          package_name: (booking?.departure as any)?.package?.name,
        };
      });

      return jamaahData;
    },
  });

  const filteredJamaah = jamaahList?.filter((j: any) => {
    const customer = j.customer;
    if (!customer) return false;
    const search = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.nik?.toLowerCase().includes(search) ||
      customer.passport_number?.toLowerCase().includes(search) ||
      j.booking_code?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: jamaahList?.length || 0,
    complete: jamaahList?.filter((j: any) => 
      j.customer?.nik && j.customer?.passport_number && j.customer?.passport_expiry
    ).length || 0,
    incomplete: jamaahList?.filter((j: any) => 
      !j.customer?.nik || !j.customer?.passport_number || !j.customer?.passport_expiry
    ).length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Jamaah</h1>
        <p className="text-muted-foreground">
          Kelola data jamaah yang Anda daftarkan
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Jamaah</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Lengkap</p>
                <p className="text-2xl font-bold text-green-600">{stats.complete}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perlu Dilengkapi</p>
                <p className="text-2xl font-bold text-amber-600">{stats.incomplete}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, telepon, NIK, paspor, atau kode booking..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Jamaah List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daftar Jamaah
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !filteredJamaah || filteredJamaah.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm ? "Tidak ada jamaah yang cocok" : "Belum ada jamaah yang didaftarkan"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Keberangkatan</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Paspor</TableHead>
                    <TableHead>Status Data</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJamaah.map((jamaah: any) => {
                    const customer = jamaah.customer;
                    const isComplete = customer?.nik && customer?.passport_number && customer?.passport_expiry;
                    
                    return (
                      <TableRow key={jamaah.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer?.full_name || '-'}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {jamaah.booking_code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{jamaah.package_name || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {jamaah.departure_date ? formatDate(jamaah.departure_date) : '-'}
                        </TableCell>
                        <TableCell>{customer?.phone || '-'}</TableCell>
                        <TableCell>
                          {customer?.passport_number ? (
                            <div>
                              <p className="font-mono text-sm">{customer.passport_number}</p>
                              {customer.passport_expiry && (
                                <p className="text-xs text-muted-foreground">
                                  Exp: {formatDate(customer.passport_expiry)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Belum ada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isComplete ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Lengkap
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Belum Lengkap
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer && (
                            <EditCustomerDialog 
                              customer={customer}
                              onSuccess={() => {}}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
