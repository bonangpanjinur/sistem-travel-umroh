// Generate a booking access token + log it (email/WA delivery hooks).
// POST { booking_id, email?, phone? } → returns { url, token }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_BASE_URL = Deno.env.get("PUBLIC_BASE_URL") ?? "";

function randomToken(len = 40): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { booking_id, email, phone } = body ?? {};
  if (!booking_id || typeof booking_id !== "string") {
    return new Response(JSON.stringify({ error: "booking_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, booking_code")
    .eq("id", booking_id)
    .maybeSingle();
  if (bErr || !booking) {
    return new Response(JSON.stringify({ error: "booking_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = randomToken();
  const { error: insErr } = await supabase
    .from("booking_access_tokens")
    .insert({ booking_id, token, email: email ?? null, phone: phone ?? null });
  if (insErr) {
    return new Response(JSON.stringify({ error: insErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const origin = req.headers.get("origin") || PUBLIC_BASE_URL || "";
  const url = `${origin}/booking/recover?t=${token}`;
  const message = `Halo! Akses booking Anda (${booking.booking_code}): ${url}\nLink berlaku 30 hari.`;

  return new Response(
    JSON.stringify({ ok: true, token, url, booking_code: booking.booking_code, message }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});