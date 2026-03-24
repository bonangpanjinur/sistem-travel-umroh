import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Edit2, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Example component demonstrating granular permission usage in UI
 * This component shows how to conditionally render UI elements based on granular permissions
 */
export function BookingListWithPermissions() {
  const { hasPermission, canPerformAction } = usePermissions();

  // Fetch bookings data
  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Check permissions
  const canViewBookings = hasPermission("bookings.view");
  const canCreateBooking = canPerformAction("bookings", "create");
  const canEditBooking = canPerformAction("bookings", "edit");
  const canDeleteBooking = canPerformAction("bookings", "delete");

  // If user doesn't have permission to view bookings
  if (!canViewBookings) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Anda tidak memiliki izin untuk melihat daftar booking. Silakan hubungi administrator untuk mendapatkan akses.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Daftar Booking</h1>

        {/* Create button - only visible if user has permission */}
        {canCreateBooking && (
          <Button onClick={() => window.location.href = "/bookings/new"}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Booking Baru
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">Memuat data...</div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Terjadi kesalahan saat memuat data booking.</AlertDescription>
        </Alert>
      ) : bookings.length === 0 ? (
        <Alert>
          <AlertDescription>Tidak ada data booking.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking: any) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Booking #{booking.id.slice(0, 8).toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-semibold">{booking.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tanggal Dibuat</p>
                      <p className="font-semibold">
                        {new Date(booking.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons - visibility based on permissions */}
                  <div className="flex gap-2 pt-4 border-t">
                    {canEditBooking && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/bookings/${booking.id}/edit`}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}

                    {canDeleteBooking && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Apakah Anda yakin ingin menghapus booking ini?")) {
                            // Handle delete
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                    )}

                    {/* If user has no edit or delete permissions, show a message */}
                    {!canEditBooking && !canDeleteBooking && (
                      <p className="text-sm text-gray-500 italic">
                        Anda tidak memiliki izin untuk mengubah atau menghapus booking ini.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
