import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * LOY-FIX4 — Reminder cicilan tabungan.
 * Dipanggil harian via pg_cron. Mengirim notifikasi ke jamaah untuk:
 *   • Cicilan jatuh tempo dalam 3 hari ke depan
 *   • Cicilan yang sudah lewat (overdue) dan belum lunas
 *   • Mark schedule sebagai overdue jika tanggal sudah lewat
 * Mendukung WhatsApp via tabel whatsapp_logs (sebagai outbox) — gateway WA
 * eksternal dapat memproses outbox terpisah.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const threeDaysAhead = new Date(today.getTime() + 3 * 86400000)
    .toISOString().slice(0, 10);

  const summary = { upcoming: 0, overdue: 0, marked_overdue: 0 };

  // 1. Mark passed-due schedules as overdue
  const { data: passed } = await supabase
    .from("savings_schedules")
    .select("id")
    .lt("due_date", todayStr)
    .in("status", ["pending", "partial"]);
  if (passed?.length) {
    await supabase
      .from("savings_schedules")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .in("id", passed.map((p: any) => p.id));
    summary.marked_overdue = passed.length;
  }

  // 2. Upcoming due in 3 days
  const { data: upcoming } = await supabase
    .from("savings_schedules")
    .select(
      `id, due_date, amount, installment_number,
       savings_plan_id,
       savings_plans!inner(customer_id, customers(user_id, full_name, phone))`,
    )
    .gte("due_date", todayStr)
    .lte("due_date", threeDaysAhead)
    .in("status", ["pending", "partial"]);

  for (const s of (upcoming as any[]) ?? []) {
    const cust = s.savings_plans?.customers;
    if (!cust?.user_id) continue;
    const days = Math.ceil(
      (new Date(s.due_date).getTime() - today.getTime()) / 86400000,
    );
    const dayLabel = days <= 0 ? "hari ini" : days === 1 ? "besok" : `${days} hari lagi`;
    const message = `Cicilan tabungan #${s.installment_number} sebesar Rp ${Number(s.amount).toLocaleString("id-ID")} jatuh tempo ${dayLabel}.`;

    await supabase.from("notifications").insert({
      user_id: cust.user_id,
      title: "💰 Cicilan Tabungan",
      message,
      type: "info",
      link: "/jamaah/tabungan",
    });

    if (cust.phone) {
      await supabase.from("whatsapp_logs").insert({
        recipient_phone: cust.phone,
        message_content: `Assalamualaikum ${cust.full_name},\n\n${message}\n\nMohon segera lakukan pembayaran. Terima kasih.`,
        status: "pending",
      }).then(() => {}, () => {});
    }
    summary.upcoming++;
  }

  // 3. Overdue: kirim reminder mendesak (tiap hari)
  const { data: overdueRows } = await supabase
    .from("savings_schedules")
    .select(
      `id, due_date, amount, installment_number,
       savings_plans!inner(customer_id, customers(user_id, full_name, phone))`,
    )
    .eq("status", "overdue");

  for (const s of (overdueRows as any[]) ?? []) {
    const cust = s.savings_plans?.customers;
    if (!cust?.user_id) continue;
    const daysLate = Math.ceil(
      (today.getTime() - new Date(s.due_date).getTime()) / 86400000,
    );
    const message = `Cicilan #${s.installment_number} sebesar Rp ${Number(s.amount).toLocaleString("id-ID")} terlambat ${daysLate} hari. Segera lakukan pembayaran.`;

    await supabase.from("notifications").insert({
      user_id: cust.user_id,
      title: "⚠️ Cicilan Terlambat",
      message,
      type: "warning",
      link: "/jamaah/tabungan",
    });

    if (cust.phone) {
      await supabase.from("whatsapp_logs").insert({
        recipient_phone: cust.phone,
        message_content: `Assalamualaikum ${cust.full_name},\n\n${message}\n\nMohon konfirmasi atau hubungi admin jika ada kendala. Terima kasih.`,
        status: "pending",
      }).then(() => {}, () => {});
    }
    summary.overdue++;
  }

  return new Response(
    JSON.stringify({ ok: true, summary, ranAt: new Date().toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});