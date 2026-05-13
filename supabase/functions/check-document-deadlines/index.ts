import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * KEP-FIX1 — Cron job: scan dokumen & visa yang akan kedaluwarsa /
 * keberangkatan dekat tanpa visa, lalu kirim notifikasi (in-app + push).
 *
 * Dipanggil tiap pagi via pg_cron.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const sixMonthsAhead = new Date(today);
  sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

  let totalNotified = 0;
  const summary: Record<string, number> = {
    passport_expiring: 0,
    visa_pending_h30: 0,
    docs_incomplete_h45: 0,
  };

  // 1. Paspor < 6 bulan dari hari ini (atau dari tgl keberangkatan jika ada)
  const { data: expiring } = await supabase
    .from("customers")
    .select("id, user_id, full_name, passport_number, passport_expiry")
    .not("passport_expiry", "is", null)
    .lte("passport_expiry", sixMonthsAhead.toISOString().slice(0, 10))
    .gte("passport_expiry", todayStr);

  for (const c of expiring ?? []) {
    if (!c.user_id) continue;
    const days = Math.ceil(
      (new Date(c.passport_expiry).getTime() - today.getTime()) / 86400000,
    );
    await supabase.from("notifications").insert({
      user_id: c.user_id,
      title: "⚠️ Paspor Akan Kedaluwarsa",
      message: `Paspor Anda (${c.passport_number ?? "—"}) akan kedaluwarsa dalam ${days} hari. Segera perpanjang sebelum keberangkatan.`,
      type: "warning",
      link: "/jamaah/dokumen",
    });
    summary.passport_expiring++;
    totalNotified++;
  }

  // 2. Visa pending dengan keberangkatan ≤ 30 hari
  const { data: visaPending } = await supabase
    .from("visa_applications")
    .select("id, customer_id, status, departure_id, departures(departure_date), customers(user_id, full_name)")
    .in("status", ["pending", "submitted", "processing"]);

  for (const v of (visaPending as any[]) ?? []) {
    const depDate = v.departures?.departure_date;
    const userId = v.customers?.user_id;
    if (!depDate || !userId) continue;
    const days = Math.ceil((new Date(depDate).getTime() - today.getTime()) / 86400000);
    if (days < 0 || days > 30) continue;
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "🛂 Visa Belum Selesai",
      message: `Keberangkatan tinggal ${days} hari, tetapi visa Anda masih berstatus "${v.status}". Segera hubungi admin.`,
      type: "warning",
      link: "/jamaah/dokumen",
    });
    summary.visa_pending_h30++;
    totalNotified++;
  }

  // 3. Dokumen kurang lengkap, keberangkatan ≤ 45 hari
  const { data: nearDepartures } = await supabase
    .from("departures")
    .select("id, departure_date")
    .gte("departure_date", todayStr)
    .lte(
      "departure_date",
      new Date(today.getTime() + 45 * 86400000).toISOString().slice(0, 10),
    );

  for (const d of nearDepartures ?? []) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("customer_id, customers(user_id, full_name)")
      .eq("departure_id", d.id)
      .not("booking_status", "in", "(cancelled,refunded)");

    for (const b of (bookings as any[]) ?? []) {
      const userId = b.customers?.user_id;
      if (!userId) continue;
      const { count } = await supabase
        .from("customer_documents")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", b.customer_id)
        .eq("status", "verified");
      if ((count ?? 0) < 2) {
        const days = Math.ceil(
          (new Date(d.departure_date).getTime() - today.getTime()) / 86400000,
        );
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "📄 Dokumen Belum Lengkap",
          message: `Keberangkatan tinggal ${days} hari. Dokumen Anda belum lengkap (terverifikasi: ${count ?? 0}). Segera lengkapi.`,
          type: "warning",
          link: "/jamaah/dokumen",
        });
        summary.docs_incomplete_h45++;
        totalNotified++;
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, totalNotified, summary, ranAt: new Date().toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});