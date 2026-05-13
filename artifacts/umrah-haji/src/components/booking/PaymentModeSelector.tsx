import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, CreditCard, PiggyBank, Info } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PaymentMode = "full" | "dp" | "savings";

interface PaymentModeSelectorProps {
  totalPrice: number;
  mode: PaymentMode;
  dpAmount: number;
  savingsPlanId?: string;
  onModeChange: (mode: PaymentMode) => void;
  onDpAmountChange: (amount: number) => void;
  onSavingsPlanChange: (id: string | undefined) => void;
}

const DP_PERCENT = 0.3; // minimum 30%

export function PaymentModeSelector({
  totalPrice,
  mode,
  dpAmount,
  savingsPlanId,
  onModeChange,
  onDpAmountChange,
  onSavingsPlanChange,
}: PaymentModeSelectorProps) {
  const { user } = useAuth();
  const minDp = Math.ceil(totalPrice * DP_PERCENT);

  // Auto set DP minimum saat mode dipilih
  useEffect(() => {
    if (mode === "dp" && (!dpAmount || dpAmount < minDp)) {
      onDpAmountChange(minDp);
    }
  }, [mode, minDp]);

  const { data: savingsPlans } = useQuery({
    queryKey: ["user-active-savings-plans", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // savings_plans uses customer_id, not user_id
      const { data: customer } = await (supabase as any)
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!customer?.id) return [];
      const { data } = await (supabase as any)
        .from("savings_plans")
        .select("id, target_amount, paid_amount, remaining_amount, status, converted_booking_id")
        .eq("customer_id", customer.id)
        .eq("status", "active")
        .is("converted_booking_id", null);
      return data || [];
    },
    enabled: !!user?.id && mode === "savings",
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Mode Pembayaran
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={mode} onValueChange={(v) => onModeChange(v as PaymentMode)} className="space-y-2">
          <Label
            htmlFor="pm-full"
            className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <RadioGroupItem value="full" id="pm-full" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <CreditCard className="h-4 w-4" /> Lunas
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Bayar penuh sekarang: {formatCurrency(totalPrice)}
              </p>
            </div>
          </Label>

          <Label
            htmlFor="pm-dp"
            className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <RadioGroupItem value="dp" id="pm-dp" className="mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Wallet className="h-4 w-4" /> Uang Muka (DP)
              </div>
              <p className="text-xs text-muted-foreground">
                Minimal {formatCurrency(minDp)} (30% dari total). Sisa {formatCurrency(Math.max(0, totalPrice - (dpAmount || 0)))} dilunasi sebelum H-30.
              </p>
              {mode === "dp" && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    min={minDp}
                    max={totalPrice}
                    value={dpAmount || ""}
                    onChange={(e) => onDpAmountChange(Number(e.target.value) || 0)}
                    className="max-w-[220px]"
                  />
                  <span className="text-xs text-muted-foreground">IDR</span>
                </div>
              )}
            </div>
          </Label>

          <Label
            htmlFor="pm-savings"
            className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <RadioGroupItem value="savings" id="pm-savings" className="mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <PiggyBank className="h-4 w-4" /> Pakai Tabungan Umroh
              </div>
              <p className="text-xs text-muted-foreground">
                Gunakan saldo tabungan aktif Anda. Sisa kekurangan akan ditagihkan terpisah.
              </p>
              {mode === "savings" && (
                <>
                  {!user ? (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Silakan login untuk memilih tabungan.
                    </p>
                  ) : !savingsPlans?.length ? (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Anda belum memiliki tabungan aktif.
                    </p>
                  ) : (
                    <Select value={savingsPlanId || ""} onValueChange={onSavingsPlanChange}>
                      <SelectTrigger className="max-w-md">
                        <SelectValue placeholder="Pilih tabungan" />
                      </SelectTrigger>
                      <SelectContent>
                        {savingsPlans.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            Saldo {formatCurrency(p.paid_amount || 0)} / target {formatCurrency(p.target_amount || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
          </Label>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
