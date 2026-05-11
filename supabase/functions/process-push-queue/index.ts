import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Load VAPID config from website_settings
  const { data: settings } = await admin
    .from("website_settings")
    .select("custom_sections")
    .limit(1)
    .maybeSingle();

  const vapid = (settings?.custom_sections as any)?.push_vapid_config;
  if (!vapid?.publicKey || !vapid?.privateKey || !vapid?.enabled) {
    return new Response(
      JSON.stringify({ error: "VAPID not configured or disabled" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  webpush.setVapidDetails(
    vapid.subject || "mailto:admin@vinstour.com",
    vapid.publicKey,
    vapid.privateKey
  );

  // Claim a batch of pending rows
  const batchSize = 50;
  const { data: pending, error: pendErr } = await admin
    .from("push_outbox")
    .select("id, user_ids, customer_ids, title, body, type, url, attempts")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(batchSize);

  if (pendErr) {
    return new Response(JSON.stringify({ error: pendErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!pending?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ids = pending.map((p: any) => p.id);
  await admin.from("push_outbox").update({ status: "processing" }).in("id", ids);

  let totalSent = 0;
  let totalFailed = 0;
  const expiredSubIds: string[] = [];

  for (const job of pending as any[]) {
    let q = admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("is_active", true);

    const userIds: string[] = job.user_ids || [];
    const customerIds: string[] = job.customer_ids || [];

    if (userIds.length && customerIds.length) {
      q = q.or(
        `user_id.in.(${userIds.join(",")}),customer_id.in.(${customerIds.join(",")})`
      );
    } else if (userIds.length) {
      q = q.in("user_id", userIds);
    } else if (customerIds.length) {
      q = q.in("customer_id", customerIds);
    } else {
      await admin
        .from("push_outbox")
        .update({ status: "failed", last_error: "no targets", attempts: (job.attempts || 0) + 1 })
        .eq("id", job.id);
      continue;
    }

    const { data: subs } = await q;
    const payload = JSON.stringify({
      title: job.title,
      body: job.body,
      type: job.type || "info",
      url: job.url || "/jamaah",
      icon: "/images/icon-192.png",
      badge: "/images/icon-192.png",
    });

    let sent = 0;
    let failed = 0;
    let lastErr: string | null = null;

    await Promise.all(
      (subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          failed++;
          lastErr = err?.message || String(err);
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            expiredSubIds.push(s.id);
          }
        }
      })
    );

    totalSent += sent;
    totalFailed += failed;

    await admin
      .from("push_outbox")
      .update({
        status: sent > 0 || (subs?.length ?? 0) === 0 ? "sent" : "failed",
        attempts: (job.attempts || 0) + 1,
        sent_at: new Date().toISOString(),
        last_error: failed > 0 ? lastErr : null,
      })
      .eq("id", job.id);
  }

  if (expiredSubIds.length) {
    await admin.from("push_subscriptions").delete().in("id", expiredSubIds);
  }

  return new Response(
    JSON.stringify({
      processed: pending.length,
      sent: totalSent,
      failed: totalFailed,
      cleaned: expiredSubIds.length,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});