import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Booking {
  id: string;
  booking_code: string;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  customer: {
    full_name: string;
    phone: string;
  };
  departure: {
    departure_date: string;
    package: {
      name: string;
    };
  };
}

// Format currency to IDR
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// Calculate days until departure
function getDaysUntilDeparture(departureDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const departure = new Date(departureDate);
  departure.setHours(0, 0, 0, 0);
  const diffTime = departure.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Send WhatsApp message via configured provider
async function sendWhatsApp(
  supabaseClient: any,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get WhatsApp config
    const { data: config, error: configError } = await supabaseClient
      .from("whatsapp_config")
      .select("*")
      .single() as { data: any; error: any };

    if (configError || !config || !config.is_active || !config.api_key) {
      return { success: false, error: "WhatsApp not configured" };
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }

    // Send based on provider
    let response;
    if (config.provider === 'fonnte') {
      response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": config.api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: message,
          countryCode: "62",
        }),
      });
    } else if (config.provider === 'wablas') {
      response = await fetch("https://console.wablas.com/api/send-message", {
        method: "POST",
        headers: {
          "Authorization": config.api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });
    } else {
      return { success: false, error: `Unsupported provider: ${config.provider}` };
    }

    const data = await response.json();
    
    // Log the message
    await (supabaseClient.from("whatsapp_logs") as any).insert({
      recipient_phone: formattedPhone,
      message_content: message,
      status: data.status === true || data.status === "true" ? 'sent' : 'failed',
      error_message: data.reason || data.message || null,
      sent_at: data.status === true || data.status === "true" ? new Date().toISOString() : null,
    });

    if (data.status === true || data.status === "true") {
      return { success: true };
    }
    return { success: false, error: data.reason || data.message || "Unknown error" };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional filters
    let reminderType = "all";
    let bookingId: string | null = null;
    
    try {
      const body = await req.json();
      reminderType = body.reminder_type || "all";
      bookingId = body.booking_id || null;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Build query for bookings that need reminders
    let query = supabase
      .from("bookings")
      .select(`
        id,
        booking_code,
        total_price,
        paid_amount,
        remaining_amount,
        customer:customers!bookings_customer_id_fkey (
          full_name,
          phone
        ),
        departure:departures!bookings_departure_id_fkey (
          departure_date,
          package:packages!departures_package_id_fkey (
            name
          )
        )
      `)
      .neq("payment_status", "paid")
      .in("booking_status", ["confirmed", "pending"]);

    if (bookingId) {
      query = query.eq("id", bookingId);
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    const results: { booking_code: string; status: string; error?: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const booking of bookings || []) {
      const b = booking as unknown as Booking;
      
      if (!b.customer?.phone) {
        results.push({
          booking_code: b.booking_code,
          status: "skipped",
          error: "No phone number"
        });
        continue;
      }

      if (!b.departure?.departure_date) {
        results.push({
          booking_code: b.booking_code,
          status: "skipped",
          error: "Missing departure data"
        });
        continue;
      }

      const daysUntil = getDaysUntilDeparture(b.departure.departure_date);
      if (Number.isNaN(daysUntil)) {
        results.push({
          booking_code: b.booking_code,
          status: "skipped",
          error: "Invalid departure date"
        });
        continue;
      }
      
      let shouldSend = false;
      let messageType = "";

      if (reminderType === "all" || reminderType === "unpaid") {
        if (b.remaining_amount > 0) {
          shouldSend = true;
          messageType = "payment";
        }
      }

      if (reminderType === "all" || reminderType === "approaching") {
        if (daysUntil <= 7 && daysUntil > 0) {
          shouldSend = true;
          messageType = daysUntil <= 3 ? "urgent" : "approaching";
        }
      }

      if (!shouldSend) {
        results.push({
          booking_code: b.booking_code,
          status: "skipped",
          error: "No reminder needed"
        });
        continue;
      }

      // Compose message
      let message = "";
      const customerName = b.customer.full_name;
      const packageName = b.departure?.package?.name || "Umrah";
      const remainingFormatted = formatCurrency(b.remaining_amount);

      if (messageType === "urgent") {
        message = `🚨 *PENGINGAT MENDESAK*\n\nAssalamu'alaikum ${customerName},\n\nKeberangkatan ${packageName} Anda tinggal *${daysUntil} hari lagi*!\n\nSisa pembayaran: *${remainingFormatted}*\n\nMohon segera lunasi pembayaran agar tidak mengganggu keberangkatan Anda.\n\nKode Booking: ${b.booking_code}\n\nTerima kasih.`;
      } else if (messageType === "approaching") {
        message = `📅 *PENGINGAT KEBERANGKATAN*\n\nAssalamu'alaikum ${customerName},\n\nKeberangkatan ${packageName} Anda tinggal *${daysUntil} hari lagi*.\n\n${b.remaining_amount > 0 ? `Sisa pembayaran: *${remainingFormatted}*\nMohon segera lunasi pembayaran Anda.\n\n` : ''}Pastikan semua dokumen sudah siap:\n✅ Paspor (min. 6 bulan masa berlaku)\n✅ Visa\n✅ Buku Kuning Vaksin\n\nKode Booking: ${b.booking_code}\n\nTerima kasih.`;
      } else {
        message = `💰 *PENGINGAT PEMBAYARAN*\n\nAssalamu'alaikum ${customerName},\n\nIni adalah pengingat untuk pembayaran paket ${packageName}.\n\nTotal: ${formatCurrency(b.total_price)}\nTerbayar: ${formatCurrency(b.paid_amount)}\nSisa: *${remainingFormatted}*\n\nKode Booking: ${b.booking_code}\n\nMohon segera melakukan pembayaran. Terima kasih.`;
      }

      // Send WhatsApp
      const sendResult = await sendWhatsApp(supabase, b.customer.phone, message);

      // Log reminder
      await (supabase.from("payment_reminders") as any).insert({
        booking_id: b.id,
        reminder_type: messageType,
        channel: "whatsapp",
        message_content: message,
        status: sendResult.success ? "sent" : "failed",
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error_message: sendResult.error || null,
      });

      results.push({
        booking_code: b.booking_code,
        status: sendResult.success ? "sent" : "failed",
        error: sendResult.error
      });
    }

    const summary = {
      total: results.length,
      sent: results.filter(r => r.status === "sent").length,
      failed: results.filter(r => r.status === "failed").length,
      skipped: results.filter(r => r.status === "skipped").length,
    };

    return respond({ 
      success: true, 
      message: `Processed ${summary.total} bookings: ${summary.sent} sent, ${summary.failed} failed, ${summary.skipped} skipped`,
      summary,
      details: results 
    });

  } catch (error: unknown) {
    console.error("Payment reminder error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return respond({
      success: false,
      error: errorMessage,
      summary: { total: 0, sent: 0, failed: 0, skipped: 0 },
      details: [],
      diagnostics: {
        function_name: "send-payment-reminder",
        timestamp: new Date().toISOString(),
      },
    });
  }
});
