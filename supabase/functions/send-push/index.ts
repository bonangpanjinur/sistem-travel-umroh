import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendPushBody {
  title: string;
  body: string;
  type?: string;
  url?: string;
  user_ids?: string[];
  customer_ids?: string[];
  send_to_all?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Authn: must be admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Role check
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  const allowed = ["super_admin", "owner", "branch_manager", "admin"];
  const isAllowed = (roleRows || []).some((r: any) => allowed.includes(r.role));
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: SendPushBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body?.title || !body?.body) {
    return new Response(JSON.stringify({ error: "title and body required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load VAPID public config from DB; PRIVATE key MUST come from secret env (RBAC-F2).
  const { data: settings } = await admin
    .from("website_settings")
    .select("custom_sections")
    .limit(1)
    .maybeSingle();

  const vapid = (settings?.custom_sections as any)?.push_vapid_config || {};
  // Prefer secret env; fallback to legacy DB value (deprecated, will be removed).
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || vapid.privateKey;
  if (!vapid?.publicKey || !privateKey || !vapid?.enabled) {
    return new Response(
      JSON.stringify({ error: "VAPID not configured. Set VAPID_PRIVATE_KEY secret + public key in admin panel and enable push." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  webpush.setVapidDetails(
    vapid.subject || "mailto:admin@vinstour.com",
    vapid.publicKey,
    privateKey
  );

  // Build subscription query
  let q = admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id, customer_id")
    .eq("is_active", true);

  if (body.user_ids?.length) q = q.in("user_id", body.user_ids);
  else if (body.customer_ids?.length) q = q.in("customer_id", body.customer_ids);
  // else: send_to_all -> no extra filter

  const { data: subs, error: subsErr } = await q;
  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = JSON.stringify({
    title: body.title,
    body: body.body,
    type: body.type || "info",
    url: body.url || "/jamaah",
    icon: "/images/icon-192.png",
    badge: "/images/icon-192.png",
  });

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

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
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredIds.push(s.id);
        }
      }
    })
  );

  // Cleanup expired subscriptions
  if (expiredIds.length) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return new Response(
    JSON.stringify({ sent, failed, total: subs?.length ?? 0, cleaned: expiredIds.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});