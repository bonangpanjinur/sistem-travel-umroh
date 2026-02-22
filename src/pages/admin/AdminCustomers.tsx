import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, User, Phone, Mail, Users, FileCheck, Calendar, Star, UserPlus, Plus } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { RegisterAsJamaahDialog } from "@/components/admin/RegisterAsJamaahDialog";
import { AddCustomerDialog } from "@/components/admin/AddCustomerDialog";
import { useCustomers } from "@/hooks/useCustomers";
import { LoadingState } from "@/components/shared/LoadingState";

export default function AdminCustomers() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: customers, isLoading } = useCustomers();

  // Fetch booking counts per customer
  const { data: bookingCounts } = useQuery({
    queryKey: ['admin-customer-booking-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('customer_id');

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      (data || []).forEach(b => {
        counts[b.customer_id] = (counts[b.customer_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch document counts per customer
  const { data: documentCounts } = useQuery({
    queryKey: ['admin-customer-document-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_documents')
        .select('customer_id, status');

      if (error) throw error;
      
      const counts: Record<string, { total: number; verified: number }> = {};
      (data || []).forEach(d => {
        if (!counts[d.customer_id]) {
          counts[d.customer_id] = { total: 0, verified: 0 };
        }
        counts[d.customer_id].total++;
        if (d.status === 'verified') {
          counts[d.customer_id].verified++;
        }
      });
      return counts;
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filteredCustomers = customers?.filter(customer => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.phone?.includes(search) ||
      customer.nik?.includes(search) ||
      customer.passport_number?.includes(search)
    );
  });

  const stats = {
    total: customers?.length || 0,
    withBookings: Object.keys(bookingCounts || {}).length,
    withDocuments: Object.keys(documentCounts || {}).length,
    tourLeaders: customers?.filter(c => c.is_tour_leader).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Data Jamaah</h1>
          <p className="text-muted-foreground">Lihat dan kelola data jamaah</p>
        </div>
        <div className="flex items-center gap-2">
          <AddCustomerDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Jamaah
              </Button>
            }
          />
          <RegisterAsJamaahDialog
            trigger={
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Daftarkan Saya
              </Button>
            }
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, NIK, paspor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-72"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pernah Booking</p>
                <p className="text-2xl font-bold">{stats.withBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dokumen Lengkap</p>
                <p className="text-2xl font-bold">{stats.withDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tour Leader</p>
                <p className="text-2xl font-bold">{stats.tourLeaders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState />
          ) : !filteredCustomers || filteredCustomers.length === 0 ? (
            <EmptyState
              icon={User}
              title={searchTerm ? 'Tidak ada jamaah yang cocok' : 'Belum ada data jamaah'}
              description={searchTerm ? `Tidak ditemukan hasil untuk "${searchTerm}"` : 'Tambahkan jamaah baru untuk memulai'}
            />
          ) : (
            <div className="divide-y">
              {filteredCustomers
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((customer) => {
                const bookingCount = bookingCounts?.[customer.id] || 0;
                const docInfo = documentCounts?.[customer.id];
                
                return (
                  <div key={customer.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{customer.full_name}</p>
                            {customer.is_tour_leader && (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                TL
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {customer.gender && (
                              <Badge variant="outline" className="text-xs">
                                {customer.gender === 'male' ? 'L' : 'P'}
                              </Badge>
                            )}
                            {customer.passport_number && (
                              <Badge variant="outline" className="text-xs font-mono">
                                {customer.passport_number}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right text-sm hidden sm:block">
                          <p className="text-muted-foreground">NIK</p>
                          <p className="font-mono">{customer.nik || '-'}</p>
                        </div>
                        <div className="text-center hidden md:block">
                          <p className="text-2xl font-bold">{bookingCount}</p>
                          <p className="text-xs text-muted-foreground">Booking</p>
                        </div>
                        {docInfo && (
                          <div className="text-center hidden md:block">
                            <p className="text-lg font-semibold">{docInfo.verified}/{docInfo.total}</p>
                            <p className="text-xs text-muted-foreground">Dokumen</p>
                          </div>
                        )}
                        <div className="text-right text-sm hidden lg:block">
                          <p className="text-muted-foreground">Terdaftar</p>
                          <p>{format(new Date(customer.created_at), 'd MMM yyyy', { locale: id })}</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/customers/${customer.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredCustomers && filteredCustomers.length > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {Math.min((currentPage - 1) * pageSize + 1, filteredCustomers.length)}-{Math.min(currentPage * pageSize, filteredCustomers.length)} dari {filteredCustomers.length} jamaah
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </Button>
            <span className="text-sm font-medium">
              {currentPage} / {Math.ceil(filteredCustomers.length / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(Math.ceil((filteredCustomers?.length || 0) / pageSize), p + 1))}
              disabled={currentPage >= Math.ceil((filteredCustomers?.length || 0) / pageSize)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}