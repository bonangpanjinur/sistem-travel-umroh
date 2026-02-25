import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: 'payment_received' | 'departure_reminder' | 'welcome_umrah' | 'booking_confirmed';
  booking_id?: string;
  departure_id?: string;
  customer_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: NotificationPayload = await req.json();
    const { type, booking_id, departure_id } = payload;

    const { data: waSettings } = await supabase
      .from('company_settings')
      .select('setting_value')
      .eq('setting_key', 'whatsapp_config')
      .single();

    const config = waSettings?.setting_value as {
      provider?: string;
      api_key?: string;
      device_id?: string;
    } | null;

    if (!config?.api_key) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp API not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const notifications: Array<{ phone: string; message: string; customer_name: string }> = [];

    const getCustomer = (booking: any) => {
      const c = booking?.customer;
      return Array.isArray(c) ? c[0] : c;
    };

    switch (type) {
      case 'payment_received': {
        if (!booking_id) throw new Error("booking_id required");
        
        const { data: booking } = await supabase
          .from('bookings')
          .select(`booking_code, total_price, paid_amount, customer:customers(full_name, phone)`)
          .eq('id', booking_id)
          .single();

        if (!booking) break;
        const customer = getCustomer(booking);
        if (customer?.phone) {
          const remaining = Number(booking.total_price) - Number(booking.paid_amount || 0);
          notifications.push({
            phone: customer.phone,
            customer_name: customer.full_name,
            message: `✅ *Pembayaran Diterima*\n\nAssalamu'alaikum ${customer.full_name},\n\nPembayaran Anda untuk booking *${booking.booking_code}* telah kami terima.\n\n💰 Sisa pembayaran: Rp ${remaining.toLocaleString('id-ID')}\n\nWassalam 🤲`
          });
        }
        break;
      }

      case 'departure_reminder': {
        if (!departure_id) throw new Error("departure_id required");
        
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`booking_code, customer:customers(full_name, phone)`)
          .eq('departure_id', departure_id)
          .eq('booking_status', 'confirmed');

        const { data: departure } = await supabase
          .from('departures')
          .select(`departure_date, departure_time, package:packages(name)`)
          .eq('id', departure_id)
          .single();

        if (bookings && departure) {
          const dep = departure as any;
          for (const booking of bookings) {
            const customer = getCustomer(booking);
            if (customer?.phone) {
              const depDate = new Date(dep.departure_date);
              const formattedDate = depDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              const pkgName = Array.isArray(dep.package) ? dep.package[0]?.name : dep.package?.name;
              notifications.push({
                phone: customer.phone,
                customer_name: customer.full_name,
                message: `🕋 *H-3 Keberangkatan Umrah*\n\nAssalamu'alaikum ${customer.full_name},\n\n📅 *${formattedDate}*\n⏰ Jam: ${dep.departure_time || 'Akan dikonfirmasi'}\n📦 Paket: ${pkgName}\n\nWassalam`
              });
            }
          }
        }
        break;
      }

      case 'welcome_umrah': {
        if (!departure_id) throw new Error("departure_id required");
        
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`customer:customers(full_name, phone)`)
          .eq('departure_id', departure_id)
          .eq('booking_status', 'confirmed');

        if (bookings) {
          for (const booking of bookings) {
            const customer = getCustomer(booking);
            if (customer?.phone) {
              notifications.push({
                phone: customer.phone,
                customer_name: customer.full_name,
                message: `🕋 *Selamat Menunaikan Ibadah Umrah*\n\nAssalamu'alaikum ${customer.full_name},\n\nSemoga perjalanan ibadah umrah Anda berjalan lancar dan penuh berkah. 🤲\n\nWassalam`
              });
            }
          }
        }
        break;
      }

      case 'booking_confirmed': {
        if (!booking_id) throw new Error("booking_id required");
        
        const { data: booking } = await supabase
          .from('bookings')
          .select(`booking_code, total_price, departure:departures(departure_date, package:packages(name)), customer:customers(full_name, phone)`)
          .eq('id', booking_id)
          .single();

        if (!booking) break;
        const customer = getCustomer(booking);
        if (customer?.phone) {
          const dep = Array.isArray((booking as any).departure) ? (booking as any).departure[0] : (booking as any).departure;
          const depDate = new Date(dep?.departure_date);
          const formattedDate = depDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
          const pkgName = Array.isArray(dep?.package) ? dep.package[0]?.name : dep?.package?.name;

          notifications.push({
            phone: customer.phone,
            customer_name: customer.full_name,
            message: `✅ *Booking Dikonfirmasi*\n\nAssalamu'alaikum ${customer.full_name},\n\n🔖 Kode: *${booking.booking_code}*\n📦 Paket: ${pkgName}\n📅 Berangkat: ${formattedDate}\n💰 Total: Rp ${Number(booking.total_price).toLocaleString('id-ID')}\n\nWassalam 🤲`
          });
        }
        break;
      }
    }

    let sent = 0;
    let failed = 0;

    for (const notif of notifications) {
      try {
        let response;
        if (config.provider === 'fonnte') {
          response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: { 'Authorization': config.api_key!, 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: notif.phone, message: notif.message }),
          });
        } else if (config.provider === 'wablas') {
          response = await fetch('https://pati.wablas.com/api/send-message', {
            method: 'POST',
            headers: { 'Authorization': config.api_key!, 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: notif.phone, message: notif.message }),
          });
        }
        if (response?.ok) { sent++; } else { failed++; }
      } catch (_err) {
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, type, sent, failed, total: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
