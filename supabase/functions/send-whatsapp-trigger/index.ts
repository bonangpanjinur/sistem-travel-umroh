import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');
const whatsappProvider = Deno.env.get('WHATSAPP_PROVIDER') || 'fonnte';

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface WhatsAppMessage {
  phone: string;
  template_code: string;
  variables: Record<string, string>;
}

async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
  try {
    if (whatsappProvider === 'fonnte') {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': whatsappApiKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: message.phone, message: message.variables.message || `Template: ${message.template_code}` }),
      });
      const result = await response.json();
      return result.status === true;
    } else if (whatsappProvider === 'wablas') {
      const response = await fetch('https://api.wablas.com/api/send-message', {
        method: 'POST',
        headers: { 'Authorization': whatsappApiKey!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: message.phone, message: message.variables.message || `Template: ${message.template_code}` }),
      });
      const result = await response.json();
      return result.status === 200;
    }
    return false;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
}

async function handleBookingCreated(bookingId: string) {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`booking_code, total_price, customer:customers(full_name, phone), departure:departures(departure_date, package:packages(name))`)
      .eq('id', bookingId)
      .single();

    if (!booking) return;
    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
    if (!customer?.phone) return;

    const dep = Array.isArray(booking.departure) ? booking.departure[0] : booking.departure;
    const pkgName = dep?.package ? (Array.isArray(dep.package) ? dep.package[0]?.name : (dep.package as any)?.name) : '';
    const message = `Halo ${customer.full_name}, booking Anda ${booking.booking_code} telah berhasil dibuat untuk paket ${pkgName} dengan total ${booking.total_price}. Terima kasih!`;

    const success = await sendWhatsAppMessage({ phone: customer.phone, template_code: 'booking_created', variables: { message } });
    console.log(`Booking created WA: ${success ? 'sent' : 'failed'}`);
  } catch (error) {
    console.error('Error handling booking created:', error);
  }
}

async function handlePaymentVerified(paymentId: string) {
  try {
    const { data: payment } = await supabase
      .from('payments')
      .select(`payment_code, amount, booking:bookings(booking_code, customer:customers(full_name, phone))`)
      .eq('id', paymentId)
      .single();

    if (!payment) return;
    const bookingData = Array.isArray(payment.booking) ? payment.booking[0] : payment.booking;
    if (!bookingData) return;
    const customer = Array.isArray(bookingData.customer) ? bookingData.customer[0] : bookingData.customer;
    if (!customer?.phone) return;

    const message = `Halo ${customer.full_name}, pembayaran Anda ${payment.payment_code} sebesar ${payment.amount} untuk booking ${bookingData.booking_code} telah diverifikasi. Terima kasih!`;
    const success = await sendWhatsAppMessage({ phone: customer.phone, template_code: 'payment_verified', variables: { message } });
    console.log(`Payment verified WA: ${success ? 'sent' : 'failed'}`);
  } catch (error) {
    console.error('Error handling payment verified:', error);
  }
}

async function handleDocumentRejected(documentId: string) {
  try {
    const { data: document } = await supabase
      .from('customer_documents')
      .select(`document_type_id, notes, customer:customers(full_name, phone)`)
      .eq('id', documentId)
      .single();

    if (!document) return;
    const customer = Array.isArray(document.customer) ? document.customer[0] : document.customer;
    if (!customer?.phone) return;

    const message = `Halo ${customer.full_name}, dokumen Anda ditolak. Alasan: ${document.notes || 'Tidak ada keterangan'}. Silakan upload kembali.`;
    const success = await sendWhatsAppMessage({ phone: customer.phone, template_code: 'document_rejected', variables: { message } });
    console.log(`Document rejected WA: ${success ? 'sent' : 'failed'}`);
  } catch (error) {
    console.error('Error handling document rejected:', error);
  }
}

async function handleCommissionPaid(commissionId: string) {
  try {
    const { data: commission } = await supabase
      .from('agent_commissions')
      .select(`commission_amount, agent:agents(company_name)`)
      .eq('id', commissionId)
      .single();

    if (!commission) return;
    const agent = Array.isArray(commission.agent) ? commission.agent[0] : commission.agent;
    const message = `Halo ${agent?.company_name || 'Agen'}, komisi Anda sebesar ${commission.commission_amount} telah ditransfer. Terima kasih!`;
    // No phone from agent directly, skip sending but log
    console.log('Commission paid notification:', message);
  } catch (error) {
    console.error('Error handling commission paid:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const { event_type, record_id } = await req.json();
    console.log(`Processing WhatsApp trigger: ${event_type} for ${record_id}`);

    switch (event_type) {
      case 'booking_created': await handleBookingCreated(record_id); break;
      case 'payment_verified': await handlePaymentVerified(record_id); break;
      case 'document_rejected': await handleDocumentRejected(record_id); break;
      case 'commission_paid': await handleCommissionPaid(record_id); break;
      default: console.warn(`Unknown event type: ${event_type}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Processed ${event_type}` }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-whatsapp-trigger:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
