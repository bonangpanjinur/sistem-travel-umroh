import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type EmailTemplate =
  | "booking_confirmation"
  | "payment_verified"
  | "payment_reminder"
  | "departure_reminder"
  | "document_ready"
  | "custom";

interface SendEmailOptions {
  to: string;
  toName?: string;
  template: EmailTemplate;
  data?: Record<string, any>;
  subject?: string;
  body?: string;
  silent?: boolean;
}

async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: opts.to,
        toName: opts.toName,
        template: opts.template,
        data: opts.data ?? {},
        subject: opts.subject,
        body: opts.body,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.success) {
      if (!opts.silent) {
        const msg: string = json.error ?? `HTTP ${res.status}`;
        if (msg.includes("belum dikonfigurasi") || msg.includes("SMTP")) {
          toast.warning("Email tidak terkirim — SMTP belum dikonfigurasi. Tambahkan SMTP_HOST, SMTP_USER, SMTP_PASS di Secrets.");
        } else {
          toast.warning(`Email gagal dikirim: ${msg}`);
        }
      }
      return false;
    }

    return true;
  } catch (err: any) {
    if (!opts.silent) {
      toast.warning("Email tidak terkirim — API server tidak terjangkau.");
    }
    return false;
  }
}

export function useEmailNotifier() {
  const sendBookingConfirmation = async (opts: {
    to: string;
    customerName: string;
    bookingCode: string;
    packageName: string;
    departureDate: string;
    totalPrice: number;
    silent?: boolean;
  }) => {
    return sendEmail({
      to: opts.to,
      toName: opts.customerName,
      template: "booking_confirmation",
      data: {
        customerName: opts.customerName,
        bookingCode: opts.bookingCode,
        packageName: opts.packageName,
        departureDate: opts.departureDate,
        totalPrice: opts.totalPrice,
      },
      silent: opts.silent,
    });
  };

  const sendPaymentVerified = async (opts: {
    to: string;
    customerName: string;
    bookingCode: string;
    amount: number;
    silent?: boolean;
  }) => {
    return sendEmail({
      to: opts.to,
      toName: opts.customerName,
      template: "payment_verified",
      data: {
        customerName: opts.customerName,
        bookingCode: opts.bookingCode,
        amount: opts.amount,
      },
      silent: opts.silent,
    });
  };

  const sendPaymentReminder = async (opts: {
    to: string;
    customerName: string;
    bookingCode: string;
    remainingAmount: number;
    paymentDeadline: string;
    silent?: boolean;
  }) => {
    return sendEmail({
      to: opts.to,
      toName: opts.customerName,
      template: "payment_reminder",
      data: {
        customerName: opts.customerName,
        bookingCode: opts.bookingCode,
        remainingAmount: opts.remainingAmount,
        paymentDeadline: opts.paymentDeadline,
      },
      silent: opts.silent,
    });
  };

  const sendDepartureReminder = async (opts: {
    to: string;
    customerName: string;
    packageName: string;
    departureDate: string;
    departureAirport?: string;
    daysUntilDeparture: number;
    silent?: boolean;
  }) => {
    return sendEmail({
      to: opts.to,
      toName: opts.customerName,
      template: "departure_reminder",
      data: {
        customerName: opts.customerName,
        packageName: opts.packageName,
        departureDate: opts.departureDate,
        departureAirport: opts.departureAirport,
        daysUntilDeparture: opts.daysUntilDeparture,
      },
      silent: opts.silent,
    });
  };

  const sendCustom = async (opts: {
    to: string;
    toName?: string;
    subject: string;
    body: string;
    silent?: boolean;
  }) => {
    return sendEmail({
      to: opts.to,
      toName: opts.toName,
      template: "custom",
      subject: opts.subject,
      body: opts.body,
      silent: opts.silent,
    });
  };

  return {
    sendBookingConfirmation,
    sendPaymentVerified,
    sendPaymentReminder,
    sendDepartureReminder,
    sendCustom,
  };
}
