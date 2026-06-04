import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ThumbsUp, Loader2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PublicPackageReviewsProps {
  packageId: string;
  packageName?: string;
  showForm?: boolean;
}

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={cn("transition-colors", readonly ? "cursor-default" : "cursor-pointer")}
        >
          <Star className={cn("h-5 w-5",
            (hover || value) >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"
          )} />
        </button>
      ))}
    </div>
  );
}

export default function PublicPackageReviews({ packageId, packageName, showForm = true }: PublicPackageReviewsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [showFormState, setShowFormState] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["package-reviews", packageId],
    enabled: !!packageId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("package_reviews")
        .select("*, customer:customers(full_name)")
        .eq("package_id", packageId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data || [];
    },
  });

  const { data: myReview } = useQuery({
    queryKey: ["my-review", packageId, user?.id],
    enabled: !!user?.id && !!packageId,
    queryFn: async () => {
      const cust = await supabase.from("customers").select("id").eq("user_id", user!.id).maybeSingle();
      if (!cust.data) return null;
      const { data } = await (supabase as any)
        .from("package_reviews")
        .select("id, rating, comment")
        .eq("package_id", packageId)
        .eq("customer_id", cust.data.id)
        .maybeSingle();
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const custRes = await supabase.from("customers").select("id").eq("user_id", user!.id).maybeSingle();
      if (!custRes.data) throw new Error("Data jamaah tidak ditemukan");
      const { error } = await (supabase as any).from("package_reviews").upsert({
        package_id: packageId,
        customer_id: custRes.data.id,
        rating,
        comment: comment.trim(),
        is_public: true,
        created_at: new Date().toISOString(),
      }, { onConflict: "package_id,customer_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["package-reviews", packageId] });
      queryClient.invalidateQueries({ queryKey: ["my-review", packageId] });
      setShowFormState(false); setComment("");
      toast.success("Review berhasil dikirim! Terima kasih 🌟");
    },
    onError: (err: any) => toast.error("Gagal: " + err.message),
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / reviews.length
    : 0;

  const ratingDist = [5, 4, 3, 2, 1].map(n => ({
    star: n,
    count: reviews.filter((r: any) => Number(r.rating) === n).length,
    pct: reviews.length > 0 ? (reviews.filter((r: any) => Number(r.rating) === n).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Ulasan Jamaah {packageName ? `— ${packageName}` : ""}
        </h2>
        {user && showForm && !myReview && !showFormState && (
          <Button size="sm" variant="outline" onClick={() => setShowFormState(true)}>
            <Star className="h-4 w-4 mr-1 text-amber-400" /> Tulis Ulasan
          </Button>
        )}
      </div>

      {/* Rating Summary */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-5 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <div className="text-center">
            <p className="text-4xl font-bold text-amber-600">{avgRating.toFixed(1)}</p>
            <StarRating value={Math.round(avgRating)} readonly />
            <p className="text-xs text-muted-foreground mt-1">{reviews.length} ulasan</p>
          </div>
          <div className="flex-1 space-y-1">
            {ratingDist.map(d => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-right text-muted-foreground">{d.star}</span>
                <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="w-4 text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Form */}
      {(showFormState || (user && myReview)) && showForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold text-sm">{myReview ? "Ulasan Anda" : "Tulis Ulasan"}</p>
            {myReview ? (
              <div>
                <StarRating value={myReview.rating} readonly />
                <p className="text-sm mt-2">{myReview.comment}</p>
                <Badge className="text-[10px] mt-2 bg-green-100 text-green-700">Sudah diulas</Badge>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rating Anda</p>
                  <StarRating value={rating} onChange={setRating} />
                </div>
                <Textarea
                  placeholder="Bagikan pengalaman ibadah Anda bersama kami..."
                  value={comment} onChange={e => setComment(e.target.value)} rows={3}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowFormState(false); setComment(""); }}>Batal</Button>
                  <Button size="sm" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !comment.trim()}>
                    {submitMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Kirim Ulasan
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-medium">Belum ada ulasan</p>
          <p className="text-sm text-muted-foreground">Jadilah yang pertama mengulas paket ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {r.customer?.full_name?.[0] || "J"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{r.customer?.full_name || "Jamaah"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.created_at ? format(parseISO(r.created_at), "d MMM yyyy", { locale: localeId }) : ""}
                      </p>
                    </div>
                    <StarRating value={r.rating} readonly />
                    {r.comment && <p className="text-sm mt-1.5 text-gray-700">{r.comment}</p>}
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
