export type EmailTemplate =
  | 'booking_confirmation'
  | 'payment_verified'
  | 'payment_reminder'
  | 'departure_reminder'
  | 'document_ready'
  | 'custom';

export interface EmailPayload {
  to: string;
  toName?: string;
  template: EmailTemplate;
  data: Record<string, any>;
  subject?: string;
  body?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { success: false, error: err.message || 'Gagal mengirim email' };
  }
  return response.json();
}

export async function sendBookingConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
  packageName: string;
  departureDate: string;
  totalPrice: number;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.customerEmail,
    toName: params.customerName,
    template: 'booking_confirmation',
    data: params,
    subject: `Konfirmasi Booking ${params.bookingCode} - ${params.packageName}`,
  });
}

export async function sendPaymentReminderEmail(params: {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
  remainingAmount: number;
  paymentDeadline: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.customerEmail,
    toName: params.customerName,
    template: 'payment_reminder',
    data: params,
    subject: `Pengingat Pembayaran - Booking ${params.bookingCode}`,
  });
}

export async function sendDepartureReminderEmail(params: {
  customerEmail: string;
  customerName: string;
  bookingCode: string;
  packageName: string;
  departureDate: string;
  departureAirport: string;
  daysUntilDeparture: number;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.customerEmail,
    toName: params.customerName,
    template: 'departure_reminder',
    data: params,
    subject: `H-${params.daysUntilDeparture} Keberangkatan - ${params.packageName}`,
  });
}
