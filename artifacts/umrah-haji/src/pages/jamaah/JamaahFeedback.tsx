import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, Star, Loader2, MapPin, Calendar } from "lucide-react";

export default function JamaahFeedback() {
  const { bookingId } = useParams() as { bookingId: string };
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [location, setLocation] = useState("");

  // Fetch booking details
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-feedback", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          departure:departures(
            departure_date,
            return_date,
            package:packages(name, duration_days)
          )
        `)
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!user,
  });

  // Check if feedback already exists
  const { data: existingFeedback } = useQuery({
    queryKey: ["booking-existing-feedback", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!rating || !feedback.trim()) {
        throw new Error("Rating dan feedback tidak boleh kosong");
      }

      const departure = booking?.departure as any;
      const packageName = departure?.package?.name;

      if (existingFeedback) {
        // Update existing feedback
        const { error } = await supabase
          .from("testimonials")
          .update({
            rating,
            content: feedback,
            location: location || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        if (error) throw error;
      } else {
        // Create new feedback
        const { error } = await supabase
          .from("testimonials")
          .insert({
            id: bookingId,
            name: user?.email || "Anonymous",
            rating,
            content: feedback,
            location: location || null,
            package_name: packageName,
            is_published: false,
            is_featured: false,
            sort_order: 0,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Terima kasih atas feedback Anda!");
      queryClient.invalidateQueries({ queryKey: ["booking-existing-feedback", bookingId] });
      setTimeout(() => navigate("/my-bookings"), 2000);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal mengirim feedback");
    },
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PublicLayout>
    );
  }

  if (!booking) {
    return (
      <PublicLayout>
        <div className="container py-12 text-center max-w-2xl">
          <h1 className="text-2xl font-bold mb-4">Booking Tidak Ditemukan</h1>
          <Button asChild>
            <Link to="/my-bookings">Kembali ke Booking Saya</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const departure = booking.departure as any;
  const pkg = departure?.package;
  const isCompleted = booking.booking_status === "completed";

  return (
    <PublicLayout>
      <div className="container py-8 max-w-2xl">
        {/* Header */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/my-bookings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Booking Saya
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Berikan Rating & Feedback</h1>
          <p className="text-muted-foreground">
            Bagikan pengalaman Anda tentang perjalanan umroh ini
          </p>
        </div>

        {/* Trip Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{pkg?.name}</h3>
                <p className="text-sm text-muted-foreground">{pkg?.duration_days} Hari</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(departure?.departure_date), "d MMM yyyy", { locale: id })} -
                  {format(new Date(departure?.return_date), "d MMM yyyy", { locale: id })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Form */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Anda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rating */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Rating Kepuasan</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Rating Anda: <span className="font-semibold">{rating} dari 5 bintang</span>
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location" className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" />
                Lokasi Asal (Opsional)
              </Label>
              <Input
                id="location"
                placeholder="Kota/Provinsi Anda"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Feedback Text */}
            <div>
              <Label htmlFor="feedback" className="mb-2 block">
                Cerita Pengalaman Anda *
              </Label>
              <Textarea
                id="feedback"
                placeholder="Bagikan pengalaman Anda selama perjalanan umroh. Apa yang Anda sukai? Apa yang bisa ditingkatkan? (Minimal 20 karakter)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {feedback.length} karakter
              </p>
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 Feedback Anda akan membantu kami meningkatkan layanan. Feedback yang dipilih
                dapat ditampilkan di website kami.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/my-bookings")}
                disabled={submitFeedbackMutation.isPending}
              >
                Batal
              </Button>
              <Button
                onClick={() => submitFeedbackMutation.mutate()}
                disabled={!rating || feedback.trim().length < 20 || submitFeedbackMutation.isPending}
              >
                {submitFeedbackMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {existingFeedback ? "Update Feedback" : "Kirim Feedback"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        {!isCompleted && (
          <Card className="mt-6 bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-900">
                ℹ️ Feedback dapat diberikan setelah perjalanan Anda selesai (status: Selesai).
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}
