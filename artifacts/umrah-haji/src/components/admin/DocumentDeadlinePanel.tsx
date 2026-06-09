import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, isAfter, isBefore, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Calendar, Clock, Send, Loader2, AlertTriangle, CheckCircle2,
  Bell, Users, MessageCircle, Save
} from "lucide-react";

const supabase: any = supabaseRaw;

export function DocumentDeadlinePanel() {
  const queryClient = useQueryClient();
  const [selectedDepId, setSelectedDepId] = useState("");
  const [editingDeadline, setEditingDeadline] = useState("");
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderProgress, setReminderProgress] = useState<{ sent: number; total: number } | null>(null);

  // Load departures with document_deadline
  const { data: departures = [], isLoading: depsLoading } = useQuery({
    queryKey: ["departures-with-deadline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departures")
        .select(`id, departure_date, return_date, status, document_deadline,
                 package:packages(name)`)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const selectedDep = departures.find((d: any) => d.id === selectedDepId);

  // Load bookings for selected departure
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["dep-bookings-for-deadline", selectedDepId],
    enabled: !!selectedDepId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, booking_code,
          customer:customers(id, full_name, phone)
        `)
        .eq("departure_id", selectedDepId)
        .not("booking_status", "eq", "cancelled");
      return data || [];
    },
  });

  const customerIds = bookings.map((b: any) => b.customer?.id).filter(Boolean);

  // Load customer documents for those customers
  const { data: customerDocs = [], isLoading: docsLoading } = useQuery({
    queryKey: ["customer-docs-deadline", customerIds.join(",")],
    enabled: customerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_documents")
        .select("customer_id, status, document_type_id")
        .in("customer_id", customerIds);
      return data || [];
    },
  });

  // Load required doc types count
  const { data: requiredDocTypes = [] } = useQuery({
    queryKey: ["required-doc-types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_types")
        .select("id")
        .eq("is_active", true)
        .eq("is_required", true);
      return data || [];
    },
  });

  // Compute which customers have incomplete docs
  const incompleteBookings = bookings.filter((b: any) => {
    const custId = b.customer?.id;
    if (!custId || !b.customer?.phone) return false;
    const verifiedCount = customerDocs.filter(
      (d: any) => d.customer_id === custId && d.status === "verified"
    ).length;
    return verifiedCount < requiredDocTypes.length;
  });

  const completeBookings = bookings.filter((b: any) => {
    const custId = b.customer?.id;
    if (!custId) return false;
    const verifiedCount = customerDocs.filter(
      (d: any) => d.customer_id === custId && d.status === "verified"
    ).length;
    return verifiedCount >= requiredDocTypes.length;
  });

  const completionPct = bookings.length > 0
    ? Math.round((completeBookings.length / bookings.length) * 100)
    : 0;

  // Deadline status
  const deadlineDate = selectedDep?.document_deadline ? new Date(selectedDep.document_deadline) : null;
  const today = new Date();
  const daysLeft = deadlineDate ? differenceInDays(deadlineDate, today) : null;
  const isOverdue = deadlineDate ? isAfter(today, deadlineDate) : false;
  const isUrgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;

  // Save deadline
  const handleSaveDeadline = async () => {
    if (!selectedDepId || !editingDeadline) { toast.error("Pilih tanggal deadline"); return; }
    setIsSavingDeadline(true);
    try {
      const { error } = await supabase
        .from("departures")
        .update({ document_deadline: new Date(editingDeadline).toISOString() })
        .eq("id", selectedDepId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["departures-with-deadline"] });
      toast.success("Deadline dokumen berhasil disimpan");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSavingDeadline(false);
    }
  };

  // Send reminder WA
  const handleSendReminder = async () => {
    if (incompleteBookings.length === 0) { toast.error("Semua jamaah sudah melengkapi dokumen"); return; }
    setIsSendingReminder(true);
    setReminderProgress({ sent: 0, total: incompleteBookings.length });

    const session = (await supabase.auth.getSession()).data.session;
    const depName = (selectedDep?.package as any)?.name || "keberangkatan";
    const depDate = selectedDep?.departure_date
      ? format(new Date(selectedDep.departure_date), "dd MMMM yyyy", { locale: localeId })
      : "-";
    const deadlineStr = deadlineDate
      ? format(deadlineDate, "dd MMMM yyyy", { locale: localeId })
      : "-";

    for (let i = 0; i < incompleteBookings.length; i++) {
      const booking = incompleteBookings[i];
      const customer = booking.customer;
      if (!customer?.phone) continue;

      const verifiedCount = customerDocs.filter(
        (d: any) => d.customer_id === customer.id && d.status === "verified"
      ).length;
      const remaining = requiredDocTypes.length - verifiedCount;

      const message =
        `Halo *${customer.full_name}*, kami mengingatkan Anda untuk segera melengkapi dokumen perjalanan.\n\n` +
        `📋 *Paket:* ${depName}\n` +
        `✈️ *Keberangkatan:* ${depDate}\n` +
        `⏰ *Deadline Upload:* ${deadlineStr}\n\n` +
        `Saat ini masih ada *${remaining} dokumen* yang belum terverifikasi. Segera upload melalui portal jamaah atau hubungi agen Anda.\n\n` +
        `_Terima kasih – Vinstour Travel_`;

      try {
        await fetch("/api/documents/send-wa", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ phone: customer.phone, message }),
        });
      } catch (_) { /* continue on error */ }

      setReminderProgress({ sent: i + 1, total: incompleteBookings.length });
      if (i < incompleteBookings.length - 1) await new Promise(r => setTimeout(r, 800));
    }

    setIsSendingReminder(false);
    toast.success(`Pengingat berhasil dikirim ke ${incompleteBookings.length} jamaah`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Deadline Upload Dokumen
        </CardTitle>
        <CardDescription>
          Atur batas waktu upload dokumen per keberangkatan dan kirim pengingat otomatis ke jamaah yang belum lengkap
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Departure selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase">Pilih Keberangkatan</Label>
          {depsLoading ? <Skeleton className="h-10 w-full" /> : (
            <Select value={selectedDepId} onValueChange={v => { setSelectedDepId(v); setEditingDeadline(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih keberangkatan..." />
              </SelectTrigger>
              <SelectContent>
                {departures.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      {format(new Date(d.departure_date), "dd MMM yyyy", { locale: localeId })} — {(d.package as any)?.name}
                      {d.document_deadline && (
                        <Badge variant="outline" className="text-[9px] px-1">
                          Deadline: {format(new Date(d.document_deadline), "dd MMM")}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedDepId && (
          <>
            {/* Current deadline + stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deadline card */}
              <div className={cn(
                "rounded-xl p-4 border-2",
                isOverdue ? "bg-red-50 border-red-300" :
                isUrgent ? "bg-amber-50 border-amber-300" :
                deadlineDate ? "bg-green-50 border-green-200" :
                "bg-muted/30 border-muted"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className={cn("h-4 w-4",
                    isOverdue ? "text-red-600" :
                    isUrgent ? "text-amber-600" :
                    deadlineDate ? "text-green-600" :
                    "text-muted-foreground"
                  )} />
                  <span className="font-semibold text-sm">Deadline Saat Ini</span>
                </div>
                {deadlineDate ? (
                  <>
                    <p className="text-xl font-bold">
                      {format(deadlineDate, "dd MMMM yyyy", { locale: localeId })}
                    </p>
                    <p className={cn("text-sm mt-1",
                      isOverdue ? "text-red-600 font-semibold" :
                      isUrgent ? "text-amber-600 font-semibold" :
                      "text-muted-foreground"
                    )}>
                      {isOverdue ? "⚠️ Deadline sudah lewat" :
                       isUrgent ? `⏰ ${daysLeft} hari lagi` :
                       `${daysLeft} hari lagi`}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Belum diatur</p>
                )}
              </div>

              {/* Completion stats */}
              <div className="rounded-xl p-4 bg-muted/30 border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Kelengkapan Dokumen</span>
                  </div>
                  <span className="text-sm font-bold">{completionPct}%</span>
                </div>
                {bookingsLoading || docsLoading ? (
                  <Skeleton className="h-2 w-full" />
                ) : (
                  <>
                    <Progress value={completionPct} className="h-2 mb-2" />
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600 font-medium">✓ {completeBookings.length} lengkap</span>
                      <span className="text-amber-600 font-medium">⚠ {incompleteBookings.length} belum lengkap</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Set deadline */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Ubah Deadline</Label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={editingDeadline}
                  onChange={e => setEditingDeadline(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveDeadline} disabled={!editingDeadline || isSavingDeadline}>
                  {isSavingDeadline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {isSavingDeadline ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Deadline akan ditampilkan kepada jamaah di portal mereka sebagai batas waktu upload dokumen
              </p>
            </div>

            {/* Send reminder */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Kirim Pengingat WA</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Kirim pesan WhatsApp pengingat ke <strong>{incompleteBookings.length} jamaah</strong> yang belum melengkapi dokumen.
                {incompleteBookings.length === 0 && " (Semua jamaah sudah lengkap 🎉)"}
              </p>

              {isSendingReminder && reminderProgress && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span>Mengirim pengingat...</span>
                    <span>{reminderProgress.sent}/{reminderProgress.total}</span>
                  </div>
                  <Progress
                    value={Math.round((reminderProgress.sent / reminderProgress.total) * 100)}
                    className="h-2"
                  />
                </div>
              )}

              {incompleteBookings.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 border rounded-lg p-2 bg-muted/20">
                  {incompleteBookings.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2 text-xs py-0.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="font-medium">{b.customer?.full_name}</span>
                      <span className="text-muted-foreground">{b.customer?.phone || "Tanpa no. HP"}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleSendReminder}
                disabled={isSendingReminder || incompleteBookings.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 gap-2"
              >
                {isSendingReminder ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim ({reminderProgress?.sent}/{reminderProgress?.total})...</>
                ) : (
                  <><MessageCircle className="h-4 w-4" /> Kirim Pengingat ke {incompleteBookings.length} Jamaah</>
                )}
              </Button>
            </div>
          </>
        )}

        {!selectedDepId && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Pilih keberangkatan untuk mengatur deadline</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
