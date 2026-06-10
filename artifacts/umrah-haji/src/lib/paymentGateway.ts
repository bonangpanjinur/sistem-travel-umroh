import { apiFetch } from '@/lib/api';

// ─── Snap (semua metode via popup Midtrans) ───────────────────────────────────

export interface MidtransPaymentPayload {
  bookingId: string;
  bookingCode: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface MidtransSnapResult {
  token: string;
  redirect_url: string;
  order_id?: string;
}

export async function createMidtransPaymentToken(
  payload: MidtransPaymentPayload
): Promise<MidtransSnapResult> {
  const response = await apiFetch('/api/midtrans/create-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking_id: payload.bookingId,
      booking_code: payload.bookingCode,
      amount: payload.amount,
      customer_name: payload.customerName,
      customer_email: payload.customerEmail,
      customer_phone: payload.customerPhone,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Gagal membuat token pembayaran');
  }
  return response.json();
}

export function openMidtransSnap(token: string, callbacks?: {
  onSuccess?: (result: any) => void;
  onPending?: (result: any) => void;
  onError?: (result: any) => void;
  onClose?: () => void;
}) {
  const snap = (window as any).snap;
  if (!snap) {
    window.open(`https://app.midtrans.com/snap/v2/vtweb/${token}`, '_blank');
    return;
  }
  snap.pay(token, {
    onSuccess: callbacks?.onSuccess,
    onPending: callbacks?.onPending,
    onError: callbacks?.onError,
    onClose: callbacks?.onClose,
  });
}

export function isMidtransAvailable(): boolean {
  return typeof (window as any).snap !== 'undefined';
}

// ─── QRIS (Midtrans Core API) ─────────────────────────────────────────────────

export interface QrisPaymentPayload {
  bookingId: string;
  bookingCode: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface QrisCreateResult {
  transaction_id: string;
  order_id: string;
  qr_code_url: string | null;
  qr_string: string | null;
  expiry_time: string | null;
  gross_amount: string;
  transaction_status: string;
}

export interface QrisStatusResult {
  transaction_status: string;
  fraud_status?: string;
  status_message?: string;
  order_id: string;
  transaction_id?: string;
  gross_amount?: string;
  payment_type?: string;
  settlement_time?: string;
}

export async function createQrisPayment(
  payload: QrisPaymentPayload
): Promise<QrisCreateResult> {
  const response = await apiFetch('/api/midtrans/create-qris', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking_id: payload.bookingId,
      booking_code: payload.bookingCode,
      amount: payload.amount,
      customer_name: payload.customerName,
      customer_email: payload.customerEmail,
      customer_phone: payload.customerPhone,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Gagal membuat QRIS');
  }
  return response.json();
}

export async function checkQrisStatus(orderId: string): Promise<QrisStatusResult> {
  const response = await apiFetch(`/api/midtrans/qris-status/${encodeURIComponent(orderId)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal cek status QRIS');
  }
  return response.json();
}

export function isQrisPaid(status: string): boolean {
  return status === 'settlement' || status === 'capture';
}

export function isQrisExpired(status: string): boolean {
  return status === 'expire' || status === 'cancel' || status === 'deny';
}

export function getQrisSecondsLeft(expiryTime: string | null): number {
  if (!expiryTime) return 15 * 60;
  const expiry = new Date(expiryTime.replace(' ', 'T') + '+07:00');
  const diff = Math.floor((expiry.getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

// ─── Xendit ───────────────────────────────────────────────────────────────────

export interface XenditInvoicePayload {
  bookingId: string;
  bookingCode: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethods?: string[];
}

export interface XenditInvoiceResult {
  invoice_id: string;
  external_id: string;
  invoice_url: string;
  expiry_date: string;
  amount: number;
  status: string;
}

export interface XenditConfigStatus {
  secret_key_configured: boolean;
  callback_token_configured: boolean;
  environment: 'live' | 'test';
  ready: boolean;
  key_hint: string | null;
}

export async function createXenditInvoice(
  payload: XenditInvoicePayload
): Promise<XenditInvoiceResult> {
  const response = await apiFetch('/api/xendit/create-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      booking_id: payload.bookingId,
      booking_code: payload.bookingCode,
      amount: payload.amount,
      customer_name: payload.customerName,
      customer_email: payload.customerEmail,
      customer_phone: payload.customerPhone,
      payment_methods: payload.paymentMethods,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Gagal membuat invoice Xendit');
  }
  return response.json();
}

export async function getXenditConfigStatus(): Promise<XenditConfigStatus | null> {
  try {
    const response = await apiFetch('/api/xendit/config-status');
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
