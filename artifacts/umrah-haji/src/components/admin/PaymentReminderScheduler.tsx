import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, isPast, isToday, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  BellOff,
  MessageCircle,
  Mail,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarClock,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReminderSlot {
  /** days before deadline */
  days: 7 | 3 | 1;
  label: string;
  description: string;
}

const SLOTS: ReminderSlot[] = [
  { days: 7, label: "H-7", description: "7 hari sebelum jatuh tempo" },
  { days: 3, label: "H-3", description: "3 hari sebelum jatuh tempo" },
  { days: 1, label: "H-1", description: "1 hari sebelum jatuh tempo" },
];

type Channel = "wa" | "email";

interface ReminderConfig {
  days: 7 | 3 | 1;
  wa: boolean;
  email: boolean;
}

interface Props {
  booking: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rtKey(days: number, channel: Channel) {
  return `h${days}_${channel}` as string;
}

function buildWAMessage(booking: any, daysUntil: number) {
  const customer = booking.customer as any;
  const departure = booking.departure as any;
  const pkg = departure?.package;
  const name = customer?.full_name || "Jamaah";
  const remaining = formatCurrency(
    booking.remaining_amount ?? Math.max(0, (booking.total_price || 0) - (booking.paid_amount || 0))
  );
  const deadline = booking.payment_deadline
    ? format(new Date(booking.payment_deadline), "dd MMMM yyyy", { locale: localeId })
    : "-";

  if (daysUntil === 0 || daysUntil < 0) {
    return (
      `Assalamu'alaikum *${name}* 🤲\n\n` +
      `⏰ *HARI INI — Jatuh Tempo Pembayaran!*\n\n` +
      `Hari ini adalah batas pembayaran untuk booking Anda.\n\n` +
      `📋 Kode Booking: *${booking.booking_code}*\n` +
      `🕌 Paket: *${pkg?.name || "-"}*\n` +
      `💰 Sisa Tagihan: *${remaining}*\n\n` +
      `Segera lakukan pelunasan agar perjalanan ibadah Anda dapat diproses.\n\nBarakallahu fiikum 🌙`
    );
  }

  return (
    `Assalamu'alaikum *${name}* 🤲\n\n` +
    `⏰ *Pengingat Pembayaran — ${daysUntil} Hari Lagi*\n\n` +
    `📋 Kode Booking: *${booking.booking_code}*\n` +
    `🕌 Paket: *${pkg?.name || "-"}*\n` +
    `💰 Sisa Tagihan: *${remaining}*\n` +
    `📅 Jatuh Tempo: *${deadline}*\n\n` +
    `Segera selesaikan pembayaran agar perjalanan ibadah Anda dapat diproses.\n\nBarakallahu fiikum 🌙`
  );
}

function buildEmailBody(booking: any, daysUntil: number) {
  return buildWAMessage(booking, daysUntil);
}

// ─── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status || status === "pending") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-bold border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
        <Clock className="h-2.5 w-2.5 mr-1" /> Terjadwal
      </Badge>
    );
  }
  if (status === "sent") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-bold border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Terkirim
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-bold border-red-300 text-red-700 bg-red-50 dark:bg-red-950/30">
        <XCircle className="h-2.5 w-2.5 mr-1" /> Gagal
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-bold text-muted-foreground">
        <BellOff className="h-2.5 w-2.5 mr-1" /> Dibatalkan
      </Badge>
    );
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PaymentReminderScheduler({ booking }: Props) {
  const queryClient = useQueryClient();
  const deadline: Date | null = booking.payment_deadline
    ? new Date(booking.payment_deadline)
    : null;
  const customer = booking.customer as any;

  // ── Fetch existing reminders ────────────────────────────────────────────────
  const { data: existingReminders = [], isLoading } = useQuery({
    queryKey: ["payment-reminders", booking.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_reminders")
        .select("*")
        .eq("booking_id", booking.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Build lookup map: reminder_type → row
  const reminderMap = Object.fromEntries(
    existingReminders.map((r: any) => [r.reminder_type, r])
  );

  // ── Local config state (derived from DB on first render) ─────────────────
  const [configs, setConfigs] = useState<ReminderConfig[]>(() =>
    SLOTS.map((slot) => ({
      days: slot.days,
      wa: !!reminderMap[rtKey(slot.days, "wa")],
      email: !!reminderMap[rtKey(slot.days, "email")],
    }))
  );

  const [isSending, setIsSending] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Update config and mark dirty
  const updateConfig = (days: 7 | 3 | 1, field: "wa" | "email", value: boolean) => {
    setConfigs((prev) =>
      prev.map((c) => (c.days === days ? { ...c, [field]: value } : c))
    );
    setIsDirty(true);
  };

  // ── Save mutation ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!deadline) throw new Error("Jatuh tempo belum diatur");

      // Delete all existing pending reminders for this booking
      await (supabase as any)
        .from("payment_reminders")
        .delete()
        .eq("booking_id", booking.id)
        .eq("status", "pending");

      // Insert new ones based on config
      const toInsert: any[] = [];
      for (const cfg of configs) {
        const scheduledAt = addDays(deadline, -cfg.days);
        if (cfg.wa) {
          toInsert.push({
            booking_id: booking.id,
            reminder_type: rtKey(cfg.days, "wa"),
            scheduled_at: scheduledAt.toISOString(),
            status: "pending",
            message_content: buildWAMessage(
              booking,
              differenceInDays(deadline, new Date())
            ),
          });
        }
        if (cfg.email) {
          toInsert.push({
            booking_id: booking.id,
            reminder_type: rtKey(cfg.days, "email"),
            scheduled_at: scheduledAt.toISOString(),
            status: "pending",
            message_content: buildEmailBody(
              booking,
              differenceInDays(deadline, new Date())
            ),
          });
        }
      }

      if (toInsert.length > 0) {
        const { error } = await (supabase as any)
          .from("payment_reminders")
          .insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Jadwal reminder berhasil disimpan");
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["payment-reminders", booking.id] });
    },
    onError: (err: any) => toast.error(err.message || "Gagal menyimpan jadwal"),
  });

  // ── Manual send ─────────────────────────────────────────────────────────────
  const handleSendNow = async (days: 7 | 3 | 1, channel: Channel) => {
    const key = `${days}_${channel}`;
    setIsSending((prev) => ({ ...prev, [key]: true }));

    const daysUntil = deadline ? differenceInDays(deadline, new Date()) : 0;

    try {
      if (channel === "wa") {
        // Try API server first
        try {
          const res = await fetch("/api/whatsapp/payment-reminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ booking_id: booking.id }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            toast.success("Reminder WA berhasil dikirim");
            // Mark as sent in DB
            const rt = rtKey(days, "wa");
            if (reminderMap[rt]) {
              await (supabase as any)
                .from("payment_reminders")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("id", reminderMap[rt].id);
              queryClient.invalidateQueries({ queryKey: ["payment-reminders", booking.id] });
            }
            return;
          }
        } catch {
          // fallback
        }

        // Fallback: open wa.me link
        if (!customer?.phone) {
          toast.error("No. WhatsApp jamaah tidak tersedia");
          return;
        }
        const phone = customer.phone.replace(/^0/, "62").replace(/\D/g, "");
        const msg = encodeURIComponent(buildWAMessage(booking, daysUntil));
        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
        toast.info("Pesan WA dibuka di tab baru — kirim secara manual");

        // Log as sent optimistically
        const rt = rtKey(days, "wa");
        if (reminderMap[rt]) {
          await (supabase as any)
            .from("payment_reminders")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", reminderMap[rt].id);
          queryClient.invalidateQueries({ queryKey: ["payment-reminders", booking.id] });
        }
      } else {
        // Email: open mailto
        if (!customer?.email) {
          toast.error("Alamat email jamaah tidak tersedia");
          return;
        }
        const subject = encodeURIComponent(
          `Pengingat Pembayaran Booking ${booking.booking_code}`
        );
        const body = encodeURIComponent(buildEmailBody(booking, daysUntil));
        window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`, "_blank");
        toast.info("Email dibuka di aplikasi mail — kirim secara manual");

        const rt = rtKey(days, "email");
        if (reminderMap[rt]) {
          await (supabase as any)
            .from("payment_reminders")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", reminderMap[rt].id);
          queryClient.invalidateQueries({ queryKey: ["payment-reminders", booking.id] });
        }
      }
    } finally {
      setIsSending((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ── Computed values per slot ────────────────────────────────────────────────
  const slotInfo = SLOTS.map((slot) => {
    const scheduledDate = deadline ? addDays(deadline, -slot.days) : null;
    const isOverdue = scheduledDate ? isPast(scheduledDate) && !isToday(scheduledDate) : false;
    const isDue = scheduledDate ? isToday(scheduledDate) : false;
    const daysUntilSend = scheduledDate
      ? differenceInDays(scheduledDate, new Date())
      : null;
    const waRow = reminderMap[rtKey(slot.days, "wa")];
    const emailRow = reminderMap[rtKey(slot.days, "email")];
    const cfg = configs.find((c) => c.days === slot.days)!;
    return { slot, scheduledDate, isOverdue, isDue, daysUntilSend, waRow, emailRow, cfg };
  });

  const totalEnabled = configs.reduce(
    (acc, c) => acc + (c.wa ? 1 : 0) + (c.email ? 1 : 0),
    0
  );

  const hasAnyActive = existingReminders.some(
    (r: any) => r.status === "pending"
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Card className="overflow-hidden border-none shadow-md">
      {/* Header */}
      <div className="bg-violet-500/5 px-6 py-4 border-b flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2 text-violet-700 dark:text-violet-400">
          <CalendarClock className="h-5 w-5" />
          Jadwal Reminder Pembayaran
        </h2>
        <div className="flex items-center gap-2">
          {hasAnyActive && (
            <Badge className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700 font-bold">
              <Bell className="h-3 w-3 mr-1" />
              {existingReminders.filter((r: any) => r.status === "pending").length} aktif
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["payment-reminders", booking.id] })}
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <CardContent className="p-5 space-y-4">
        {/* No deadline warning */}
        {!deadline && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Jatuh tempo belum diatur</p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                Atur batas bayar di bagian "Catatan & Info" agar jadwal reminder bisa dihitung.
              </p>
            </div>
          </div>
        )}

        {/* Paid info */}
        {(booking.payment_status === "paid" || booking.payment_status === "verified") && (
          <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs font-medium">Booking sudah lunas — reminder tidak diperlukan.</p>
          </div>
        )}

        {/* Deadline display */}
        {deadline && (
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-muted-foreground font-medium">Jatuh Tempo</span>
            <span className="font-black text-primary">
              {format(deadline, "dd MMMM yyyy", { locale: localeId })}
              {differenceInDays(deadline, new Date()) >= 0 && (
                <span className="ml-2 text-xs font-bold text-muted-foreground">
                  ({differenceInDays(deadline, new Date())} hari lagi)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Slot rows */}
        <div className="space-y-2">
          {slotInfo.map(({ slot, scheduledDate, isOverdue, isDue, daysUntilSend, waRow, emailRow, cfg }) => (
            <div
              key={slot.days}
              className={cn(
                "rounded-xl border-2 overflow-hidden transition-colors",
                cfg.wa || cfg.email
                  ? "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20"
                  : "border-muted bg-muted/20"
              )}
            >
              {/* Row header */}
              <div className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black",
                    cfg.wa || cfg.email
                      ? "bg-violet-600 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {slot.label}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight">{slot.description}</p>
                    {scheduledDate ? (
                      <p className={cn(
                        "text-[11px] font-medium",
                        isOverdue ? "text-red-500" : isDue ? "text-amber-500" : "text-muted-foreground"
                      )}>
                        {isOverdue ? "⚠ Sudah lewat · " : isDue ? "🔔 Hari ini · " : ""}
                        {format(scheduledDate, "EEE, d MMM yyyy", { locale: localeId })}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">— (atur jatuh tempo dulu)</p>
                    )}
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex flex-col gap-1 shrink-0">
                  {waRow && <StatusBadge status={waRow.status} />}
                  {emailRow && emailRow !== waRow && <StatusBadge status={emailRow.status} />}
                </div>
              </div>

              {/* Channel toggles */}
              <div className="border-t border-inherit px-4 py-2.5 flex flex-wrap items-center gap-4">
                {/* WA toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id={`wa-${slot.days}`}
                    checked={cfg.wa}
                    onCheckedChange={(v) => updateConfig(slot.days, "wa", v)}
                    disabled={!deadline}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <Label
                    htmlFor={`wa-${slot.days}`}
                    className="text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    WhatsApp
                  </Label>
                </div>

                {/* Email toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id={`email-${slot.days}`}
                    checked={cfg.email}
                    onCheckedChange={(v) => updateConfig(slot.days, "email", v)}
                    disabled={!deadline}
                    className="data-[state=checked]:bg-blue-500"
                  />
                  <Label
                    htmlFor={`email-${slot.days}`}
                    className="text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Mail className="h-3.5 w-3.5 text-blue-600" />
                    Email
                  </Label>
                </div>

                {/* Spacer + Kirim Sekarang buttons */}
                {(cfg.wa || cfg.email) && (
                  <div className="ml-auto flex gap-1.5">
                    {cfg.wa && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[10px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        onClick={() => handleSendNow(slot.days, "wa")}
                        disabled={!!isSending[`${slot.days}_wa`]}
                      >
                        {isSending[`${slot.days}_wa`] ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Send className="h-3 w-3 mr-1" />
                        )}
                        WA Sekarang
                      </Button>
                    )}
                    {cfg.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[10px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                        onClick={() => handleSendNow(slot.days, "email")}
                        disabled={!!isSending[`${slot.days}_email`]}
                      >
                        {isSending[`${slot.days}_email`] ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Mail className="h-3 w-3 mr-1" />
                        )}
                        Email Sekarang
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Reminder terjadwal otomatis dikirim oleh sistem sesuai tanggal.{" "}
            Gunakan <span className="font-bold">Kirim Sekarang</span> untuk pengiriman manual kapan saja.
          </p>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-1 gap-3">
          <div className="text-xs text-muted-foreground">
            {totalEnabled > 0 ? (
              <span className="font-medium text-violet-700 dark:text-violet-400">
                {totalEnabled} reminder aktif
              </span>
            ) : (
              <span>Tidak ada reminder aktif</span>
            )}
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending || !deadline}
            size="sm"
            className={cn(
              "h-9 px-5 font-black text-xs rounded-xl transition-all",
              isDirty
                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md"
                : "opacity-60"
            )}
          >
            {saveMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                {isDirty ? "Simpan Jadwal" : "Tersimpan"}
              </span>
            )}
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
