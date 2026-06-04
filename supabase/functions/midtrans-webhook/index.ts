// Midtrans webhook handler — auto-confirm payment + log notification
// Receives POST from Midtrans, verifies signature_key, updates payments/bookings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY") ?? "";

async function sha512Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
    payment_type,
  } = payload ?? {};

  // Verify signature: SHA512(order_id + status_code + gross_amount + server_key)
  let signatureValid = false;
  if (MIDTRANS_SERVER_KEY && order_id && status_code && gross_amount && signature_key) {
    const expected = await sha512Hex(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`);
    signatureValid = expected === signature_key;
  }

  // Always log
  const { data: logRow } = await supabase
    .from("midtrans_webhook_logs")
    .insert({
      order_id: order_id ?? "unknown",
      transaction_status,
      fraud_status,
      payment_type,
      gross_amount: Number(gross_amount) || null,
      signature_valid: signatureValid,
      payload,
    })
    .select("id")
    .single();

  if (!signatureValid) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // order_id format: PAY-<paymentCode> or BOOK-<bookingCode>
  const isSettled =
    transaction_status === "settlement" ||
    (transaction_status === "capture" && fraud_status === "accept");
  const isFailed = ["deny", "cancel", "expire", "failure"].includes(transaction_status);

  let processed = false;
  let errorMessage: string | null = null;

  try {
    // Find payment by payment_code or booking_code
    let payment: any = null;
    if (typeof order_id === "string" && order_id) {
      const code = order_id.replace(/^PAY-/, "").replace(/^BOOK-/, "");
      const { data } = await supabase
        .from("payments")
        .select("id, booking_id, status")
        .eq("payment_code", code)
        .maybeSingle();
      payment = data;

      if (!payment) {
        const { data: byBooking } = await supabase
          .from("bookings")
          .select("id, booking_code")
          .eq("booking_code", code)
          .maybeSingle();
        if (byBooking) {
          const { data: pendingPay } = await supabase
            .from("payments")
            .select("id, booking_id, status")
            .eq("booking_id", byBooking.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          payment = pendingPay;
        }
      }
    }

    if (payment && isSettled) {
      await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: payment_type ?? "midtrans",
          notes: `Auto-confirmed via Midtrans webhook (${order_id})`,
        })
        .eq("id", payment.id);
      processed = true;
    } else if (payment && isFailed) {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          notes: `Midtrans status: ${transaction_status}`,
        })
        .eq("id", payment.id);
      processed = true;
    }
  } catch (e) {
    errorMessage = String((e as any)?.message || e);
  }

  if (logRow?.id) {
    await supabase
      .from("midtrans_webhook_logs")
      .update({ processed, error_message: errorMessage })
      .eq("id", logRow.id);
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});