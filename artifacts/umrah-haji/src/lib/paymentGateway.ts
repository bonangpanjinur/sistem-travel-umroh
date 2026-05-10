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
}

export async function createMidtransPaymentToken(
  payload: MidtransPaymentPayload
): Promise<MidtransSnapResult> {
  const response = await fetch('/api/midtrans/create-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Gagal membuat token pembayaran');
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
