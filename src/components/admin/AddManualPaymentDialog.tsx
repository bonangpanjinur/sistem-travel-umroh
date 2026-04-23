import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddManualPaymentDialogProps {
  trigger?: React.ReactNode;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Tunai" },
  { value: "transfer", label: "Transfer Bank" },
  { value: "edc", label: "EDC / Kartu" },
  { value: "qris", label: "QRIS" },
  { value: "other", label: "Lainnya" },
];

export function AddManualPaymentDialog({ trigger }: AddManualPaymentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["manual-payment-bookings", search],
    enabled: open,
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(
          `id, booking_code, total_price, paid_amount, remaining_amount, payment_status,
           customer:customers(full_name, phone)`
        )
        .neq("booking_status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(50);

      if (search.trim()) {
        const sanitized = search.replace(/[%_()\\*?{}[\]]/g, "");
        if (sanitized.trim()) {
          query = query.or(
            `booking_code.ilike.%${sanitized}%,customer_id.in.(select id from customers where full_name.ilike.%${sanitized}%)`
          );
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const selectedBooking = useMemo(
    () => bookings?.find((b: any) => b.id === bookingId),
    [bookings, bookingId]
  );

  const reset = () => {
    setBookingId("");
    setSearch("");
    setAmount("");
    setPaymentMethod("cash");
    setBankName("");
    setAccountName("");
    setAccountNumber("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setProofFile(null);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!bookingId) throw new Error("Pilih booking terlebih dahulu");
      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum <= 0) throw new Error("Jumlah tidak valid");

      // Generate payment code via DB
      const { data: codeData, error: codeError } = await supabase.rpc(
        "generate_payment_code"
      );
      if (codeError) throw codeError;
      const paymentCode = codeData || `PAY${Date.now().toString(36).toUpperCase()}`;

      // Upload proof if present
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const path = `manual/${paymentCode}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(path, proofFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(path);
        proofUrl = urlData.publicUrl;
      }

      const finalNotes = `Manual entry by Finance${notes ? ` — ${notes}` : ""}`;

      const { error: insertError } = await supabase.from("payments").insert({
        booking_id: bookingId,
        payment_code: paymentCode,
        amount: amountNum,
        payment_method: paymentMethod,
        bank_name: bankName || null,
        account_name: accountName || null,
        account_number: accountNumber || null,
        payment_date: paymentDate,
        proof_url: proofUrl,
        status: "paid",
        notes: finalNotes,
        verified_at: new Date().toISOString(),
        verified_by: user?.id || null,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Pembayaran manual berhasil dicatat");
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      reset();
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mencatat pembayaran");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Catat Pembayaran
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran Manual</DialogTitle>
          <DialogDescription>
            Untuk pembayaran offline (tunai, transfer langsung) yang belum tercatat
            di sistem. Status akan langsung "Disetujui".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking autocomplete */}
          <div className="space-y-1.5">
            <Label>Booking *</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {selectedBooking ? (
                    <span className="truncate">
                      <span className="font-mono">{selectedBooking.booking_code}</span>
                      {" — "}
                      {(selectedBooking.customer as any)?.full_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Cari kode booking atau nama jamaah...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Ketik kode atau nama..."
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    {loadingBookings ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Mencari...
                      </div>
                    ) : !bookings || bookings.length === 0 ? (
                      <CommandEmpty>Tidak ditemukan</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {bookings.map((b: any) => (
                          <CommandItem
                            key={b.id}
                            value={b.id}
                            onSelect={() => {
                              setBookingId(b.id);
                              const remaining = b.remaining_amount || 0;
                              if (remaining > 0 && !amount) {
                                setAmount(String(remaining));
                              }
                              setSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                bookingId === b.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">
                                  {b.booking_code}
                                </span>
                                <span className="truncate">
                                  {b.customer?.full_name}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Sisa: {formatCurrency(b.remaining_amount || 0)} dari{" "}
                                {formatCurrency(b.total_price)}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedBooking && (
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(selectedBooking.total_price)} • Sudah dibayar:{" "}
                {formatCurrency(selectedBooking.paid_amount || 0)} • Sisa:{" "}
                <span className="font-medium text-destructive">
                  {formatCurrency(selectedBooking.remaining_amount || 0)}
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jumlah *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Pembayaran</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Metode Pembayaran *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(paymentMethod === "transfer" || paymentMethod === "edc") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bank</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="BCA, Mandiri, dll"
                />
              </div>
              <div className="space-y-1.5">
                <Label>No. Rekening</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Atas Nama</Label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Bukti Pembayaran (opsional)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan (opsional)"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={
              submitMutation.isPending || !bookingId || !amount || !paymentMethod
            }
          >
            {submitMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Simpan Pembayaran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { DialogTrigger } from "@/components/ui/dialog";
