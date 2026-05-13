import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/**
 * BOOK-FIX7 — Guest checkout recovery.
 * Redeems a one-time access token from the URL `?t=…` and redirects
 * the user to their booking detail page.
 */
export default function BookingRecover() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("t");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Memverifikasi link akses…");

  useEffect(() => {
    (async () => {
      if (!token) {
        setState("error");
        setMessage("Token tidak ditemukan di URL.");
        return;
      }
      const { data, error } = await (supabase.rpc as any)("redeem_booking_access_token", {
        _token: token,
      });
      if (error || !data?.ok) {
        setState("error");
        setMessage(
          data?.error === "invalid_or_expired"
            ? "Link sudah kadaluwarsa atau tidak valid."
            : "Gagal memverifikasi link.",
        );
        return;
      }
      setState("ok");
      setMessage("Berhasil! Mengalihkan ke detail booking…");
      setTimeout(() => navigate(`/customer/bookings/${data.booking_id}`), 1200);
    })();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          {state === "loading" && <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />}
          {state === "ok" && <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />}
          {state === "error" && <AlertCircle className="h-10 w-10 text-destructive mx-auto" />}
          <p className="text-sm text-muted-foreground">{message}</p>
          {state === "error" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth/login">Login Manual</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}